/**
 * Tipe data dasar TemanJawara, mengikuti PRD bagian 15.
 * Ini hanya tipe TypeScript (belum terhubung ke database).
 * Di Build berikutnya, tipe ini bisa dicocokkan dengan skema Supabase.
 */
import type { CompetitionCategory } from "@/constants/competition";

export type ConnectionStatus = "pending" | "accepted" | "rejected";

export type NotificationType =
  | "connection_request"
  | "connection_accepted"
  | "post_liked"
  | "post_commented";

export type Profile = {
  id: string;
  full_name: string;
  nim: string | null;
  faculty: string | null;
  study_program: string | null;
  generation: number | null;
  profile_picture_url: string | null;
  bio: string | null;
  skills: string[];
  competition_interests: string[];
  contact_email: string | null;
  whatsapp: string | null;
  instagram: string | null;
  share_contact_email: boolean;
  share_contact_whatsapp: boolean;
  share_contact_instagram: boolean;
  created_at: string;
  updated_at: string;
};

export type Post = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  required_skills: string[];
  event_name: string | null;
  deadline: string | null;
  teammate_count: number;
  faculty_preference: string | null;
  study_program_preference: string | null;
  image_url: string | null;
  status: "active" | "closed";
  created_at: string;
  updated_at: string;
   like_count?: number;
  comment_count?: number;
  view_count?: number;
  author?: {
    id: string;
    full_name: string | null;
    nim: string | null;
    avatar_url: string | null;
    faculty: string | null;
    study_program: string | null;
    generation: number | null;
    bio: string | null;
    skills?: string[];
  } | null;
  // Legacy alias fields for backward compatibility
  competition_category?: CompetitionCategory;
  competition_event_name?: string | null;
  number_of_teammates_needed?: number | null;
  faculty_or_prodi_preference?: string | null;
};

export type Like = {
  user_id: string;
  post_id: string;
  created_at: string;
};

export type SavedPost = {
  user_id: string;
  post_id: string;
  created_at: string;
};

export type Comment = {
  id: string;
  user_id: string;
  post_id: string;
  content: string;
  created_at: string;
  updated_at: string;
};

export type Connection = {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: ConnectionStatus;
  created_at: string;
  updated_at: string;
};

export type Notification = {
  id: string;
  recipient_id: string;
  type: NotificationType;
  actor_id: string;
  post_id: string | null;
  connection_id: string | null;
  read: boolean;
  created_at: string;
};
