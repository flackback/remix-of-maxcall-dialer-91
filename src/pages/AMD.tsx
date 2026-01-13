import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AMDDashboard } from "@/components/amd/AMDDashboard";
import { AMDSettings } from "@/components/amd/AMDSettings";
import {
  BarChart3,
  Settings,
} from "lucide-react";

export default function AMD() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">Detecção AMD</h1>
        <p className="text-muted-foreground">
          Answering Machine Detection - Detecção de Secretária Eletrônica
        </p>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configurações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <AMDDashboard />
        </TabsContent>

        <TabsContent value="settings">
          <AMDSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
