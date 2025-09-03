import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RouteRequest {
  coordinates: number[][];
  profile?: string;
}

interface OpenRouteServiceResponse {
  routes: Array<{
    summary: {
      distance: number;
      duration: number;
    };
    segments: Array<{
      duration: number;
      distance: number;
    }>;
  }>;
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

    const openRouteServiceKey = Deno.env.get('OPENROUTE_SERVICE_KEY')
    
    if (!openRouteServiceKey) {
      throw new Error('OpenRouteService API key not configured')
    }

    // Get all active bus positions
    const { data: busPositions, error: positionsError } = await supabaseClient
      .from('bus_positions')
      .select(`
        *,
        buses (id, route_id, bus_number),
        routes (id, route_number)
      `)

    if (positionsError) {
      throw new Error(`Error fetching bus positions: ${positionsError.message}`)
    }

    // Get route stops for each bus
    const predictions = []

    for (const position of busPositions || []) {
      if (!position.buses?.route_id) continue

      // Get upcoming stops for this route
      const { data: routeStops, error: stopsError } = await supabaseClient
        .from('route_stops')
        .select(`
          *,
          bus_stops (*)
        `)
        .eq('route_id', position.buses.route_id)
        .order('stop_sequence')

      if (stopsError || !routeStops) continue

      // Find next stops (simple logic - can be enhanced)
      const upcomingStops = routeStops.slice(0, 3) // Next 3 stops

      for (const routeStop of upcomingStops) {
        if (!routeStop.bus_stops) continue

        const stop = routeStop.bus_stops
        
        // Calculate ETA using multiple factors
        const distance = calculateDistance(
          position.current_latitude,
          position.current_longitude,
          stop.latitude,
          stop.longitude
        )

        // Base ETA on distance and current speed
        let baseETA = distance / Math.max(position.speed || 20, 5) * 60 // minutes
        
        // Apply ML-based adjustments
        const adjustedETA = await applyMLAdjustments(
          supabaseClient,
          position.bus_id,
          stop.id,
          baseETA,
          position
        )

        // Get OpenRouteService ETA for comparison
        try {
          const orsETA = await getOpenRouteServiceETA(
            openRouteServiceKey,
            [position.current_longitude, position.current_latitude],
            [stop.longitude, stop.latitude]
          )

          // Combine our prediction with ORS (weighted average)
          const finalETA = Math.round((adjustedETA * 0.7) + (orsETA * 0.3))

          const prediction = {
            bus_id: position.bus_id,
            stop_id: stop.id,
            predicted_eta: Math.max(finalETA, 1), // Minimum 1 minute
            confidence_score: calculateConfidenceScore(distance, position.speed || 0),
            model_version: 'v1.0',
            prediction_timestamp: new Date().toISOString()
          }

          predictions.push(prediction)

        } catch (orsError) {
          console.warn('OpenRouteService error:', orsError)
          
          // Fallback to our prediction only
          const prediction = {
            bus_id: position.bus_id,
            stop_id: stop.id,
            predicted_eta: Math.max(Math.round(adjustedETA), 1),
            confidence_score: calculateConfidenceScore(distance, position.speed || 0) * 0.8, // Lower confidence without ORS
            model_version: 'v1.0',
            prediction_timestamp: new Date().toISOString()
          }

          predictions.push(prediction)
        }
      }
    }

    // Store predictions in database
    if (predictions.length > 0) {
      const { error: insertError } = await supabaseClient
        .from('eta_predictions')
        .insert(predictions)

      if (insertError) {
        console.error('Error inserting predictions:', insertError)
      }
    }

    // Update bus positions with next stop ETA
    for (const prediction of predictions) {
      const { error: updateError } = await supabaseClient
        .from('bus_positions')
        .update({
          eta_next_stop: prediction.predicted_eta
        })
        .eq('bus_id', prediction.bus_id)

      if (updateError) {
        console.error('Error updating ETA:', updateError)
      }
    }

    return new Response(JSON.stringify({ 
      message: `Generated ${predictions.length} ETA predictions`,
      predictions: predictions.length
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

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

async function applyMLAdjustments(
  supabaseClient: any,
  busId: string,
  stopId: string,
  baseETA: number,
  position: any
): Promise<number> {
  // Get historical data for this bus-stop combination
  const { data: historicalData } = await supabaseClient
    .from('eta_predictions')
    .select('predicted_eta, actual_arrival')
    .eq('bus_id', busId)
    .eq('stop_id', stopId)
    .not('actual_arrival', 'is', null)
    .order('created_at', { ascending: false })
    .limit(10)

  if (!historicalData || historicalData.length === 0) {
    // No historical data, apply general adjustments
    return applyGeneralAdjustments(baseETA, position)
  }

  // Calculate historical accuracy
  let totalError = 0
  let count = 0

  for (const record of historicalData) {
    if (record.actual_arrival && record.predicted_eta) {
      const actualTime = new Date(record.actual_arrival).getTime()
      const predictedTime = new Date().getTime() + (record.predicted_eta * 60 * 1000)
      const error = (actualTime - predictedTime) / (60 * 1000) // Error in minutes
      totalError += error
      count++
    }
  }

  if (count > 0) {
    const avgError = totalError / count
    // Apply learned correction
    return Math.max(baseETA + avgError, 1)
  }

  return applyGeneralAdjustments(baseETA, position)
}

function applyGeneralAdjustments(baseETA: number, position: any): number {
  let adjustedETA = baseETA

  // Traffic adjustments based on time of day
  const hour = new Date().getHours()
  if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
    adjustedETA *= 1.3 // Rush hour adjustment
  } else if (hour >= 22 || hour <= 6) {
    adjustedETA *= 0.9 // Night time adjustment
  }

  // Crowd level adjustments
  if (position.crowd_level === 'high') {
    adjustedETA *= 1.2
  } else if (position.crowd_level === 'low') {
    adjustedETA *= 0.95
  }

  // Speed-based adjustments
  if (position.speed < 10) {
    adjustedETA *= 1.4 // Slow speed, likely in traffic
  } else if (position.speed > 40) {
    adjustedETA *= 0.9 // High speed, clear roads
  }

  return adjustedETA
}

function calculateConfidenceScore(distance: number, speed: number): number {
  // Base confidence on distance (closer = more confident)
  let confidence = Math.max(0.3, 1 - (distance / 10)) // Max 10km for full confidence drop
  
  // Adjust for speed consistency
  if (speed > 5 && speed < 60) {
    confidence *= 1.1 // Normal operating speeds
  } else if (speed < 2) {
    confidence *= 0.7 // Very low speed, uncertain situation
  }

  return Math.min(1.0, Math.max(0.1, confidence))
}

async function getOpenRouteServiceETA(
  apiKey: string,
  start: number[],
  end: number[]
): Promise<number> {
  const request: RouteRequest = {
    coordinates: [start, end],
    profile: 'driving-car'
  }

  const response = await fetch('https://api.openrouteservice.org/v2/directions/driving-car/json', {
    method: 'POST',
    headers: {
      'Authorization': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(request)
  })

  if (!response.ok) {
    throw new Error(`OpenRouteService API error: ${response.status}`)
  }

  const data: OpenRouteServiceResponse = await response.json()
  
  if (data.routes && data.routes.length > 0) {
    return data.routes[0].summary.duration / 60 // Convert seconds to minutes
  }

  throw new Error('No route found')
}