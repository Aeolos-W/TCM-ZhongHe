export interface CommunityPost {
  id: string;
  title: string;
  content: string;
  type: 'record' | 'post' | 'qa' | 'experience';
  author: string;
  user_id: string | null;
  tags: string[];
  view_count: number;
  like_count: number;
  source_record_id: string | null;
  source_record_title: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommunityComment {
  id: string;
  post_id: string;
  content: string;
  author: string;
  user_id: string | null;
  created_at: string;
}

export interface AppUpdate {
  id: string;
  version: string;
  version_code: number;
  apk_url: string;
  changelog: string;
  force_update: boolean;
  created_at: string;
}

export interface UserProfile {
  id: string;
  display_name: string;
  avatar_url?: string;
  created_at: string;
}
