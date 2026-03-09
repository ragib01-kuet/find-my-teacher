import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { TutorProfile, Profile, TuitionRequest, Report, Message as MessageType } from "@/types/database";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Shield, Users, CheckCircle, XCircle, Eye, AlertTriangle,
  MessageCircle, Ban, FileText, Trash2, GraduationCap, Heart, Zap, Phone,
  Lock, Mail, ArrowRight, Handshake, BarChart3, TrendingUp, Clock, Activity,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import ContractModal from "@/components/ContractModal";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from "recharts";

interface StudentInfo {
  user_id: string;
  full_name: string;
  phone: string | null;
  created_at: string;
  request_count: number;
  favorite_tutor?: string;
  is_suspended?: boolean;
}

const AdminDashboard = () => {
  const { user, role, loading: authLoading, signIn } = useAuth();
  const [pendingTutors, setPendingTutors] = useState<(TutorProfile & { profile?: Profile })[]>([]);
  const [allTutors, setAllTutors] = useState<(TutorProfile & { profile?: Profile; email?: string })[]>([]);
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [requests, setRequests] = useState<(TuitionRequest & { student_name_resolved?: string; tutor_name_resolved?: string })[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedTutor, setSelectedTutor] = useState<(TutorProfile & { profile?: Profile }) | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [chatMessages, setChatMessages] = useState<(MessageType & { sender_name?: string })[]>([]);
  const [selectedChat, setSelectedChat] = useState<TuitionRequest | null>(null);
  const [stats, setStats] = useState({ tutors: 0, students: 0, requests: 0, deals: 0, contracts: 0, messages: 0 });
  const [deals, setDeals] = useState<any[]>([]);
  const [selectedContract, setSelectedContract] = useState<any>(null);
  const [selectedClassroomCode, setSelectedClassroomCode] = useState<string | null>(null);
  const [approvalPatterns, setApprovalPatterns] = useState<{ id: string; pattern: string; description: string | null; is_active: boolean; created_at: string }[]>([]);
  const [newPattern, setNewPattern] = useState("");
  const [newPatternDesc, setNewPatternDesc] = useState("");
  const [signupTrend, setSignupTrend] = useState<{ date: string; tutors: number; students: number }[]>([]);
  const [requestStatusData, setRequestStatusData] = useState<{ name: string; value: number }[]>([]);
  const [dealStatusData, setDealStatusData] = useState<{ name: string; value: number }[]>([]);
  const [suspendedStudents, setSuspendedStudents] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (role !== "admin") return;

    const fetchAll = async () => {
      // Pending tutors
      const { data: pending } = await supabase
        .from("tutor_profiles").select("*").eq("status", "pending").order("created_at", { ascending: false });
      if (pending) {
        const enriched = await Promise.all(
          (pending as TutorProfile[]).map(async (t) => {
            const { data: p } = await supabase.from("profiles").select("*").eq("user_id", t.user_id).single();
            return { ...t, profile: p as Profile };
          })
        );
        setPendingTutors(enriched);
      }

      // All tutors
      const { data: all } = await supabase.from("tutor_profiles").select("*").order("created_at", { ascending: false });
      if (all) {
        const enriched = await Promise.all(
          (all as TutorProfile[]).map(async (t) => {
            const { data: p } = await supabase.from("profiles").select("*").eq("user_id", t.user_id).single();
            return { ...t, profile: p as Profile };
          })
        );
        setAllTutors(enriched);
      }

      // Students
      const { data: studentRoles } = await supabase.from("user_roles").select("*").eq("role", "student");
      if (studentRoles) {
        const studentInfos = await Promise.all(
          studentRoles.map(async (sr) => {
            const { data: profile } = await supabase.from("profiles").select("*").eq("user_id", sr.user_id).single();
            const { count } = await supabase.from("tuition_requests").select("*", { count: "exact", head: true }).eq("student_id", sr.user_id);
            const { data: reqs } = await supabase.from("tuition_requests").select("tutor_id").eq("student_id", sr.user_id);
            let favTutor = "";
            if (reqs && reqs.length > 0) {
              const tutorCounts: Record<string, number> = {};
              reqs.forEach((r: any) => { tutorCounts[r.tutor_id] = (tutorCounts[r.tutor_id] || 0) + 1; });
              const topTutorId = Object.entries(tutorCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
              if (topTutorId) {
                const { data: tp } = await supabase.from("profiles").select("full_name").eq("user_id", topTutorId).single();
                favTutor = tp?.full_name || "";
              }
            }
            return {
              user_id: sr.user_id, full_name: profile?.full_name || "Unknown",
              phone: profile?.phone || null, created_at: profile?.created_at || "",
              request_count: count || 0, favorite_tutor: favTutor,
            } as StudentInfo;
          })
        );
        setStudents(studentInfos);
      }

      // Requests
      const { data: reqs } = await supabase.from("tuition_requests").select("*").order("created_at", { ascending: false });
      if (reqs) {
        const enrichedReqs = await Promise.all(
          (reqs as TuitionRequest[]).map(async (req) => {
            const { data: sp } = await supabase.from("profiles").select("full_name").eq("user_id", req.student_id).single();
            const { data: tp } = await supabase.from("profiles").select("full_name").eq("user_id", req.tutor_id).single();
            return { ...req, student_name_resolved: sp?.full_name || "Unknown", tutor_name_resolved: tp?.full_name || "Unknown" };
          })
        );
        setRequests(enrichedReqs);

        // Request status analytics
        const statusCounts: Record<string, number> = {};
        enrichedReqs.forEach((r) => { statusCounts[r.status] = (statusCounts[r.status] || 0) + 1; });
        setRequestStatusData(Object.entries(statusCounts).map(([name, value]) => ({ name, value })));
      }

      // Reports
      const { data: r } = await supabase.from("reports").select("*").order("created_at", { ascending: false });
      if (r) setReports(r as Report[]);

      // Stats
      const { count: tutorCount } = await supabase.from("tutor_profiles").select("*", { count: "exact", head: true });
      const { count: studentCount } = await supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "student");
      const { count: reqCount } = await supabase.from("tuition_requests").select("*", { count: "exact", head: true });
      const { count: dealCount } = await supabase.from("deals").select("*", { count: "exact", head: true });
      const { count: contractCount } = await supabase.from("contracts").select("*", { count: "exact", head: true });
      const { count: messageCount } = await supabase.from("messages").select("*", { count: "exact", head: true });
      setStats({
        tutors: tutorCount || 0, students: studentCount || 0, requests: reqCount || 0,
        deals: dealCount || 0, contracts: contractCount || 0, messages: messageCount || 0,
      });

      // Deals with enriched data
      const { data: dealsData } = await supabase.from("deals").select("*").order("created_at", { ascending: false });
      if (dealsData) {
        const enrichedDeals = await Promise.all(
          dealsData.map(async (deal: any) => {
            const { data: sp } = await supabase.from("profiles").select("full_name").eq("user_id", deal.student_id).single();
            const { data: tp } = await supabase.from("profiles").select("full_name").eq("user_id", deal.tutor_id).single();
            const { data: tutorP } = await supabase.from("tutor_profiles").select("department, university_name").eq("user_id", deal.tutor_id).single();
            const { data: req } = await supabase.from("tuition_requests").select("subject").eq("id", deal.request_id).single();
            const { data: contract } = await supabase.from("contracts").select("*").eq("deal_id", deal.id).maybeSingle();
            const sigCount = contract ? (await supabase.from("contract_signatures").select("id", { count: "exact", head: true }).eq("contract_id", contract.id)).count || 0 : 0;
            return {
              ...deal,
              student_name: sp?.full_name || "Unknown",
              tutor_name: tp?.full_name || "Unknown",
              tutor_department: tutorP?.department || "",
              tutor_university: (tutorP as any)?.university_name || "Unknown",
              subject: req?.subject || "N/A",
              contract,
              signature_count: sigCount,
            };
          })
        );
        setDeals(enrichedDeals);

        // Deal status analytics
        const dStatusCounts: Record<string, number> = {};
        enrichedDeals.forEach((d) => { dStatusCounts[d.status] = (dStatusCounts[d.status] || 0) + 1; });
        setDealStatusData(Object.entries(dStatusCounts).map(([name, value]) => ({ name, value })));
      }

      // Auto-approval patterns
      const { data: patterns } = await supabase
        .from("auto_approval_patterns")
        .select("*")
        .order("created_at", { ascending: true });
      if (patterns) setApprovalPatterns(patterns as any);

      // Signup trend (last 7 days from profiles)
      const { data: allProfiles } = await supabase.from("profiles").select("created_at").order("created_at", { ascending: true });
      if (allProfiles) {
        const last7 = Array.from({ length: 7 }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          return d.toISOString().slice(0, 10);
        });
        const trendData = last7.map((date) => {
          const daySignups = allProfiles.filter((p: any) => p.created_at?.startsWith(date));
          return { date: date.slice(5), tutors: 0, students: daySignups.length };
        });
        setSignupTrend(trendData);
      }
    };
    fetchAll();
  }, [role]);

  const viewChat = async (req: TuitionRequest) => {
    setSelectedChat(req);
    const { data } = await supabase.from("messages").select("*").eq("request_id", req.id).order("created_at", { ascending: true });
    if (data) {
      const enriched = await Promise.all(
        (data as MessageType[]).map(async (m) => {
          const { data: p } = await supabase.from("profiles").select("full_name").eq("user_id", m.sender_id).single();
          return { ...m, sender_name: p?.full_name || "Unknown" };
        })
      );
      setChatMessages(enriched);
    }
  };

  const handleApprove = async (tutor: TutorProfile) => {
    const { error } = await supabase.from("tutor_profiles").update({ status: "approved", admin_notes: adminNotes || null } as any).eq("id", tutor.id);
    if (error) { toast.error("Failed: " + error.message); }
    else { toast.success("Tutor approved!"); setPendingTutors((p) => p.filter((t) => t.id !== tutor.id)); setSelectedTutor(null); setAdminNotes(""); }
  };

  const handleReject = async (tutor: TutorProfile) => {
    const { error } = await supabase.from("tutor_profiles").update({ status: "rejected", admin_notes: adminNotes || null } as any).eq("id", tutor.id);
    if (error) { toast.error("Failed: " + error.message); }
    else { toast.success("Tutor rejected"); setPendingTutors((p) => p.filter((t) => t.id !== tutor.id)); setSelectedTutor(null); setAdminNotes(""); }
  };

  const handleSuspend = async (tutor: TutorProfile) => {
    const { error } = await supabase.from("tutor_profiles").update({ status: "suspended" } as any).eq("id", tutor.id);
    if (!error) { toast.success("Tutor suspended"); setAllTutors((p) => p.map((t) => (t.id === tutor.id ? { ...t, status: "suspended" as const } : t))); }
  };

  const handleReactivateTutor = async (tutor: TutorProfile) => {
    const { error } = await supabase.from("tutor_profiles").update({ status: "approved" } as any).eq("id", tutor.id);
    if (!error) { toast.success("Tutor reactivated"); setAllTutors((p) => p.map((t) => (t.id === tutor.id ? { ...t, status: "approved" as const } : t))); }
  };

  const handleDeleteStudent = async (userId: string) => {
    await supabase.from("tuition_requests").delete().eq("student_id", userId);
    await supabase.from("profiles").delete().eq("user_id", userId);
    await supabase.from("user_roles").delete().eq("user_id", userId);
    setStudents((p) => p.filter((s) => s.user_id !== userId));
    toast.success("Student removed");
  };

  const handleSuspendStudent = (userId: string) => {
    setSuspendedStudents((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
        toast.success("Student reactivated");
      } else {
        next.add(userId);
        toast.success("Student suspended");
      }
      return next;
    });
  };

  const handleDeleteTutor = async (tutor: TutorProfile) => {
    await supabase.from("tutor_profiles").delete().eq("id", tutor.id);
    await supabase.from("tuition_requests").delete().eq("tutor_id", tutor.user_id);
    await supabase.from("profiles").delete().eq("user_id", tutor.user_id);
    await supabase.from("user_roles").delete().eq("user_id", tutor.user_id);
    setAllTutors((p) => p.filter((t) => t.id !== tutor.id));
    toast.success("Tutor removed");
  };

  // Admin login form state
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminLoginLoading, setAdminLoginLoading] = useState(false);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminLoginLoading(true);
    const { error } = await signIn(adminEmail, adminPassword);
    setAdminLoginLoading(false);
    if (error) {
      toast.error("Login failed: " + error.message);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen"><Navbar />
        <div className="flex min-h-[60vh] items-center justify-center pt-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!user || role !== "admin") {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex min-h-[80vh] items-center justify-center pt-16 px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-elevated sm:p-8"
          >
            <div className="mb-6 flex flex-col items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-coral-gradient">
                <Shield className="h-6 w-6 text-primary-foreground" />
              </div>
              <h2 className="mt-3 font-display text-xl font-bold text-foreground">Admin Access</h2>
              <p className="mt-1 text-sm text-muted-foreground">Sign in with admin credentials</p>
            </div>
            <form className="space-y-4" onSubmit={handleAdminLogin}>
              <div className="space-y-2">
                <Label>Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="admin@email.com" className="pl-10" type="email"
                    value={adminEmail} onChange={e => setAdminEmail(e.target.value)} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input type="password" placeholder="••••••••" className="pl-10"
                    value={adminPassword} onChange={e => setAdminPassword(e.target.value)} required />
                </div>
              </div>
              <Button type="submit" disabled={adminLoginLoading}
                className="w-full gap-2 bg-coral-gradient text-primary-foreground hover:opacity-90">
                {adminLoginLoading ? "Signing in..." : "Sign In as Admin"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
            {user && role !== "admin" && (
              <p className="mt-4 text-center text-xs text-destructive">
                You're signed in but don't have admin privileges.
              </p>
            )}
          </motion.div>
        </div>
      </div>
    );
  }

  const statusColor = (s: string) => {
    switch (s) {
      case "approved": return "bg-green-100 text-green-700";
      case "accepted": return "bg-green-100 text-green-700";
      case "pending": return "bg-yellow-100 text-yellow-700";
      case "pending_admin": return "bg-yellow-100 text-yellow-700";
      case "rejected": return "bg-red-100 text-red-700";
      case "suspended": return "bg-orange-100 text-orange-700";
      case "completed": return "bg-blue-100 text-blue-700";
      default: return "bg-secondary text-secondary-foreground";
    }
  };

  const isAutoApproved = (t: TutorProfile) => {
    return t.status === "approved" && t.admin_notes === null && t.created_at === t.updated_at;
  };

  const PIE_COLORS = ["hsl(var(--primary))", "hsl(142 76% 36%)", "hsl(38 92% 50%)", "hsl(0 84% 60%)", "hsl(262 83% 58%)"];

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="pt-16">
        <div className="container py-6 px-4 sm:py-8">
          <div className="mb-6 flex items-center gap-3 sm:mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-coral-gradient">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-foreground sm:text-2xl">Admin Dashboard</h1>
              <p className="text-xs text-muted-foreground sm:text-sm">Manage FindMyTeacher platform</p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="mb-6 grid gap-3 grid-cols-2 sm:mb-8 sm:gap-4 lg:grid-cols-6">
            {[
              { label: "Tutors", value: stats.tutors, icon: GraduationCap, color: "text-coral" },
              { label: "Students", value: stats.students, icon: Users, color: "text-blue-500" },
              { label: "Requests", value: stats.requests, icon: MessageCircle, color: "text-amber-500" },
              { label: "Deals", value: stats.deals, icon: Handshake, color: "text-green-500" },
              { label: "Contracts", value: stats.contracts, icon: FileText, color: "text-purple-500" },
              { label: "Messages", value: stats.messages, icon: Activity, color: "text-pink-500" },
            ].map((stat) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-border bg-card p-3 shadow-card sm:p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground sm:text-xs">{stat.label}</span>
                  <stat.icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${stat.color}`} />
                </div>
                <p className="mt-1 font-display text-xl font-bold text-foreground sm:text-2xl">{stat.value}</p>
              </motion.div>
            ))}
          </div>

          <Tabs defaultValue="analytics">
            <TabsList className="mb-4 flex-wrap sm:mb-6">
              <TabsTrigger value="analytics" className="gap-1 text-xs sm:gap-2 sm:text-sm">
                <BarChart3 className="h-3.5 w-3.5" /> Analytics
              </TabsTrigger>
              <TabsTrigger value="pending" className="gap-1 text-xs sm:gap-2 sm:text-sm">
                <AlertTriangle className="h-3.5 w-3.5" /> Pending ({pendingTutors.length})
              </TabsTrigger>
              <TabsTrigger value="tutors" className="gap-1 text-xs sm:gap-2 sm:text-sm">
                <GraduationCap className="h-3.5 w-3.5" /> Tutors
              </TabsTrigger>
              <TabsTrigger value="students" className="gap-1 text-xs sm:gap-2 sm:text-sm">
                <Users className="h-3.5 w-3.5" /> Students
              </TabsTrigger>
              <TabsTrigger value="requests" className="gap-1 text-xs sm:gap-2 sm:text-sm">
                <MessageCircle className="h-3.5 w-3.5" /> Requests
              </TabsTrigger>
              <TabsTrigger value="deals" className="gap-1 text-xs sm:gap-2 sm:text-sm">
                <Handshake className="h-3.5 w-3.5" /> Deals
              </TabsTrigger>
              <TabsTrigger value="reports" className="gap-1 text-xs sm:gap-2 sm:text-sm">
                <AlertTriangle className="h-3.5 w-3.5" /> Reports
              </TabsTrigger>
              <TabsTrigger value="auto-approval" className="gap-1 text-xs sm:gap-2 sm:text-sm">
                <Zap className="h-3.5 w-3.5" /> Auto Approval
              </TabsTrigger>
            </TabsList>

            {/* ─── Analytics Tab ─── */}
            <TabsContent value="analytics">
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Signup Trend */}
                <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <h3 className="font-display text-sm font-semibold text-foreground">Signups (Last 7 Days)</h3>
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={signupTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                      <Line type="monotone" dataKey="students" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Request Status Distribution */}
                <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    <h3 className="font-display text-sm font-semibold text-foreground">Request Status Breakdown</h3>
                  </div>
                  {requestStatusData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={requestStatusData}>
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                        <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">No request data yet</div>
                  )}
                </div>

                {/* Deal Status Pie */}
                <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
                  <div className="flex items-center gap-2 mb-4">
                    <Handshake className="h-4 w-4 text-primary" />
                    <h3 className="font-display text-sm font-semibold text-foreground">Deal Status</h3>
                  </div>
                  {dealStatusData.length > 0 ? (
                    <div className="flex items-center gap-4">
                      <ResponsiveContainer width="50%" height={180}>
                        <PieChart>
                          <Pie data={dealStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} strokeWidth={2}>
                            {dealStatusData.map((_, i) => (
                              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-2">
                        {dealStatusData.map((d, i) => (
                          <div key={d.name} className="flex items-center gap-2 text-xs">
                            <div className="h-3 w-3 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                            <span className="text-foreground font-medium">{d.name}</span>
                            <span className="text-muted-foreground">({d.value})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-[180px] items-center justify-center text-sm text-muted-foreground">No deals yet</div>
                  )}
                </div>

                {/* Quick Stats Summary */}
                <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="h-4 w-4 text-primary" />
                    <h3 className="font-display text-sm font-semibold text-foreground">Platform Summary</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-xl bg-secondary/50 px-4 py-3">
                      <span className="text-sm text-muted-foreground">Active Tutors</span>
                      <span className="font-display text-lg font-bold text-foreground">{allTutors.filter(t => t.status === "approved").length}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-secondary/50 px-4 py-3">
                      <span className="text-sm text-muted-foreground">Pending Approvals</span>
                      <span className="font-display text-lg font-bold text-amber-600">{pendingTutors.length}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-secondary/50 px-4 py-3">
                      <span className="text-sm text-muted-foreground">Signed Contracts</span>
                      <span className="font-display text-lg font-bold text-foreground">{deals.filter(d => d.signature_count >= 2).length}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-secondary/50 px-4 py-3">
                      <span className="text-sm text-muted-foreground">Open Reports</span>
                      <span className="font-display text-lg font-bold text-destructive">{reports.filter(r => r.status === "open").length}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-secondary/50 px-4 py-3">
                      <span className="text-sm text-muted-foreground">Auto-Approval Rules</span>
                      <span className="font-display text-lg font-bold text-foreground">{approvalPatterns.filter(p => p.is_active).length}</span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ─── Pending Tutors ─── */}
            <TabsContent value="pending">
              <div className="space-y-4">
                {pendingTutors.length === 0 ? (
                  <div className="rounded-2xl border border-border bg-card p-10 text-center shadow-card">
                    <CheckCircle className="mx-auto h-10 w-10 text-green-500" />
                    <p className="mt-3 font-display text-base font-semibold text-foreground">All caught up!</p>
                    <p className="mt-1 text-xs text-muted-foreground">No pending tutor approvals.</p>
                  </div>
                ) : (
                  pendingTutors.map((tutor) => (
                    <div key={tutor.id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex gap-3">
                          {tutor.photo_url ? (
                            <img src={tutor.photo_url} alt="" className="h-12 w-12 rounded-xl object-cover" />
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary">
                              <Users className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <h3 className="font-display text-sm font-semibold text-foreground">{tutor.profile?.full_name || "Unknown"}</h3>
                            <p className="text-xs text-muted-foreground">{tutor.university_name || "Unknown Uni"} • {tutor.department} • {tutor.session}</p>
                            {tutor.profile?.phone && (
                              <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                <Phone className="h-2.5 w-2.5" /> {tutor.profile.phone}
                              </p>
                            )}
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {tutor.subjects.slice(0, 3).map((s) => (
                                <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => { setSelectedTutor(tutor); setAdminNotes(""); }} className="text-xs">
                          <Eye className="mr-1 h-3 w-3" /> Review
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            {/* ─── All Tutors ─── */}
            <TabsContent value="tutors">
              <div className="space-y-3">
                {allTutors.map((tutor) => (
                  <div key={tutor.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3 shadow-card sm:p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary sm:h-10 sm:w-10">
                        <GraduationCap className="h-3.5 w-3.5 text-muted-foreground sm:h-4 sm:w-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{tutor.profile?.full_name}</span>
                          {isAutoApproved(tutor) && (
                            <Badge className="bg-blue-100 text-blue-700 text-[9px] gap-0.5 px-1.5 py-0">
                              <Zap className="h-2.5 w-2.5" /> Auto
                            </Badge>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground sm:text-xs">
                          {tutor.university_name || "Unknown"} • {tutor.department} • {tutor.session}
                          {tutor.profile?.phone && ` • ${tutor.profile.phone}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`text-[10px] sm:text-xs ${statusColor(tutor.status)}`}>{tutor.status}</Badge>
                      {tutor.status === "approved" && (
                        <Button size="sm" variant="outline" onClick={() => handleSuspend(tutor)} className="text-xs">
                          <Ban className="mr-1 h-3 w-3" /> Suspend
                        </Button>
                      )}
                      {tutor.status === "suspended" && (
                        <Button size="sm" variant="outline" onClick={() => handleReactivateTutor(tutor)} className="text-xs text-green-600">
                          <CheckCircle className="mr-1 h-3 w-3" /> Reactivate
                        </Button>
                      )}
                      <Button size="sm" variant="outline" className="text-xs text-destructive hover:bg-destructive/10" onClick={() => handleDeleteTutor(tutor)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
                {allTutors.length === 0 && <p className="py-12 text-center text-muted-foreground">No tutors registered yet.</p>}
              </div>
            </TabsContent>

            {/* ─── Students (Enhanced) ─── */}
            <TabsContent value="students">
              <div className="mb-4 rounded-xl border border-border bg-secondary/20 p-3">
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">Students from any Bangladeshi university</strong> can sign up freely and are auto-approved. 
                  Manage their accounts below — suspend or remove as needed.
                </p>
              </div>
              <div className="space-y-3">
                {students.map((student) => {
                  const isSuspended = suspendedStudents.has(student.user_id);
                  return (
                    <div key={student.user_id} className={`flex items-center justify-between rounded-xl border bg-card p-3 shadow-card sm:p-4 ${isSuspended ? "border-orange-300 bg-orange-50/30 dark:bg-orange-950/10" : "border-border"}`}>
                      <div className="flex items-center gap-3">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg sm:h-10 sm:w-10 ${isSuspended ? "bg-orange-100 dark:bg-orange-900/30" : "bg-secondary"}`}>
                          <Users className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isSuspended ? "text-orange-600" : "text-muted-foreground"}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">{student.full_name}</span>
                            {isSuspended && (
                              <Badge className="bg-orange-100 text-orange-700 text-[9px] px-1.5 py-0">Suspended</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground sm:text-xs">
                            <span>{student.request_count} requests</span>
                            {student.phone && (
                              <span className="flex items-center gap-0.5"><Phone className="h-2.5 w-2.5" />{student.phone}</span>
                            )}
                            {student.favorite_tutor && (
                              <span className="flex items-center gap-0.5"><Heart className="h-2.5 w-2.5 fill-coral text-coral" />{student.favorite_tutor}</span>
                            )}
                            <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{new Date(student.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className={`text-xs ${isSuspended ? "text-green-600" : "text-orange-600"}`}
                          onClick={() => handleSuspendStudent(student.user_id)}
                        >
                          {isSuspended ? <><CheckCircle className="mr-1 h-3 w-3" /> Reactivate</> : <><Ban className="mr-1 h-3 w-3" /> Suspend</>}
                        </Button>
                        <Button size="sm" variant="outline" className="text-xs text-destructive hover:bg-destructive/10" onClick={() => handleDeleteStudent(student.user_id)}>
                          <Trash2 className="mr-1 h-3 w-3" /> Remove
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {students.length === 0 && <p className="py-12 text-center text-muted-foreground">No students yet.</p>}
              </div>
            </TabsContent>

            {/* ─── Requests + Chats ─── */}
            <TabsContent value="requests">
              <div className="space-y-3">
                {requests.map((req) => (
                  <div key={req.id} className="rounded-xl border border-border bg-card p-3 shadow-card sm:p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-foreground sm:text-sm">
                          <span className="text-muted-foreground">Student:</span> {(req as any).student_name_resolved}
                          <span className="mx-2 text-muted-foreground">→</span>
                          <span className="text-muted-foreground">Tutor:</span> {(req as any).tutor_name_resolved}
                        </p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground sm:text-xs">
                          {req.subject} • {req.class_level} • ৳{req.budget} • {new Date(req.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`text-[10px] sm:text-xs ${statusColor(req.status)}`}>{req.status}</Badge>
                        <Button size="sm" variant="outline" onClick={() => viewChat(req)} className="text-xs gap-1">
                          <Eye className="h-3 w-3" /> Chat
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                {requests.length === 0 && <p className="py-12 text-center text-muted-foreground">No requests yet.</p>}
              </div>
            </TabsContent>

            {/* ─── Deals + Contracts ─── */}
            <TabsContent value="deals">
              <div className="space-y-3">
                {deals.length === 0 ? (
                  <div className="rounded-2xl border border-border bg-card p-10 text-center shadow-card">
                    <Handshake className="mx-auto h-10 w-10 text-muted-foreground" />
                    <p className="mt-3 font-display text-base font-semibold text-foreground">No deals yet</p>
                  </div>
                ) : (
                  deals.map((deal: any) => (
                    <div key={deal.id} className="rounded-xl border border-border bg-card p-4 shadow-card">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-foreground">{deal.student_name}</span>
                            <span className="text-muted-foreground text-xs">↔</span>
                            <span className="text-sm font-semibold text-foreground">{deal.tutor_name}</span>
                            <Badge className={`text-[10px] ${statusColor(deal.status)}`}>{deal.status}</Badge>
                            {deal.signature_count >= 2 && (
                              <Badge className="bg-green-100 text-green-700 text-[9px] gap-0.5 px-1.5 py-0">
                                <CheckCircle className="h-2.5 w-2.5" /> Fully Signed
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            🏫 {deal.tutor_university} • {deal.tutor_department} • 📚 {deal.subject}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {new Date(deal.created_at).toLocaleString()} • Signatures: {deal.signature_count}/2
                            {deal.classroom_code && deal.signature_count >= 2 && (
                              <span className="ml-2 font-mono text-foreground bg-secondary px-1.5 py-0.5 rounded">🔑 {deal.classroom_code}</span>
                            )}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {deal.contract && (
                            <Button size="sm" variant="outline" className="text-xs gap-1"
                              onClick={() => { setSelectedContract(deal.contract); setSelectedClassroomCode(deal.classroom_code); }}>
                              <FileText className="h-3 w-3" /> Contract
                            </Button>
                          )}
                          <Button size="sm" variant="outline" className="text-xs gap-1"
                            onClick={async () => {
                              const { data: reqData } = await supabase.from("tuition_requests").select("*").eq("id", deal.request_id).single();
                              if (reqData) viewChat(reqData as TuitionRequest);
                            }}>
                            <MessageCircle className="h-3 w-3" /> Chat
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            {/* ─── Reports ─── */}
            <TabsContent value="reports">
              <div className="space-y-3">
                {reports.map((report) => (
                  <div key={report.id} className="rounded-xl border border-border bg-card p-3 shadow-card sm:p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-foreground sm:text-sm">{report.reason}</p>
                        <p className="mt-1 text-[10px] text-muted-foreground sm:text-xs">{report.details}</p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">{new Date(report.created_at).toLocaleString()}</p>
                      </div>
                      <Badge className={`text-[10px] sm:text-xs ${report.status === "open" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                        {report.status}
                      </Badge>
                    </div>
                  </div>
                ))}
                {reports.length === 0 && <p className="py-12 text-center text-muted-foreground">No reports filed.</p>}
              </div>
            </TabsContent>

            {/* ─── Auto Approval Patterns ─── */}
            <TabsContent value="auto-approval">
              <div className="space-y-6">
                <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
                  <h3 className="font-display text-base font-semibold text-foreground mb-1">Email Auto-Approval Rules</h3>
                  <p className="text-xs text-muted-foreground mb-5">
                    Tutors signing up with emails matching these patterns will be automatically approved — no manual review needed.
                    All major Bangladeshi university domains are pre-configured.
                  </p>

                  {/* Add new pattern */}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end mb-6">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">Email Pattern</Label>
                      <Input placeholder="e.g. @university.edu.bd" value={newPattern} onChange={(e) => setNewPattern(e.target.value)} className="text-sm" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">Description (optional)</Label>
                      <Input placeholder="e.g. University name" value={newPatternDesc} onChange={(e) => setNewPatternDesc(e.target.value)} className="text-sm" />
                    </div>
                    <Button
                      size="sm"
                      className="gap-1.5 bg-coral-gradient text-primary-foreground hover:opacity-90"
                      disabled={!newPattern.trim()}
                      onClick={async () => {
                        const pattern = newPattern.trim();
                        if (!pattern.startsWith("@")) {
                          toast.error("Pattern must start with @ (e.g. @university.edu)");
                          return;
                        }
                        const { data, error } = await supabase
                          .from("auto_approval_patterns")
                          .insert({ pattern, description: newPatternDesc.trim() || null, created_by: user!.id } as any)
                          .select().single();
                        if (error) {
                          toast.error(error.message.includes("duplicate") ? "This pattern already exists." : "Failed: " + error.message);
                        } else {
                          setApprovalPatterns((prev) => [...prev, data as any]);
                          setNewPattern("");
                          setNewPatternDesc("");
                          toast.success(`Pattern "${pattern}" added!`);
                        }
                      }}
                    >
                      <Zap className="h-3.5 w-3.5" /> Add Rule
                    </Button>
                  </div>

                  {/* Existing patterns */}
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {approvalPatterns.length === 0 ? (
                      <div className="py-8 text-center text-muted-foreground text-sm">No auto-approval rules configured.</div>
                    ) : (
                      approvalPatterns.map((p) => (
                        <div key={p.id} className="flex items-center justify-between rounded-xl border border-border bg-secondary/30 px-4 py-2.5">
                          <div className="flex items-center gap-3">
                            <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${p.is_active ? "bg-green-100 dark:bg-green-900/30" : "bg-secondary"}`}>
                              <Mail className={`h-3.5 w-3.5 ${p.is_active ? "text-green-600" : "text-muted-foreground"}`} />
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-foreground font-mono">{p.pattern}</p>
                              {p.description && <p className="text-[10px] text-muted-foreground">{p.description}</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Badge variant="outline" className={`text-[9px] ${p.is_active ? "border-green-500/30 text-green-600" : "text-muted-foreground"}`}>
                              {p.is_active ? "Active" : "Off"}
                            </Badge>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                              onClick={async () => {
                                const { error } = await supabase.from("auto_approval_patterns").update({ is_active: !p.is_active } as any).eq("id", p.id);
                                if (!error) {
                                  setApprovalPatterns((prev) => prev.map((item) => item.id === p.id ? { ...item, is_active: !item.is_active } : item));
                                  toast.success(p.is_active ? "Rule disabled" : "Rule enabled");
                                }
                              }}
                            >
                              {p.is_active ? <Ban className="h-3 w-3" /> : <CheckCircle className="h-3 w-3" />}
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                              onClick={async () => {
                                const { error } = await supabase.from("auto_approval_patterns").delete().eq("id", p.id);
                                if (!error) {
                                  setApprovalPatterns((prev) => prev.filter((item) => item.id !== p.id));
                                  toast.success("Pattern removed");
                                }
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-secondary/20 p-4">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <strong className="text-foreground">How it works:</strong> When a tutor signs up, their email is checked against all active patterns.
                    If it matches, their profile is instantly approved. Otherwise, they enter the pending queue.
                    Students from any university can sign up freely without approval.
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Tutor Review Dialog */}
          <Dialog open={!!selectedTutor} onOpenChange={() => setSelectedTutor(null)}>
            <DialogContent className="max-w-[95vw] sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-display">Review Tutor Application</DialogTitle>
              </DialogHeader>
              {selectedTutor && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-muted-foreground">Name:</span><p className="font-medium text-foreground">{selectedTutor.profile?.full_name}</p></div>
                    <div><span className="text-muted-foreground">University:</span><p className="font-medium text-foreground">{selectedTutor.university_name || "Unknown"}</p></div>
                    <div><span className="text-muted-foreground">Department:</span><p className="font-medium text-foreground">{selectedTutor.department}</p></div>
                    <div><span className="text-muted-foreground">Session:</span><p className="font-medium text-foreground">{selectedTutor.session}</p></div>
                    <div><span className="text-muted-foreground">Fee:</span><p className="font-medium text-foreground">৳{selectedTutor.fee_expectation}/mo</p></div>
                    {selectedTutor.profile?.phone && (
                      <div><span className="text-muted-foreground">Phone:</span><p className="font-medium text-foreground">{selectedTutor.profile.phone}</p></div>
                    )}
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Subjects:</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {selectedTutor.subjects.map((s) => (<Badge key={s} variant="secondary" className="text-xs">{s}</Badge>))}
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Bio:</span>
                    <p className="mt-1 text-sm text-foreground">{selectedTutor.bio || "N/A"}</p>
                  </div>
                  {selectedTutor.cv_url && (
                    <a href={selectedTutor.cv_url} target="_blank" rel="noopener" className="flex items-center gap-2 text-sm text-primary hover:underline">
                      <FileText className="h-4 w-4" /> View CV
                    </a>
                  )}
                  <div>
                    <span className="text-sm text-muted-foreground">Admin Notes</span>
                    <Textarea className="mt-1" placeholder="Optional notes..." value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} />
                  </div>
                  <div className="flex gap-3">
                    <Button onClick={() => handleApprove(selectedTutor)} className="flex-1 gap-2 bg-green-600 text-primary-foreground hover:bg-green-700">
                      <CheckCircle className="h-4 w-4" /> Approve
                    </Button>
                    <Button onClick={() => handleReject(selectedTutor)} variant="outline" className="flex-1 gap-2 text-destructive">
                      <XCircle className="h-4 w-4" /> Reject
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Chat Viewer Dialog */}
          <Dialog open={!!selectedChat} onOpenChange={() => setSelectedChat(null)}>
            <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[80vh]">
              <DialogHeader>
                <DialogTitle className="font-display">Chat History</DialogTitle>
              </DialogHeader>
              <ScrollArea className="h-[60vh]">
                <div className="space-y-2 p-2">
                  {chatMessages.map((msg) => (
                    <div key={msg.id} className="rounded-lg bg-secondary/50 p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground">{(msg as any).sender_name}</span>
                        <span className="text-[10px] text-muted-foreground">{new Date(msg.created_at).toLocaleString()}</span>
                      </div>
                      <p className="mt-1 text-sm text-foreground">{msg.content}</p>
                      {msg.is_flagged && (<Badge className="mt-1 bg-red-100 text-red-700 text-[10px]">⚠️ Flagged</Badge>)}
                    </div>
                  ))}
                  {chatMessages.length === 0 && (<p className="text-center text-sm text-muted-foreground py-8">No messages in this conversation.</p>)}
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>
          <ContractModal
            open={!!selectedContract}
            onOpenChange={() => setSelectedContract(null)}
            contract={selectedContract}
            classroomCode={selectedClassroomCode}
          />
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
