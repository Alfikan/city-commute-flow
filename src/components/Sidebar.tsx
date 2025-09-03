import { useState } from 'react';
import { Bus, Route, MapPin, Clock, Users, TrendingUp, Settings, Bell } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

const sampleRoutes = [
  {
    id: '15',
    name: 'Route 15',
    status: 'on-time',
    busCount: 3,
    crowdLevel: 'medium',
    nextArrival: '2 min'
  },
  {
    id: '22',
    name: 'Route 22',
    status: 'delayed',
    busCount: 2,
    crowdLevel: 'high',
    nextArrival: '8 min'
  },
  {
    id: '8',
    name: 'Route 8',
    status: 'on-time',
    busCount: 4,
    crowdLevel: 'low',
    nextArrival: '4 min'
  }
];

const recentAlerts = [
  {
    id: 1,
    type: 'delay',
    route: 'Route 22',
    message: '5 min delay due to traffic',
    time: '2 min ago'
  },
  {
    id: 2,
    type: 'maintenance',
    route: 'Route 12',
    message: 'Temporary stop closure',
    time: '15 min ago'
  }
];

const Sidebar = () => {
  const [activeTab, setActiveTab] = useState('routes');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on-time': return 'bg-success';
      case 'delayed': return 'bg-destructive';
      case 'maintenance': return 'bg-warning';
      default: return 'bg-muted';
    }
  };

  const getCrowdColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-success';
      case 'medium': return 'text-warning';
      case 'high': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="w-80 bg-card border-r border-border h-full flex flex-col">
      <div className="p-4 border-b border-border">
        <div className="grid grid-cols-3 gap-1 bg-muted p-1 rounded-lg">
          <Button
            variant={activeTab === 'routes' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('routes')}
            className="text-xs"
          >
            <Route className="h-3 w-3 mr-1" />
            Routes
          </Button>
          <Button
            variant={activeTab === 'stops' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('stops')}
            className="text-xs"
          >
            <MapPin className="h-3 w-3 mr-1" />
            Stops
          </Button>
          <Button
            variant={activeTab === 'alerts' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('alerts')}
            className="text-xs"
          >
            <Bell className="h-3 w-3 mr-1" />
            Alerts
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {activeTab === 'routes' && (
            <>
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Active Routes</h3>
                {sampleRoutes.map((route) => (
                  <Card key={route.id} className="p-3 hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
                          <span className="text-xs font-bold text-primary-foreground">{route.id}</span>
                        </div>
                        <span className="font-medium text-sm">{route.name}</span>
                      </div>
                      <Badge variant="outline" className={getStatusColor(route.status)}>
                        {route.status}
                      </Badge>
                    </div>
                    
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div className="flex justify-between">
                        <span className="flex items-center gap-1">
                          <Bus className="h-3 w-3" />
                          {route.busCount} buses
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {route.nextArrival}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className={`h-3 w-3 ${getCrowdColor(route.crowdLevel)}`} />
                        <span className={getCrowdColor(route.crowdLevel)}>
                          {route.crowdLevel} crowd
                        </span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}

          {activeTab === 'stops' && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Nearby Stops</h3>
              <div className="text-center py-8 text-muted-foreground">
                <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Select a location on the map to see nearby stops</p>
              </div>
            </div>
          )}

          {activeTab === 'alerts' && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Recent Alerts</h3>
              {recentAlerts.map((alert) => (
                <Card key={alert.id} className="p-3">
                  <div className="flex items-start gap-2">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      alert.type === 'delay' ? 'bg-destructive' : 'bg-warning'
                    }`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{alert.route}</span>
                        <span className="text-xs text-muted-foreground">{alert.time}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{alert.message}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-border">
        <Card className="bg-gradient-to-r from-transit-blue/10 to-transit-green/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="font-medium text-sm">System Status</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Active Buses:</span>
                <div className="font-bold text-primary">23</div>
              </div>
              <div>
                <span className="text-muted-foreground">On Time:</span>
                <div className="font-bold text-success">87%</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Sidebar;