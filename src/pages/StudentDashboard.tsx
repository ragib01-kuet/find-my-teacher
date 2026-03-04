import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Profile, TuitionRequest } from "@/types/database";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BookOpen, MessageCircle, Users, Heart, Star, Search,
} from "lucide-react";
import { motion } from "framer-motion";
import { Navigate, Link } from "react-router-dom";

interface EnrichedRequest extends TuitionRequest {
  tutor_name?: string;
  tutor_rating?: number;
}

const StudentDashboard = () => {
  const { user, role, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [requests, setRequests] = useState<EnrichedRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || role !== "student") return;
    const fetch = async () => {
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
      setLoading(false);
    };
    fetch();
  }, [user, role]);

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
