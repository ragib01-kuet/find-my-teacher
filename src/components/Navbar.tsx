import { Link, useLocation, useNavigate } from "react-router-dom";
import { GraduationCap, Search, LogIn, Menu, X, MessageCircle, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, role, signOut } = useAuth();

  // Secret admin access: 5 clicks within 3 seconds
  const clickTimesRef = useRef<number[]>([]);
  const handleTitleClick = useCallback(() => {
    const now = Date.now();
    clickTimesRef.current.push(now);
    // Keep only clicks within last 3 seconds
    clickTimesRef.current = clickTimesRef.current.filter(t => now - t < 3000);
    if (clickTimesRef.current.length >= 5) {
      clickTimesRef.current = [];
      navigate("/admin");
    }
  }, [navigate]);

  const links = [
    { to: "/", label: "Home" },
    { to: "/discover", label: "Find Tutors" },
    { to: "/how-it-works", label: "How It Works" },
  ];

  if (user) {
    links.push({ to: "/messages", label: "Messages" });
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Link to="/" className="flex h-9 w-9 items-center justify-center rounded-lg bg-coral-gradient">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </Link>
          <button
            onClick={handleTitleClick}
            className="font-display text-lg font-bold tracking-tight text-foreground select-none"
          >
            KUET <span className="text-gradient-coral">Tuition</span>
          </button>
        </div>

        <div className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                location.pathname === link.to
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <>
              <Link to="/messages">
                <Button variant="ghost" size="sm" className="gap-2">
                  <MessageCircle className="h-4 w-4" />
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={signOut}
                className="gap-2 text-muted-foreground"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </>
          ) : (
            <>
              <Link to="/discover">
                <Button variant="ghost" size="sm" className="gap-2">
                  <Search className="h-4 w-4" />
                  Search
                </Button>
              </Link>
              <Link to="/login">
                <Button size="sm" className="gap-2 bg-coral-gradient text-primary-foreground hover:opacity-90">
                  <LogIn className="h-4 w-4" />
                  Sign In
                </Button>
              </Link>
            </>
          )}
        </div>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="rounded-lg p-2 text-foreground md:hidden"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-b border-border bg-background md:hidden"
          >
            <div className="container flex flex-col gap-2 py-4">
              {links.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
              {user ? (
                <Button
                  variant="outline"
                  onClick={() => { signOut(); setMobileOpen(false); }}
                  className="mt-2"
                >
                  Sign Out
                </Button>
              ) : (
                <Link to="/login" onClick={() => setMobileOpen(false)}>
                  <Button className="mt-2 w-full bg-coral-gradient text-primary-foreground">Sign In</Button>
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
