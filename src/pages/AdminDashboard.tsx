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
  Lock, Mail, ArrowRight, Handshake,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import ContractModal from "@/components/ContractModal";


interface StudentInfo {
  user_id: string;
  full_name: string;
  phone: string | null;
  created_at: string;
  request_count: number;
  favorite_tutor?: string;
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
  const [stats, setStats] = useState({ tutors: 0, students: 0, requests: 0, deals: 0 });
  const [deals, setDeals] = useState<any[]>([]);
  const [selectedContract, setSelectedContract] = useState<any>(null);
  const [selectedClassroomCode, setSelectedClassroomCode] = useState<string | null>(null);

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
      }

      // Reports
      const { data: r } = await supabase.from("reports").select("*").order("created_at", { ascending: false });
      if (r) setReports(r as Report[]);

      // Stats
      const { count: tutorCount } = await supabase.from("tutor_profiles").select("*", { count: "exact", head: true });
      const { count: studentCount } = await supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "student");
      const { count: reqCount } = await supabase.from("tuition_requests").select("*", { count: "exact", head: true });
      const { count: dealCount } = await supabase.from("deals").select("*", { count: "exact", head: true });
      setStats({ tutors: tutorCount || 0, students: studentCount || 0, requests: reqCount || 0, deals: dealCount || 0 });

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
              tutor_university: (tutorP as any)?.university_name || "KUET",
              subject: req?.subject || "N/A",
              contract,
              signature_count: sigCount,
            };
          })
        );
        setDeals(enrichedDeals);
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

  const handleDeleteStudent = async (userId: string) => {
    await supabase.from("tuition_requests").delete().eq("student_id", userId);
    await supabase.from("profiles").delete().eq("user_id", userId);
    await supabase.from("user_roles").delete().eq("user_id", userId);
    setStudents((p) => p.filter((s) => s.user_id !== userId));
    toast.success("Student removed");
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
      case "rejected": return "bg-red-100 text-red-700";
      case "suspended": return "bg-orange-100 text-orange-700";
      default: return "bg-secondary text-secondary-foreground";
    }
  };

  const isAutoApproved = (t: TutorProfile) => {
    // Tutors created with approved status from the start (auto-approved via KUET email)
    return t.status === "approved" && t.admin_notes === null && t.created_at === t.updated_at;
  };

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
              <p className="text-xs text-muted-foreground sm:text-sm">Manage the KUET Tuition Ecosystem</p>
            </div>
          </div>

          {/* Stats */}
          <div className="mb-6 grid gap-3 grid-cols-2 sm:mb-8 sm:gap-4 lg:grid-cols-4">
            {[
              { label: "Tutors", value: stats.tutors, icon: GraduationCap, color: "text-coral" },
              { label: "Students", value: stats.students, icon: Users, color: "text-blue-500" },
              { label: "Requests", value: stats.requests, icon: MessageCircle, color: "text-gold" },
              { label: "Deals", value: stats.deals, icon: CheckCircle, color: "text-green-500" },
            ].map((stat) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground sm:text-sm">{stat.label}</span>
                  <stat.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${stat.color}`} />
                </div>
                <p className="mt-1 font-display text-2xl font-bold text-foreground sm:mt-2 sm:text-3xl">{stat.value}</p>
              </motion.div>
            ))}
          </div>

          <Tabs defaultValue="pending">
            <TabsList className="mb-4 flex-wrap sm:mb-6">
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
                <Handshake className="h-3.5 w-3.5" /> Deals ({deals.length})
              </TabsTrigger>
              <TabsTrigger value="reports" className="gap-1 text-xs sm:gap-2 sm:text-sm">
                <AlertTriangle className="h-3.5 w-3.5" /> Reports
              </TabsTrigger>
            </TabsList>

            {/* Pending Tutors */}
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
                            <p className="text-xs text-muted-foreground">{tutor.department} • {tutor.session}</p>
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

            {/* All Tutors */}
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
                          {tutor.department} • {tutor.session}
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
                      <Button size="sm" variant="outline" className="text-xs text-destructive hover:bg-destructive/10" onClick={() => handleDeleteTutor(tutor)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
                {allTutors.length === 0 && <p className="py-12 text-center text-muted-foreground">No tutors registered yet.</p>}
              </div>
            </TabsContent>

            {/* Students */}
            <TabsContent value="students">
              <div className="space-y-3">
                {students.map((student) => (
                  <div key={student.user_id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3 shadow-card sm:p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary sm:h-10 sm:w-10">
                        <Users className="h-3.5 w-3.5 text-muted-foreground sm:h-4 sm:w-4" />
                      </div>
                      <div>
                        <span className="text-sm font-medium text-foreground">{student.full_name}</span>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground sm:text-xs">
                          <span>{student.request_count} requests</span>
                          {student.phone && (
                            <span className="flex items-center gap-0.5"><Phone className="h-2.5 w-2.5" />{student.phone}</span>
                          )}
                          {student.favorite_tutor && (
                            <span className="flex items-center gap-0.5"><Heart className="h-2.5 w-2.5 fill-coral text-coral" />{student.favorite_tutor}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="text-xs text-destructive hover:bg-destructive/10" onClick={() => handleDeleteStudent(student.user_id)}>
                      <Trash2 className="mr-1 h-3 w-3" /> Remove
                    </Button>
                  </div>
                ))}
                {students.length === 0 && <p className="py-12 text-center text-muted-foreground">No students yet.</p>}
              </div>
            </TabsContent>

            {/* Requests + Chats */}
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
                          {req.subject} • {req.class_level} • ৳{req.budget}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`text-[10px] sm:text-xs ${statusColor(req.status)}`}>{req.status}</Badge>
                        {req.status === "accepted" && (
                          <Button size="sm" variant="outline" onClick={() => viewChat(req)} className="text-xs">
                            <Eye className="mr-1 h-3 w-3" /> Chat
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {requests.length === 0 && <p className="py-12 text-center text-muted-foreground">No requests yet.</p>}
              </div>
            </TabsContent>

            {/* Deals */}
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
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {deal.tutor_university} • {deal.tutor_department} • 📚 {deal.subject}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {new Date(deal.created_at).toLocaleString()} • Signatures: {deal.signature_count}/2
                          </p>
                        </div>
                        {deal.contract && (
                          <Button size="sm" variant="outline" className="text-xs gap-1"
                            onClick={() => { setSelectedContract(deal.contract); setSelectedClassroomCode(deal.classroom_code); }}>
                            <FileText className="h-3 w-3" /> Contract
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            {/* Reports */}
            <TabsContent value="reports">
              <div className="space-y-3">
                {reports.map((report) => (
                  <div key={report.id} className="rounded-xl border border-border bg-card p-3 shadow-card sm:p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-foreground sm:text-sm">{report.reason}</p>
                        <p className="mt-1 text-[10px] text-muted-foreground sm:text-xs">{report.details}</p>
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
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
