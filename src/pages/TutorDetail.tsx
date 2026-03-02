import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { TutorProfile, Profile, Review } from "@/types/database";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  BookOpen,
  MapPin,
  Star,
  Calendar,
  GraduationCap,
  Heart,
  MessageCircle,
  Shield,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { mockTutors } from "@/data/mockTutors";

const TutorDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user, role } = useAuth();
  const [tutor, setTutor] = useState<(TutorProfile & { profile?: Profile }) | null>(null);
  const [reviews, setReviews] = useState<(Review & { profile?: Profile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [useMock, setUseMock] = useState(false);

  // Interest form
  const [showInterest, setShowInterest] = useState(false);
  const [interestMsg, setInterestMsg] = useState("");
  const [interestSubject, setInterestSubject] = useState("");
  const [interestClass, setInterestClass] = useState("");
  const [interestBudget, setInterestBudget] = useState("");
  const [interestArea, setInterestArea] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const fetchTutor = async () => {
      // Try DB first
      const { data, error } = await supabase
        .from("tutor_profiles")
        .select("*")
        .eq("id", id!)
        .single();

      if (data) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", data.user_id)
          .single();

        setTutor({ ...data, profile: profileData } as any);

        // Fetch reviews
        const { data: reviewsData } = await supabase
          .from("reviews")
          .select("*")
          .eq("tutor_id", data.user_id)
          .order("created_at", { ascending: false });

        if (reviewsData) setReviews(reviewsData as any);
      } else {
        // Fall back to mock data
        const mock = mockTutors.find((t) => t.id === id);
        if (mock) {
          setUseMock(true);
          setTutor({
            id: mock.id,
            user_id: mock.id,
            department: mock.department,
            session: mock.session,
            subjects: mock.subjects,
            preferred_areas: mock.areas,
            fee_expectation: parseInt(mock.fee.replace(/,/g, "")),
            experience: mock.experience,
            bio: mock.bio,
            photo_url: mock.photo,
            cv_url: null,
            demo_video_url: null,
            status: "approved",
            rating: mock.rating,
            total_reviews: 12,
            admin_notes: null,
            created_at: "",
            updated_at: "",
            profile: { full_name: mock.name } as any,
          } as any);
        }
      }
      setLoading(false);
    };
    fetchTutor();
  }, [id]);

  const handleSendInterest = async () => {
    if (!user) {
      toast.error("Please sign in to express interest");
      return;
    }
    if (!tutor) return;
    setSending(true);

    const { error } = await supabase.from("tuition_requests").insert({
      student_id: user.id,
      tutor_id: tutor.user_id,
      message: interestMsg,
      subject: interestSubject,
      class_level: interestClass,
      budget: interestBudget ? parseInt(interestBudget) : null,
      area: interestArea,
    } as any);

    setSending(false);
    if (error) {
      toast.error("Failed to send request. " + error.message);
    } else {
      toast.success("Interest sent! The tutor will be notified.");
      setShowInterest(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex min-h-[60vh] items-center justify-center pt-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!tutor) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex min-h-[60vh] flex-col items-center justify-center pt-16">
          <p className="text-xl font-semibold text-foreground">Tutor not found</p>
          <Link to="/discover">
            <Button variant="ghost" className="mt-4 gap-2 text-primary">
              <ArrowLeft className="h-4 w-4" />
              Back to Discover
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const name = (tutor as any).profile?.full_name || "Tutor";
  const photo = tutor.photo_url;

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="pt-16">
        <div className="container py-8">
          <Link to="/discover">
            <Button variant="ghost" size="sm" className="mb-6 gap-2 text-muted-foreground">
              <ArrowLeft className="h-4 w-4" />
              Back to Tutors
            </Button>
          </Link>

          <div className="grid gap-8 lg:grid-cols-3">
            {/* Photo & Quick Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="lg:col-span-1"
            >
              <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
                <div className="aspect-[3/4] overflow-hidden">
                  {photo ? (
                    <img src={photo} alt={name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-secondary">
                      <GraduationCap className="h-20 w-20 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Star className="h-5 w-5 fill-gold text-gold" />
                      <span className="font-display text-lg font-bold text-foreground">{tutor.rating}</span>
                      <span className="text-sm text-muted-foreground">({tutor.total_reviews} reviews)</span>
                    </div>
                    <Badge variant="secondary" className="bg-coral/10 text-coral">
                      <Shield className="mr-1 h-3 w-3" />
                      Verified
                    </Badge>
                  </div>

                  <div className="mt-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <GraduationCap className="h-4 w-4" />
                      {tutor.department} • {tutor.session}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {tutor.experience || "N/A"} experience
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {tutor.preferred_areas.join(", ")}
                    </div>
                  </div>

                  <div className="mt-5 border-t border-border pt-4">
                    <div className="text-center">
                      <span className="font-display text-2xl font-bold text-foreground">
                        ৳{tutor.fee_expectation.toLocaleString()}
                      </span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Details */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="space-y-6 lg:col-span-2"
            >
              <div>
                <h1 className="font-display text-3xl font-bold text-foreground">{name}</h1>
                <p className="mt-1 text-muted-foreground">
                  {tutor.department} Department, KUET • Session {tutor.session}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Dialog open={showInterest} onOpenChange={setShowInterest}>
                  <DialogTrigger asChild>
                    <Button size="lg" className="gap-2 bg-coral-gradient text-primary-foreground hover:opacity-90">
                      <Heart className="h-4 w-4" />
                      Express Interest
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
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
                        <Label>Subject Needed</Label>
                        <Input
                          placeholder="e.g., Physics, Mathematics"
                          value={interestSubject}
                          onChange={(e) => setInterestSubject(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Class Level</Label>
                        <Input
                          placeholder="e.g., HSC, SSC, Class 8"
                          value={interestClass}
                          onChange={(e) => setInterestClass(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Budget (৳/month)</Label>
                        <Input
                          type="number"
                          placeholder="e.g., 3000"
                          value={interestBudget}
                          onChange={(e) => setInterestBudget(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Your Area</Label>
                        <Input
                          placeholder="e.g., Sonadanga, Boyra"
                          value={interestArea}
                          onChange={(e) => setInterestArea(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Message</Label>
                        <Textarea
                          placeholder="Tell the tutor about your needs..."
                          value={interestMsg}
                          onChange={(e) => setInterestMsg(e.target.value)}
                        />
                      </div>
                      <Button
                        onClick={handleSendInterest}
                        disabled={sending || !user}
                        className="w-full bg-coral-gradient text-primary-foreground"
                      >
                        {sending ? "Sending..." : "Send Interest Request"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Bio */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
                <h3 className="font-display text-lg font-semibold text-foreground">About</h3>
                <p className="mt-3 leading-relaxed text-muted-foreground">
                  {tutor.bio || "No bio available."}
                </p>
              </div>

              {/* Subjects */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
                <h3 className="font-display text-lg font-semibold text-foreground">Subjects</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {tutor.subjects.map((s) => (
                    <Badge key={s} variant="secondary" className="rounded-full px-3 py-1">
                      <BookOpen className="mr-1.5 h-3 w-3" />
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Reviews */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
                <h3 className="font-display text-lg font-semibold text-foreground">
                  Reviews ({reviews.length || tutor.total_reviews})
                </h3>
                {reviews.length > 0 ? (
                  <div className="mt-4 space-y-4">
                    {reviews.map((r) => (
                      <div key={r.id} className="border-b border-border pb-4 last:border-0 last:pb-0">
                        <div className="flex items-center gap-2">
                          <div className="flex">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${i < r.rating ? "fill-gold text-gold" : "text-border"}`}
                              />
                            ))}
                          </div>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">{r.comment}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">No reviews yet.</p>
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
