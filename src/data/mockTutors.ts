import tutor1 from "@/assets/tutor-1.png";
import tutor2 from "@/assets/tutor-2.png";
import tutor3 from "@/assets/tutor-3.png";

export interface Tutor {
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
  bio: string;
}

export const mockTutors: Tutor[] = [
  {
    id: "1",
    name: "Rafiul Islam",
    photo: tutor1,
    department: "EEE",
    session: "2019-20",
    subjects: ["Physics", "Mathematics", "Higher Math"],
    areas: ["Boyra", "Sonadanga", "Khalishpur"],
    fee: "3,500",
    rating: 4.8,
    experience: "2 years",
    bio: "Passionate about making Physics and Math simple. Experienced with HSC and SSC students.",
  },
  {
    id: "2",
    name: "Fatima Akter",
    photo: tutor2,
    department: "CSE",
    session: "2020-21",
    subjects: ["ICT", "Mathematics", "English"],
    areas: ["Daulatpur", "KUET Campus", "Fulbarigate"],
    fee: "4,000",
    rating: 4.9,
    experience: "3 years",
    bio: "Top of class in CSE. Specializing in ICT and English for HSC preparation.",
  },
  {
    id: "3",
    name: "Tanvir Hasan",
    photo: tutor3,
    department: "ME",
    session: "2020-21",
    subjects: ["Chemistry", "Physics", "Biology"],
    areas: ["Sonadanga", "New Market", "Shibbari"],
    fee: "3,000",
    rating: 4.6,
    experience: "1.5 years",
    bio: "Engineering student with strong foundation in science subjects. Great with class 8-SSC level students.",
  },
  {
    id: "4",
    name: "Nusrat Jahan",
    photo: tutor2,
    department: "CE",
    session: "2019-20",
    subjects: ["Bangla", "English", "General Math"],
    areas: ["Boyra", "KDA Avenue"],
    fee: "2,500",
    rating: 4.7,
    experience: "2.5 years",
    bio: "Friendly and patient. Excellent track record with class 1-8 students in language subjects.",
  },
  {
    id: "5",
    name: "Arif Rahman",
    photo: tutor1,
    department: "ECE",
    session: "2021-22",
    subjects: ["Physics", "Higher Math", "ICT"],
    areas: ["Khalishpur", "Daulatpur"],
    fee: "3,800",
    rating: 4.5,
    experience: "1 year",
    bio: "Young and energetic tutor passionate about electronics and physics education.",
  },
  {
    id: "6",
    name: "Mahfuz Ahmed",
    photo: tutor3,
    department: "IEM",
    session: "2020-21",
    subjects: ["Accounting", "Mathematics", "Economics"],
    areas: ["Sonadanga", "Gollamari"],
    fee: "3,200",
    rating: 4.4,
    experience: "2 years",
    bio: "Strong in math and commerce subjects. Ideal for SSC Commerce students.",
  },
];
