import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface UserProfile {
  user_id: string;
  user_role: string;
  nombre_usuario: string | null;
  email: string;
  ambito_almacenes: number[] | null;
}

export function useUserProfile() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const { data, error } = await supabase
            .from('user_profiles')
            .select('user_id, user_role, nombre_usuario, email, ambito_almacenes')
            .eq('user_id', user.id)
            .maybeSingle();

          if (error) {
            console.error('[useUserProfile] Error fetching profile:', error);
          }

          if (data) {
            setUserProfile(data);
          }
        }
      } catch (error) {
        console.error('[useUserProfile] Exception:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  const isAdmin = userProfile?.user_role === 'ADMINISTRADOR';

  return {
    userProfile,
    loading,
    isAdmin,
  };
}
