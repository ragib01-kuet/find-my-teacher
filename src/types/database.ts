// Local types for the KUET Tuition Ecosystem
// These mirror the database schema

export type AppRole = 'admin' | 'tutor' | 'student';
export type TutorStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type RequestStatus = 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled';
export type DealStatus = 'pending_admin' | 'approved' | 'rejected' | 'completed';

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
}

export interface TutorProfile {
  id: string;
  user_id: string;
  department: string;
  session: string;
  university_name: string;
  subjects: string[];
  preferred_areas: string[];
  fee_expectation: number;
  experience: string | null;
  bio: string | null;
  photo_url: string | null;
  cv_url: string | null;
  demo_video_url: string | null;
  id_card_url: string | null;
  status: TutorStatus;
  rating: number;
  total_reviews: number;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TuitionRequest {
  id: string;
  student_id: string;
  tutor_id: string;
  status: RequestStatus;
  message: string | null;
  student_name: string | null;
  subject: string | null;
  class_level: string | null;
  budget: number | null;
  area: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  request_id: string;
  sender_id: string;
  content: string;
  is_flagged: boolean;
  is_read: boolean;
  reply_to_id: string | null;
  created_at: string;
}

export interface Deal {
  id: string;
  request_id: string;
  tutor_id: string;
  student_id: string;
  status: DealStatus;
  admin_notes: string | null;
  commission_amount: number;
  contact_revealed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: string;
  tutor_id: string;
  student_id: string;
  deal_id: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface Report {
  id: string;
  reporter_id: string;
  reported_user_id: string | null;
  request_id: string | null;
  reason: string;
  details: string | null;
  status: string;
  admin_response: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  metadata: Record<string, any>;
  created_at: string;
}

export interface DemoVideoView {
  id: string;
  tutor_id: string;
  student_id: string;
  watched_at: string;
  completed: boolean;
  rating: number | null;
  comment: string | null;
  created_at: string;
}

// Profile completion helper — now requires 8 fields including university ID card
export function getProfileCompletion(tutor: TutorProfile | null): { percentage: number; missing: string[] } {
  if (!tutor) return { percentage: 0, missing: ['Everything'] };
  const fields: { key: string; label: string; check: () => boolean }[] = [
    { key: 'photo', label: 'Profile Photo', check: () => !!tutor.photo_url },
    { key: 'bio', label: 'Bio / About', check: () => !!tutor.bio && tutor.bio.trim().length > 0 },
    { key: 'subjects', label: 'Subjects', check: () => tutor.subjects?.length > 0 },
    { key: 'fee', label: 'Fee Expectation', check: () => tutor.fee_expectation > 0 },
    { key: 'experience', label: 'Experience', check: () => !!tutor.experience && tutor.experience.trim().length > 0 },
    { key: 'demo_video', label: 'Demo Video', check: () => !!tutor.demo_video_url },
    { key: 'id_card', label: 'University ID Card', check: () => !!tutor.id_card_url },
  ];
  const missing = fields.filter(f => !f.check()).map(f => f.label);
  const filled = fields.length - missing.length;
  return { percentage: Math.round((filled / fields.length) * 100), missing };
}
