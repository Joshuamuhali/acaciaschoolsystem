import { supabase } from '../lib/supabase';
import { Profile } from '../types/database';

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) {
    if (error.message.includes('not authorized')) {
      throw new Error('This email is not authorized for access.');
    }
    throw error;
  }
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUserProfile(): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Use RPC function to bypass RLS for profile fetching
  const { data, error } = await supabase.rpc('get_user_profile', {
    p_user_id: user.id
  });

  if (error) {
    console.warn('Profile fetch error:', error);
    return null;
  }

  // Handle null result (profile not found)
  if (!data) return null;

  // Transform JSONB data to match Profile interface
  return {
    id: data.id,
    email: data.email,
    full_name: data.full_name,
    school_id: data.school_id,
    is_active: data.is_active,
    user_roles: data.roles || []
  };
}
