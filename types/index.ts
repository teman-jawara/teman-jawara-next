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
  competition_category: CompetitionCategory;
  required_skills: string[];
  competition_event_name: string | null;
  deadline: string | null;
  number_of_teammates_needed: number | null;
  faculty_or_prodi_preference: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
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
