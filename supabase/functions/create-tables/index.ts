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

    // Create tables and setup schema
    const { error: schemaError } = await supabaseClient.rpc('exec_sql', {
      sql: `
        -- Enable necessary extensions
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
        
        -- Create enum types
        DO $$ BEGIN
          CREATE TYPE bus_status AS ENUM ('active', 'inactive', 'maintenance', 'delayed');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
        
        DO $$ BEGIN
          CREATE TYPE crowd_level AS ENUM ('low', 'medium', 'high');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
        
        DO $$ BEGIN
          CREATE TYPE alert_type AS ENUM ('delay', 'breakdown', 'maintenance', 'route_change', 'weather');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;

        -- Routes table
        CREATE TABLE IF NOT EXISTS routes (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            route_number VARCHAR(20) NOT NULL UNIQUE,
            route_name VARCHAR(100) NOT NULL,
            description TEXT,
            color VARCHAR(7) DEFAULT '#3B82F6',
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Bus stops table
        CREATE TABLE IF NOT EXISTS bus_stops (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            stop_code VARCHAR(20) NOT NULL UNIQUE,
            stop_name VARCHAR(100) NOT NULL,
            latitude FLOAT NOT NULL,
            longitude FLOAT NOT NULL,
            address TEXT,
            amenities JSONB DEFAULT '{}',
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Route stops junction table
        CREATE TABLE IF NOT EXISTS route_stops (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
            stop_id UUID REFERENCES bus_stops(id) ON DELETE CASCADE,
            stop_sequence INTEGER NOT NULL,
            distance_from_start FLOAT DEFAULT 0,
            estimated_travel_time INTEGER DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(route_id, stop_sequence)
        );

        -- Buses table
        CREATE TABLE IF NOT EXISTS buses (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            bus_number VARCHAR(20) NOT NULL UNIQUE,
            license_plate VARCHAR(20),
            route_id UUID REFERENCES routes(id),
            capacity INTEGER DEFAULT 50,
            current_latitude FLOAT,
            current_longitude FLOAT,
            status bus_status DEFAULT 'inactive',
            speed FLOAT DEFAULT 0,
            heading FLOAT DEFAULT 0,
            last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            driver_id UUID,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Real-time bus positions
        CREATE TABLE IF NOT EXISTS bus_positions (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            bus_id UUID REFERENCES buses(id) ON DELETE CASCADE,
            route_id UUID REFERENCES routes(id),
            current_latitude FLOAT NOT NULL,
            current_longitude FLOAT NOT NULL,
            next_stop_id UUID REFERENCES bus_stops(id),
            speed FLOAT DEFAULT 0,
            heading FLOAT DEFAULT 0,
            passenger_count INTEGER DEFAULT 0,
            crowd_level crowd_level DEFAULT 'low',
            eta_next_stop INTEGER,
            last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(bus_id)
        );

        -- System alerts
        CREATE TABLE IF NOT EXISTS alerts (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            alert_type alert_type NOT NULL,
            severity INTEGER DEFAULT 1,
            title VARCHAR(200) NOT NULL,
            message TEXT NOT NULL,
            route_id UUID REFERENCES routes(id),
            bus_id UUID REFERENCES buses(id),
            stop_id UUID REFERENCES bus_stops(id),
            is_active BOOLEAN DEFAULT true,
            auto_resolve BOOLEAN DEFAULT false,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            resolved_at TIMESTAMP WITH TIME ZONE,
            created_by UUID
        );

        -- User reports
        CREATE TABLE IF NOT EXISTS user_reports (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            report_type VARCHAR(50) NOT NULL,
            description TEXT NOT NULL,
            bus_id UUID REFERENCES buses(id),
            route_id UUID REFERENCES routes(id),
            stop_id UUID REFERENCES bus_stops(id),
            latitude FLOAT,
            longitude FLOAT,
            user_contact VARCHAR(100),
            status VARCHAR(20) DEFAULT 'pending',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- ETA predictions cache
        CREATE TABLE IF NOT EXISTS eta_predictions (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            bus_id UUID REFERENCES buses(id) ON DELETE CASCADE,
            stop_id UUID REFERENCES bus_stops(id) ON DELETE CASCADE,
            predicted_eta INTEGER NOT NULL,
            confidence_score FLOAT DEFAULT 0.5,
            model_version VARCHAR(20),
            prediction_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            actual_arrival TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- GPS traces for ML training
        CREATE TABLE IF NOT EXISTS gps_traces (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            bus_id UUID REFERENCES buses(id) ON DELETE CASCADE,
            latitude FLOAT NOT NULL,
            longitude FLOAT NOT NULL,
            speed FLOAT DEFAULT 0,
            heading FLOAT DEFAULT 0,
            timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            accuracy FLOAT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Enable RLS
        ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
        ALTER TABLE bus_stops ENABLE ROW LEVEL SECURITY;
        ALTER TABLE route_stops ENABLE ROW LEVEL SECURITY;
        ALTER TABLE buses ENABLE ROW LEVEL SECURITY;
        ALTER TABLE bus_positions ENABLE ROW LEVEL SECURITY;
        ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
        ALTER TABLE user_reports ENABLE ROW LEVEL SECURITY;
        ALTER TABLE eta_predictions ENABLE ROW LEVEL SECURITY;
        ALTER TABLE gps_traces ENABLE ROW LEVEL SECURITY;

        -- Public read policies
        DROP POLICY IF EXISTS "Public can view routes" ON routes;
        CREATE POLICY "Public can view routes" ON routes FOR SELECT USING (is_active = true);
        
        DROP POLICY IF EXISTS "Public can view bus stops" ON bus_stops;
        CREATE POLICY "Public can view bus stops" ON bus_stops FOR SELECT USING (is_active = true);
        
        DROP POLICY IF EXISTS "Public can view route stops" ON route_stops;
        CREATE POLICY "Public can view route stops" ON route_stops FOR SELECT USING (true);
        
        DROP POLICY IF EXISTS "Public can view bus positions" ON bus_positions;
        CREATE POLICY "Public can view bus positions" ON bus_positions FOR SELECT USING (true);
        
        DROP POLICY IF EXISTS "Public can view alerts" ON alerts;
        CREATE POLICY "Public can view alerts" ON alerts FOR SELECT USING (is_active = true);
        
        DROP POLICY IF EXISTS "Public can view eta predictions" ON eta_predictions;
        CREATE POLICY "Public can view eta predictions" ON eta_predictions FOR SELECT USING (true);
        
        DROP POLICY IF EXISTS "Public can create user reports" ON user_reports;
        CREATE POLICY "Public can create user reports" ON user_reports FOR INSERT WITH CHECK (true);

        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_bus_positions_bus_id ON bus_positions(bus_id);
        CREATE INDEX IF NOT EXISTS idx_gps_traces_bus_timestamp ON gps_traces(bus_id, timestamp);
        CREATE INDEX IF NOT EXISTS idx_alerts_active ON alerts(is_active, created_at);
        CREATE INDEX IF NOT EXISTS idx_route_stops_route_sequence ON route_stops(route_id, stop_sequence);
      `
    })

    if (schemaError) {
      console.error('Schema creation error:', schemaError)
      return new Response(JSON.stringify({ error: schemaError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ message: 'Database schema created successfully' }), {
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