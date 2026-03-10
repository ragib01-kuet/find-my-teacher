import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import TutorCard from "@/components/TutorCard";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { getProfileCompletion } from "@/types/database";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";

interface FeaturedTutor {
  id: string;
  user_id: string;
  name: string;
  photo: string;
  department: string;
  session: string;
  university_name: string;
  subjects: string[];
  areas: string[];
  fee: string;
  rating: number;
  experience: string;
}

const Index = () => {
  const [tutors, setTutors] = useState<FeaturedTutor[]>([]);
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user || !role) return;
    // Avoid flashing landing page after login
    if (role === "admin") navigate("/admin", { replace: true });
    else if (role === "tutor") navigate("/my-profile", { replace: true });
    else navigate("/dashboard", { replace: true });
  }, [user, role, loading, navigate]);

  useEffect(() => {
    const fetchFeatured = async () => {
      const { data } = await supabase
        .from("tutor_profiles")
        .select("*")
        .eq("status", "approved")
        .order("rating", { ascending: false })
        .limit(20);

      if (data) {
        // Featured tutors: 100% complete AND have demo video + id card
        const featuredTutors = data.filter((t: any) => {
          const isComplete = getProfileCompletion(t as any).percentage === 100;
          const hasDemo = !!t.demo_video_url;
          return isComplete && hasDemo;
        });

        const enriched = await Promise.all(
          featuredTutors.slice(0, 6).map(async (t: any) => {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name, avatar_url")
              .eq("user_id", t.user_id)
              .single();
            return {
              id: t.id,
              user_id: t.user_id,
              name: profile?.full_name || "Tutor",
              photo: t.photo_url || profile?.avatar_url || "",
              department: t.department,
              session: t.session,
              university_name: t.university_name || "KUET",
              subjects: t.subjects || [],
              areas: t.preferred_areas || [],
              fee: t.fee_expectation?.toLocaleString() || "0",
              rating: Number(t.rating) || 0,
              experience: t.experience || "N/A",
            } as FeaturedTutor;
          })
        );
        const shuffled = [...enriched].sort(() => Math.random() - 0.5);
        setTutors(shuffled);
      }
    };
    fetchFeatured();
  }, []);

  return (
    <div className="min-h-screen">
      <Navbar />
      {loading && (
        <div className="flex min-h-[30vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}
      {!loading && (
      <HeroSection />
      )}
      {!loading && (
      <FeaturesSection />
      )}

      {/* Featured Tutors */}
      {!loading && tutors.length > 0 && (
        <section className="py-16 sm:py-24">
          <div className="container px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex items-end justify-between"
            >
              <div>
                <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl lg:text-4xl">
                  Featured <span className="text-gradient-coral">Tutors</span>
                </h2>
                <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                  100% verified KUET tutors with demo class videos.
                </p>
              </div>
              <Link to="/discover" className="hidden sm:block">
                <Button variant="ghost" className="gap-2 text-primary">
                  View All <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </motion.div>

            <div className="mt-8 grid gap-4 grid-cols-1 sm:grid-cols-2 sm:gap-6 sm:mt-10 lg:grid-cols-3">
              {tutors.slice(0, 3).map((tutor) => (
                <TutorCard key={tutor.id} {...tutor} />
              ))}
            </div>

            <div className="mt-8 text-center sm:hidden">
              <Link to="/discover">
                <Button className="gap-2 bg-coral-gradient text-primary-foreground">
                  View All Tutors <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      {!loading && (
      <section className="py-16 sm:py-24">
        <div className="container px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-3xl bg-hero-gradient p-8 text-center sm:p-16"
          >
            <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-coral/10 blur-3xl" />
            <h2 className="relative font-display text-2xl font-bold text-primary-foreground sm:text-3xl lg:text-4xl">
              Ready to Find Your <span className="text-gradient-coral">Perfect Tutor</span>?
            </h2>
            <p className="relative mx-auto mt-4 max-w-lg text-sm text-primary-foreground/60 sm:text-base">
              Join the exclusive KUET tuition ecosystem.
            </p>
            <div className="relative mt-6 flex flex-col items-center gap-4 sm:mt-8 sm:flex-row sm:justify-center">
              <Link to="/discover">
                <Button size="lg" className="gap-2 bg-coral-gradient px-8 text-primary-foreground hover:opacity-90">
                  Browse Tutors <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" className="border-primary-foreground/20 bg-primary-foreground/5 text-primary-foreground hover:bg-primary-foreground/10">
                  Register Now
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
      )}

      <Footer />
    </div>
  );
};

export default Index;
