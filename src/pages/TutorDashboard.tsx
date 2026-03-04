import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { TutorProfile, Profile, TuitionRequest } from "@/types/database";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  GraduationCap, Edit3, MapPin, BookOpen, Star, Calendar, Phone,
  MessageCircle, Users, Heart, Check, X, Save, Plus, Trash2,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Navigate, Link } from "react-router-dom";

const TutorDashboard = () => {
  const { user, role, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tutor, setTutor] = useState<TutorProfile | null>(null);
  const [requests, setRequests] = useState<(TuitionRequest & { student_name_resolved?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit form state
  const [editBio, setEditBio] = useState("");
  const [editFee, setEditFee] = useState("");
  const [editExperience, setEditExperience] = useState("");
  const [editSubjects, setEditSubjects] = useState<string[]>([]);
  const [editAreas, setEditAreas] = useState<string[]>([]);
  const [newSubject, setNewSubject] = useState("");
  const [newArea, setNewArea] = useState("");

  useEffect(() => {
    if (!user || role !== "tutor") return;
    const fetch = async () => {
      const { data: p } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
      if (p) setProfile(p as Profile);

      const { data: t } = await supabase.from("tutor_profiles").select("*").eq("user_id", user.id).single();
      if (t) {
        setTutor(t as TutorProfile);
        setEditBio(t.bio || "");
        setEditFee(String(t.fee_expectation || ""));
        setEditExperience(t.experience || "");
        setEditSubjects(t.subjects || []);
        setEditAreas(t.preferred_areas || []);
      }

      const { data: reqs } = await supabase
        .from("tuition_requests").select("*").eq("tutor_id", user.id)
        .order("created_at", { ascending: false });
      if (reqs) {
        const enriched = await Promise.all(
          (reqs as TuitionRequest[]).map(async (r) => {
            const { data: sp } = await supabase.from("profiles").select("full_name").eq("user_id", r.student_id).single();
            return { ...r, student_name_resolved: sp?.full_name || "Unknown" };
          })
        );
        setRequests(enriched);
      }
      setLoading(false);
    };
    fetch();
  }, [user, role]);

  const handleSaveProfile = async () => {
    if (!tutor) return;
    setSaving(true);
    const { error } = await supabase.from("tutor_profiles").update({
      bio: editBio.trim() || null,
      fee_expectation: parseInt(editFee) || 0,
      experience: editExperience.trim() || null,
      subjects: editSubjects,
      preferred_areas: editAreas,
    } as any).eq("id", tutor.id);
    setSaving(false);
    if (error) { toast.error("Failed to save: " + error.message); }
    else {
      toast.success("Profile updated!");
      setTutor({ ...tutor, bio: editBio, fee_expectation: parseInt(editFee) || 0, experience: editExperience, subjects: editSubjects, preferred_areas: editAreas });
      setEditOpen(false);
    }
  };

  const handleAccept = async (req: TuitionRequest) => {
    const { error } = await supabase.from("tuition_requests").update({ status: "accepted" } as any).eq("id", req.id);
    if (!error) { toast.success("Request accepted!"); setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: "accepted" } : r)); }
  };

  const handleReject = async (req: TuitionRequest) => {
    const { error } = await supabase.from("tuition_requests").update({ status: "rejected" } as any).eq("id", req.id);
    if (!error) { toast.success("Request rejected"); setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: "rejected" } : r)); }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen"><Navbar />
        <div className="flex min-h-[60vh] items-center justify-center pt-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!user || role !== "tutor") return <Navigate to="/" />;

  const pendingCount = requests.filter(r => r.status === "pending").length;
  const acceptedCount = requests.filter(r => r.status === "accepted").length;

  const statusColor = (s: string) => {
    switch (s) {
      case "accepted": return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";
      case "pending": return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
      case "rejected": return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300";
      default: return "bg-secondary text-secondary-foreground";
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="pt-16">
        {/* Profile Header - Instagram style */}
        <div className="border-b border-border bg-card">
          <div className="container py-6 px-4 sm:py-8">
            <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start sm:gap-8">
              {/* Avatar */}
              <div className="relative">
                <div className="h-20 w-20 overflow-hidden rounded-full border-[3px] border-primary/30 sm:h-28 sm:w-28">
                  {tutor?.photo_url ? (
                    <img src={tutor.photo_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-secondary">
                      <GraduationCap className="h-8 w-8 text-muted-foreground sm:h-10 sm:w-10" />
                    </div>
                  )}
                </div>
                {tutor?.status === "approved" && (
                  <div className="absolute -bottom-1 -right-1 rounded-full bg-emerald-500 p-1">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 text-center sm:text-left">
                <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-start sm:gap-4">
                  <h1 className="font-display text-xl font-bold text-foreground sm:text-2xl">
                    {profile?.full_name || "Tutor"}
                  </h1>
                  <Dialog open={editOpen} onOpenChange={setEditOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                        <Edit3 className="h-3.5 w-3.5" /> Edit Profile
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[85vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="font-display">Edit Your Profile</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-2">
                        <div className="space-y-2">
                          <Label>Bio / About</Label>
                          <Textarea placeholder="Tell students about yourself..." value={editBio} onChange={e => setEditBio(e.target.value)} className="min-h-[80px]" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Fee (৳/month)</Label>
                            <Input type="number" placeholder="3000" value={editFee} onChange={e => setEditFee(e.target.value)} />
                          </div>
                          <div className="space-y-2">
                            <Label>Experience</Label>
                            <Input placeholder="2 years" value={editExperience} onChange={e => setEditExperience(e.target.value)} />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Subjects</Label>
                          <div className="flex flex-wrap gap-1.5">
                            {editSubjects.map(s => (
                              <Badge key={s} className="gap-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-0">
                                {s}
                                <button onClick={() => setEditSubjects(prev => prev.filter(x => x !== s))} className="ml-0.5 hover:text-destructive">
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <Input placeholder="Add subject" value={newSubject} onChange={e => setNewSubject(e.target.value)} className="text-sm" />
                            <Button size="sm" variant="outline" onClick={() => { if (newSubject.trim() && !editSubjects.includes(newSubject.trim())) { setEditSubjects(prev => [...prev, newSubject.trim()]); setNewSubject(""); } }}>
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Preferred Areas</Label>
                          <div className="flex flex-wrap gap-1.5">
                            {editAreas.map(a => (
                              <Badge key={a} className="gap-1 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-0">
                                {a}
                                <button onClick={() => setEditAreas(prev => prev.filter(x => x !== a))} className="ml-0.5 hover:text-destructive">
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <Input placeholder="Add area" value={newArea} onChange={e => setNewArea(e.target.value)} className="text-sm" />
                            <Button size="sm" variant="outline" onClick={() => { if (newArea.trim() && !editAreas.includes(newArea.trim())) { setEditAreas(prev => [...prev, newArea.trim()]); setNewArea(""); } }}>
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                        <Button onClick={handleSaveProfile} disabled={saving} className="w-full gap-2 bg-coral-gradient text-primary-foreground">
                          <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Changes"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <p className="mt-1 text-sm text-muted-foreground">
                  {tutor?.department} • Session {tutor?.session}
                  {profile?.phone && <span> • <Phone className="inline h-3 w-3" /> {profile.phone}</span>}
                </p>

                {tutor?.status === "pending" && (
                  <Badge className="mt-2 bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-0">
                    ⏳ Pending Admin Approval
                  </Badge>
                )}

                {tutor?.bio && (
                  <p className="mt-3 max-w-lg text-sm text-foreground leading-relaxed">{tutor.bio}</p>
                )}

                {/* Stats row - Instagram style */}
                <div className="mt-4 flex justify-center gap-8 border-t border-border pt-4 sm:justify-start">
                  <div className="text-center">
                    <p className="font-display text-lg font-bold text-foreground">{requests.length}</p>
                    <p className="text-xs text-muted-foreground">Requests</p>
                  </div>
                  <div className="text-center">
                    <p className="font-display text-lg font-bold text-foreground">{tutor?.total_reviews || 0}</p>
                    <p className="text-xs text-muted-foreground">Reviews</p>
                  </div>
                  <div className="text-center">
                    <p className="font-display text-lg font-bold text-foreground">{tutor?.rating || 0}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-0.5"><Star className="h-3 w-3 fill-amber-400 text-amber-400" />Rating</p>
                  </div>
                  <div className="text-center">
                    <p className="font-display text-lg font-bold text-foreground">৳{(tutor?.fee_expectation || 0).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Fee/mo</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Tabs */}
        <div className="container py-6 px-4">
          <Tabs defaultValue="details">
            <TabsList className="mb-4">
              <TabsTrigger value="details" className="gap-1.5 text-xs sm:text-sm">
                <BookOpen className="h-3.5 w-3.5" /> Details
              </TabsTrigger>
              <TabsTrigger value="requests" className="gap-1.5 text-xs sm:text-sm">
                <MessageCircle className="h-3.5 w-3.5" /> Requests
                {pendingCount > 0 && <span className="ml-1 rounded-full bg-destructive px-1.5 py-0.5 text-[10px] text-destructive-foreground">{pendingCount}</span>}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details">
              <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
                {/* Subjects */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border-l-4 border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 shadow-card sm:p-6">
                  <h3 className="font-display text-base font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" /> Subjects I Teach
                  </h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(tutor?.subjects || []).length > 0 ? tutor!.subjects.map(s => (
                      <Badge key={s} className="rounded-full px-3 py-1 text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-0">
                        <BookOpen className="mr-1 h-3 w-3" /> {s}
                      </Badge>
                    )) : <p className="text-sm text-muted-foreground">No subjects added yet. Click Edit Profile to add.</p>}
                  </div>
                </motion.div>

                {/* Preferred Areas */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-2xl border-l-4 border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 p-4 shadow-card sm:p-6">
                  <h3 className="font-display text-base font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-blue-500" /> Preferred Areas
                  </h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(tutor?.preferred_areas || []).length > 0 ? tutor!.preferred_areas.map(a => (
                      <Badge key={a} className="rounded-full px-3 py-1 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-0">
                        <MapPin className="mr-1 h-3 w-3" /> {a}
                      </Badge>
                    )) : <p className="text-sm text-muted-foreground">No areas added yet.</p>}
                  </div>
                </motion.div>
              </div>
            </TabsContent>

            <TabsContent value="requests">
              <div className="space-y-3">
                {requests.length === 0 ? (
                  <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-card">
                    <Users className="mx-auto h-10 w-10 text-muted-foreground" />
                    <p className="mt-3 font-display text-base font-semibold text-foreground">No requests yet</p>
                    <p className="mt-1 text-sm text-muted-foreground">Students will send you interest requests when they find your profile.</p>
                  </div>
                ) : (
                  requests.map(req => (
                    <motion.div key={req.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl border border-border bg-card p-4 shadow-card"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-foreground">{req.student_name_resolved}</span>
                            <Badge className={`text-[10px] ${statusColor(req.status)}`}>{req.status}</Badge>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {req.subject && <span>📚 {req.subject}</span>}
                            {req.class_level && <span> • 🎓 {req.class_level}</span>}
                            {req.budget && <span> • ৳{req.budget}/mo</span>}
                            {req.area && <span> • 📍 {req.area}</span>}
                          </p>
                          {req.message && <p className="mt-2 text-sm text-foreground bg-secondary/50 rounded-lg p-2">{req.message}</p>}
                        </div>
                        {req.status === "pending" && (
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleAccept(req)} className="gap-1 bg-emerald-600 text-white hover:bg-emerald-700 text-xs">
                              <Check className="h-3 w-3" /> Accept
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleReject(req)} className="gap-1 text-destructive text-xs">
                              <X className="h-3 w-3" /> Reject
                            </Button>
                          </div>
                        )}
                        {req.status === "accepted" && (
                          <Link to="/messages">
                            <Button size="sm" variant="outline" className="gap-1 text-xs">
                              <MessageCircle className="h-3 w-3" /> Chat
                            </Button>
                          </Link>
                        )}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default TutorDashboard;
