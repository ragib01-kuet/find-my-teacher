import { ArrowRight, Shield, Users, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import tutor1 from "@/assets/tutor-1.png";
import tutor2 from "@/assets/tutor-2.png";
import tutor3 from "@/assets/tutor-3.png";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen overflow-hidden bg-hero-gradient pt-16">
      {/* Decorative Elements */}
      <div className="absolute right-0 top-1/4 h-96 w-96 rounded-full bg-coral/5 blur-3xl" />
      <div className="absolute -left-20 bottom-1/4 h-72 w-72 rounded-full bg-coral/10 blur-3xl" />

      <div className="container relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center py-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="mx-auto max-w-3xl text-center"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-coral/20 bg-coral/10 px-4 py-1.5"
          >
            <Sparkles className="h-4 w-4 text-coral" />
            <span className="text-sm font-medium text-coral-light">Exclusive for KUET Students</span>
          </motion.div>

          <h1 className="font-display text-4xl font-bold leading-tight tracking-tight text-primary-foreground sm:text-5xl md:text-6xl lg:text-7xl">
            Find Your Perfect
            <br />
            <span className="text-gradient-coral">Academic Match</span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-primary-foreground/60 sm:text-lg">
            A premium, trust-based tuition ecosystem exclusively for KUET. 
            Verified tutors, anonymous matching, and admin-controlled quality.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link to="/discover">
              <Button size="lg" className="gap-2 bg-coral-gradient px-8 text-primary-foreground shadow-elevated hover:opacity-90">
                Browse Tutors
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/login">
              <Button
                size="lg"
                variant="outline"
                className="border-primary-foreground/20 bg-primary-foreground/5 px-8 text-primary-foreground hover:bg-primary-foreground/10"
              >
                Join as Tutor
              </Button>
            </Link>
          </div>

          {/* Trust Indicators */}
          <div className="mt-14 flex flex-wrap items-center justify-center gap-8 text-primary-foreground/40">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <span className="text-sm font-medium">Admin Verified</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <span className="text-sm font-medium">KUET Exclusive</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              <span className="text-sm font-medium">Anonymous Matching</span>
            </div>
          </div>
        </motion.div>

        {/* Floating Tutor Cards Preview */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="mt-16 flex items-end justify-center gap-4"
        >
          {[tutor1, tutor2, tutor3].map((src, i) => (
            <motion.div
              key={i}
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, delay: i * 0.4, repeat: Infinity, ease: "easeInOut" }}
              className={`overflow-hidden rounded-2xl border-2 border-primary-foreground/10 shadow-elevated ${
                i === 1 ? "h-48 w-36 sm:h-56 sm:w-40" : "h-40 w-28 sm:h-48 sm:w-32"
              }`}
            >
              <img src={src} alt="Tutor" className="h-full w-full object-cover" />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
