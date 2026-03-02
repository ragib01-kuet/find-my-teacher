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
  subjects: string[];
  preferred_areas: string[];
  fee_expectation: number;
  experience: string | null;
  bio: string | null;
  photo_url: string | null;
  cv_url: string | null;
  demo_video_url: string | null;
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
