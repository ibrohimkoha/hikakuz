export interface UserFandubSession {
  id: number;
  name: string;
  slug: string;
  logo_url?: string;
  description?: string;
  role: string; // 'ADMIN' | 'UPLOADER' | 'MEMBER'
}

export interface UserSession {
  id: number;
  telegram_id?: number;
  email?: string;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  is_vip: boolean;
  is_admin: boolean;
  admin_role?: string;
  token: string;
  fandub?: UserFandubSession | null;
}
