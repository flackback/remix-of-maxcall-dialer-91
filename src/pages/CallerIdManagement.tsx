import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CallerIdPoolsPanel } from "@/components/callerid/CallerIdPoolsPanel";
import { CallerIdNumbersPanel } from "@/components/callerid/CallerIdNumbersPanel";
import { CallerIdHealthDashboard } from "@/components/callerid/CallerIdHealthDashboard";
import { Phone, Activity, Settings } from "lucide-react";

export default function CallerIdManagement() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gestão de Caller ID</h1>
        <p className="text-muted-foreground">
          Gerencie pools de números, rotação inteligente e monitore a reputação
        </p>
      </div>

      <Tabs defaultValue="health" className="w-full">
        <TabsList>
          <TabsTrigger value="health" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Health Dashboard
          </TabsTrigger>
          <TabsTrigger value="pools" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Pools
          </TabsTrigger>
          <TabsTrigger value="numbers" className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Números
          </TabsTrigger>
        </TabsList>

        <TabsContent value="health" className="mt-6">
          <CallerIdHealthDashboard />
        </TabsContent>

        <TabsContent value="pools" className="mt-6">
          <CallerIdPoolsPanel />
        </TabsContent>

        <TabsContent value="numbers" className="mt-6">
          <CallerIdNumbersPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
