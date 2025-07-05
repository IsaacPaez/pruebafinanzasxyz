export interface Business {
  id: string;
  name: string;
  description?: string;
  user_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserProfile {
  id: string;
  phone: string;
  user_name: string;
  is_phone_verified: boolean;
  created_at?: string;
}