import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/supabase';

type BusPosition = Database['public']['Tables']['bus_positions']['Row'] & {
  buses?: Database['public']['Tables']['buses']['Row'];
  routes?: Database['public']['Tables']['routes']['Row'];
  bus_stops?: Database['public']['Tables']['bus_stops']['Row'];
};

type Alert = Database['public']['Tables']['alerts']['Row'] & {
  routes?: Database['public']['Tables']['routes']['Row'];
  buses?: Database['public']['Tables']['buses']['Row'];
  bus_stops?: Database['public']['Tables']['bus_stops']['Row'];
};

export const useRealTimeBusPositions = () => {
  const [busPositions, setBusPositions] = useState<BusPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const { data, error } = await supabase
          .from('bus_positions')
          .select(`
            *,
            buses (
              id,
              bus_number,
              license_plate,
              capacity,
              status
            ),
            routes (
              id,
              route_number,
              route_name,
              color
            ),
            bus_stops (
              id,
              stop_name,
              stop_code
            )
          `)
          .order('last_updated', { ascending: false });

        if (error) {
          setError(error.message);
        } else {
          setBusPositions(data || []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();

    // Set up real-time subscription
    const subscription = supabase
      .channel('bus-positions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bus_positions'
        },
        async (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            // Fetch the complete record with related data
            const { data: updatedRecord } = await supabase
              .from('bus_positions')
              .select(`
                *,
                buses (
                  id,
                  bus_number,
                  license_plate,
                  capacity,
                  status
                ),
                routes (
                  id,
                  route_number,
                  route_name,
                  color
                ),
                bus_stops (
                  id,
                  stop_name,
                  stop_code
                )
              `)
              .eq('id', payload.new.id)
              .single();

            if (updatedRecord) {
              setBusPositions(prev => {
                const existingIndex = prev.findIndex(pos => pos.id === updatedRecord.id);
                if (existingIndex >= 0) {
                  const newPositions = [...prev];
                  newPositions[existingIndex] = updatedRecord;
                  return newPositions;
                } else {
                  return [...prev, updatedRecord];
                }
              });
            }
          } else if (payload.eventType === 'DELETE') {
            setBusPositions(prev => prev.filter(pos => pos.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { busPositions, loading, error };
};

export const useRealTimeAlerts = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const { data, error } = await supabase
          .from('alerts')
          .select(`
            *,
            routes (
              id,
              route_number,
              route_name
            ),
            buses (
              id,
              bus_number
            ),
            bus_stops (
              id,
              stop_name,
              stop_code
            )
          `)
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (error) {
          setError(error.message);
        } else {
          setAlerts(data || []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();

    // Set up real-time subscription
    const subscription = supabase
      .channel('alerts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'alerts'
        },
        async (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            // Fetch the complete record with related data
            const { data: updatedRecord } = await supabase
              .from('alerts')
              .select(`
                *,
                routes (
                  id,
                  route_number,
                  route_name
                ),
                buses (
                  id,
                  bus_number
                ),
                bus_stops (
                  id,
                  stop_name,
                  stop_code
                )
              `)
              .eq('id', payload.new.id)
              .single();

            if (updatedRecord) {
              setAlerts(prev => {
                const existingIndex = prev.findIndex(alert => alert.id === updatedRecord.id);
                if (existingIndex >= 0) {
                  const newAlerts = [...prev];
                  newAlerts[existingIndex] = updatedRecord;
                  return newAlerts;
                } else {
                  return [...prev, updatedRecord];
                }
              });
            }
          } else if (payload.eventType === 'DELETE') {
            setAlerts(prev => prev.filter(alert => alert.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { alerts, loading, error };
};

export const useRoutes = () => {
  const [routes, setRoutes] = useState<Database['public']['Tables']['routes']['Row'][]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        const { data, error } = await supabase
          .from('routes')
          .select('*')
          .eq('is_active', true)
          .order('route_number');

        if (error) {
          setError(error.message);
        } else {
          setRoutes(data || []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchRoutes();
  }, []);

  return { routes, loading, error };
};