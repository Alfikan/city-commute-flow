import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Sample routes data
    const routes = [
      { route_number: '15', route_name: 'Downtown Express', description: 'City center to university campus', color: '#3B82F6' },
      { route_number: '22', route_name: 'Mall Connector', description: 'Shopping district to residential areas', color: '#10B981' },
      { route_number: '8', route_name: 'Airport Shuttle', description: 'Airport to city center', color: '#F59E0B' },
      { route_number: '12', route_name: 'Hospital Line', description: 'Medical district route', color: '#EF4444' },
      { route_number: '5', route_name: 'Coastal Route', description: 'Beach to downtown', color: '#8B5CF6' }
    ];

    // Sample bus stops data
    const busStops = [
      { stop_code: 'CS001', stop_name: 'Central Station', latitude: 40.7128, longitude: -74.0060, address: '123 Main St' },
      { stop_code: 'UC002', stop_name: 'University Campus', latitude: 40.7282, longitude: -73.9942, address: '456 College Ave' },
      { stop_code: 'CM003', stop_name: 'City Mall', latitude: 40.7589, longitude: -73.9851, address: '789 Shopping Blvd' },
      { stop_code: 'AP004', stop_name: 'Airport Terminal', latitude: 40.6892, longitude: -74.1745, address: 'Airport Rd' },
      { stop_code: 'HM005', stop_name: 'Hospital Main', latitude: 40.7505, longitude: -73.9934, address: '321 Health St' },
      { stop_code: 'BP006', stop_name: 'Beach Plaza', latitude: 40.7614, longitude: -73.9776, address: '654 Ocean Ave' },
      { stop_code: 'DT007', stop_name: 'Downtown Hub', latitude: 40.7180, longitude: -74.0000, address: '987 Commerce St' },
      { stop_code: 'RS008', stop_name: 'Residential Square', latitude: 40.7400, longitude: -73.9900, address: '147 Maple Dr' }
    ];

    // Sample buses data
    const buses = [
      { bus_number: 'BUS001', license_plate: 'ABC123', capacity: 50 },
      { bus_number: 'BUS002', license_plate: 'DEF456', capacity: 45 },
      { bus_number: 'BUS003', license_plate: 'GHI789', capacity: 55 },
      { bus_number: 'BUS004', license_plate: 'JKL012', capacity: 50 },
      { bus_number: 'BUS005', license_plate: 'MNO345', capacity: 60 }
    ];

    // Insert routes
    const { data: routesData, error: routesError } = await supabaseClient
      .from('routes')
      .insert(routes)
      .select();

    if (routesError) {
      console.error('Routes error:', routesError);
      return new Response(JSON.stringify({ error: routesError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Insert bus stops
    const { data: stopsData, error: stopsError } = await supabaseClient
      .from('bus_stops')
      .insert(busStops)
      .select();

    if (stopsError) {
      console.error('Stops error:', stopsError);
      return new Response(JSON.stringify({ error: stopsError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Insert buses with route assignments
    const busesWithRoutes = buses.map((bus, index) => ({
      ...bus,
      route_id: routesData?.[index % routesData.length]?.id,
      status: 'active' as const
    }));

    const { data: busesData, error: busesError } = await supabaseClient
      .from('buses')
      .insert(busesWithRoutes)
      .select();

    if (busesError) {
      console.error('Buses error:', busesError);
      return new Response(JSON.stringify({ error: busesError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create route-stop relationships
    const routeStops = [
      // Route 15 stops
      { route_id: routesData?.[0]?.id, stop_id: stopsData?.[0]?.id, stop_sequence: 1 }, // Central Station
      { route_id: routesData?.[0]?.id, stop_id: stopsData?.[1]?.id, stop_sequence: 2 }, // University Campus
      { route_id: routesData?.[0]?.id, stop_id: stopsData?.[6]?.id, stop_sequence: 3 }, // Downtown Hub
      
      // Route 22 stops
      { route_id: routesData?.[1]?.id, stop_id: stopsData?.[2]?.id, stop_sequence: 1 }, // City Mall
      { route_id: routesData?.[1]?.id, stop_id: stopsData?.[7]?.id, stop_sequence: 2 }, // Residential Square
      { route_id: routesData?.[1]?.id, stop_id: stopsData?.[0]?.id, stop_sequence: 3 }, // Central Station
      
      // Route 8 stops
      { route_id: routesData?.[2]?.id, stop_id: stopsData?.[3]?.id, stop_sequence: 1 }, // Airport Terminal
      { route_id: routesData?.[2]?.id, stop_id: stopsData?.[6]?.id, stop_sequence: 2 }, // Downtown Hub
      { route_id: routesData?.[2]?.id, stop_id: stopsData?.[0]?.id, stop_sequence: 3 }, // Central Station
    ];

    const { error: routeStopsError } = await supabaseClient
      .from('route_stops')
      .insert(routeStops.filter(rs => rs.route_id && rs.stop_id));

    if (routeStopsError) {
      console.error('Route stops error:', routeStopsError);
    }

    // Insert sample bus positions
    const busPositions = [
      {
        bus_id: busesData?.[0]?.id,
        route_id: routesData?.[0]?.id,
        current_latitude: 40.7128,
        current_longitude: -74.0060,
        speed: 25,
        crowd_level: 'low' as const,
        eta_next_stop: 3
      },
      {
        bus_id: busesData?.[1]?.id,
        route_id: routesData?.[1]?.id,
        current_latitude: 40.7589,
        current_longitude: -73.9851,
        speed: 15,
        crowd_level: 'high' as const,
        eta_next_stop: 7
      },
      {
        bus_id: busesData?.[2]?.id,
        route_id: routesData?.[2]?.id,
        current_latitude: 40.7282,
        current_longitude: -73.9942,
        speed: 30,
        crowd_level: 'medium' as const,
        eta_next_stop: 2
      }
    ];

    const { error: positionsError } = await supabaseClient
      .from('bus_positions')
      .insert(busPositions.filter(bp => bp.bus_id && bp.route_id));

    if (positionsError) {
      console.error('Positions error:', positionsError);
    }

    // Insert sample alerts
    const alerts = [
      {
        alert_type: 'delay' as const,
        severity: 2,
        title: 'Route 22 Delay',
        message: '5 minute delay due to traffic congestion on Main Street',
        route_id: routesData?.[1]?.id,
        is_active: true
      },
      {
        alert_type: 'maintenance' as const,
        severity: 1,
        title: 'Stop Closure',
        message: 'Temporary closure of Hospital Main stop for maintenance',
        stop_id: stopsData?.[4]?.id,
        is_active: true
      }
    ];

    const { error: alertsError } = await supabaseClient
      .from('alerts')
      .insert(alerts);

    if (alertsError) {
      console.error('Alerts error:', alertsError);
    }

    return new Response(JSON.stringify({ 
      message: 'Sample data inserted successfully',
      data: {
        routes: routesData?.length,
        stops: stopsData?.length,
        buses: busesData?.length,
        positions: busPositions.length,
        alerts: alerts.length
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
})