import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getCurrentUserProfile } from '../services/auth';
import { Profile } from '../types/database';

export function useUser() {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUser() {
      try {
        const profile = await getCurrentUserProfile();
        setUser(profile);
      } catch (error) {
        // Error handled silently - user state will be null
      } finally {
        setLoading(false);
      }
    }

    fetchUser();

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        fetchUser();
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setLoading(false);
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  return { user, loading, setUser };
}
