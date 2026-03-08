import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import TutorCard from "@/components/TutorCard";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Search, SlidersHorizontal, X, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { toast } from "sonner";

const allSubjects = ["Physics", "Mathematics", "Chemistry", "English", "ICT", "Biology", "Bangla", "Higher Math", "Accounting", "Economics", "General Math"];

interface DiscoverTutor {
  id: string;
  user_id: string;
  name: string;
  photo: string;
  department: string;
  session: string;
  subjects: string[];
  areas: string[];
  fee: string;
  rating: number;
  experience: string;
}

const Discover = () => {
  const { role } = useAuth();
  const [tutors, setTutors] = useState<DiscoverTutor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const fetchTutors = async () => {
      const { data, error } = await supabase
        .from("tutor_profiles")
        .select("*")
        .eq("status", "approved");

      if (error) {
        console.error("Error fetching tutors:", error);
        setLoading(false);
        return;
      }

      if (data) {
        // Filter to only 100% complete profiles
        const completeTutors = data.filter((t: any) => {
          return (
            !!t.photo_url &&
            !!t.bio && t.bio.trim().length > 0 &&
            t.subjects && t.subjects.length > 0 &&
            t.preferred_areas && t.preferred_areas.length > 0 &&
            t.fee_expectation > 0 &&
            !!t.experience && t.experience.trim().length > 0 &&
            !!t.demo_video_url
          );
        });

        const enriched = await Promise.all(
          completeTutors.map(async (t: any) => {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name, avatar_url")
              .eq("user_id", t.user_id)
              .single();

            // Fetch actual average rating from reviews
            const { data: reviewsData } = await supabase
              .from("reviews")
              .select("rating")
              .eq("tutor_id", t.user_id);
            
            const avgRating = reviewsData && reviewsData.length > 0
              ? parseFloat((reviewsData.reduce((sum: number, r: any) => sum + r.rating, 0) / reviewsData.length).toFixed(1))
              : 0;

            return {
              id: t.id,
              user_id: t.user_id,
              name: profile?.full_name || "Tutor",
              photo: t.photo_url || profile?.avatar_url || "",
              department: t.department,
              session: t.session,
              subjects: t.subjects || [],
              areas: t.preferred_areas || [],
              fee: t.fee_expectation?.toLocaleString() || "0",
              rating: avgRating,
              experience: t.experience || "N/A",
            } as DiscoverTutor;
          })
        );
        const shuffled = [...enriched].sort(() => Math.random() - 0.5);
        setTutors(shuffled);
      }
      setLoading(false);
    };
    fetchTutors();
  }, []);

  const toggleSubject = (s: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  const handleDeleteTutor = async (tutorId: string, userId: string) => {
    if (!confirm("Are you sure you want to delete this tutor profile?")) return;
    await supabase.from("tutor_profiles").delete().eq("id", tutorId);
    await supabase.from("tuition_requests").delete().eq("tutor_id", userId);
    setTutors((prev) => prev.filter((t) => t.id !== tutorId));
    toast.success("Tutor profile deleted");
  };

  const filtered = tutors.filter((t) => {
    const matchesSearch =
      !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.department.toLowerCase().includes(search.toLowerCase()) ||
      t.subjects.some((s) => s.toLowerCase().includes(search.toLowerCase()));

    const matchesSubjects =
      selectedSubjects.length === 0 ||
      t.subjects.some((s) => selectedSubjects.includes(s));

    return matchesSearch && matchesSubjects;
  });

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="pt-16">
        <div className="border-b border-border bg-card">
          <div className="container py-6 px-4 sm:py-8">
            <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
              Discover <span className="text-gradient-coral">Tutors</span>
            </h1>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              Browse verified KUET tutors with complete profiles. No sign-in required to explore.
            </p>

            <div className="mt-4 flex gap-3 sm:mt-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name, subject, or department..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant={showFilters ? "default" : "outline"}
                onClick={() => setShowFilters(!showFilters)}
                className={showFilters ? "bg-coral-gradient text-primary-foreground" : ""}
              >
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Filters</span>
              </Button>
            </div>

            {showFilters && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-4">
                <p className="mb-2 text-sm font-medium text-foreground">Subjects</p>
                <div className="flex flex-wrap gap-2">
                  {allSubjects.map((s) => (
                    <Badge
                      key={s}
                      variant={selectedSubjects.includes(s) ? "default" : "outline"}
                      className={`cursor-pointer transition-colors text-xs sm:text-sm ${
                        selectedSubjects.includes(s)
                          ? "bg-coral-gradient text-primary-foreground"
                          : "hover:bg-secondary"
                      }`}
                      onClick={() => toggleSubject(s)}
                    >
                      {s}
                    </Badge>
                  ))}
                </div>
                {selectedSubjects.length > 0 && (
                  <Button variant="ghost" size="sm" className="mt-2 text-primary" onClick={() => setSelectedSubjects([])}>
                    <X className="mr-1 h-3 w-3" />
                    Clear filters
                  </Button>
                )}
              </motion.div>
            )}
          </div>
        </div>

        <div className="container py-6 px-4 sm:py-10">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : (
            <>
              <p className="mb-4 text-sm text-muted-foreground sm:mb-6">
                {filtered.length} tutor{filtered.length !== 1 ? "s" : ""} found
              </p>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
                {filtered.map((tutor) => (
                  <div key={tutor.id} className="relative">
                    <TutorCard {...tutor} />
                    {role === "admin" && (
                      <Button
                        size="sm"
                        variant="destructive"
                        className="absolute top-2 right-2 z-10 gap-1 text-xs"
                        onClick={() => handleDeleteTutor(tutor.id, tutor.user_id)}
                      >
                        <Trash2 className="h-3 w-3" /> Delete
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              {filtered.length === 0 && (
                <div className="py-20 text-center">
                  <p className="text-lg font-medium text-foreground">No tutors found</p>
                  <p className="mt-1 text-muted-foreground">Only tutors with 100% complete profiles appear here. Try adjusting your filters.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Discover;
