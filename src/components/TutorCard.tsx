import { Heart, MapPin, BookOpen, Star, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

interface TutorCardProps {
  id: string;
  name: string;
  photo: string;
  department: string;
  session: string;
  subjects: string[];
  areas: string[];
  fee: string;
  rating: number;
  experience: string;
}

const TutorCard = ({
  id,
  name,
  photo,
  department,
  session,
  subjects,
  areas,
  fee,
  rating,
  experience,
}: TutorCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
      className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-shadow hover:shadow-card-hover"
    >
      {/* Photo - constrained height */}
      <div className="relative aspect-[4/3] overflow-hidden sm:aspect-[3/4]">
        <img
          src={photo}
          alt={name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-transparent to-transparent" />

        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
          <div className="flex items-end justify-between">
            <div>
              <h3 className="font-display text-lg font-bold text-primary-foreground sm:text-xl">{name}</h3>
              <p className="mt-0.5 text-xs text-primary-foreground/80 sm:text-sm">{department} • {session}</p>
            </div>
            <div className="flex items-center gap-1 rounded-full bg-background/20 px-2 py-0.5 backdrop-blur-sm sm:px-2.5 sm:py-1">
              <Star className="h-3 w-3 fill-gold text-gold sm:h-3.5 sm:w-3.5" />
              <span className="text-xs font-semibold text-primary-foreground sm:text-sm">{rating > 0 ? rating : "New"}</span>
            </div>
          </div>
        </div>

        <button className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-background/20 backdrop-blur-sm transition-colors hover:bg-primary/80 sm:right-4 sm:top-4 sm:h-10 sm:w-10">
          <Heart className="h-4 w-4 text-primary-foreground sm:h-5 sm:w-5" />
        </button>
      </div>

      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap gap-1.5">
          {subjects.slice(0, 3).map((subject) => (
            <Badge key={subject} variant="secondary" className="rounded-full text-[10px] font-medium sm:text-xs">
              <BookOpen className="mr-1 h-2.5 w-2.5 sm:h-3 sm:w-3" />
              {subject}
            </Badge>
          ))}
          {subjects.length > 3 && (
            <Badge variant="secondary" className="rounded-full text-[10px] sm:text-xs">
              +{subjects.length - 3}
            </Badge>
          )}
        </div>

        <div className="mt-2.5 flex items-center gap-1.5 text-xs text-muted-foreground sm:mt-3 sm:text-sm">
          <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          {areas.slice(0, 2).join(", ")}
        </div>

        <div className="mt-3 flex items-center justify-between sm:mt-4">
          <div>
            <span className="font-display text-base font-bold text-foreground sm:text-lg">৳{fee}</span>
            <span className="text-xs text-muted-foreground sm:text-sm">/month</span>
          </div>
          <Link to={`/tutor/${id}`}>
            <Button size="sm" className="gap-1 text-xs bg-coral-gradient text-primary-foreground hover:opacity-90 sm:gap-1.5 sm:text-sm">
              View Profile
              <ArrowRight className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </motion.div>
  );
};

export default TutorCard;
