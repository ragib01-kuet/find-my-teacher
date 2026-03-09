import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "Who can register as a tutor?",
    a: "Anyone with teaching experience can register as a tutor. All tutor profiles go through our verification process before becoming visible to students.",
  },
  {
    q: "Do I need to sign in to browse tutors?",
    a: "No! The tutor discovery page is completely public. You can browse all verified tutor profiles, view their subjects, ratings, and expertise without creating an account. Sign-in is only required to express interest or leave reviews.",
  },
  {
    q: "How do I express interest in a tutor?",
    a: "Visit a tutor's profile and click 'Express Interest'. Fill in the subject you need help with, your class level, budget, and preferences. The tutor will receive your request and can accept or reject it.",
  },
  {
    q: "How does the matching process work?",
    a: "After you express interest, the tutor reviews your request. If accepted, a messaging channel opens between you and the tutor. Contact information is only revealed after the admin approves the deal and both parties sign the contract.",
  },
  {
    q: "Is my contact information safe?",
    a: "Yes. Phone numbers and personal contact details are masked in messages. Contact information is only shared after an admin-approved deal is finalized. All chats are monitored for safety.",
  },
  {
    q: "Can I leave reviews for tutors?",
    a: "Yes! Students can rate tutors from 1-5 stars and leave written comments. Reviews help other students make informed decisions. All reviews are publicly visible on the tutor's profile.",
  },
  {
    q: "Is FindMyTeacher only for online tutoring?",
    a: "Yes! FindMyTeacher is 100% online. This means students from anywhere — cities, towns, or remote villages — can access quality tutoring as long as they have an internet connection.",
  },
  {
    q: "How much do tutors charge?",
    a: "Each tutor sets their own fee expectation (displayed as ৳/month). You can negotiate the final fee directly. Typical rates range from ৳2,000 to ৳5,000 per month depending on the subject and level.",
  },
  {
    q: "What if I have a problem with a tutor?",
    a: "You can report any issues through the platform. The admin monitors all interactions and can suspend or remove tutors who violate the platform's terms of service.",
  },
  {
    q: "How do I update my tutor profile?",
    a: "Sign in as a tutor and go to 'My Profile' from the navigation menu. You can update your photo, bio, subjects, fee expectations, and more from your dashboard.",
  },
];

const FAQ = () => (
  <div className="min-h-screen">
    <Navbar />
    <div className="pt-16">
      <div className="container py-10 px-4 max-w-3xl">
        <h1 className="font-display text-3xl font-bold text-foreground mb-2">Frequently Asked Questions</h1>
        <p className="text-muted-foreground mb-8">Everything you need to know about FindMyTeacher.</p>

        <Accordion type="single" collapsible className="space-y-3">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="rounded-xl border border-border bg-card px-4 shadow-card">
              <AccordionTrigger className="text-sm font-semibold text-foreground hover:no-underline py-4">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground pb-4 leading-relaxed">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
    <Footer />
  </div>
);

export default FAQ;
