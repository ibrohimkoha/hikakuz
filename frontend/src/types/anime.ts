export interface Anime {
  id: number;
  mal_id: number;
  title_uz: string;
  title_en: string;
  title_jp: string;
  slug: string;
  synopsis: string;
  poster_url: string;
  banner_url: string;
  score: number;
  episodes_count: number;
  current_episode: number;
  status: string;
  season: string;
  year: number;
  studio?: string;
  telegram_url?: string;
  genres: string[];
  is_trending?: boolean;
  is_featured?: boolean;
}

export interface Fandub {
  id: number;
  name: string;
  slug: string;
  logo_url?: string;
  description?: string;
  admin_telegram_id?: number;
  admin_username?: string;
  admin_full_name?: string;
  episodes_count?: number;
  created_at?: string;
}

export interface FandubUser {
  id: number;
  fandub_id: number;
  fandub_name?: string;
  telegram_id: number;
  role: string;
  username?: string;
  first_name?: string;
  photo_url?: string;
  created_at?: string;
}

export interface AuditLog {
  id: number;
  actor_id: number;
  actor_name: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: string;
  created_at: string;
}

export interface Episode {
  id: number;
  anime_id: number;
  episode_number: number;
  title: string;
  thumbnail_url: string;
  duration: number;
  is_vip_only: boolean;
  is_vip?: boolean;
  has_uzbek_dub: boolean;
  has_subtitles: boolean;
  stream_url: string;
  b2_key?: string;
  video_url?: string;
  anime_title?: string;
  dub_studio?: string;
  studio?: string;
  fandub_id?: number;
  fandub_name?: string;
}
