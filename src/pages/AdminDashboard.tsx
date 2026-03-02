import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { TutorProfile, Profile, TuitionRequest, Deal, Report } from "@/types/database";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Shield,
  Users,
  CheckCircle,
  XCircle,
  Eye,
  BarChart3,
  AlertTriangle,
  MessageCircle,
  Ban,
  FileText,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Navigate } from "react-router-dom";

const AdminDashboard = () => {
  const { user, role, loading: authLoading } = useAuth();
  const [pendingTutors, setPendingTutors] = useState<(TutorProfile & { profile?: Profile })[]>([]);
  const [allTutors, setAllTutors] = useState<(TutorProfile & { profile?: Profile })[]>([]);
  const [requests, setRequests] = useState<TuitionRequest[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedTutor, setSelectedTutor] = useState<(TutorProfile & { profile?: Profile }) | null>(null);
  const [adminNotes, setAdminNotes] = useState("");

  // Stats
  const [stats, setStats] = useState({ tutors: 0, students: 0, requests: 0, deals: 0 });

  useEffect(() => {
    if (role !== "admin") return;

    const fetchAll = async () => {
      // Pending tutors
      const { data: pending } = await supabase
        .from("tutor_profiles")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

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

      // Requests
      const { data: reqs } = await supabase.from("tuition_requests").select("*").order("created_at", { ascending: false });
      if (reqs) setRequests(reqs as TuitionRequest[]);

      // Deals
      const { data: d } = await supabase.from("deals").select("*").order("created_at", { ascending: false });
      if (d) setDeals(d as Deal[]);

      // Reports
      const { data: r } = await supabase.from("reports").select("*").order("created_at", { ascending: false });
      if (r) setReports(r as Report[]);

      // Stats
      const { count: tutorCount } = await supabase.from("tutor_profiles").select("*", { count: "exact", head: true });
      const { count: studentCount } = await supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "student");
      const { count: reqCount } = await supabase.from("tuition_requests").select("*", { count: "exact", head: true });
      const { count: dealCount } = await supabase.from("deals").select("*", { count: "exact", head: true });

      setStats({
        tutors: tutorCount || 0,
        students: studentCount || 0,
        requests: reqCount || 0,
        deals: dealCount || 0,
      });
    };

    fetchAll();
  }, [role]);

  const handleApprove = async (tutor: TutorProfile) => {
    const { error } = await supabase
      .from("tutor_profiles")
      .update({ status: "approved", admin_notes: adminNotes || null } as any)
      .eq("id", tutor.id);
    if (error) {
      toast.error("Failed: " + error.message);
    } else {
      toast.success("Tutor approved!");
      setPendingTutors((prev) => prev.filter((t) => t.id !== tutor.id));
      setSelectedTutor(null);
      setAdminNotes("");
    }
  };

  const handleReject = async (tutor: TutorProfile) => {
    const { error } = await supabase
      .from("tutor_profiles")
      .update({ status: "rejected", admin_notes: adminNotes || null } as any)
      .eq("id", tutor.id);
    if (error) {
      toast.error("Failed: " + error.message);
    } else {
      toast.success("Tutor rejected");
      setPendingTutors((prev) => prev.filter((t) => t.id !== tutor.id));
      setSelectedTutor(null);
      setAdminNotes("");
    }
  };

  const handleSuspend = async (tutor: TutorProfile) => {
    const { error } = await supabase
      .from("tutor_profiles")
      .update({ status: "suspended" } as any)
      .eq("id", tutor.id);
    if (!error) {
      toast.success("Tutor suspended");
      setAllTutors((prev) => prev.map((t) => (t.id === tutor.id ? { ...t, status: "suspended" as const } : t)));
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex min-h-[60vh] items-center justify-center pt-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!user || role !== "admin") return <Navigate to="/" />;

  const statusColor = (s: string) => {
    switch (s) {
      case "approved": return "bg-green-100 text-green-700";
      case "pending": return "bg-yellow-100 text-yellow-700";
      case "rejected": return "bg-red-100 text-red-700";
      case "suspended": return "bg-orange-100 text-orange-700";
      default: return "bg-secondary text-secondary-foreground";
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="pt-16">
        <div className="container py-8">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-coral-gradient">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground">Manage the KUET Tuition Ecosystem</p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Total Tutors", value: stats.tutors, icon: Users, color: "text-coral" },
              { label: "Students", value: stats.students, icon: Users, color: "text-blue-500" },
              { label: "Requests", value: stats.requests, icon: MessageCircle, color: "text-gold" },
              { label: "Deals", value: stats.deals, icon: CheckCircle, color: "text-green-500" },
            ].map((stat) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-border bg-card p-5 shadow-card"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{stat.label}</span>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <p className="mt-2 font-display text-3xl font-bold text-foreground">{stat.value}</p>
              </motion.div>
            ))}
          </div>

          {/* Tabs */}
          <Tabs defaultValue="pending">
            <TabsList className="mb-6">
              <TabsTrigger value="pending" className="gap-2">
                <AlertTriangle className="h-4 w-4" />
                Pending ({pendingTutors.length})
              </TabsTrigger>
              <TabsTrigger value="tutors" className="gap-2">
                <Users className="h-4 w-4" />
                All Tutors
              </TabsTrigger>
              <TabsTrigger value="requests" className="gap-2">
                <MessageCircle className="h-4 w-4" />
                Requests
              </TabsTrigger>
              <TabsTrigger value="reports" className="gap-2">
                <AlertTriangle className="h-4 w-4" />
                Reports
              </TabsTrigger>
            </TabsList>

            {/* Pending Tutors */}
            <TabsContent value="pending">
              <div className="space-y-4">
                {pendingTutors.length === 0 ? (
                  <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-card">
                    <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
                    <p className="mt-4 font-display text-lg font-semibold text-foreground">All caught up!</p>
                    <p className="mt-1 text-sm text-muted-foreground">No pending tutor approvals.</p>
                  </div>
                ) : (
                  pendingTutors.map((tutor) => (
                    <div key={tutor.id} className="rounded-2xl border border-border bg-card p-5 shadow-card">
                      <div className="flex items-start justify-between">
                        <div className="flex gap-4">
                          {tutor.photo_url ? (
                            <img src={tutor.photo_url} alt="" className="h-16 w-16 rounded-xl object-cover" />
                          ) : (
                            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-secondary">
                              <Users className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <h3 className="font-display font-semibold text-foreground">
                              {tutor.profile?.full_name || "Unknown"}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {tutor.department} • {tutor.session}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-1">
                              {tutor.subjects.map((s) => (
                                <Badge key={s} variant="secondary" className="text-xs">
                                  {s}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedTutor(tutor);
                              setAdminNotes("");
                            }}
                          >
                            <Eye className="mr-1 h-3 w-3" /> Review
                          </Button>
                        </div>
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
                  <div key={tutor.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-card">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                        <Users className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <span className="font-medium text-foreground">{tutor.profile?.full_name}</span>
                        <p className="text-xs text-muted-foreground">{tutor.department} • ৳{tutor.fee_expectation}/mo</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`text-xs ${statusColor(tutor.status)}`}>{tutor.status}</Badge>
                      {tutor.status === "approved" && (
                        <Button size="sm" variant="outline" onClick={() => handleSuspend(tutor)}>
                          <Ban className="mr-1 h-3 w-3" /> Suspend
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {allTutors.length === 0 && (
                  <p className="py-12 text-center text-muted-foreground">No tutors registered yet.</p>
                )}
              </div>
            </TabsContent>

            {/* Requests */}
            <TabsContent value="requests">
              <div className="space-y-3">
                {requests.map((req) => (
                  <div key={req.id} className="rounded-xl border border-border bg-card p-4 shadow-card">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {req.subject} • {req.class_level}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Budget: ৳{req.budget} • Area: {req.area}
                        </p>
                      </div>
                      <Badge className={`text-xs ${statusColor(req.status)}`}>{req.status}</Badge>
                    </div>
                  </div>
                ))}
                {requests.length === 0 && (
                  <p className="py-12 text-center text-muted-foreground">No requests yet.</p>
                )}
              </div>
            </TabsContent>

            {/* Reports */}
            <TabsContent value="reports">
              <div className="space-y-3">
                {reports.map((report) => (
                  <div key={report.id} className="rounded-xl border border-border bg-card p-4 shadow-card">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">{report.reason}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{report.details}</p>
                      </div>
                      <Badge className={`text-xs ${report.status === "open" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                        {report.status}
                      </Badge>
                    </div>
                  </div>
                ))}
                {reports.length === 0 && (
                  <p className="py-12 text-center text-muted-foreground">No reports filed.</p>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* Review Dialog */}
          <Dialog open={!!selectedTutor} onOpenChange={() => setSelectedTutor(null)}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-display">Review Tutor Application</DialogTitle>
              </DialogHeader>
              {selectedTutor && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Name:</span>
                      <p className="font-medium text-foreground">{selectedTutor.profile?.full_name}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Department:</span>
                      <p className="font-medium text-foreground">{selectedTutor.department}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Session:</span>
                      <p className="font-medium text-foreground">{selectedTutor.session}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Fee:</span>
                      <p className="font-medium text-foreground">৳{selectedTutor.fee_expectation}/mo</p>
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Subjects:</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {selectedTutor.subjects.map((s) => (
                        <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                      ))}
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
                    <Textarea
                      className="mt-1"
                      placeholder="Optional notes..."
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={() => handleApprove(selectedTutor)}
                      className="flex-1 gap-2 bg-green-600 text-primary-foreground hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4" /> Approve
                    </Button>
                    <Button
                      onClick={() => handleReject(selectedTutor)}
                      variant="outline"
                      className="flex-1 gap-2 text-destructive"
                    >
                      <XCircle className="h-4 w-4" /> Reject
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
