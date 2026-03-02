import { Shield, Eye, MessageCircle, CheckCircle, Search, Star } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    icon: Shield,
    title: "Admin Verified",
    desc: "Every tutor is verified by KUET administration before going live.",
  },
  {
    icon: Eye,
    title: "Anonymous Until Ready",
    desc: "Your identity stays private until both parties agree to connect.",
  },
  {
    icon: MessageCircle,
    title: "Secure Messaging",
    desc: "In-platform chat with contact masking and admin monitoring.",
  },
  {
    icon: Search,
    title: "Smart Discovery",
    desc: "Filter by subject, budget, location, and experience level.",
  },
  {
    icon: CheckCircle,
    title: "Deal Workflow",
    desc: "Structured agreement process with digital contracts.",
  },
  {
    icon: Star,
    title: "Trust System",
    desc: "Ratings, reviews, and fraud detection for quality assurance.",
  },
];

const FeaturesSection = () => {
  return (
    <section className="py-24">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto max-w-2xl text-center"
        >
          <h2 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
            Built for <span className="text-gradient-coral">Trust & Privacy</span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            Not just another tuition site. A controlled academic ecosystem.
          </p>
        </motion.div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group rounded-2xl border border-border bg-card p-6 shadow-card transition-all hover:shadow-card-hover"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-coral-gradient">
                <feature.icon className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold text-foreground">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {feature.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
