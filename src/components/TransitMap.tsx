import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Bus, MapPin, Users, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Fix for default marker icons in react-leaflet
delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Sample data for demo
const sampleBuses = [
  {
    id: 'bus-001',
    route: 'Route 15',
    position: [40.7128, -74.0060] as [number, number],
    speed: 25,
    crowdLevel: 'low',
    nextStop: 'Central Station',
    eta: '3 min'
  },
  {
    id: 'bus-002',
    route: 'Route 22',
    position: [40.7589, -73.9851] as [number, number],
    speed: 15,
    crowdLevel: 'high',
    nextStop: 'City Mall',
    eta: '7 min'
  },
  {
    id: 'bus-003',
    route: 'Route 8',
    position: [40.7282, -73.9942] as [number, number],
    speed: 30,
    crowdLevel: 'medium',
    nextStop: 'University Campus',
    eta: '2 min'
  }
];

const sampleRoutes = [
  {
    id: 'route-15',
    color: '#3b82f6',
    path: [
      [40.7128, -74.0060],
      [40.7282, -73.9942],
      [40.7589, -73.9851]
    ] as [number, number][]
  }
];

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
    case 'low': return 'bg-success';
    case 'medium': return 'bg-warning';
    case 'high': return 'bg-destructive';
    default: return 'bg-muted';
  }
};

const TransitMap = () => {
  const [selectedBus, setSelectedBus] = useState<typeof sampleBuses[0] | null>(null);

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
        {sampleRoutes.map((route) => (
          <Polyline
            key={route.id}
            positions={route.path}
            color={route.color}
            weight={4}
            opacity={0.7}
          />
        ))}
        
        {/* Bus markers */}
        {sampleBuses.map((bus) => (
          <Marker
            key={bus.id}
            position={bus.position}
            icon={busIcon}
            eventHandlers={{
              click: () => setSelectedBus(bus),
            }}
          >
            <Popup>
              <div className="p-2">
                <div className="flex items-center gap-2 mb-2">
                  <Bus className="h-4 w-4 text-primary" />
                  <span className="font-semibold">{bus.route}</span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3 w-3" />
                    <span>Next: {bus.nextStop}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    <span>ETA: {bus.eta}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-3 w-3" />
                    <Badge variant="secondary" className={getCrowdColor(bus.crowdLevel)}>
                      {bus.crowdLevel} crowd
                    </Badge>
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
                <span className="font-semibold">{selectedBus.route}</span>
              </div>
              <Badge variant="outline">{selectedBus.speed} km/h</Badge>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-3 w-3 text-muted-foreground" />
                <span>Next stop: {selectedBus.nextStop}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span>ETA: {selectedBus.eta}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-3 w-3 text-muted-foreground" />
                <span>Crowd level:</span>
                <Badge className={getCrowdColor(selectedBus.crowdLevel)}>
                  {selectedBus.crowdLevel}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TransitMap;