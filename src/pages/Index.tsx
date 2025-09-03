import { useState } from 'react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import TransitMap from '@/components/TransitMap';
import QuickStats from '@/components/QuickStats';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Database, Shield, Zap } from 'lucide-react';

const Index = () => {
  const [showSupabaseInfo, setShowSupabaseInfo] = useState(true);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      {showSupabaseInfo && (
        <div className="bg-gradient-to-r from-primary/10 to-accent/10 border-b border-border/40">
          <div className="container py-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Backend Integration Required</CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowSupabaseInfo(false)}
                    className="ml-auto"
                  >
                    ×
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  To enable real-time tracking, authentication, database storage, and API integrations, 
                  connect to Supabase using our native integration.
                </p>
                <div className="grid md:grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-primary" />
                    <span className="text-sm">Real-time data storage</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    <span className="text-sm">User authentication</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    <span className="text-sm">API integrations</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Click the green Supabase button in the top right to connect and activate backend features.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
      
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 flex flex-col">
          <QuickStats />
          <div className="flex-1 p-4">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-transit-blue to-transit-green rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">ST</span>
                  </div>
                  Live Transit Map
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 p-0">
                <div className="h-[600px] rounded-lg overflow-hidden">
                  <TransitMap />
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;
