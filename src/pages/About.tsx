import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { GraduationCap, Shield, Users, MessageCircle, Star, Heart } from "lucide-react";

const About = () => (
  <div className="min-h-screen">
    <Navbar />
    <div className="pt-16">
      <div className="container py-10 px-4 max-w-3xl">
        <h1 className="font-display text-3xl font-bold text-foreground mb-2">About KUET Tuition Ecosystem</h1>
        <p className="text-muted-foreground mb-8">Connecting KUET excellence with learning needs in Khulna.</p>

        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-coral-gradient">
                <GraduationCap className="h-5 w-5 text-primary-foreground" />
              </div>
              <h2 className="font-display text-lg font-semibold text-foreground">Our Mission</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              KUET Tuition Ecosystem is the first dedicated academic matching platform for Khulna University of Engineering & Technology. We bridge the gap between talented KUET students who want to teach and local students/guardians who need quality tutoring — all within a trusted, verified ecosystem.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <h2 className="font-display text-lg font-semibold text-foreground mb-4">How It Works</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { icon: Shield, title: "Verified Tutors", desc: "KUET email holders are auto-verified. Others go through admin review." },
                { icon: Users, title: "Easy Matching", desc: "Students browse tutor profiles and express interest with one click." },
                { icon: MessageCircle, title: "Secure Chat", desc: "Built-in messaging with contact masking until deals are approved." },
                { icon: Star, title: "Ratings & Reviews", desc: "Students rate tutors to help the community make informed choices." },
              ].map((item) => (
                <div key={item.title} className="flex gap-3">
                  <item.icon className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <h2 className="font-display text-lg font-semibold text-foreground mb-3">Why KUET Tuition?</h2>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2"><Heart className="h-4 w-4 text-primary mt-0.5 shrink-0" /> <span><strong>Exclusive to KUET:</strong> Only verified KUET students can register as tutors.</span></li>
              <li className="flex items-start gap-2"><Heart className="h-4 w-4 text-primary mt-0.5 shrink-0" /> <span><strong>Admin-Moderated:</strong> Every interaction is overseen to ensure safety and quality.</span></li>
              <li className="flex items-start gap-2"><Heart className="h-4 w-4 text-primary mt-0.5 shrink-0" /> <span><strong>Free to Browse:</strong> No sign-in required to discover and explore tutor profiles.</span></li>
              <li className="flex items-start gap-2"><Heart className="h-4 w-4 text-primary mt-0.5 shrink-0" /> <span><strong>Local Focus:</strong> Designed specifically for the Khulna area and KUET community.</span></li>
            </ul>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-card text-center">
            <p className="text-sm text-muted-foreground">
              Built with ❤️ for the KUET community. <br />
              <span className="text-xs">© 2026 KUET Tuition Ecosystem. All rights reserved.</span>
            </p>
          </div>
        </div>
      </div>
    </div>
    <Footer />
  </div>
);

export default About;
