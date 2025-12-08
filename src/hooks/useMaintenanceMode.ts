import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface MaintenanceModeState {
  isActive: boolean;
  loading: boolean;
  error: Error | null;
}

export function useMaintenanceMode(): MaintenanceModeState {
  const [state, setState] = useState<MaintenanceModeState>({
    isActive: false,
    loading: true,
    error: null,
  });

  useEffect(() => {
    checkMaintenanceMode();

    // Suscribirse a cambios en tiempo real
    const subscription = supabase
      .channel('maintenance-mode-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tbl_maintenance_mode',
        },
        (payload) => {
          console.log('Maintenance mode changed:', payload);
          checkMaintenanceMode();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkMaintenanceMode = async () => {
    try {
      const { data, error } = await supabase
        .from('tbl_maintenance_mode')
        .select('is_active')
        .eq('id', 1)
        .single();

      if (error) throw error;

      setState({
        isActive: data?.is_active || false,
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error('Error checking maintenance mode:', error);
      setState({
        isActive: false,
        loading: false,
        error: error as Error,
      });
    }
  };

  return state;
}
