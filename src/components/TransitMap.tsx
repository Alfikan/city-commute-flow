import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Bus, MapPin, Users, Clock, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRealTimeBusPositions, useRoutes } from '@/hooks/useRealTimeData';
import { useToast } from '@/hooks/use-toast';

// Fix for default marker icons in react-leaflet
delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const busIcon = new Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="16" fill="#3b82f6"/>
      <path d="M8 12h16v8H8z" fill="white"/>
      <circle cx="12" cy="22" r="2" fill="white"/>
      <circle cx="20" cy="22" r="2" fill="white"/>
      <rect x="10" y="8" width="12" height="4" fill="white"/>
    </svg>
  `),
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const getCrowdColor = (level: string) => {
  switch (level) {
    case 'low': return 'bg-success text-success-foreground';
    case 'medium': return 'bg-warning text-warning-foreground';
    case 'high': return 'bg-destructive text-destructive-foreground';
    default: return 'bg-muted text-muted-foreground';
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active': return 'bg-success text-success-foreground';
    case 'delayed': return 'bg-warning text-warning-foreground';
    case 'maintenance': return 'bg-destructive text-destructive-foreground';
    case 'inactive': return 'bg-muted text-muted-foreground';
    default: return 'bg-muted text-muted-foreground';
  }
};

const TransitMap = () => {
  const { busPositions, loading, error } = useRealTimeBusPositions();
  const { routes } = useRoutes();
  const { toast } = useToast();
  const [selectedBus, setSelectedBus] = useState<typeof busPositions[0] | null>(null);

  useEffect(() => {
    if (error) {
      toast({
        title: "Error loading bus data",
        description: error,
        variant: "destructive",
      });
    }
  }, [error, toast]);

  // Create route paths (simplified - in real app, you'd fetch actual route geometry)
  const routePaths = routes.map(route => ({
    id: route.id,
    color: route.color,
    path: busPositions
      .filter(bp => bp.route_id === route.id)
      .map(bp => [bp.current_latitude, bp.current_longitude] as [number, number])
  }));

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted/50 rounded-lg">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading live transit data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={[40.7128, -74.0060]}
        zoom={13}
        className="w-full h-full rounded-lg"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Route lines */}
        {routePaths.map((route) => (
          route.path.length > 1 && (
            <Polyline
              key={route.id}
              positions={route.path}
              color={route.color}
              weight={4}
              opacity={0.7}
            />
          )
        ))}
        
        {/* Bus markers */}
        {busPositions.map((position) => (
          <Marker
            key={position.id}
            position={[position.current_latitude, position.current_longitude]}
            icon={busIcon}
            eventHandlers={{
              click: () => setSelectedBus(position),
            }}
          >
            <Popup>
              <div className="p-2">
                <div className="flex items-center gap-2 mb-2">
                  <Bus className="h-4 w-4 text-primary" />
                  <span className="font-semibold">
                    {position.routes?.route_name || position.buses?.bus_number}
                  </span>
                  <Badge className={getStatusColor(position.buses?.status || 'active')}>
                    {position.buses?.status}
                  </Badge>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3 w-3" />
                    <span>Next: {position.bus_stops?.stop_name || 'Unknown'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    <span>ETA: {position.eta_next_stop || 'N/A'} min</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-3 w-3" />
                    <Badge className={getCrowdColor(position.crowd_level)}>
                      {position.crowd_level} crowd
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Speed: {Math.round(position.speed)} km/h
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      
      {/* Bus info panel */}
      {selectedBus && (
        <Card className="absolute top-4 left-4 w-80 z-10 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <Bus className="h-4 w-4 text-primary-foreground" />
                </div>
                <div>
                  <span className="font-semibold">
                    {selectedBus.routes?.route_name || selectedBus.buses?.bus_number}
                  </span>
                  <div className="text-xs text-muted-foreground">
                    {selectedBus.buses?.bus_number} • {selectedBus.routes?.route_number}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <Badge className={getStatusColor(selectedBus.buses?.status || 'active')}>
                  {selectedBus.buses?.status}
                </Badge>
                <div className="text-xs text-muted-foreground mt-1">
                  {Math.round(selectedBus.speed)} km/h
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-3 w-3 text-muted-foreground" />
                <span>Next: {selectedBus.bus_stops?.stop_name || 'Unknown stop'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span>ETA: {selectedBus.eta_next_stop || 'N/A'} min</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-3 w-3 text-muted-foreground" />
                <span>Crowd level:</span>
                <Badge className={getCrowdColor(selectedBus.crowd_level)}>
                  {selectedBus.crowd_level}
                </Badge>
              </div>
              {selectedBus.passenger_count > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-3 w-3 text-muted-foreground" />
                  <span>Passengers: {selectedBus.passenger_count}/{selectedBus.buses?.capacity}</span>
                </div>
              )}
              <div className="text-xs text-muted-foreground">
                Last updated: {new Date(selectedBus.last_updated).toLocaleTimeString()}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TransitMap;