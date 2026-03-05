import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { TutorProfile, Profile, TuitionRequest, Review } from "@/types/database";
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
  MessageCircle, Users, Heart, Check, X, Save, Plus, Camera,
  Grid3X3, Inbox, Settings, Share2, Award, TrendingUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Navigate, Link } from "react-router-dom";

const TutorDashboard = () => {
  const { user, role, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tutor, setTutor] = useState<TutorProfile | null>(null);
  const [requests, setRequests] = useState<(TuitionRequest & { student_name_resolved?: string })[]>([]);
  const [reviews, setReviews] = useState<(Review & { profile?: Profile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

      // Fetch reviews
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

      setLoading(false);
    };
    fetchData();
  }, [user, role]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !tutor) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setUploadingPhoto(true);
    const ext = file.name.split(".").pop();
    const filePath = `${user.id}/profile.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast.error("Upload failed: " + uploadError.message);
      setUploadingPhoto(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
    const photoUrl = urlData.publicUrl + "?t=" + Date.now();

    const { error: updateError } = await supabase
      .from("tutor_profiles")
      .update({ photo_url: photoUrl } as any)
      .eq("id", tutor.id);

    setUploadingPhoto(false);
    if (updateError) {
      toast.error("Failed to update profile photo");
    } else {
      setTutor({ ...tutor, photo_url: photoUrl });
      toast.success("Profile photo updated!");
    }
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
  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : (tutor?.rating || 0);

  const statusColor = (s: string) => {
    switch (s) {
      case "accepted": return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";
      case "pending": return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
      case "rejected": return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300";
      default: return "bg-secondary text-secondary-foreground";
    }
  };

  // Instagram-style highlights data
  const highlights = [
    { icon: BookOpen, label: "Subjects", value: tutor?.subjects?.length || 0, color: "bg-emerald-500" },
    { icon: MapPin, label: "Areas", value: tutor?.preferred_areas?.length || 0, color: "bg-blue-500" },
    { icon: Star, label: "Rating", value: avgRating, color: "bg-amber-500" },
    { icon: Award, label: "Reviews", value: reviews.length || tutor?.total_reviews || 0, color: "bg-purple-500" },
  ];

  return (
    <div className="min-h-screen">
      <Navbar />
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />

      <div className="pt-16">
        {/* Instagram-style Profile Header */}
        <div className="border-b border-border bg-card">
          <div className="container py-6 px-4 sm:py-8">
            <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start sm:gap-8 lg:gap-12">
              {/* Profile Photo - Instagram circle */}
              <div className="relative shrink-0">
                <div className="group relative h-24 w-24 overflow-hidden rounded-full ring-[3px] ring-primary/20 ring-offset-2 ring-offset-background sm:h-36 sm:w-36">
                  {tutor?.photo_url ? (
                    <img src={tutor.photo_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-secondary">
                      <GraduationCap className="h-10 w-10 text-muted-foreground sm:h-14 sm:w-14" />
                    </div>
                  )}
                  {/* Upload overlay */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="absolute inset-0 flex items-center justify-center bg-foreground/0 opacity-0 transition-all group-hover:bg-foreground/40 group-hover:opacity-100"
                  >
                    <Camera className="h-6 w-6 text-primary-foreground sm:h-8 sm:w-8" />
                  </button>
                </div>
                {tutor?.status === "approved" && (
                  <div className="absolute -bottom-1 -right-1 rounded-full border-2 border-background bg-emerald-500 p-1">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                )}
                {uploadingPhoto && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-foreground/30">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  </div>
                )}
              </div>

              {/* Info Section */}
              <div className="flex-1 text-center sm:text-left">
                {/* Name & Actions Row */}
                <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:gap-4">
                  <h1 className="font-display text-xl font-bold text-foreground sm:text-2xl">
                    {profile?.full_name || "Tutor"}
                  </h1>
                  <div className="flex gap-2">
                    <Dialog open={editOpen} onOpenChange={setEditOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-1.5 text-xs font-semibold">
                          <Edit3 className="h-3.5 w-3.5" /> Edit Profile
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[85vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle className="font-display">Edit Your Profile</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 pt-2">
                          {/* Photo upload in dialog too */}
                          <div className="flex items-center gap-4">
                            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full ring-2 ring-border">
                              {tutor?.photo_url ? (
                                <img src={tutor.photo_url} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center bg-secondary">
                                  <GraduationCap className="h-6 w-6 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                            <Button variant="link" size="sm" className="text-primary text-xs font-semibold" onClick={() => fileInputRef.current?.click()}>
                              Change Profile Photo
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
                                  <button onClick={() => setEditSubjects(prev => prev.filter(x => x !== s))} className="ml-0.5 hover:text-destructive">
                                    <X className="h-3 w-3" />
                                  </button>
                                </Badge>
                              ))}
                            </div>
                            <div className="flex gap-2">
                              <Input placeholder="Add subject" value={newSubject} onChange={e => setNewSubject(e.target.value)} className="text-sm"
                                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); if (newSubject.trim() && !editSubjects.includes(newSubject.trim())) { setEditSubjects(prev => [...prev, newSubject.trim()]); setNewSubject(""); } } }}
                              />
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
                              <Input placeholder="Add area" value={newArea} onChange={e => setNewArea(e.target.value)} className="text-sm"
                                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); if (newArea.trim() && !editAreas.includes(newArea.trim())) { setEditAreas(prev => [...prev, newArea.trim()]); setNewArea(""); } } }}
                              />
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
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs" asChild>
                      <Link to="/messages">
                        <MessageCircle className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                </div>

                {/* Department & Contact */}
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {tutor?.department} Department, KUET • Session {tutor?.session}
                  {profile?.phone && <span className="ml-2"><Phone className="inline h-3 w-3" /> {profile.phone}</span>}
                </p>

                {tutor?.status === "pending" && (
                  <Badge className="mt-2 bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-0">
                    ⏳ Pending Admin Approval
                  </Badge>
                )}

                {/* Stats Row - Instagram style */}
                <div className="mt-4 flex justify-center gap-8 sm:justify-start">
                  <div className="text-center">
                    <p className="font-display text-lg font-bold text-foreground">{requests.length}</p>
                    <p className="text-[11px] text-muted-foreground">requests</p>
                  </div>
                  <div className="text-center">
                    <p className="font-display text-lg font-bold text-foreground">{reviews.length || tutor?.total_reviews || 0}</p>
                    <p className="text-[11px] text-muted-foreground">reviews</p>
                  </div>
                  <div className="text-center">
                    <p className="font-display text-lg font-bold text-foreground">{acceptedCount}</p>
                    <p className="text-[11px] text-muted-foreground">students</p>
                  </div>
                </div>

                {/* Bio */}
                {tutor?.bio ? (
                  <p className="mt-3 max-w-lg text-sm text-foreground leading-relaxed">{tutor.bio}</p>
                ) : (
                  <p className="mt-3 max-w-lg text-sm text-muted-foreground italic">No bio yet — tap Edit Profile to add one.</p>
                )}

                {/* Fee highlight */}
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-primary/5 px-3 py-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-primary" />
                  <span className="text-sm font-semibold text-foreground">৳{(tutor?.fee_expectation || 0).toLocaleString()}</span>
                  <span className="text-xs text-muted-foreground">/month</span>
                </div>
              </div>
            </div>

            {/* Story-style Highlights */}
            <div className="mt-6 flex justify-center gap-6 sm:justify-start sm:gap-8">
              {highlights.map((h) => (
                <div key={h.label} className="flex flex-col items-center gap-1.5">
                  <div className={`flex h-14 w-14 items-center justify-center rounded-full ring-2 ring-border ring-offset-2 ring-offset-background sm:h-16 sm:w-16 ${h.color}`}>
                    <h.icon className="h-5 w-5 text-primary-foreground sm:h-6 sm:w-6" />
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground">{h.label}</span>
                  <span className="text-xs font-bold text-foreground">{h.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Content Tabs - Instagram style */}
        <div className="container py-6 px-4">
          <Tabs defaultValue="details">
            <TabsList className="mb-6 w-full justify-start border-b border-border bg-transparent p-0">
              <TabsTrigger value="details" className="gap-1.5 rounded-none border-b-2 border-transparent px-6 py-3 text-xs font-semibold uppercase tracking-wider data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none sm:text-sm">
                <Grid3X3 className="h-3.5 w-3.5" /> Details
              </TabsTrigger>
              <TabsTrigger value="requests" className="gap-1.5 rounded-none border-b-2 border-transparent px-6 py-3 text-xs font-semibold uppercase tracking-wider data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none sm:text-sm">
                <Inbox className="h-3.5 w-3.5" /> Requests
                {pendingCount > 0 && <span className="ml-1 rounded-full bg-destructive px-1.5 py-0.5 text-[10px] text-destructive-foreground">{pendingCount}</span>}
              </TabsTrigger>
              <TabsTrigger value="reviews" className="gap-1.5 rounded-none border-b-2 border-transparent px-6 py-3 text-xs font-semibold uppercase tracking-wider data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none sm:text-sm">
                <Star className="h-3.5 w-3.5" /> Reviews
              </TabsTrigger>
            </TabsList>

            {/* Details Tab */}
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

                {/* Experience & Fee */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-2xl border-l-4 border-purple-500 bg-purple-50/50 dark:bg-purple-950/20 p-4 shadow-card sm:p-6">
                  <h3 className="font-display text-base font-semibold text-purple-700 dark:text-purple-400 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-purple-500" /> Experience & Fee
                  </h3>
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground font-medium">{tutor?.experience || "Not specified"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground font-medium">৳{(tutor?.fee_expectation || 0).toLocaleString()}/month</span>
                    </div>
                  </div>
                </motion.div>

                {/* Quick Stats */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="rounded-2xl border-l-4 border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 p-4 shadow-card sm:p-6">
                  <h3 className="font-display text-base font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-amber-500" /> Performance
                  </h3>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-card p-3 text-center border border-border">
                      <p className="font-display text-2xl font-bold text-foreground">{pendingCount}</p>
                      <p className="text-[11px] text-muted-foreground">Pending</p>
                    </div>
                    <div className="rounded-xl bg-card p-3 text-center border border-border">
                      <p className="font-display text-2xl font-bold text-foreground">{acceptedCount}</p>
                      <p className="text-[11px] text-muted-foreground">Accepted</p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </TabsContent>

            {/* Requests Tab */}
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
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                              {(req.student_name_resolved || "U").charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <span className="text-sm font-semibold text-foreground">{req.student_name_resolved}</span>
                              <Badge className={`ml-2 text-[10px] ${statusColor(req.status)}`}>{req.status}</Badge>
                            </div>
                          </div>
                          <p className="mt-1.5 ml-10 text-xs text-muted-foreground">
                            {req.subject && <span>📚 {req.subject}</span>}
                            {req.class_level && <span> • 🎓 {req.class_level}</span>}
                            {req.budget && <span> • ৳{req.budget}/mo</span>}
                            {req.area && <span> • 📍 {req.area}</span>}
                          </p>
                          {req.message && <p className="mt-2 ml-10 text-sm text-foreground bg-secondary/50 rounded-lg p-2">{req.message}</p>}
                        </div>
                        {req.status === "pending" && (
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleAccept(req)} className="gap-1 bg-emerald-600 text-primary-foreground hover:bg-emerald-700 text-xs">
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

            {/* Reviews Tab */}
            <TabsContent value="reviews">
              <div className="space-y-4">
                {/* Rating Summary */}
                <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="font-display text-4xl font-bold text-foreground">{avgRating}</p>
                      <div className="mt-1 flex items-center gap-0.5">
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

                {/* Review List */}
                {reviews.length > 0 ? (
                  reviews.map(r => (
                    <motion.div key={r.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl border border-border bg-card p-4 shadow-card"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40 text-xs font-bold text-amber-700">
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
                    <p className="mt-1 text-sm text-muted-foreground">Students can leave reviews on your public profile page.</p>
                  </div>
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
