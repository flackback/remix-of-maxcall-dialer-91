import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { 
  Gauge, 
  TrendingUp, 
  AlertTriangle,
  RefreshCw,
  Zap,
  Clock,
  Ban
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { toast } from "sonner";

interface TrunkStatus {
  trunk_id: string;
  name: string;
  carrier_name: string;
  max_cps: number;
  current_cps: number;
  utilization_percent: number;
  status: 'healthy' | 'warning' | 'high' | 'throttled';
}

interface CPSHistory {
  timestamp: string;
  max_cps: number;
  avg_cps: number;
  throttle_count: number;
}

export function CPSMonitor() {
  const [trunks, setTrunks] = useState<TrunkStatus[]>([]);
  const [history, setHistory] = useState<CPSHistory[]>([]);
  const [selectedTrunk, setSelectedTrunk] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    total_trunks: 0,
    healthy: 0,
    warning: 0,
    throttled: 0,
    total_throttle_events: 0,
    peak_cps: 0
  });

  useEffect(() => {
    fetchTrunkStatus();
    
    // Subscribe to realtime CPS updates
    const channel = supabase
      .channel('cps-monitor')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'trunk_config'
      }, () => {
        fetchTrunkStatus();
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'cps_history'
      }, (payload) => {
        const newEvent = payload.new as any;
        if (newEvent.was_throttled) {
          toast.warning(`CPS throttled no trunk ${newEvent.trunk_id}`);
        }
      })
      .subscribe();

    // Refresh every 5 seconds
    const interval = setInterval(fetchTrunkStatus, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (selectedTrunk) {
      fetchHistory(selectedTrunk);
    }
  }, [selectedTrunk]);

  const fetchTrunkStatus = async () => {
    try {
      const { data: trunksData } = await supabase
        .from('trunk_config')
        .select(`
          id,
          name,
          max_cps,
          current_cps,
          telephony_carriers(name)
        `);

      if (trunksData) {
        const statuses: TrunkStatus[] = trunksData.map((t: any) => {
          const utilization = t.max_cps > 0 ? (t.current_cps / t.max_cps) * 100 : 0;
          let status: TrunkStatus['status'] = 'healthy';
          if (utilization >= 100) status = 'throttled';
          else if (utilization >= 90) status = 'high';
          else if (utilization >= 70) status = 'warning';

          return {
            trunk_id: t.id,
            name: t.name,
            carrier_name: t.telephony_carriers?.name || 'Unknown',
            max_cps: t.max_cps,
            current_cps: t.current_cps,
            utilization_percent: utilization,
            status
          };
        });

        setTrunks(statuses);
        
        if (!selectedTrunk && statuses.length > 0) {
          setSelectedTrunk(statuses[0].trunk_id);
        }

        // Update summary
        setSummary({
          total_trunks: statuses.length,
          healthy: statuses.filter(t => t.status === 'healthy').length,
          warning: statuses.filter(t => t.status === 'warning' || t.status === 'high').length,
          throttled: statuses.filter(t => t.status === 'throttled').length,
          total_throttle_events: 0, // Will be updated from history
          peak_cps: Math.max(...statuses.map(t => t.current_cps), 0)
        });
      }
    } catch (error) {
      console.error('Error fetching trunk status:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (trunkId: string) => {
    try {
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { data } = await supabase
        .from('cps_history')
        .select('*')
        .eq('trunk_id', trunkId)
        .gte('timestamp', last24h)
        .order('timestamp', { ascending: true });

      if (data) {
        // Aggregate by 5-minute intervals
        const intervalStats: Record<string, any> = {};
        for (const h of data) {
          const interval = new Date(h.timestamp).toISOString().slice(0, 15) + '0';
          if (!intervalStats[interval]) {
            intervalStats[interval] = {
              timestamp: interval,
              max_cps: 0,
              total_cps: 0,
              count: 0,
              throttle_count: 0
            };
          }
          intervalStats[interval].max_cps = Math.max(intervalStats[interval].max_cps, h.cps_value);
          intervalStats[interval].total_cps += h.cps_value;
          intervalStats[interval].count++;
          if (h.was_throttled) intervalStats[interval].throttle_count++;
        }

        const history: CPSHistory[] = Object.values(intervalStats).map((s: any) => ({
          timestamp: new Date(s.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          max_cps: s.max_cps,
          avg_cps: s.total_cps / s.count,
          throttle_count: s.throttle_count
        }));

        setHistory(history);

        // Update throttle events count
        const totalThrottles = data.filter(h => h.was_throttled).length;
        setSummary(prev => ({ ...prev, total_throttle_events: totalThrottles }));
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  const resetCPS = async (trunkId: string) => {
    try {
      await supabase
        .from('trunk_config')
        .update({ current_cps: 0 })
        .eq('id', trunkId);
      
      toast.success('CPS resetado com sucesso');
      fetchTrunkStatus();
    } catch (error) {
      console.error('Error resetting CPS:', error);
      toast.error('Erro ao resetar CPS');
    }
  };

  const getStatusColor = (status: TrunkStatus['status']) => {
    switch (status) {
      case 'healthy': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'high': return 'text-orange-500';
      case 'throttled': return 'text-red-500';
    }
  };

  const getStatusBadge = (status: TrunkStatus['status']) => {
    switch (status) {
      case 'healthy': return <Badge variant="default">Saudável</Badge>;
      case 'warning': return <Badge variant="secondary">Atenção</Badge>;
      case 'high': return <Badge variant="secondary" className="bg-orange-500/10 text-orange-500">Alto</Badge>;
      case 'throttled': return <Badge variant="destructive">Limitado</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const selectedTrunkData = trunks.find(t => t.trunk_id === selectedTrunk);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Gauge className="h-4 w-4" />
              Total de Trunks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold">{summary.total_trunks}</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Saudáveis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-green-500">{summary.healthy}</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              Em Alerta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-yellow-500">{summary.warning}</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Ban className="h-4 w-4 text-red-500" />
              Throttled
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-red-500">{summary.throttled}</span>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trunk List */}
        <Card>
          <CardHeader>
            <CardTitle>Trunks Ativos</CardTitle>
            <CardDescription>Clique para ver detalhes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {trunks.map(trunk => (
                <button
                  key={trunk.trunk_id}
                  onClick={() => setSelectedTrunk(trunk.trunk_id)}
                  className={`w-full p-3 border rounded-lg text-left transition-colors ${
                    selectedTrunk === trunk.trunk_id 
                      ? 'border-primary bg-primary/5' 
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{trunk.name}</span>
                    {getStatusBadge(trunk.status)}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <span>{trunk.carrier_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress 
                      value={trunk.utilization_percent} 
                      className={`flex-1 h-2 ${
                        trunk.status === 'throttled' ? '[&>div]:bg-destructive' :
                        trunk.status === 'high' ? '[&>div]:bg-orange-500' :
                        trunk.status === 'warning' ? '[&>div]:bg-yellow-500' :
                        ''
                      }`}
                    />
                    <span className="text-xs min-w-[60px] text-right">
                      {trunk.current_cps}/{trunk.max_cps}
                    </span>
                  </div>
                </button>
              ))}
              {trunks.length === 0 && (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  Nenhum trunk configurado
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* CPS History Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  {selectedTrunkData?.name || 'Selecione um trunk'}
                </CardTitle>
                <CardDescription>Histórico de CPS nas últimas 24h</CardDescription>
              </div>
              {selectedTrunk && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => resetCPS(selectedTrunk)}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset CPS
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {history.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="timestamp" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))' 
                    }} 
                  />
                  <Area
                    type="monotone"
                    dataKey="max_cps"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary) / 0.2)"
                    name="Max CPS"
                  />
                  <Area
                    type="monotone"
                    dataKey="avg_cps"
                    stroke="hsl(var(--muted-foreground))"
                    fill="hsl(var(--muted) / 0.5)"
                    name="Avg CPS"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                <Clock className="h-8 w-8 mr-2" />
                Sem dados históricos
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Throttle Events */}
      {summary.total_throttle_events > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              Eventos de Throttling (24h)
            </CardTitle>
            <CardDescription>
              {summary.total_throttle_events} eventos de limitação de CPS
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={history.filter(h => h.throttle_count > 0)}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="timestamp" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))' 
                  }} 
                />
                <Bar 
                  dataKey="throttle_count" 
                  fill="hsl(var(--destructive))" 
                  name="Throttles" 
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
