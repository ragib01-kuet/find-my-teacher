import { useState } from "react";
import Navbar from "@/components/Navbar";
import TutorCard from "@/components/TutorCard";
import Footer from "@/components/Footer";
import { mockTutors } from "@/data/mockTutors";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const allSubjects = ["Physics", "Mathematics", "Chemistry", "English", "ICT", "Biology", "Bangla", "Higher Math", "Accounting", "Economics", "General Math"];
const allAreas = ["Boyra", "Sonadanga", "Khalishpur", "Daulatpur", "KUET Campus", "Fulbarigate", "New Market", "Shibbari", "KDA Avenue", "Gollamari"];

const Discover = () => {
  const [search, setSearch] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const toggleSubject = (s: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  const filtered = mockTutors.filter((t) => {
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
        {/* Header */}
        <div className="border-b border-border bg-card">
          <div className="container py-8">
            <h1 className="font-display text-3xl font-bold text-foreground">
              Discover <span className="text-gradient-coral">Tutors</span>
            </h1>
            <p className="mt-2 text-muted-foreground">
              Browse verified KUET tutors. No sign-in required to explore.
            </p>

            {/* Search */}
            <div className="mt-6 flex gap-3">
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
                Filters
              </Button>
            </div>

            {/* Filters */}
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-4"
              >
                <p className="mb-2 text-sm font-medium text-foreground">Subjects</p>
                <div className="flex flex-wrap gap-2">
                  {allSubjects.map((s) => (
                    <Badge
                      key={s}
                      variant={selectedSubjects.includes(s) ? "default" : "outline"}
                      className={`cursor-pointer transition-colors ${
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
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 text-primary"
                    onClick={() => setSelectedSubjects([])}
                  >
                    <X className="mr-1 h-3 w-3" />
                    Clear filters
                  </Button>
                )}
              </motion.div>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="container py-10">
          <p className="mb-6 text-sm text-muted-foreground">
            {filtered.length} tutor{filtered.length !== 1 ? "s" : ""} found
          </p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
