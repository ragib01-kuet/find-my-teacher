import { Link, useLocation, useNavigate } from "react-router-dom";
import { GraduationCap, Search, LogIn, Menu, X, MessageCircle, LogOut, User, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, role, signOut } = useAuth();

  // Fetch unread message count
  useEffect(() => {
    if (!user) { setUnreadCount(0); return; }

    const fetchUnread = async () => {
      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .neq("sender_id", user.id)
        .eq("is_read", false);
      setUnreadCount(count || 0);
    };

    fetchUnread();

    const channel = supabase
      .channel("unread-nav")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        fetchUnread();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  // Secret admin access: 5 clicks within 3 seconds
  const clickTimesRef = useRef<number[]>([]);
  const handleTitleClick = useCallback(() => {
    const now = Date.now();
    clickTimesRef.current.push(now);
    clickTimesRef.current = clickTimesRef.current.filter(t => now - t < 3000);
    if (clickTimesRef.current.length >= 5) {
      clickTimesRef.current = [];
      navigate("/admin");
    }
  }, [navigate]);

  const links: { to: string; label: string }[] = [];

  if (user && role === "tutor") {
    links.push({ to: "/my-profile", label: "Dashboard" });
    links.push({ to: "/discover", label: "Find Tutors" });
    links.push({ to: "/messages", label: "Messages" });
  } else if (user && role === "student") {
    links.push({ to: "/dashboard", label: "Dashboard" });
    links.push({ to: "/discover", label: "Find Tutors" });
    links.push({ to: "/messages", label: "Messages" });
  } else {
    links.push({ to: "/", label: "Home" });
    links.push({ to: "/discover", label: "Find Tutors" });
    links.push({ to: "/how-it-works", label: "How It Works" });
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
              className={`relative rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                location.pathname === link.to
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {link.label}
              {link.label === "Messages" && unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <>
              {role === "tutor" && (
                <Link to="/my-profile">
                  <Button variant="ghost" size="sm" className="gap-2">
                    <User className="h-4 w-4" />
                  </Button>
                </Link>
              )}
              {role === "student" && (
                <Link to="/dashboard">
                  <Button variant="ghost" size="sm" className="gap-2">
                    <LayoutDashboard className="h-4 w-4" />
                  </Button>
                </Link>
              )}
              <Link to="/messages" className="relative">
                <Button variant="ghost" size="sm" className="gap-2">
                  <MessageCircle className="h-4 w-4" />
                </Button>
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
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
                  className="relative rounded-lg px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  {link.label}
                  {link.label === "Messages" && unreadCount > 0 && (
                    <span className="ml-2 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
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
