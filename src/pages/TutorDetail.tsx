import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { TutorProfile, Profile, Review, DemoVideoView } from "@/types/database";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  ArrowLeft, BookOpen, MapPin, Star, Calendar, GraduationCap,
  Heart, Shield, Send, Video, Lock, Play,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

const TutorDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user, role } = useAuth();
  const [tutor, setTutor] = useState<(TutorProfile & { profile?: Profile }) | null>(null);
  const [reviews, setReviews] = useState<(Review & { profile?: Profile })[]>([]);
  const [loading, setLoading] = useState(true);

  // Interest form
  const [showInterest, setShowInterest] = useState(false);
  const [interestMsg, setInterestMsg] = useState("");
  const [interestSubject, setInterestSubject] = useState("");
  const [interestClass, setInterestClass] = useState("");
  const [interestBudget, setInterestBudget] = useState("");
  const [interestArea, setInterestArea] = useState("");
  const [interestName, setInterestName] = useState("");
  const [sending, setSending] = useState(false);

  // Review form
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewHover, setReviewHover] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  // Demo video state
  const [showDemoVideo, setShowDemoVideo] = useState(false);
  const [demoView, setDemoView] = useState<DemoVideoView | null>(null);
  const [videoCompleted, setVideoCompleted] = useState(false);
  const [demoRating, setDemoRating] = useState(0);
  const [demoRatingHover, setDemoRatingHover] = useState(0);
  const [demoComment, setDemoComment] = useState("");
  const [submittingDemoRating, setSubmittingDemoRating] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const fetchTutor = async () => {
      const { data, error } = await supabase
        .from("tutor_profiles").select("*").eq("id", id!).single();

      if (data) {
        const { data: profileData } = await supabase
          .from("profiles").select("*").eq("user_id", data.user_id).single();
        setTutor({ ...data, profile: profileData } as any);

        const { data: reviewsData } = await supabase
          .from("reviews").select("*").eq("tutor_id", data.user_id)
          .order("created_at", { ascending: false });
        if (reviewsData) {
          const enriched = await Promise.all(
            (reviewsData as Review[]).map(async (r) => {
              const { data: p } = await supabase.from("profiles").select("*").eq("user_id", r.student_id).single();
              return { ...r, profile: p as Profile };
            })
          );
          setReviews(enriched);
        }
      }
      setLoading(false);
    };
    fetchTutor();
  }, [id]);

  // Fetch existing demo view for this student
  useEffect(() => {
    if (!user || !tutor) return;
    supabase
      .from("demo_video_views")
      .select("*")
      .eq("tutor_id", tutor.user_id)
      .eq("student_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setDemoView(data as DemoVideoView);
          setVideoCompleted(data.completed);
          if (data.rating) setDemoRating(data.rating);
        }
      });
  }, [user?.id, tutor?.user_id]);

  useEffect(() => {
    if (user) {
      supabase.from("profiles").select("full_name").eq("user_id", user.id).single().then(({ data }) => {
        if (data) setInterestName(data.full_name);
      });
    }
  }, [user]);

  const handleSendInterest = async () => {
    if (!user) { toast.error("Please sign in to express interest"); return; }
    if (!tutor) return;
    if (!interestSubject.trim()) { toast.error("Please specify a subject"); return; }
    setSending(true);
    const { error } = await supabase.from("tuition_requests").insert({
      student_id: user.id,
      tutor_id: tutor.user_id,
      message: interestMsg || null,
      subject: interestSubject,
      class_level: interestClass || null,
      budget: interestBudget ? parseInt(interestBudget) : null,
      area: interestArea || null,
      student_name: interestName || null,
    });
    setSending(false);
    if (error) { toast.error("Failed to send request. " + error.message); }
    else {
      toast.success("Interest sent! The tutor will be notified.");
      setShowInterest(false);
      setInterestMsg(""); setInterestSubject(""); setInterestClass(""); setInterestBudget(""); setInterestArea("");
    }
  };

  const handleSubmitReview = async () => {
    if (!user) { toast.error("Please sign in to leave a review"); return; }
    if (role !== "student") { toast.error("Only students can leave reviews"); return; }
    if (!tutor) return;
    if (reviewRating === 0) { toast.error("Please select a star rating"); return; }
    setSubmittingReview(true);
    const { error } = await supabase.from("reviews").insert({
      tutor_id: tutor.user_id,
      student_id: user.id,
      rating: reviewRating,
      comment: reviewComment.trim() || null,
    });
    setSubmittingReview(false);
    if (error) { toast.error("Failed to submit review. " + error.message); }
    else {
      toast.success("Review posted!");
      const { data: p } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
      setReviews((prev) => [{
        id: crypto.randomUUID(), tutor_id: tutor.user_id, student_id: user.id,
        rating: reviewRating, comment: reviewComment.trim() || null,
        deal_id: null, created_at: new Date().toISOString(), profile: p as Profile
      }, ...prev]);
      setReviewRating(0); setReviewHover(0); setReviewComment("");
    }
  };

  const handleWatchDemo = async () => {
    if (!user || !tutor) return;
    setShowDemoVideo(true);

    // Record view + notify tutor
    const { data: profile } = await supabase.from("profiles").select("full_name").eq("user_id", user.id).single();
    const studentName = profile?.full_name || "A student";

    // Upsert view record
    if (!demoView) {
      const { data: newView } = await supabase.from("demo_video_views").insert({
        tutor_id: tutor.user_id,
        student_id: user.id,
      } as any).select().single();
      if (newView) setDemoView(newView as DemoVideoView);
    }

    // Notify tutor
    await supabase.from("notifications").insert({
      user_id: tutor.user_id,
      title: "Demo Video Viewed",
      message: `${studentName} is watching your demo class video`,
      type: "demo_watch",
      metadata: { student_id: user.id, student_name: studentName },
    } as any);
  };

  const handleVideoEnded = async () => {
    setVideoCompleted(true);
    if (!user || !tutor) return;
    // Mark as completed
    await supabase.from("demo_video_views")
      .update({ completed: true } as any)
      .eq("tutor_id", tutor.user_id)
      .eq("student_id", user.id);
  };

  const handleSubmitDemoRating = async () => {
    if (!user || !tutor) return;
    if (demoRating === 0) { toast.error("Please select a star rating"); return; }
    if (!demoComment.trim() || demoComment.trim().length < 20) {
      toast.error("Please write a constructive comment (at least 20 characters). Example: 'The Newton's 3rd law topic was not clearly explained'");
      return;
    }
    setSubmittingDemoRating(true);

    const { error } = await supabase.from("demo_video_views")
      .update({ rating: demoRating, comment: demoComment.trim() } as any)
      .eq("tutor_id", tutor.user_id)
      .eq("student_id", user.id);

    if (!error) {
      // Notify tutor about rating
      const { data: profile } = await supabase.from("profiles").select("full_name").eq("user_id", user.id).single();
      await supabase.from("notifications").insert({
        user_id: tutor.user_id,
        title: "Demo Class Rated",
        message: `${profile?.full_name || "A student"} rated your demo class ${demoRating}/5 ⭐`,
        type: "demo_rating",
        metadata: { student_id: user.id, rating: demoRating, comment: demoComment.trim() },
      } as any);

      setDemoView(prev => prev ? { ...prev, rating: demoRating, comment: demoComment.trim() } : prev);
      toast.success("Thank you for your feedback!");
    } else {
      toast.error("Failed to submit rating");
    }
    setSubmittingDemoRating(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen"><Navbar />
        <div className="flex min-h-[60vh] items-center justify-center pt-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!tutor) {
    return (
      <div className="min-h-screen"><Navbar />
        <div className="flex min-h-[60vh] flex-col items-center justify-center pt-16">
          <p className="text-xl font-semibold text-foreground">Tutor not found</p>
          <Link to="/discover"><Button variant="ghost" className="mt-4 gap-2 text-primary"><ArrowLeft className="h-4 w-4" /> Back to Discover</Button></Link>
        </div>
      </div>
    );
  }

  const name = (tutor as any).profile?.full_name || "Tutor";
  const photo = tutor.photo_url;
  const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : tutor.rating;

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="pt-16">
        <div className="container py-6 px-4 sm:py-8">
          <Link to="/discover">
            <Button variant="ghost" size="sm" className="mb-4 gap-2 text-muted-foreground sm:mb-6">
              <ArrowLeft className="h-4 w-4" /> Back to Tutors
            </Button>
          </Link>

          <div className="grid gap-6 sm:gap-8 lg:grid-cols-3">
            {/* Photo & Quick Info */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-1">
              <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
                <div className="relative mx-auto w-full max-w-[240px] overflow-hidden sm:max-w-[280px] lg:max-w-none">
                  <div className="aspect-square overflow-hidden">
                    {photo ? (
                      <img src={photo} alt={name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-secondary">
                        <GraduationCap className="h-14 w-14 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="p-4 sm:p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-gold text-gold" />
                      <span className="font-display text-base font-bold text-foreground">{avgRating}</span>
                      <span className="text-xs text-muted-foreground">({reviews.length || tutor.total_reviews} reviews)</span>
                    </div>
                    <Badge variant="secondary" className="bg-coral/10 text-coral text-xs">
                      <Shield className="mr-1 h-3 w-3" /> Verified
                    </Badge>
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <GraduationCap className="h-3.5 w-3.5" /> {tutor.department} • {tutor.session}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" /> {tutor.experience || "N/A"} experience
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" /> {tutor.preferred_areas?.join(", ") || "N/A"}
                    </div>
                  </div>
                  <div className="mt-4 border-t border-border pt-3">
                    <div className="text-center">
                      <span className="font-display text-xl font-bold text-foreground">৳{tutor.fee_expectation?.toLocaleString()}</span>
                      <span className="text-muted-foreground text-sm">/month</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Demo Video Preview Card */}
              {tutor.demo_video_url && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                  className="mt-4 overflow-hidden rounded-2xl border border-border bg-card shadow-card"
                >
                  <div className="p-4">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Video className="h-4 w-4 text-rose-500" /> Demo Class
                    </h3>
                  </div>
                  {/* Blurry preview */}
                  <div className="relative">
                    <video
                      src={tutor.demo_video_url}
                      className="w-full h-40 object-cover"
                      style={{ filter: !user ? "blur(12px)" : "none" }}
                      muted
                      preload="metadata"
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-foreground/30">
                      {!user ? (
                        <div className="text-center">
                          <Lock className="mx-auto h-8 w-8 text-primary-foreground mb-2" />
                          <Link to="/login" className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
                            Sign in to watch
                          </Link>
                        </div>
                      ) : (
                        <button
                          onClick={handleWatchDemo}
                          className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all hover:scale-105"
                        >
                          <Play className="h-4 w-4" /> Watch Demo Class
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>

            {/* Details */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-4 sm:space-y-6 lg:col-span-2">
              <div>
                <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">{name}</h1>
                <p className="mt-1 text-sm text-muted-foreground">{tutor.department} Department, KUET • Session {tutor.session}</p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Dialog open={showInterest} onOpenChange={setShowInterest}>
                  <DialogTrigger asChild>
                    <Button size="lg" className="gap-2 bg-coral-gradient text-primary-foreground hover:opacity-90 text-sm sm:text-base">
                      <Heart className="h-4 w-4" /> Express Interest
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[95vw] sm:max-w-lg">
                    <DialogHeader>
                      <DialogTitle className="font-display">Send Interest to {name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                      {!user && (
                        <div className="rounded-lg bg-coral/10 p-3 text-sm text-coral">
                          <Link to="/login" className="font-semibold underline">Sign in</Link> to send interest requests.
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label>Your Name</Label>
                        <Input placeholder="Your full name" value={interestName} onChange={(e) => setInterestName(e.target.value)} />
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Subject Needed *</Label>
                          <Input placeholder="e.g., Physics" value={interestSubject} onChange={(e) => setInterestSubject(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label>Class Level</Label>
                          <Input placeholder="e.g., HSC" value={interestClass} onChange={(e) => setInterestClass(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label>Budget (৳/month)</Label>
                          <Input type="number" placeholder="e.g., 3000" value={interestBudget} onChange={(e) => setInterestBudget(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label>Your Area</Label>
                          <Input placeholder="e.g., Sonadanga" value={interestArea} onChange={(e) => setInterestArea(e.target.value)} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Message</Label>
                        <Textarea placeholder="Tell the tutor about your needs..." value={interestMsg} onChange={(e) => setInterestMsg(e.target.value)} />
                      </div>
                      <Button onClick={handleSendInterest} disabled={sending || !user} className="w-full bg-coral-gradient text-primary-foreground">
                        <Send className="mr-2 h-4 w-4" />
                        {sending ? "Sending..." : "Send Interest Request"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Demo Video Dialog */}
              <Dialog open={showDemoVideo} onOpenChange={setShowDemoVideo}>
                <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="font-display flex items-center gap-2">
                      <Video className="h-5 w-5 text-rose-500" /> Demo Class — {name}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <video
                      ref={videoRef}
                      src={tutor.demo_video_url || ""}
                      controls
                      className="w-full rounded-xl"
                      onEnded={handleVideoEnded}
                      style={{ maxHeight: 400 }}
                    />

                    {/* Rating section - only after video completion */}
                    {videoCompleted && !demoView?.rating ? (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        className="rounded-xl border-2 border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20 p-4"
                      >
                        <p className="text-sm font-semibold text-foreground mb-1">⭐ Rate this demo class</p>
                        <p className="text-xs text-muted-foreground mb-3">
                          Your constructive feedback helps the tutor improve. Please mention specifics like topics you didn't understand or communication issues.
                        </p>
                        <div className="flex items-center gap-1.5 mb-3">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button key={star} type="button"
                              onClick={() => setDemoRating(star)}
                              onMouseEnter={() => setDemoRatingHover(star)}
                              onMouseLeave={() => setDemoRatingHover(0)}
                              className="transition-transform hover:scale-125 active:scale-95"
                            >
                              <Star className={`h-7 w-7 transition-colors ${
                                star <= (demoRatingHover || demoRating)
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-border hover:text-amber-200"
                              }`} />
                            </button>
                          ))}
                          {demoRating > 0 && <span className="ml-2 text-sm font-medium text-amber-600">{demoRating}/5</span>}
                        </div>
                        <Textarea
                          placeholder="Write constructive feedback (required). E.g.: 'Did not understand Newton's 3rd law topic clearly' or 'All topics were explained perfectly, great communication'"
                          value={demoComment}
                          onChange={(e) => setDemoComment(e.target.value)}
                          className="text-sm min-h-[80px] mb-2"
                          rows={3}
                        />
                        <p className="text-[10px] text-muted-foreground mb-3">Minimum 20 characters required</p>
                        <Button
                          onClick={handleSubmitDemoRating}
                          disabled={submittingDemoRating || demoRating === 0 || demoComment.trim().length < 20}
                          className="w-full gap-2 bg-amber-500 text-primary-foreground hover:bg-amber-600"
                        >
                          <Star className="h-4 w-4" />
                          {submittingDemoRating ? "Submitting..." : "Submit Rating"}
                        </Button>
                      </motion.div>
                    ) : demoView?.rating ? (
                      <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 p-4 text-center">
                        <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                          ✅ You rated this demo class {demoView.rating}/5
                        </p>
                        {demoView.comment && <p className="mt-1 text-xs text-muted-foreground">"{demoView.comment}"</p>}
                      </div>
                    ) : (
                      <div className="rounded-xl bg-secondary/50 p-3 text-center">
                        <p className="text-xs text-muted-foreground">
                          Watch the full video to unlock the rating option
                        </p>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>

              {/* Bio */}
              <div className="rounded-2xl border-l-4 border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 p-4 shadow-card sm:p-6">
                <h3 className="font-display text-base font-semibold text-blue-700 dark:text-blue-400 sm:text-lg flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-blue-500" /> About
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:mt-3 sm:text-base">
                  {tutor.bio || "No bio available."}
                </p>
              </div>

              {/* Subjects */}
              <div className="rounded-2xl border-l-4 border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 shadow-card sm:p-6">
                <h3 className="font-display text-base font-semibold text-emerald-700 dark:text-emerald-400 sm:text-lg flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" /> Subjects
                </h3>
                <div className="mt-2 flex flex-wrap gap-2 sm:mt-3">
                  {tutor.subjects?.map((s) => (
                    <Badge key={s} className="rounded-full px-3 py-1 text-xs sm:text-sm bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-0">
                      <BookOpen className="mr-1.5 h-3 w-3" /> {s}
                    </Badge>
                  ))}
                  {(!tutor.subjects || tutor.subjects.length === 0) && (
                    <p className="text-sm text-muted-foreground">No subjects listed yet.</p>
                  )}
                </div>
              </div>

              {/* Reviews */}
              <div className="rounded-2xl border-l-4 border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 p-4 shadow-card sm:p-6">
                <h3 className="font-display text-base font-semibold text-amber-700 dark:text-amber-400 sm:text-lg flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-amber-500" /> Reviews ({reviews.length})
                </h3>

                {user && role === "student" && (
                  <div className="mt-4 rounded-xl border-2 border-amber-200 dark:border-amber-800/40 bg-card p-4 sm:p-5">
                    <p className="text-sm font-semibold text-foreground mb-1">⭐ Rate this tutor</p>
                    <p className="text-xs text-muted-foreground mb-3">Share your experience to help other students</p>
                    <div className="flex items-center gap-1.5 mb-3">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button key={star} type="button"
                          onClick={() => setReviewRating(star)}
                          onMouseEnter={() => setReviewHover(star)}
                          onMouseLeave={() => setReviewHover(0)}
                          className="transition-transform hover:scale-125 active:scale-95"
                        >
                          <Star className={`h-7 w-7 sm:h-8 sm:w-8 transition-colors ${
                            star <= (reviewHover || reviewRating)
                              ? "fill-amber-400 text-amber-400"
                              : "text-border hover:text-amber-200"
                          }`} />
                        </button>
                      ))}
                      {reviewRating > 0 && <span className="ml-2 text-sm font-medium text-amber-600">{reviewRating}/5</span>}
                    </div>
                    <Textarea placeholder="Write about your experience with this tutor..." value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)} className="text-sm min-h-[80px] mb-3" rows={3}
                    />
                    <Button type="button" onClick={handleSubmitReview} disabled={submittingReview || reviewRating === 0}
                      className="w-full gap-2 bg-amber-500 text-primary-foreground hover:bg-amber-600"
                    >
                      <Send className="h-4 w-4" />
                      {submittingReview ? "Submitting..." : "Submit Review"}
                    </Button>
                  </div>
                )}
                {!user && (
                  <div className="mt-4 rounded-xl border border-amber-200 dark:border-amber-800/40 bg-card p-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      <Link to="/login" className="font-semibold text-primary underline">Sign in</Link> as a student to leave a review.
                    </p>
                  </div>
                )}

                {reviews.length > 0 ? (
                  <div className="mt-4 space-y-4">
                    {reviews.map((r) => (
                      <div key={r.id} className="rounded-xl border border-amber-200/50 dark:border-amber-800/30 bg-card p-3 sm:p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40 text-xs font-bold text-amber-700">
                              {((r as any).profile?.full_name || "A").charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <span className="text-sm font-medium text-foreground">{(r as any).profile?.full_name || "Anonymous"}</span>
                              <p className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <div className="flex">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? "fill-amber-400 text-amber-400" : "text-border"}`} />
                            ))}
                          </div>
                        </div>
                        {r.comment && <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{r.comment}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-muted-foreground">No reviews yet. Be the first to review!</p>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default TutorDetail;
