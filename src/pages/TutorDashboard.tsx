import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { TutorProfile, Profile, TuitionRequest, Review, Notification, getProfileCompletion } from "@/types/database";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  GraduationCap, Edit3, BookOpen, Star, Phone,
  MessageCircle, Users, Check, X, Save, Plus, Camera,
  LayoutDashboard, Inbox, Bell, Video, Upload, Trash2, AlertCircle,
  Award, ChevronRight, Eye, Clock, Wifi, CreditCard,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Navigate, Link } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";

type TabKey = "home" | "requests" | "notifications" | "reviews" | "demo_views";

const TutorDashboard = () => {
  const { user, role, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tutor, setTutor] = useState<TutorProfile | null>(null);
  const [requests, setRequests] = useState<(TuitionRequest & { student_name_resolved?: string })[]>([]);
  const [reviews, setReviews] = useState<(Review & { profile?: Profile })[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [demoViews, setDemoViews] = useState<{ id: string; student_name: string; watched_at: string; completed: boolean; rating: number | null; comment: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingIdCard, setUploadingIdCard] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("home");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const idCardInputRef = useRef<HTMLInputElement>(null);

  const [editBio, setEditBio] = useState("");
  const [editFee, setEditFee] = useState("");
  const [editExperience, setEditExperience] = useState("");
  const [editSubjects, setEditSubjects] = useState<string[]>([]);
  const [newSubject, setNewSubject] = useState("");

  useEffect(() => {
    if (!user || role !== "tutor") return;
    const fetchData = async () => {
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

      const { data: revs } = await supabase
        .from("reviews").select("*").eq("tutor_id", user.id)
        .order("created_at", { ascending: false });
      if (revs) {
        const enrichedRevs = await Promise.all(
          (revs as Review[]).map(async (r) => {
            const { data: rp } = await supabase.from("profiles").select("*").eq("user_id", r.student_id).single();
            return { ...r, profile: rp as Profile };
          })
        );
        setReviews(enrichedRevs);
      }

      const { data: notifs } = await supabase
        .from("notifications").select("*").eq("user_id", user.id)
        .order("created_at", { ascending: false }).limit(50);
      if (notifs) setNotifications(notifs as Notification[]);

      // Fetch demo video views
      const { data: dv } = await supabase
        .from("demo_video_views").select("*").eq("tutor_id", user.id)
        .order("watched_at", { ascending: false });
      if (dv) {
        const enrichedDv = await Promise.all(
          (dv as any[]).map(async (v) => {
            const { data: sp } = await supabase.from("profiles").select("full_name").eq("user_id", v.student_id).single();
            return { id: v.id, student_name: sp?.full_name || "Unknown", watched_at: v.watched_at, completed: v.completed, rating: v.rating, comment: v.comment };
          })
        );
        setDemoViews(enrichedDv);
      }

      setLoading(false);
    };
    fetchData();
  }, [user, role]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("tutor-notifications")
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "notifications",
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        setNotifications((prev) => [payload.new as Notification, ...prev]);
        toast.info((payload.new as any).title);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !tutor) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be less than 5MB"); return; }
    setUploadingPhoto(true);
    const ext = file.name.split(".").pop();
    const filePath = `${user.id}/profile.${ext}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true });
    if (uploadError) { toast.error("Upload failed: " + uploadError.message); setUploadingPhoto(false); return; }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
    const photoUrl = urlData.publicUrl + "?t=" + Date.now();
    const { error: updateError } = await supabase.from("tutor_profiles").update({ photo_url: photoUrl } as any).eq("id", tutor.id);
    setUploadingPhoto(false);
    if (updateError) { toast.error("Failed to update profile photo"); }
    else { setTutor({ ...tutor, photo_url: photoUrl }); toast.success("Profile photo updated!"); }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !tutor) return;
    if (!file.type.startsWith("video/")) { toast.error("Please select a video file"); return; }
    if (file.size > 100 * 1024 * 1024) { toast.error("Video must be under 100MB"); return; }
    const video = document.createElement("video");
    video.preload = "metadata";
    const durationPromise = new Promise<number>((resolve) => {
      video.onloadedmetadata = () => { resolve(video.duration); URL.revokeObjectURL(video.src); };
      video.onerror = () => resolve(0);
    });
    video.src = URL.createObjectURL(file);
    const duration = await durationPromise;
    if (duration > 310) { toast.error("Video must be 5 minutes or less"); return; }
    setUploadingVideo(true);
    if (tutor.demo_video_url) {
      const oldPath = tutor.demo_video_url.split("/demo-videos/")[1]?.split("?")[0];
      if (oldPath) await supabase.storage.from("demo-videos").remove([decodeURIComponent(oldPath)]);
    }
    const ext = file.name.split(".").pop();
    const filePath = `${user.id}/demo.${ext}`;
    const { error: uploadError } = await supabase.storage.from("demo-videos").upload(filePath, file, { upsert: true });
    if (uploadError) { toast.error("Upload failed: " + uploadError.message); setUploadingVideo(false); return; }
    const { data: urlData } = supabase.storage.from("demo-videos").getPublicUrl(filePath);
    const videoUrl = urlData.publicUrl + "?t=" + Date.now();
    const { error: updateError } = await supabase.from("tutor_profiles").update({ demo_video_url: videoUrl } as any).eq("id", tutor.id);
    setUploadingVideo(false);
    if (updateError) { toast.error("Failed to save video URL"); }
    else { setTutor({ ...tutor, demo_video_url: videoUrl }); toast.success("Demo video uploaded!"); }
    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  const handleDeleteVideo = async () => {
    if (!tutor || !tutor.demo_video_url || !user) return;
    const oldPath = tutor.demo_video_url.split("/demo-videos/")[1]?.split("?")[0];
    if (oldPath) await supabase.storage.from("demo-videos").remove([decodeURIComponent(oldPath)]);
    await supabase.from("tutor_profiles").update({ demo_video_url: null } as any).eq("id", tutor.id);
    setTutor({ ...tutor, demo_video_url: null });
    toast.success("Demo video removed");
  };

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

  const markNotificationRead = async (notifId: string) => {
    await supabase.from("notifications").update({ is_read: true } as any).eq("id", notifId);
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, is_read: true } : n));
  };

  const markAllRead = async () => {
    if (!user) return;
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from("notifications").update({ is_read: true } as any).in("id", unreadIds);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    toast.success("All notifications marked as read");
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex min-h-[80vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user || role !== "tutor") return <Navigate to="/" />;

  const pendingCount = requests.filter(r => r.status === "pending").length;
  const acceptedCount = requests.filter(r => r.status === "accepted").length;
  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : (tutor?.rating || 0);
  const completion = getProfileCompletion(tutor);
  const unreadNotifs = notifications.filter(n => !n.is_read).length;

  const statusColor = (s: string) => {
    switch (s) {
      case "accepted": return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";
      case "pending": return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
      case "rejected": return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300";
      default: return "bg-secondary text-secondary-foreground";
    }
  };

  const bottomTabs: { key: TabKey; label: string; icon: typeof LayoutDashboard; badge?: number }[] = [
    { key: "home", label: "Home", icon: LayoutDashboard },
    { key: "requests", label: "Requests", icon: Inbox, badge: pendingCount },
    { key: "demo_views", label: "Demo", icon: Eye, badge: demoViews.filter(d => !d.completed).length || undefined },
    { key: "notifications", label: "Alerts", icon: Bell, badge: unreadNotifs },
    { key: "reviews", label: "Reviews", icon: Star },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
      <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} />

      {/* Scrollable content */}
      <div className="pt-16">
        <AnimatePresence mode="wait">
          {activeTab === "home" && (
            <motion.div key="home" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}>
              {/* Profile Card — Material style */}
              <div className="bg-card border-b border-border">
                <div className="px-4 py-5 sm:px-6 sm:py-6">
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <button onClick={() => fileInputRef.current?.click()} disabled={uploadingPhoto} className="group relative h-16 w-16 overflow-hidden rounded-2xl ring-2 ring-primary/20 sm:h-20 sm:w-20">
                        {tutor?.photo_url ? (
                          <img src={tutor.photo_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-secondary">
                            <GraduationCap className="h-7 w-7 text-muted-foreground" />
                          </div>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center bg-foreground/0 opacity-0 transition-all group-hover:bg-foreground/40 group-hover:opacity-100 rounded-2xl">
                          <Camera className="h-5 w-5 text-primary-foreground" />
                        </div>
                      </button>
                      {tutor?.status === "approved" && (
                        <div className="absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-card bg-emerald-500 p-0.5">
                          <Check className="h-2.5 w-2.5 text-primary-foreground" />
                        </div>
                      )}
                      {uploadingPhoto && (
                        <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-foreground/30">
                          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                        </div>
                      )}
                    </div>

                    {/* Name & Meta */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h1 className="font-display text-lg font-bold text-foreground truncate sm:text-xl">
                          {profile?.full_name || "Tutor"}
                        </h1>
                        {tutor?.status === "pending" && (
                          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-0 text-[9px] shrink-0">
                            Pending
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {tutor?.department} • Session {tutor?.session}
                        {profile?.phone && <span className="ml-1">• <Phone className="inline h-2.5 w-2.5" /> {profile.phone}</span>}
                      </p>
                      <div className="mt-2 flex gap-2">
                        <Dialog open={editOpen} onOpenChange={setEditOpen}>
                          <DialogTrigger asChild>
                            <Button size="sm" className="h-7 gap-1 text-[11px] bg-coral-gradient text-primary-foreground rounded-full px-3">
                              <Edit3 className="h-3 w-3" /> Edit Profile
                            </Button>
                          </DialogTrigger>
                          {/* Edit Dialog */}
                          <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[85vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle className="font-display">Edit Your Profile</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 pt-2">
                              <div className="flex items-center gap-4">
                                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl ring-2 ring-border">
                                  {tutor?.photo_url ? (
                                    <img src={tutor.photo_url} alt="" className="h-full w-full object-cover" />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center bg-secondary">
                                      <GraduationCap className="h-6 w-6 text-muted-foreground" />
                                    </div>
                                  )}
                                </div>
                                <Button variant="link" size="sm" className="text-primary text-xs font-semibold" onClick={() => fileInputRef.current?.click()}>
                                  Change Photo
                                </Button>
                              </div>
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
                                      <button onClick={() => setEditSubjects(prev => prev.filter(x => x !== s))} className="ml-0.5 hover:text-destructive"><X className="h-3 w-3" /></button>
                                    </Badge>
                                  ))}
                                </div>
                                <div className="flex gap-2">
                                  <Input placeholder="Add subject" value={newSubject} onChange={e => setNewSubject(e.target.value)} className="text-sm"
                                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); if (newSubject.trim() && !editSubjects.includes(newSubject.trim())) { setEditSubjects(prev => [...prev, newSubject.trim()]); setNewSubject(""); } } }}
                                  />
                                  <Button size="sm" variant="outline" onClick={() => { if (newSubject.trim() && !editSubjects.includes(newSubject.trim())) { setEditSubjects(prev => [...prev, newSubject.trim()]); setNewSubject(""); } }}><Plus className="h-3.5 w-3.5" /></Button>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label>Preferred Areas</Label>
                                <div className="flex flex-wrap gap-1.5">
                                  {editAreas.map(a => (
                                    <Badge key={a} className="gap-1 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-0">
                                      {a}
                                      <button onClick={() => setEditAreas(prev => prev.filter(x => x !== a))} className="ml-0.5 hover:text-destructive"><X className="h-3 w-3" /></button>
                                    </Badge>
                                  ))}
                                </div>
                                <div className="flex gap-2">
                                  <Input placeholder="Add area" value={newArea} onChange={e => setNewArea(e.target.value)} className="text-sm"
                                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); if (newArea.trim() && !editAreas.includes(newArea.trim())) { setEditAreas(prev => [...prev, newArea.trim()]); setNewArea(""); } } }}
                                  />
                                  <Button size="sm" variant="outline" onClick={() => { if (newArea.trim() && !editAreas.includes(newArea.trim())) { setEditAreas(prev => [...prev, newArea.trim()]); setNewArea(""); } }}><Plus className="h-3.5 w-3.5" /></Button>
                                </div>
                              </div>
                              <Button onClick={handleSaveProfile} disabled={saving} className="w-full gap-2 bg-coral-gradient text-primary-foreground rounded-full">
                                <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Changes"}
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Link to="/messages">
                          <Button size="sm" variant="outline" className="h-7 gap-1 text-[11px] rounded-full px-3">
                            <MessageCircle className="h-3 w-3" /> Messages
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>

                  {/* Profile Completion */}
                  {completion.percentage < 100 && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" /> Complete Your Profile
                        </span>
                        <span className="text-xs font-bold text-amber-700 dark:text-amber-400">{completion.percentage}%</span>
                      </div>
                      <Progress value={completion.percentage} className="h-1.5" />
                      <div className="mt-2 flex flex-wrap gap-1">
                        {completion.missing.map(m => (
                          <Badge key={m} variant="outline" className="text-[9px] px-1.5 py-0 border-amber-300 text-amber-600 dark:border-amber-700 dark:text-amber-400 rounded-full">
                            {m}
                          </Badge>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>

              <div className="px-4 py-4 sm:px-6 space-y-4">
                {/* Stats Grid — Android card style */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { label: "Students", value: acceptedCount, icon: Users, gradient: "from-emerald-500 to-emerald-600" },
                    { label: "Pending", value: pendingCount, icon: Clock, gradient: "from-amber-500 to-amber-600" },
                    { label: "Rating", value: avgRating, icon: Star, gradient: "from-primary to-primary/80" },
                    { label: "Reviews", value: reviews.length, icon: Award, gradient: "from-purple-500 to-purple-600" },
                  ].map((stat, i) => (
                    <motion.div key={stat.label} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                      className="relative overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-card">
                      <div className={`absolute top-0 right-0 h-12 w-12 rounded-bl-[2rem] bg-gradient-to-br ${stat.gradient} opacity-10`} />
                      <stat.icon className="h-5 w-5 text-muted-foreground" />
                      <p className="mt-2 font-display text-2xl font-bold text-foreground">{stat.value}</p>
                      <p className="text-[11px] text-muted-foreground">{stat.label}</p>
                    </motion.div>
                  ))}
                </div>

                {/* Quick Actions */}
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  <Link to="/discover">
                    <Button size="sm" variant="outline" className="shrink-0 rounded-full gap-1.5 text-xs h-8">
                      <Eye className="h-3 w-3" /> View My Public Profile
                    </Button>
                  </Link>
                  <Button size="sm" variant="outline" className="shrink-0 rounded-full gap-1.5 text-xs h-8" onClick={() => setEditOpen(true)}>
                    <Edit3 className="h-3 w-3" /> Quick Edit
                  </Button>
                </div>

                {/* Fee & Experience Card */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                  className="rounded-2xl border border-border bg-card p-4 shadow-card">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Monthly Fee</p>
                      <p className="font-display text-xl font-bold text-foreground">৳{(tutor?.fee_expectation || 0).toLocaleString()}</p>
                    </div>
                    <div className="h-10 w-px bg-border" />
                    <div>
                      <p className="text-xs text-muted-foreground">Experience</p>
                      <p className="font-display text-sm font-bold text-foreground">{tutor?.experience || "Not set"}</p>
                    </div>
                    <div className="h-10 w-px bg-border" />
                    <div>
                      <p className="text-xs text-muted-foreground">Status</p>
                      <Badge className={`text-[10px] mt-0.5 ${tutor?.status === "approved" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"} border-0`}>
                        {tutor?.status}
                      </Badge>
                    </div>
                  </div>
                </motion.div>

                {/* Bio */}
                {tutor?.bio && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                    className="rounded-2xl border border-border bg-card p-4 shadow-card">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">About Me</p>
                    <p className="text-sm text-foreground leading-relaxed">{tutor.bio}</p>
                  </motion.div>
                )}

                {/* Subjects & Areas */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    className="rounded-2xl border border-border bg-card p-4 shadow-card">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <BookOpen className="h-3 w-3" /> Subjects
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {(tutor?.subjects || []).length > 0 ? tutor!.subjects.map(s => (
                        <Badge key={s} className="rounded-full px-2.5 py-0.5 text-[11px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-0">{s}</Badge>
                      )) : <p className="text-xs text-muted-foreground italic">No subjects added</p>}
                    </div>
                  </motion.div>
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                    className="rounded-2xl border border-border bg-card p-4 shadow-card">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <MapPin className="h-3 w-3" /> Preferred Areas
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {(tutor?.preferred_areas || []).length > 0 ? tutor!.preferred_areas.map(a => (
                        <Badge key={a} className="rounded-full px-2.5 py-0.5 text-[11px] bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-0">{a}</Badge>
                      )) : <p className="text-xs text-muted-foreground italic">No areas added</p>}
                    </div>
                  </motion.div>
                </div>

                {/* Demo Video Card */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                  className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Video className="h-3 w-3" /> Demo Class Video
                      </p>
                      {!tutor?.demo_video_url && (
                        <Badge variant="outline" className="text-[9px] border-destructive/50 text-destructive rounded-full">Required</Badge>
                      )}
                    </div>
                    {tutor?.demo_video_url ? (
                      <div className="mt-3 space-y-3">
                        <video src={tutor.demo_video_url} controls className="w-full rounded-xl border border-border" style={{ maxHeight: 240 }} />
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => videoInputRef.current?.click()} className="gap-1.5 text-xs rounded-full h-7">
                            <Upload className="h-3 w-3" /> Replace
                          </Button>
                          <Button size="sm" variant="outline" onClick={handleDeleteVideo} className="gap-1.5 text-xs text-destructive rounded-full h-7">
                            <Trash2 className="h-3 w-3" /> Remove
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 flex flex-col items-center rounded-xl border-2 border-dashed border-border p-6">
                        <Video className="h-8 w-8 text-muted-foreground" />
                        <p className="mt-2 text-xs text-muted-foreground text-center">Upload a 5-min demo class video for students</p>
                        <Button onClick={() => videoInputRef.current?.click()} disabled={uploadingVideo}
                          className="mt-3 gap-2 bg-coral-gradient text-primary-foreground rounded-full text-xs h-8">
                          <Upload className="h-3 w-3" /> {uploadingVideo ? "Uploading..." : "Upload Video"}
                        </Button>
                      </div>
                    )}
                    {uploadingVideo && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        Uploading video...
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* Recent Requests Preview */}
                {requests.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
                    className="rounded-2xl border border-border bg-card p-4 shadow-card">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recent Requests</p>
                      <button onClick={() => setActiveTab("requests")} className="text-xs text-primary font-medium flex items-center gap-0.5">
                        View All <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="space-y-2">
                      {requests.slice(0, 3).map(req => (
                        <div key={req.id} className="flex items-center gap-3 rounded-xl bg-secondary/50 p-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary shrink-0">
                            {(req.student_name_resolved || "U").charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{req.student_name_resolved}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{req.subject || "General Tuition"} {req.area && `• ${req.area}`}</p>
                          </div>
                          <Badge className={`text-[9px] shrink-0 ${statusColor(req.status)} border-0`}>{req.status}</Badge>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === "requests" && (
            <motion.div key="requests" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}
              className="px-4 py-4 sm:px-6">
              <h2 className="font-display text-lg font-bold text-foreground mb-4">Student Requests</h2>
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
                      className="rounded-2xl border border-border bg-card p-4 shadow-card">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary shrink-0">
                          {(req.student_name_resolved || "U").charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-foreground">{req.student_name_resolved}</span>
                            <Badge className={`text-[10px] ${statusColor(req.status)} border-0`}>{req.status}</Badge>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {req.subject && <span>📚 {req.subject}</span>}
                            {req.class_level && <span> • 🎓 {req.class_level}</span>}
                            {req.budget && <span> • ৳{req.budget}/mo</span>}
                            {req.area && <span> • 📍 {req.area}</span>}
                          </p>
                          {req.message && <p className="mt-2 text-sm text-foreground bg-secondary/50 rounded-xl p-2.5">{req.message}</p>}
                          {req.status === "pending" && (
                            <div className="flex gap-2 mt-3">
                              <Button size="sm" onClick={() => handleAccept(req)} className="gap-1 bg-emerald-600 text-primary-foreground hover:bg-emerald-700 text-xs rounded-full h-8">
                                <Check className="h-3 w-3" /> Accept
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleReject(req)} className="gap-1 text-destructive text-xs rounded-full h-8">
                                <X className="h-3 w-3" /> Reject
                              </Button>
                            </div>
                          )}
                          {req.status === "accepted" && (
                            <Link to="/messages">
                              <Button size="sm" variant="outline" className="gap-1 text-xs mt-3 rounded-full h-8">
                                <MessageCircle className="h-3 w-3" /> Open Chat
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {activeTab === "notifications" && (
            <motion.div key="notifications" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}
              className="px-4 py-4 sm:px-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-lg font-bold text-foreground">Notifications</h2>
                {unreadNotifs > 0 && (
                  <Button size="sm" variant="ghost" onClick={markAllRead} className="text-xs text-primary rounded-full h-7">
                    Mark all read
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                {notifications.length === 0 ? (
                  <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-card">
                    <Bell className="mx-auto h-10 w-10 text-muted-foreground" />
                    <p className="mt-3 font-display text-base font-semibold text-foreground">No notifications yet</p>
                    <p className="mt-1 text-sm text-muted-foreground">You'll be notified when students interact with you.</p>
                  </div>
                ) : (
                  notifications.map(n => (
                    <motion.div key={n.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                      onClick={() => !n.is_read && markNotificationRead(n.id)}
                      className={`cursor-pointer rounded-2xl border p-3.5 transition-colors ${n.is_read ? "border-border bg-card" : "border-primary/30 bg-primary/5"}`}>
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl shrink-0 ${
                          n.type === "demo_watch" ? "bg-rose-100 dark:bg-rose-900/40" :
                          n.type === "demo_rating" ? "bg-amber-100 dark:bg-amber-900/40" :
                          n.type === "demo_request" ? "bg-blue-100 dark:bg-blue-900/40" :
                          "bg-primary/10"
                        }`}>
                          {n.type === "demo_watch" ? <Video className="h-4 w-4 text-rose-600" /> :
                           n.type === "demo_rating" ? <Star className="h-4 w-4 text-amber-600" /> :
                           n.type === "demo_request" ? <Video className="h-4 w-4 text-blue-600" /> :
                           <Bell className="h-4 w-4 text-primary" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-foreground">{n.title}</p>
                            {!n.is_read && <div className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                          <p className="text-[10px] text-muted-foreground/60 mt-1">{new Date(n.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {activeTab === "demo_views" && (
            <motion.div key="demo_views" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}
              className="px-4 py-4 sm:px-6">
              <h2 className="font-display text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <Eye className="h-5 w-5 text-rose-500" /> Demo Video Viewers
              </h2>

              {/* Summary */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { label: "Total Views", value: demoViews.length, color: "text-blue-500" },
                  { label: "Completed", value: demoViews.filter(d => d.completed).length, color: "text-emerald-500" },
                  { label: "Avg Rating", value: (() => { const rated = demoViews.filter(d => d.rating); return rated.length > 0 ? (rated.reduce((s, d) => s + (d.rating || 0), 0) / rated.length).toFixed(1) : "—"; })(), color: "text-amber-500" },
                ].map(stat => (
                  <div key={stat.label} className="rounded-2xl border border-border bg-card p-3 text-center shadow-card">
                    <p className={`font-display text-xl font-bold ${stat.color}`}>{stat.value}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Viewer Cards */}
              <div className="space-y-3">
                {demoViews.length > 0 ? (
                  demoViews.map(v => (
                    <motion.div key={v.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl border border-border bg-card p-4 shadow-card">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-900/40 text-xs font-bold text-rose-700">
                            {v.student_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="text-sm font-medium text-foreground">{v.student_name}</span>
                            <p className="text-[10px] text-muted-foreground">
                              {new Date(v.watched_at).toLocaleDateString()} • {new Date(v.watched_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {v.completed ? (
                            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-0 text-[10px]">
                              Watched
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-0 text-[10px]">
                              <Clock className="h-2.5 w-2.5 mr-0.5" /> Watching
                            </Badge>
                          )}
                        </div>
                      </div>
                      {v.rating && (
                        <div className="mt-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30 p-3">
                          <div className="flex items-center gap-1.5 mb-1">
                            {[1, 2, 3, 4, 5].map(s => (
                              <Star key={s} className={`h-3.5 w-3.5 ${s <= v.rating! ? "fill-amber-400 text-amber-400" : "text-border"}`} />
                            ))}
                            <span className="ml-1 text-xs font-medium text-amber-600">{v.rating}/5</span>
                          </div>
                          {v.comment && <p className="text-xs text-muted-foreground leading-relaxed">"{v.comment}"</p>}
                        </div>
                      )}
                    </motion.div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-card">
                    <Eye className="mx-auto h-10 w-10 text-muted-foreground" />
                    <p className="mt-3 font-display text-base font-semibold text-foreground">No demo views yet</p>
                    <p className="mt-1 text-sm text-muted-foreground">Students will appear here after watching your demo video.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === "reviews" && (
            <motion.div key="reviews" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}
              className="px-4 py-4 sm:px-6">
              <h2 className="font-display text-lg font-bold text-foreground mb-4">Reviews & Ratings</h2>

              {/* Rating Summary */}
              <div className="rounded-2xl border border-border bg-card p-5 shadow-card mb-4">
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="font-display text-4xl font-bold text-foreground">{avgRating}</p>
                    <div className="mt-1 flex items-center gap-0.5 justify-center">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star key={s} className={`h-4 w-4 ${s <= Math.round(Number(avgRating)) ? "fill-amber-400 text-amber-400" : "text-border"}`} />
                      ))}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{reviews.length} reviews</p>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    {[5, 4, 3, 2, 1].map(star => {
                      const count = reviews.filter(r => r.rating === star).length;
                      const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                      return (
                        <div key={star} className="flex items-center gap-2 text-xs">
                          <span className="w-3 text-muted-foreground">{star}</span>
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                            <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="w-6 text-right text-muted-foreground">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Review Cards */}
              <div className="space-y-3">
                {reviews.length > 0 ? (
                  reviews.map(r => (
                    <motion.div key={r.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl border border-border bg-card p-4 shadow-card">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/40 text-xs font-bold text-amber-700">
                            {(r.profile?.full_name || "A").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="text-sm font-medium text-foreground">{r.profile?.full_name || "Anonymous"}</span>
                            <p className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map(s => (
                            <Star key={s} className={`h-3.5 w-3.5 ${s <= r.rating ? "fill-amber-400 text-amber-400" : "text-border"}`} />
                          ))}
                        </div>
                      </div>
                      {r.comment && <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{r.comment}</p>}
                    </motion.div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-card">
                    <Star className="mx-auto h-10 w-10 text-muted-foreground" />
                    <p className="mt-3 font-display text-base font-semibold text-foreground">No reviews yet</p>
                    <p className="mt-1 text-sm text-muted-foreground">Students can leave reviews after working with you.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Android-style Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-lg safe-bottom">
        <div className="flex items-center justify-around px-2 py-1">
          {bottomTabs.map(tab => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all min-w-[60px] ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {isActive && (
                  <motion.div layoutId="bottomNavIndicator" className="absolute top-0 left-1/2 -translate-x-1/2 h-[3px] w-8 rounded-full bg-primary" />
                )}
                <div className="relative">
                  <tab.icon className={`h-5 w-5 transition-all ${isActive ? "scale-110" : ""}`} />
                  {(tab.badge ?? 0) > 0 && (
                    <span className="absolute -top-1.5 -right-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
                      {tab.badge}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] font-medium ${isActive ? "font-semibold" : ""}`}>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default TutorDashboard;
