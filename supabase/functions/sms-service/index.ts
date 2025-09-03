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
    const { phone, routeNumber, stopCode } = await req.json()
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get route and stop information
    const { data: routeData } = await supabaseClient
      .from('routes')
      .select('id, route_name, route_number')
      .eq('route_number', routeNumber)
      .single()

    const { data: stopData } = await supabaseClient
      .from('bus_stops')
      .select('id, stop_name')
      .eq('stop_code', stopCode)
      .single()

    if (!routeData || !stopData) {
      return new Response(JSON.stringify({ error: 'Route or stop not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get ETA predictions for this route at this stop
    const { data: predictions } = await supabaseClient
      .from('eta_predictions')
      .select(`
        predicted_eta,
        bus_positions!inner(
          buses!inner(route_id)
        )
      `)
      .eq('stop_id', stopData.id)
      .eq('bus_positions.buses.route_id', routeData.id)
      .order('predicted_eta')
      .limit(3)

    let message = `SmartTransit: ${routeData.route_name} at ${stopData.stop_name}\n`
    
    if (predictions && predictions.length > 0) {
      message += 'Next arrivals:\n'
      predictions.forEach((pred, index) => {
        message += `${index + 1}. ${pred.predicted_eta} min\n`
      })
    } else {
      message += 'No buses currently scheduled for this route.'
    }

    // Send SMS using Twilio (if configured)
    const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID')
    const twilioToken = Deno.env.get('TWILIO_AUTH_TOKEN')
    const twilioPhone = Deno.env.get('TWILIO_PHONE_NUMBER')

    if (twilioSid && twilioToken && twilioPhone) {
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`
      
      const formData = new FormData()
      formData.append('To', phone)
      formData.append('From', twilioPhone)
      formData.append('Body', message)

      const twilioResponse = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${twilioSid}:${twilioToken}`)}`
        },
        body: formData
      })

      if (!twilioResponse.ok) {
        throw new Error('Failed to send SMS')
      }
    }

    return new Response(JSON.stringify({ 
      message: 'SMS sent successfully',
      content: message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})