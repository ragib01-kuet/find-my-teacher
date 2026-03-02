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
      {/* Photo */}
      <div className="relative aspect-[3/4] overflow-hidden">
        <img
          src={photo}
          alt={name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-transparent to-transparent" />

        {/* Overlay Info */}
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <div className="flex items-end justify-between">
            <div>
              <h3 className="font-display text-xl font-bold text-primary-foreground">{name}</h3>
              <p className="mt-0.5 text-sm text-primary-foreground/80">{department} • {session}</p>
            </div>
            <div className="flex items-center gap-1 rounded-full bg-background/20 px-2.5 py-1 backdrop-blur-sm">
              <Star className="h-3.5 w-3.5 fill-gold text-gold" />
              <span className="text-sm font-semibold text-primary-foreground">{rating}</span>
            </div>
          </div>
        </div>

        {/* Like Button */}
        <button className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-background/20 backdrop-blur-sm transition-colors hover:bg-primary/80">
          <Heart className="h-5 w-5 text-primary-foreground" />
        </button>
      </div>

      {/* Details */}
      <div className="p-5">
        <div className="flex flex-wrap gap-1.5">
          {subjects.slice(0, 3).map((subject) => (
            <Badge
              key={subject}
              variant="secondary"
              className="rounded-full text-xs font-medium"
            >
              <BookOpen className="mr-1 h-3 w-3" />
              {subject}
            </Badge>
          ))}
          {subjects.length > 3 && (
            <Badge variant="secondary" className="rounded-full text-xs">
              +{subjects.length - 3}
            </Badge>
          )}
        </div>

        <div className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          {areas.slice(0, 2).join(", ")}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div>
            <span className="font-display text-lg font-bold text-foreground">৳{fee}</span>
            <span className="text-sm text-muted-foreground">/month</span>
          </div>
          <Link to={`/tutor/${id}`}>
            <Button size="sm" className="gap-1.5 bg-coral-gradient text-primary-foreground hover:opacity-90">
              View Profile
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </motion.div>
  );
};

export default TutorCard;
