import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const PrivacyPolicy = () => (
  <div className="min-h-screen">
    <Navbar />
    <div className="pt-16">
      <div className="container py-10 px-4 max-w-3xl">
        <h1 className="font-display text-3xl font-bold text-foreground mb-6">Privacy Policy</h1>
        <div className="prose prose-sm max-w-none text-muted-foreground space-y-4">
          <p><strong>Last updated:</strong> March 6, 2026</p>

          <h2 className="font-display text-lg font-semibold text-foreground mt-6">1. Information We Collect</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Account Information:</strong> Full name, email address, phone number, and role (tutor/student).</li>
            <li><strong>Tutor Profiles:</strong> Department, session/batch, subjects, preferred areas, fee expectations, bio, profile photos, and CVs.</li>
            <li><strong>Usage Data:</strong> Tuition requests, messages, reviews, and ratings.</li>
          </ul>

          <h2 className="font-display text-lg font-semibold text-foreground mt-6">2. How We Use Your Information</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>To match students with appropriate tutors.</li>
            <li>To verify KUET student identity through email domain verification.</li>
            <li>To display tutor profiles to prospective students.</li>
            <li>To facilitate communication between matched tutors and students.</li>
            <li>To enable the review and rating system.</li>
          </ul>

          <h2 className="font-display text-lg font-semibold text-foreground mt-6">3. Data Visibility</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Tutor profiles (approved) are publicly visible without sign-in.</li>
            <li>Contact information (phone numbers) is protected and only shared after admin-approved deals.</li>
            <li>Messages between users are private and only visible to participants and admins.</li>
            <li>Reviews and ratings are publicly visible on tutor profiles.</li>
          </ul>

          <h2 className="font-display text-lg font-semibold text-foreground mt-6">4. Data Security</h2>
          <p>We implement row-level security policies to ensure users can only access data they are authorized to see. All data is encrypted in transit. Passwords are securely hashed and never stored in plain text.</p>

          <h2 className="font-display text-lg font-semibold text-foreground mt-6">5. Admin Access</h2>
          <p>Platform administrators have access to all user data, including chat histories, for moderation and safety purposes. This ensures the platform remains safe and trustworthy.</p>

          <h2 className="font-display text-lg font-semibold text-foreground mt-6">6. Data Retention</h2>
          <p>Your data is retained as long as your account is active. If your account is deleted by an admin, all associated data (profile, requests, messages) will be removed.</p>

          <h2 className="font-display text-lg font-semibold text-foreground mt-6">7. Your Rights</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>You can update your profile information at any time.</li>
            <li>You can request account deletion by contacting the admin.</li>
            <li>Tutors can update or remove their profile details through their dashboard.</li>
          </ul>

          <h2 className="font-display text-lg font-semibold text-foreground mt-6">8. Contact</h2>
          <p>For privacy-related inquiries, contact the platform administrator through the admin panel.</p>
        </div>
      </div>
    </div>
    <Footer />
  </div>
);

export default PrivacyPolicy;
