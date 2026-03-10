import { useState, useEffect } from "react";
import { GraduationCap, Mail, Lock, ArrowRight, User, Phone, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AppRole } from "@/types/database";

const defaultPathForRole = (role: AppRole | null) => {
  switch (role) {
    case "admin":
      return "/admin";
    case "tutor":
      return "/my-profile";
    case "student":
    default:
      return "/dashboard";
  }
};

const Login = () => {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupRole, setSignupRole] = useState<AppRole>("student");
  const [signupDepartment, setSignupDepartment] = useState("");
  const [signupUniversity, setSignupUniversity] = useState("");
  const [signupLoading, setSignupLoading] = useState(false);
  const [autoApprovalPatterns, setAutoApprovalPatterns] = useState<string[]>([]);

  useEffect(() => {
    const fetchPatterns = async () => {
      const { data } = await supabase
        .from("auto_approval_patterns")
        .select("pattern")
        .eq("is_active", true);
      if (data) setAutoApprovalPatterns(data.map((p: any) => p.pattern));
    };
    fetchPatterns();
  }, []);

  const isAutoApprovedEmail = autoApprovalPatterns.some((p) => signupEmail.endsWith(p));

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    const { error } = await signIn(loginEmail, loginPassword);
    if (error) {
      setLoginLoading(false);
      toast.error(error.message);
    } else {
      // Resolve role immediately to avoid flashing landing page
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;
      if (userId) {
        const { data: roleData, error: roleError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .maybeSingle();
        if (roleError) {
          toast.success("Welcome back!");
          navigate("/dashboard");
        } else {
          toast.success("Welcome back!");
          navigate(defaultPathForRole((roleData as any)?.role ?? null));
        }
      } else {
        toast.success("Welcome back!");
        navigate("/dashboard");
      }
      setLoginLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupUniversity.trim()) {
      toast.error("Please enter your university/institution name.");
      return;
    }
    if (signupRole === "tutor" && !signupDepartment) {
      toast.error("Please fill in your department/subject expertise.");
      return;
    }
    setSignupLoading(true);
    const { error } = await signUp(signupEmail, signupPassword, signupName, signupRole, {
      phone: signupPhone,
      department: signupDepartment,
      university_name: signupUniversity,
    });
    setSignupLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      if (signupRole === "tutor") {
        if (isAutoApprovedEmail) {
          toast.success("Account created & auto-approved! Redirecting to your dashboard.");
        } else {
          toast.success("Account created! Your profile is pending admin approval.");
        }
        navigate("/my-profile");
      } else {
        toast.success("Account created! Find your perfect tutor.");
        navigate("/discover");
      }
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left Panel */}
      <div className="hidden flex-1 bg-hero-gradient lg:flex lg:items-center lg:justify-center">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="max-w-md px-12"
        >
          <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-coral-gradient">
            <GraduationCap className="h-7 w-7 text-primary-foreground" />
          </div>
          <h2 className="font-display text-3xl font-bold text-primary-foreground">
            Welcome to FindMyTeacher
          </h2>
          <p className="mt-4 text-primary-foreground/60">
            Join our online learning platform. Connect with verified tutors from anywhere — whether you're in a city or a remote village.
          </p>
        </motion.div>
      </div>

      {/* Right Panel */}
      <div className="flex flex-1 items-center justify-center bg-background px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          <Link to="/" className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-coral-gradient">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-bold text-foreground">FindMyTeacher</span>
          </Link>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-6">
              <div className="space-y-1">
                <h2 className="font-display text-2xl font-bold text-foreground">Welcome back</h2>
                <p className="text-sm text-muted-foreground">Sign in to your account</p>
              </div>
              <form className="mt-6 space-y-4" onSubmit={handleLogin}>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="you@example.com" className="pl-10" type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input type="password" placeholder="••••••••" className="pl-10" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required />
                  </div>
                </div>
                <Button type="submit" disabled={loginLoading} className="w-full gap-2 bg-coral-gradient text-primary-foreground hover:opacity-90">
                  {loginLoading ? "Signing in..." : "Sign In"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="mt-6">
              <div className="space-y-1">
                <h2 className="font-display text-2xl font-bold text-foreground">Create account</h2>
                <p className="text-sm text-muted-foreground">Join as a tutor or student</p>
              </div>
              <form className="mt-6 space-y-4" onSubmit={handleSignup}>
                <div className="space-y-2">
                  <Label>Full Name *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="Your full name" className="pl-10" value={signupName} onChange={(e) => setSignupName(e.target.value)} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="you@example.com" className="pl-10" type="email" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} required />
                  </div>
                  {signupRole === "tutor" && signupEmail && isAutoApprovedEmail && (
                    <p className="text-xs text-green-600 mt-1">✅ Matching email detected — you'll be auto-approved!</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Password *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input type="password" placeholder="Min 6 characters" className="pl-10" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} required minLength={6} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Contact Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="01XXXXXXXXX" className="pl-10" value={signupPhone} onChange={(e) => setSignupPhone(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>University / Institution *</Label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="e.g., Dhaka University" className="pl-10" value={signupUniversity} onChange={(e) => setSignupUniversity(e.target.value)} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>I am a</Label>
                  <RadioGroup value={signupRole} onValueChange={(v) => setSignupRole(v as AppRole)} className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="student" id="student" />
                      <Label htmlFor="student" className="cursor-pointer">Student / Guardian</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="tutor" id="tutor" />
                      <Label htmlFor="tutor" className="cursor-pointer">Tutor</Label>
                    </div>
                  </RadioGroup>
                </div>

                {signupRole === "tutor" && (
                  <div className="space-y-3 rounded-xl border border-border bg-secondary/30 p-3">
                    <p className="text-xs font-medium text-foreground">Tutor Details</p>
                    <div className="space-y-1">
                      <Label className="text-xs">Department / Expertise *</Label>
                      <div className="relative">
                        <Building className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input placeholder="e.g., Mathematics, Physics" className="pl-9 text-sm" value={signupDepartment} onChange={(e) => setSignupDepartment(e.target.value)} required />
                      </div>
                    </div>
                    {isAutoApprovedEmail ? (
                      <p className="text-xs text-green-600">
                        ✅ Your email matches an auto-approval rule. You'll be approved instantly!
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        ⚠️ Your profile will require admin approval before becoming visible.
                      </p>
                    )}
                  </div>
                )}

                <Button type="submit" disabled={signupLoading} className="w-full gap-2 bg-coral-gradient text-primary-foreground hover:opacity-90">
                  {signupLoading ? "Creating..." : "Create Account"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            By continuing, you agree to our{" "}
            <Link to="/terms" className="underline hover:text-foreground">Terms of Service</Link>{" "}
            and{" "}
            <Link to="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
