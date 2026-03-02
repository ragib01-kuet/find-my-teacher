import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import TutorCard from "@/components/TutorCard";
import Footer from "@/components/Footer";
import { mockTutors } from "@/data/mockTutors";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <HeroSection />
      <FeaturesSection />

      {/* Featured Tutors */}
      <section className="py-24">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex items-end justify-between"
          >
            <div>
              <h2 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
                Featured <span className="text-gradient-coral">Tutors</span>
              </h2>
              <p className="mt-2 text-muted-foreground">
                Hand-picked, admin-verified KUET tutors ready to help.
              </p>
            </div>
            <Link to="/discover" className="hidden sm:block">
              <Button variant="ghost" className="gap-2 text-primary">
                View All
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </motion.div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {mockTutors.slice(0, 3).map((tutor) => (
              <TutorCard key={tutor.id} {...tutor} />
            ))}
          </div>

          <div className="mt-8 text-center sm:hidden">
            <Link to="/discover">
              <Button className="gap-2 bg-coral-gradient text-primary-foreground">
                View All Tutors
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-3xl bg-hero-gradient p-10 text-center sm:p-16"
          >
            <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-coral/10 blur-3xl" />
            <h2 className="relative font-display text-3xl font-bold text-primary-foreground sm:text-4xl">
              Ready to Find Your <span className="text-gradient-coral">Perfect Tutor</span>?
            </h2>
            <p className="relative mx-auto mt-4 max-w-lg text-primary-foreground/60">
              Join the exclusive KUET tuition ecosystem. Whether you're a tutor looking for students or a guardian looking for quality education.
            </p>
            <div className="relative mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link to="/discover">
                <Button size="lg" className="gap-2 bg-coral-gradient px-8 text-primary-foreground hover:opacity-90">
                  Browse Tutors
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/login">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-primary-foreground/20 bg-primary-foreground/5 text-primary-foreground hover:bg-primary-foreground/10"
                >
                  Register Now
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
