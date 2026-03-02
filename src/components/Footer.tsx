import { GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="border-t border-border bg-card py-12">
      <div className="container">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-coral-gradient">
              <GraduationCap className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display text-sm font-bold text-foreground">
              KUET Tuition Ecosystem
            </span>
          </Link>
          <p className="text-xs text-muted-foreground">
            © 2026 KUET Tuition Ecosystem. Exclusively for KUET, Khulna.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
