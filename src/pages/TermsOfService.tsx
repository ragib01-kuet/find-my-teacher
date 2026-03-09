import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const TermsOfService = () => (
  <div className="min-h-screen">
    <Navbar />
    <div className="pt-16">
      <div className="container py-10 px-4 max-w-3xl">
        <h1 className="font-display text-3xl font-bold text-foreground mb-6">Terms of Service</h1>
        <div className="prose prose-sm max-w-none text-muted-foreground space-y-4">
          <p><strong>Last updated:</strong> March 6, 2026</p>

          <h2 className="font-display text-lg font-semibold text-foreground mt-6">1. Acceptance of Terms</h2>
          <p>By accessing and using the FindMyTeacher platform, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.</p>

          <h2 className="font-display text-lg font-semibold text-foreground mt-6">2. Platform Description</h2>
          <p>FindMyTeacher is an online tutoring platform that connects verified tutors with students seeking quality education. The platform is 100% online, enabling students from anywhere — including remote villages — to access quality tutoring.</p>

          <h2 className="font-display text-lg font-semibold text-foreground mt-6">3. User Accounts</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>You must provide accurate information when creating an account.</li>
            <li>All tutor profiles require admin verification before becoming visible.</li>
            <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
          </ul>

          <h2 className="font-display text-lg font-semibold text-foreground mt-6">4. User Conduct</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Do not share false or misleading information.</li>
            <li>Do not harass, abuse, or intimidate other users.</li>
            <li>Do not attempt to circumvent platform security measures.</li>
            <li>Do not share contact information through the messaging system before admin approval.</li>
          </ul>

          <h2 className="font-display text-lg font-semibold text-foreground mt-6">5. Tutor Responsibilities</h2>
          <p>Tutors must provide accurate academic qualifications, subject expertise, and fee expectations. Tutors agree to respond to student interest requests in a timely manner and conduct all sessions online.</p>

          <h2 className="font-display text-lg font-semibold text-foreground mt-6">6. Payment & Fees</h2>
          <p>All tuition fee negotiations and payments occur directly between tutors and students. The platform does not process payments. Commission arrangements may apply as determined by the admin.</p>

          <h2 className="font-display text-lg font-semibold text-foreground mt-6">7. Content & Reviews</h2>
          <p>Users may post reviews and ratings for tutors. All reviews must be honest and based on genuine experiences. The admin reserves the right to remove inappropriate content.</p>

          <h2 className="font-display text-lg font-semibold text-foreground mt-6">8. Termination</h2>
          <p>The admin may suspend or terminate any account that violates these terms, engages in fraudulent activity, or receives multiple reports from other users.</p>

          <h2 className="font-display text-lg font-semibold text-foreground mt-6">9. Disclaimer</h2>
          <p>FindMyTeacher acts as a matchmaking platform. We do not guarantee the quality of tutoring services, and we are not responsible for disputes between tutors and students.</p>

          <h2 className="font-display text-lg font-semibold text-foreground mt-6">10. Contact</h2>
          <p>For questions about these terms, please contact the platform administrator through the admin panel.</p>
        </div>
      </div>
    </div>
    <Footer />
  </div>
);

export default TermsOfService;
