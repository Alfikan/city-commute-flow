import { Bus, Clock, Users, TrendingUp, MapPin, Wifi } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const stats = [
  {
    icon: Bus,
    label: 'Active Buses',
    value: '23',
    change: '+2',
    trend: 'up'
  },
  {
    icon: Clock,
    label: 'Avg Delay',
    value: '2.3 min',
    change: '-0.5',
    trend: 'down'
  },
  {
    icon: Users,
    label: 'Passengers Today',
    value: '1,247',
    change: '+15%',
    trend: 'up'
  },
  {
    icon: MapPin,
    label: 'Active Routes',
    value: '8',
    change: '0',
    trend: 'neutral'
  }
];

const QuickStats = () => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className="relative overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                {stat.trend !== 'neutral' && (
                  <Badge variant={stat.trend === 'up' ? 'default' : 'secondary'} className="text-xs">
                    {stat.change}
                  </Badge>
                )}
              </div>
              <div>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default QuickStats;