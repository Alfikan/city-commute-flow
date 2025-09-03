import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TraccarPosition {
  id: number;
  deviceId: number;
  latitude: number;
  longitude: number;
  speed: number;
  course: number;
  deviceTime: string;
  fixTime: string;
  attributes: Record<string, any>;
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

    const traccarUrl = Deno.env.get('TRACCAR_URL') || 'http://localhost:8082'
    const traccarUsername = Deno.env.get('TRACCAR_USERNAME') || 'admin'
    const traccarPassword = Deno.env.get('TRACCAR_PASSWORD') || 'admin'

    // Authenticate with Traccar
    const authHeader = btoa(`${traccarUsername}:${traccarPassword}`)
    
    // Fetch latest positions from Traccar
    const traccarResponse = await fetch(`${traccarUrl}/api/positions`, {
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/json'
      }
    })

    if (!traccarResponse.ok) {
      throw new Error(`Traccar API error: ${traccarResponse.status}`)
    }

    const positions: TraccarPosition[] = await traccarResponse.json()

    // Get device mappings (device ID to bus ID)
    const { data: buses, error: busesError } = await supabaseClient
      .from('buses')
      .select('id, bus_number, route_id')
      .eq('status', 'active')

    if (busesError) {
      throw new Error(`Error fetching buses: ${busesError.message}`)
    }

    // Process each position update
    const updates = []
    const gpsTraces = []

    for (const position of positions) {
      // Find corresponding bus (assuming device name matches bus number)
      const bus = buses?.find(b => b.bus_number === `BUS${position.deviceId.toString().padStart(3, '0')}`)
      
      if (bus) {
        // Calculate crowd level based on speed and time
        const crowdLevel = calculateCrowdLevel(position.speed, new Date(position.deviceTime))
        
        // Prepare bus position update
        const positionUpdate = {
          bus_id: bus.id,
          route_id: bus.route_id,
          current_latitude: position.latitude,
          current_longitude: position.longitude,
          speed: position.speed * 1.852, // Convert knots to km/h
          heading: position.course,
          crowd_level: crowdLevel,
          last_updated: new Date(position.fixTime).toISOString()
        }

        updates.push(positionUpdate)

        // Prepare GPS trace
        const gpsTrace = {
          bus_id: bus.id,
          latitude: position.latitude,
          longitude: position.longitude,
          speed: position.speed * 1.852,
          heading: position.course,
          timestamp: new Date(position.fixTime).toISOString(),
          accuracy: position.attributes?.accuracy || null
        }

        gpsTraces.push(gpsTrace)
      }
    }

    // Update bus positions (upsert)
    if (updates.length > 0) {
      for (const update of updates) {
        const { error: updateError } = await supabaseClient
          .from('bus_positions')
          .upsert(update, { 
            onConflict: 'bus_id',
            ignoreDuplicates: false 
          })

        if (updateError) {
          console.error('Error updating bus position:', updateError)
        }
      }
    }

    // Insert GPS traces for ML training
    if (gpsTraces.length > 0) {
      const { error: tracesError } = await supabaseClient
        .from('gps_traces')
        .insert(gpsTraces)

      if (tracesError) {
        console.error('Error inserting GPS traces:', tracesError)
      }
    }

    // Update bus table with latest position
    for (const update of updates) {
      const { error: busUpdateError } = await supabaseClient
        .from('buses')
        .update({
          current_latitude: update.current_latitude,
          current_longitude: update.current_longitude,
          speed: update.speed,
          heading: update.heading,
          last_updated: update.last_updated
        })
        .eq('id', update.bus_id)

      if (busUpdateError) {
        console.error('Error updating bus:', busUpdateError)
      }
    }

    return new Response(JSON.stringify({ 
      message: `Processed ${updates.length} position updates`,
      updated: updates.length,
      traces: gpsTraces.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

function calculateCrowdLevel(speed: number, timestamp: Date): 'low' | 'medium' | 'high' {
  const hour = timestamp.getHours()
  const speedKmh = speed * 1.852

  // Rush hour logic (7-9 AM, 5-7 PM)
  const isRushHour = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)
  
  // Very low speed might indicate heavy loading/unloading
  if (speedKmh < 5 && isRushHour) {
    return 'high'
  } else if (speedKmh < 10 && isRushHour) {
    return 'medium'
  } else if (isRushHour) {
    return 'medium'
  }
  
  return 'low'
}