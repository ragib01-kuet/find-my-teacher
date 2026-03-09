import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Profile, TuitionRequest } from "@/types/database";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  BookOpen, MessageCircle, Users, Heart, Star, Search, Video, Play, X, FileText, ExternalLink,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Navigate, Link } from "react-router-dom";
import { toast } from "sonner";
import ContractModal from "@/components/ContractModal";

interface EnrichedRequest extends TuitionRequest {
  tutor_name?: string;
  tutor_rating?: number;
}

interface DemoAccess {
  id: string;
  tutor_id: string;
  tutor_name: string;
  video_url: string;
  completed: boolean;
  rating: number | null;
  comment: string | null;
}

const StudentDashboard = () => {
  const { user, role, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [requests, setRequests] = useState<EnrichedRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Demo video state
  const [demoAccess, setDemoAccess] = useState<DemoAccess[]>([]);
  const [activeDemo, setActiveDemo] = useState<DemoAccess | null>(null);
  const [videoCompleted, setVideoCompleted] = useState(false);
  const [demoRating, setDemoRating] = useState(0);
  const [demoRatingHover, setDemoRatingHover] = useState(0);
  const [demoComment, setDemoComment] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!user || role !== "student") return;
    const fetchData = async () => {
      const { data: p } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
      if (p) setProfile(p as Profile);

      const { data: reqs } = await supabase
        .from("tuition_requests").select("*").eq("student_id", user.id)
        .order("created_at", { ascending: false });
      if (reqs) {
        const enriched = await Promise.all(
          (reqs as TuitionRequest[]).map(async (r) => {
            const { data: tp } = await supabase.from("profiles").select("full_name").eq("user_id", r.tutor_id).single();
            const { data: tutorP } = await supabase.from("tutor_profiles").select("rating").eq("user_id", r.tutor_id).single();
            return { ...r, tutor_name: tp?.full_name || "Unknown", tutor_rating: tutorP?.rating || 0 } as EnrichedRequest;
          })
        );
        setRequests(enriched);
      }

      // Fetch demo video access (all, not just incomplete - allow multiple watches)
      const { data: demoViews } = await supabase
        .from("demo_video_views")
        .select("*")
        .eq("student_id", user.id);

      if (demoViews && demoViews.length > 0) {
        const demos = await Promise.all(
          demoViews.map(async (dv: any) => {
            const { data: tp } = await supabase.from("tutor_profiles").select("demo_video_url").eq("user_id", dv.tutor_id).single();
            const { data: prof } = await supabase.from("profiles").select("full_name").eq("user_id", dv.tutor_id).single();
            return {
              id: dv.id,
              tutor_id: dv.tutor_id,
              tutor_name: prof?.full_name || "Tutor",
              video_url: tp?.demo_video_url || "",
              completed: dv.completed,
              rating: dv.rating,
              comment: dv.comment,
            } as DemoAccess;
          })
        );
        setDemoAccess(demos.filter(d => d.video_url));
      }

      setLoading(false);
    };
    fetchData();
  }, [user, role]);

  const handleWatchDemo = async (demo: DemoAccess) => {
    setActiveDemo(demo);
    setVideoCompleted(false);
    setDemoRating(0);
    setDemoComment("");

    // Notify tutor that student is watching
    const studentName = profile?.full_name || "A student";
    await supabase.from("notifications").insert({
      user_id: demo.tutor_id,
      title: "Demo Video Viewed",
      message: `${studentName} is watching your demo class video`,
      type: "demo_watch",
      metadata: { student_id: user!.id, student_name: studentName },
    } as any);
  };

  const handleVideoEnded = () => {
    setVideoCompleted(true);
  };

  const handleSubmitDemoRating = async () => {
    if (!activeDemo || !user) return;
    // Rating is now optional
    if (demoRating === 0 && !demoComment.trim()) {
      // Just close without rating
      setActiveDemo(null);
      return;
    }
    setSubmittingRating(true);

    // Update with rating, mark completed
    await supabase.from("demo_video_views")
      .update({ rating: demoRating, comment: demoComment.trim(), completed: true } as any)
      .eq("id", activeDemo.id);

    // Notify tutor
    await supabase.from("notifications").insert({
      user_id: activeDemo.tutor_id,
      title: "Demo Class Rated",
      message: `${profile?.full_name || "A student"} rated your demo class ${demoRating}/5 ⭐`,
      type: "demo_rating",
      metadata: { student_id: user.id, rating: demoRating, comment: demoComment.trim() },
    } as any);

    toast.success("Thank you for your feedback!");
    setActiveDemo(null);
    setSubmittingRating(false);
  };

  const handleCloseDemo = () => {
    // Allow closing anytime - feedback is optional
    setActiveDemo(null);
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

  if (!user || role !== "student") return <Navigate to="/" />;

  const pendingCount = requests.filter(r => r.status === "pending").length;
  const acceptedCount = requests.filter(r => r.status === "accepted").length;

  // Find favorite tutor
  const tutorCounts: Record<string, { name: string; count: number }> = {};
  requests.forEach(r => {
    if (!tutorCounts[r.tutor_id]) tutorCounts[r.tutor_id] = { name: r.tutor_name || "", count: 0 };
    tutorCounts[r.tutor_id].count++;
  });
  const favTutor = Object.values(tutorCounts).sort((a, b) => b.count - a.count)[0];

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
        {/* Header */}
        <div className="border-b border-border bg-card">
          <div className="container py-6 px-4 sm:py-8">
            <h1 className="font-display text-xl font-bold text-foreground sm:text-2xl">
              Welcome, <span className="text-gradient-coral">{profile?.full_name || "Student"}</span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">Track your tutor requests and conversations</p>
          </div>
        </div>

        <div className="container py-6 px-4">
          {/* Stats */}
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {[
              { label: "Total Requests", value: requests.length, icon: BookOpen, color: "text-blue-500" },
              { label: "Pending", value: pendingCount, icon: Users, color: "text-amber-500" },
              { label: "Accepted", value: acceptedCount, icon: MessageCircle, color: "text-emerald-500" },
              { label: "Favorite Tutor", value: favTutor?.name || "—", icon: Heart, color: "text-primary", small: true },
            ].map(stat => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-border bg-card p-4 shadow-card">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{stat.label}</span>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <p className={`mt-1 font-display font-bold text-foreground ${stat.small ? "text-sm truncate" : "text-2xl"}`}>{stat.value}</p>
              </motion.div>
            ))}
          </div>

          {/* Quick actions */}
          <div className="mb-6 flex gap-3">
            <Link to="/discover">
              <Button className="gap-2 bg-coral-gradient text-primary-foreground hover:opacity-90">
                <Search className="h-4 w-4" /> Find Tutors
              </Button>
            </Link>
            <Link to="/messages">
              <Button variant="outline" className="gap-2">
                <MessageCircle className="h-4 w-4" /> Messages
              </Button>
            </Link>
          </div>

          {/* Demo Videos Available */}
          {demoAccess.length > 0 && (
            <div className="mb-6">
              <h2 className="mb-3 font-display text-lg font-semibold text-foreground flex items-center gap-2">
                <Video className="h-5 w-5 text-rose-500" /> Demo Videos Available
              </h2>
              <div className="space-y-3">
                {demoAccess.map(demo => (
                  <motion.div key={demo.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border-2 border-rose-200 dark:border-rose-800/40 bg-rose-50/50 dark:bg-rose-950/20 p-4 shadow-card"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{demo.tutor_name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">🎬 One-time demo video access</p>
                      </div>
                      <Button
                        onClick={() => handleWatchDemo(demo)}
                        className="gap-2 bg-rose-500 text-primary-foreground hover:bg-rose-600"
                        size="sm"
                      >
                        <Play className="h-3.5 w-3.5" /> Watch Now
                      </Button>
                    </div>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      ⚠️ You can only watch this once. After watching & rating, you'll need to request again from the chatbox.
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Active Demo Video Player */}
          <AnimatePresence>
            {activeDemo && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
              >
                <div className="w-full max-w-2xl rounded-2xl bg-card border border-border shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-rose-50 dark:bg-rose-950/20">
                    <div className="flex items-center gap-2">
                      <Video className="h-5 w-5 text-rose-500" />
                      <span className="font-display font-semibold text-foreground text-sm">Demo Class — {activeDemo.tutor_name}</span>
                    </div>
                    <button onClick={handleCloseDemo} className="rounded-full p-1.5 hover:bg-secondary transition-colors">
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>

                  <div className="p-4 space-y-4">
                    <video
                      ref={videoRef}
                      src={activeDemo.video_url}
                      controls
                      controlsList="nodownload"
                      onContextMenu={(e) => e.preventDefault()}
                      className="w-full rounded-xl"
                      onEnded={handleVideoEnded}
                      style={{ maxHeight: 400 }}
                      autoPlay
                    />

                    {/* Rating section after completion */}
                    {videoCompleted && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        className="rounded-xl border-2 border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20 p-4"
                      >
                        <p className="text-sm font-semibold text-foreground mb-1">⭐ Rate this demo class</p>
                        <p className="text-xs text-muted-foreground mb-3">
                          Your constructive feedback helps the tutor improve. After submitting, access will be consumed.
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
                          placeholder="Write constructive feedback (required, min 20 chars). E.g.: 'The explanation of Newton's 3rd law was unclear'"
                          value={demoComment}
                          onChange={(e) => setDemoComment(e.target.value)}
                          className="text-sm min-h-[80px] mb-2"
                          rows={3}
                        />
                        <p className="text-[10px] text-muted-foreground mb-3">Minimum 20 characters required</p>
                        <Button
                          onClick={handleSubmitDemoRating}
                          disabled={submittingRating || demoRating === 0 || demoComment.trim().length < 20}
                          className="w-full gap-2 bg-amber-500 text-primary-foreground hover:bg-amber-600"
                        >
                          <Star className="h-4 w-4" />
                          {submittingRating ? "Submitting..." : "Submit Rating & Close"}
                        </Button>
                      </motion.div>
                    )}

                    {!videoCompleted && (
                      <div className="rounded-xl bg-secondary/50 p-3 text-center">
                        <p className="text-xs text-muted-foreground">
                          Watch the full video to unlock the rating option
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Requests list */}
          <h2 className="mb-3 font-display text-lg font-semibold text-foreground">Your Requests</h2>
          <div className="space-y-3">
            {requests.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-card">
                <Search className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-3 font-display text-base font-semibold text-foreground">No requests yet</p>
                <p className="mt-1 text-sm text-muted-foreground">Browse tutors and express interest to get started!</p>
                <Link to="/discover"><Button className="mt-4 bg-coral-gradient text-primary-foreground">Browse Tutors</Button></Link>
              </div>
            ) : (
              requests.map(req => (
                <motion.div key={req.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-border bg-card p-4 shadow-card"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">{req.tutor_name}</span>
                        {req.tutor_rating > 0 && (
                          <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {req.tutor_rating}
                          </span>
                        )}
                        <Badge className={`text-[10px] ${statusColor(req.status)}`}>{req.status}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {req.subject && <span>📚 {req.subject}</span>}
                        {req.class_level && <span> • 🎓 {req.class_level}</span>}
                        {req.area && <span> • 📍 {req.area}</span>}
                      </p>
                    </div>
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
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default StudentDashboard;
