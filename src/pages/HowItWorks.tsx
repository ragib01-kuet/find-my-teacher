import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Search, Heart, MessageCircle, CheckCircle, Shield, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const steps = [
  {
    icon: Search,
    title: "Browse Tutors",
    desc: "Explore verified tutor profiles. Filter by subject, budget, and availability. No sign-in needed to browse.",
  },
  {
    icon: Heart,
    title: "Express Interest",
    desc: "Found someone perfect? Send an interest request. Both parties must match before chatting begins.",
  },
  {
    icon: MessageCircle,
    title: "Chat Securely",
    desc: "Discuss details through our encrypted in-platform messaging. No phone numbers shared.",
  },
  {
    icon: Shield,
    title: "Admin Review",
    desc: "When both agree, admin reviews the match and conversation for quality assurance.",
  },
  {
    icon: CheckCircle,
    title: "Start Learning!",
    desc: "Digital agreement generated. Classroom access unlocked. Your online learning journey begins.",
  },
];

const HowItWorks = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="pt-16">
        <div className="container py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto max-w-2xl text-center"
          >
            <h1 className="font-display text-4xl font-bold text-foreground sm:text-5xl">
              How It <span className="text-gradient-coral">Works</span>
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              A simple, secure 5-step process from discovery to online learning.
            </p>
          </motion.div>

          <div className="mx-auto mt-16 max-w-2xl space-y-0">
            {steps.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative flex gap-6 pb-12 last:pb-0"
              >
                {/* Line */}
                {i < steps.length - 1 && (
                  <div className="absolute left-6 top-14 h-[calc(100%-3.5rem)] w-px bg-border" />
                )}
                {/* Icon */}
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-coral-gradient shadow-card">
                  <step.icon className="h-6 w-6 text-primary-foreground" />
                </div>
                {/* Content */}
                <div className="pt-1">
                  <h3 className="font-display text-lg font-semibold text-foreground">
                    <span className="text-primary">Step {i + 1}.</span> {step.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {step.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-20 text-center"
          >
            <Link to="/discover">
              <Button size="lg" className="gap-2 bg-coral-gradient px-8 text-primary-foreground hover:opacity-90">
                Start Exploring
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default HowItWorks;
