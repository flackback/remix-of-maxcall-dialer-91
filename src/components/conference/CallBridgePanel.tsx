import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowRightLeft,
  Phone,
  PhoneForwarded,
  Users,
  Headphones,
  Volume2,
  RefreshCw,
  Merge,
} from "lucide-react";
import { toast } from "sonner";

interface ActiveCall {
  id: string;
  phone: string;
  direction: string;
  status: string;
  agent_name?: string;
}

interface Bridge {
  id: string;
  bridge_type: string;
  status: string;
  created_at: string;
  call_a?: { phone: string };
  call_b?: { phone: string };
}

export function CallBridgePanel() {
  const [activeCalls, setActiveCalls] = useState<ActiveCall[]>([]);
  const [bridges, setBridges] = useState<Bridge[]>([]);
  const [selectedCallA, setSelectedCallA] = useState<string>("");
  const [selectedCallB, setSelectedCallB] = useState<string>("");
  const [bridgeType, setBridgeType] = useState<string>("conference");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      // Fetch active calls
      const { data: calls, error: callsError } = await supabase
        .from('calls')
        .select('id, phone, direction, status')
        .in('status', ['CONNECTED', 'ON_HOLD'])
        .order('started_at', { ascending: false })
        .limit(20);

      if (callsError) throw callsError;
      setActiveCalls(calls || []);

      // Fetch active bridges
      const { data: bridgeData, error: bridgesError } = await supabase
        .from('call_bridges')
        .select('*')
        .in('status', ['pending', 'active'])
        .order('created_at', { ascending: false })
        .limit(10);

      if (bridgesError) throw bridgesError;
      setBridges(bridgeData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBridge = async () => {
    if (!selectedCallA || !selectedCallB) {
      toast.error('Selecione as duas chamadas para conectar');
      return;
    }

    if (selectedCallA === selectedCallB) {
      toast.error('Selecione chamadas diferentes');
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('conference-bridge', {
        body: {
          action: 'bridge',
          callId: selectedCallA,
          targetCallId: selectedCallB,
          bridgeType,
        },
      });

      if (error) throw error;

      toast.success('Bridge criado com sucesso!');
      setSelectedCallA("");
      setSelectedCallB("");
      fetchData();
    } catch (error) {
      console.error('Error creating bridge:', error);
      toast.error('Erro ao criar bridge');
    }
  };

  const getBridgeIcon = (type: string) => {
    switch (type) {
      case 'transfer':
        return <PhoneForwarded className="h-4 w-4" />;
      case 'conference':
        return <Users className="h-4 w-4" />;
      case 'whisper':
        return <Headphones className="h-4 w-4" />;
      case 'barge':
        return <Volume2 className="h-4 w-4" />;
      default:
        return <ArrowRightLeft className="h-4 w-4" />;
    }
  };

  const getBridgeLabel = (type: string) => {
    switch (type) {
      case 'transfer':
        return 'Transferência';
      case 'conference':
        return 'Conferência';
      case 'whisper':
        return 'Whisper';
      case 'barge':
        return 'Barge';
      default:
        return type;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'completed':
        return 'outline';
      case 'failed':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      {/* Create Bridge */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Merge className="h-5 w-5" />
            Criar Bridge de Chamadas
          </CardTitle>
          <CardDescription>
            Conecte duas chamadas ativas para conferência, transferência ou monitoramento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium">Chamada A</label>
              <Select value={selectedCallA} onValueChange={setSelectedCallA}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar chamada" />
                </SelectTrigger>
                <SelectContent>
                  {activeCalls.map((call) => (
                    <SelectItem key={call.id} value={call.id}>
                      {call.phone} ({call.direction === 'INBOUND' ? 'Entrada' : 'Saída'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Chamada B</label>
              <Select value={selectedCallB} onValueChange={setSelectedCallB}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar chamada" />
                </SelectTrigger>
                <SelectContent>
                  {activeCalls
                    .filter((call) => call.id !== selectedCallA)
                    .map((call) => (
                      <SelectItem key={call.id} value={call.id}>
                        {call.phone} ({call.direction === 'INBOUND' ? 'Entrada' : 'Saída'})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de Bridge</label>
              <Select value={bridgeType} onValueChange={setBridgeType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="conference">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Conferência
                    </div>
                  </SelectItem>
                  <SelectItem value="transfer">
                    <div className="flex items-center gap-2">
                      <PhoneForwarded className="h-4 w-4" />
                      Transferência
                    </div>
                  </SelectItem>
                  <SelectItem value="whisper">
                    <div className="flex items-center gap-2">
                      <Headphones className="h-4 w-4" />
                      Whisper (Supervisor ouve)
                    </div>
                  </SelectItem>
                  <SelectItem value="barge">
                    <div className="flex items-center gap-2">
                      <Volume2 className="h-4 w-4" />
                      Barge (Supervisor fala)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleCreateBridge} disabled={!selectedCallA || !selectedCallB}>
              <ArrowRightLeft className="h-4 w-4 mr-2" />
              Conectar
            </Button>
          </div>

          {activeCalls.length === 0 && !loading && (
            <div className="mt-4 text-center text-muted-foreground py-4 bg-muted/50 rounded-lg">
              <Phone className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nenhuma chamada ativa no momento</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Bridges */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Bridges Ativos</CardTitle>
              <CardDescription>
                Conexões de chamadas em andamento
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-24">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : bridges.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <ArrowRightLeft className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum bridge ativo</p>
            </div>
          ) : (
            <div className="space-y-3">
              {bridges.map((bridge) => (
                <div
                  key={bridge.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-4">
                    {getBridgeIcon(bridge.bridge_type)}
                    <div>
                      <div className="font-medium">
                        {getBridgeLabel(bridge.bridge_type)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {bridge.call_a?.phone || 'Chamada A'} ↔ {bridge.call_b?.phone || 'Chamada B'}
                      </div>
                    </div>
                  </div>

                  <Badge variant={getStatusColor(bridge.status)}>
                    {bridge.status === 'active' ? 'Ativo' : 
                     bridge.status === 'pending' ? 'Conectando...' : 
                     bridge.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
