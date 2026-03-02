import { useState } from "react";
import Navbar from "@/components/Navbar";
import TutorCard from "@/components/TutorCard";
import Footer from "@/components/Footer";
import { useShuffledTutors } from "@/hooks/useShuffledTutors";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const allSubjects = ["Physics", "Mathematics", "Chemistry", "English", "ICT", "Biology", "Bangla", "Higher Math", "Accounting", "Economics", "General Math"];

const Discover = () => {
  const tutors = useShuffledTutors();
  const [search, setSearch] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const toggleSubject = (s: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  const filtered = tutors.filter((t) => {
    const matchesSearch =
      !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.department.toLowerCase().includes(search.toLowerCase()) ||
      t.subjects.some((s) => s.toLowerCase().includes(search.toLowerCase()));

    const matchesSubjects =
      selectedSubjects.length === 0 ||
      t.subjects.some((s) => selectedSubjects.includes(s));

    return matchesSearch && matchesSubjects;
  });

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="pt-16">
        <div className="border-b border-border bg-card">
          <div className="container py-6 px-4 sm:py-8">
            <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
              Discover <span className="text-gradient-coral">Tutors</span>
            </h1>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              Browse verified KUET tutors. No sign-in required to explore.
            </p>

            <div className="mt-4 flex gap-3 sm:mt-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name, subject, or department..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant={showFilters ? "default" : "outline"}
                onClick={() => setShowFilters(!showFilters)}
                className={showFilters ? "bg-coral-gradient text-primary-foreground" : ""}
              >
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Filters</span>
              </Button>
            </div>

            {showFilters && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-4">
                <p className="mb-2 text-sm font-medium text-foreground">Subjects</p>
                <div className="flex flex-wrap gap-2">
                  {allSubjects.map((s) => (
                    <Badge
                      key={s}
                      variant={selectedSubjects.includes(s) ? "default" : "outline"}
                      className={`cursor-pointer transition-colors text-xs sm:text-sm ${
                        selectedSubjects.includes(s)
                          ? "bg-coral-gradient text-primary-foreground"
                          : "hover:bg-secondary"
                      }`}
                      onClick={() => toggleSubject(s)}
                    >
                      {s}
                    </Badge>
                  ))}
                </div>
                {selectedSubjects.length > 0 && (
                  <Button variant="ghost" size="sm" className="mt-2 text-primary" onClick={() => setSelectedSubjects([])}>
                    <X className="mr-1 h-3 w-3" />
                    Clear filters
                  </Button>
                )}
              </motion.div>
            )}
          </div>
        </div>

        <div className="container py-6 px-4 sm:py-10">
          <p className="mb-4 text-sm text-muted-foreground sm:mb-6">
            {filtered.length} tutor{filtered.length !== 1 ? "s" : ""} found
          </p>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
            {filtered.map((tutor) => (
              <TutorCard key={tutor.id} {...tutor} />
            ))}
          </div>
          {filtered.length === 0 && (
            <div className="py-20 text-center">
              <p className="text-lg font-medium text-foreground">No tutors found</p>
              <p className="mt-1 text-muted-foreground">Try adjusting your filters.</p>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Discover;
