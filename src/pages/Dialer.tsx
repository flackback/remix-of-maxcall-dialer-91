import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DialerDashboard } from '@/components/dialer/DialerDashboard';
import { DialerSettings } from '@/components/dialer/DialerSettings';
import { EngineMonitorDashboard } from '@/components/dialer/EngineMonitorDashboard';
import { Activity, Settings, Cpu } from 'lucide-react';

export default function Dialer() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dialer Preditivo</h1>
        <p className="text-muted-foreground">
          Gerencie a discagem automática e monitore métricas em tempo real
        </p>
      </div>

      <Tabs defaultValue="engine" className="space-y-4">
        <TabsList>
          <TabsTrigger value="engine" className="gap-2">
            <Cpu className="h-4 w-4" />
            Motor
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="gap-2">
            <Activity className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" />
            Configurações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="engine">
          <EngineMonitorDashboard />
        </TabsContent>

        <TabsContent value="dashboard">
          <DialerDashboard />
        </TabsContent>

        <TabsContent value="settings">
          <DialerSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
