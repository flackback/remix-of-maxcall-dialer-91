import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { TrunkConfigPanel } from "@/components/telephony/TrunkConfigPanel";
import { QualityDashboard } from "@/components/telephony/QualityDashboard";
import { CPSMonitor } from "@/components/telephony/CPSMonitor";
import { SIPLogsViewer } from "@/components/telephony/SIPLogsViewer";
import { CarrierDiagnostics } from "@/components/telephony/CarrierDiagnostics";
import { 
  Phone, 
  Activity, 
  Gauge, 
  Settings, 
  Shield,
  Wifi,
  RefreshCw,
  Plus,
  FileText,
  Stethoscope
} from "lucide-react";
import { toast } from "sonner";

interface Carrier {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
}

export default function Telephony() {
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [selectedCarrier, setSelectedCarrier] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCarriers();
  }, []);

  const fetchCarriers = async () => {
    try {
      const { data, error } = await supabase
        .from('telephony_carriers')
        .select('id, name, type, is_active')
        .order('name');

      if (error) throw error;
      setCarriers(data || []);
      
      if (data && data.length > 0 && !selectedCarrier) {
        setSelectedCarrier(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching carriers:', error);
      toast.error('Erro ao carregar operadoras');
    } finally {
      setLoading(false);
    }
  };

  const selectedCarrierData = carriers.find(c => c.id === selectedCarrier);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Telefonia Enterprise</h1>
          <p className="text-muted-foreground">
            Gerenciamento avançado de SBC, CPS, qualidade e logs SIP/WebRTC
          </p>
        </div>
        <Button onClick={fetchCarriers} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      <Tabs defaultValue="quality" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="quality" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Qualidade
          </TabsTrigger>
          <TabsTrigger value="cps" className="flex items-center gap-2">
            <Gauge className="h-4 w-4" />
            CPS Monitor
          </TabsTrigger>
          <TabsTrigger value="sbc" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Config SBC
          </TabsTrigger>
          <TabsTrigger value="carriers" className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Operadoras
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Logs SIP
          </TabsTrigger>
          <TabsTrigger value="diagnostics" className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4" />
            Diagnóstico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="quality">
          <QualityDashboard />
        </TabsContent>

        <TabsContent value="cps">
          <CPSMonitor />
        </TabsContent>

        <TabsContent value="sbc">
          {loading ? (
            <Card>
              <CardContent className="flex items-center justify-center h-48">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          ) : carriers.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                <Phone className="h-12 w-12 mb-4" />
                <p>Nenhuma operadora configurada</p>
                <p className="text-sm">Configure uma operadora na página de Integrações</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Carrier Selector */}
              <Card>
                <CardHeader>
                  <CardTitle>Selecionar Operadora</CardTitle>
                  <CardDescription>
                    Escolha a operadora para configurar o SBC
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {carriers.map(carrier => (
                      <Button
                        key={carrier.id}
                        variant={selectedCarrier === carrier.id ? "default" : "outline"}
                        onClick={() => setSelectedCarrier(carrier.id)}
                        className="flex items-center gap-2"
                      >
                        <Wifi className="h-4 w-4" />
                        {carrier.name}
                        <Badge variant={carrier.is_active ? "default" : "secondary"} className="ml-1">
                          {carrier.type}
                        </Badge>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Trunk Config Panel */}
              {selectedCarrier && selectedCarrierData && (
                <TrunkConfigPanel 
                  carrierId={selectedCarrier} 
                  carrierName={selectedCarrierData.name}
                />
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="carriers">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Operadoras Configuradas</CardTitle>
                  <CardDescription>
                    Lista de operadoras de telefonia conectadas
                  </CardDescription>
                </div>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {carriers.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                  <Phone className="h-8 w-8 mb-2" />
                  <p>Nenhuma operadora configurada</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {carriers.map(carrier => (
                    <Card key={carrier.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <Phone className="h-5 w-5" />
                            <span className="font-medium">{carrier.name}</span>
                          </div>
                          <Badge variant={carrier.is_active ? "default" : "secondary"}>
                            {carrier.is_active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </div>
                        <div className="space-y-2 text-sm text-muted-foreground">
                          <div className="flex justify-between">
                            <span>Tipo:</span>
                            <span className="font-medium">{carrier.type}</span>
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full mt-4"
                          onClick={() => {
                            setSelectedCarrier(carrier.id);
                          }}
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          Configurar SBC
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <SIPLogsViewer />
        </TabsContent>

        <TabsContent value="diagnostics">
          <CarrierDiagnostics />
        </TabsContent>
      </Tabs>
    </div>
  );
}
