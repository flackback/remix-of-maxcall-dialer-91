import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp,
  TrendingDown,
  Wifi,
  Clock,
  Volume2,
  RefreshCw,
  Bell,
  BellOff
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { toast } from "sonner";

interface QualityStats {
  avg_mos: number;
  avg_jitter: number;
  avg_rtt: number;
  avg_packet_loss: number;
  total_samples: number;
}

interface CarrierStats {
  carrier_id: string;
  carrier_name: string;
  avg_mos: number | null;
  samples: number;
  trunks: {
    id: string;
    name: string;
    cps_usage: number;
    current_cps: number;
    max_cps: number;
  }[];
}

interface QualityAlert {
  id: string;
  alert_type: string;
  severity: string;
  threshold_value: number;
  current_value: number;
  message: string;
  created_at: string;
  acknowledged_at: string | null;
  telephony_carriers?: { name: string };
  trunk_config?: { name: string };
}

export function QualityDashboard() {
  const [overallStats, setOverallStats] = useState<QualityStats | null>(null);
  const [carrierStats, setCarrierStats] = useState<CarrierStats[]>([]);
  const [alerts, setAlerts] = useState<QualityAlert[]>([]);
  const [qualityHistory, setQualityHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    
    // Subscribe to realtime updates
    const alertsChannel = supabase
      .channel('quality-alerts')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'quality_alerts'
      }, (payload) => {
        setAlerts(prev => [payload.new as QualityAlert, ...prev].slice(0, 10));
        toast.warning(`Alerta de qualidade: ${(payload.new as QualityAlert).alert_type}`);
      })
      .subscribe();

    const metricsChannel = supabase
      .channel('quality-metrics')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'call_quality_metrics'
      }, () => {
        // Refresh stats on new metrics
        fetchDashboardData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(alertsChannel);
      supabase.removeChannel(metricsChannel);
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch overall stats from recent metrics
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { data: metrics } = await supabase
        .from('call_quality_metrics')
        .select('*')
        .gte('measured_at', last24h);

      if (metrics && metrics.length > 0) {
        const stats: QualityStats = {
          avg_mos: metrics.reduce((a, b) => a + Number(b.mos_score), 0) / metrics.length,
          avg_jitter: metrics.reduce((a, b) => a + Number(b.jitter_ms), 0) / metrics.length,
          avg_rtt: metrics.reduce((a, b) => a + Number(b.rtt_ms), 0) / metrics.length,
          avg_packet_loss: metrics.reduce((a, b) => a + Number(b.packet_loss_percent), 0) / metrics.length,
          total_samples: metrics.length
        };
        setOverallStats(stats);

        // Build hourly history
        const hourlyStats: Record<string, any> = {};
        for (const m of metrics) {
          const hour = new Date(m.measured_at).toISOString().slice(11, 13) + ':00';
          if (!hourlyStats[hour]) {
            hourlyStats[hour] = { hour, mos_sum: 0, jitter_sum: 0, count: 0 };
          }
          hourlyStats[hour].mos_sum += Number(m.mos_score);
          hourlyStats[hour].jitter_sum += Number(m.jitter_ms);
          hourlyStats[hour].count++;
        }
        
        const history = Object.values(hourlyStats)
          .map((h: any) => ({
            hour: h.hour,
            mos: h.mos_sum / h.count,
            jitter: h.jitter_sum / h.count
          }))
          .sort((a, b) => a.hour.localeCompare(b.hour));
        
        setQualityHistory(history);
      }

      // Fetch carrier stats
      const { data: carriers } = await supabase
        .from('telephony_carriers')
        .select(`
          id,
          name,
          trunk_config(id, name, current_cps, max_cps)
        `);

      if (carriers) {
        const stats: CarrierStats[] = carriers.map((c: any) => ({
          carrier_id: c.id,
          carrier_name: c.name,
          avg_mos: null,
          samples: 0,
          trunks: c.trunk_config?.map((t: any) => ({
            id: t.id,
            name: t.name,
            cps_usage: t.max_cps > 0 ? (t.current_cps / t.max_cps) * 100 : 0,
            current_cps: t.current_cps,
            max_cps: t.max_cps
          })) || []
        }));
        setCarrierStats(stats);
      }

      // Fetch alerts
      const { data: alertsData } = await supabase
        .from('quality_alerts')
        .select(`
          *,
          telephony_carriers(name),
          trunk_config(name)
        `)
        .is('acknowledged_at', null)
        .order('created_at', { ascending: false })
        .limit(10);

      if (alertsData) {
        setAlerts(alertsData);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('quality_alerts')
        .update({
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: user.id
        })
        .eq('id', alertId);

      if (error) throw error;
      
      setAlerts(prev => prev.filter(a => a.id !== alertId));
      toast.success('Alerta reconhecido');
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      toast.error('Erro ao reconhecer alerta');
    }
  };

  const getQualityStatus = (mos: number) => {
    if (mos >= 4.0) return { label: 'Excelente', color: 'bg-green-500', icon: CheckCircle };
    if (mos >= 3.5) return { label: 'Bom', color: 'bg-blue-500', icon: TrendingUp };
    if (mos >= 3.0) return { label: 'Regular', color: 'bg-yellow-500', icon: Activity };
    if (mos >= 2.5) return { label: 'Ruim', color: 'bg-orange-500', icon: TrendingDown };
    return { label: 'Crítico', color: 'bg-red-500', icon: AlertTriangle };
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'warning': return 'secondary';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const qualityStatus = overallStats ? getQualityStatus(overallStats.avg_mos) : null;
  const QualityIcon = qualityStatus?.icon || Activity;

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              MOS Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QualityIcon className={`h-5 w-5 ${qualityStatus?.color.replace('bg-', 'text-')}`} />
                <span className="text-3xl font-bold">
                  {overallStats?.avg_mos.toFixed(1) || '-'}
                </span>
              </div>
              {qualityStatus && (
                <Badge variant="secondary">{qualityStatus.label}</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Jitter Médio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold">
              {overallStats?.avg_jitter.toFixed(1) || '-'}
            </span>
            <span className="text-muted-foreground ml-1">ms</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              RTT Médio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold">
              {overallStats?.avg_rtt.toFixed(0) || '-'}
            </span>
            <span className="text-muted-foreground ml-1">ms</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Wifi className="h-4 w-4" />
              Packet Loss
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold">
              {overallStats?.avg_packet_loss.toFixed(2) || '-'}
            </span>
            <span className="text-muted-foreground ml-1">%</span>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quality History Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Histórico de Qualidade (24h)</CardTitle>
            <CardDescription>MOS Score e Jitter por hora</CardDescription>
          </CardHeader>
          <CardContent>
            {qualityHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={qualityHistory}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="hour" className="text-xs" />
                  <YAxis yAxisId="left" domain={[1, 5]} className="text-xs" />
                  <YAxis yAxisId="right" orientation="right" className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))' 
                    }} 
                  />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="mos"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary) / 0.2)"
                    name="MOS"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="jitter"
                    stroke="hsl(var(--destructive))"
                    strokeDasharray="5 5"
                    name="Jitter (ms)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                <Volume2 className="h-8 w-8 mr-2" />
                Sem dados de qualidade nas últimas 24h
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Alertas Ativos
              {alerts.length > 0 && (
                <Badge variant="destructive">{alerts.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                <BellOff className="h-8 w-8 mb-2" />
                <p>Nenhum alerta ativo</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {alerts.map(alert => (
                  <div 
                    key={alert.id} 
                    className="p-3 border rounded-lg space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <Badge variant={getSeverityColor(alert.severity) as any}>
                        {alert.alert_type}
                      </Badge>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => acknowledgeAlert(alert.id)}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-sm">{alert.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {alert.telephony_carriers?.name || alert.trunk_config?.name || 'Sistema'}
                      {' • '}
                      {new Date(alert.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Carrier Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Status por Carrier</CardTitle>
          <CardDescription>Uso de CPS e qualidade por operadora</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {carrierStats.map(carrier => (
              <div key={carrier.carrier_id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">{carrier.carrier_name}</h4>
                  {carrier.avg_mos !== null && (
                    <Badge variant="secondary">
                      MOS: {carrier.avg_mos.toFixed(1)}
                    </Badge>
                  )}
                </div>
                <div className="space-y-2">
                  {carrier.trunks.map(trunk => (
                    <div key={trunk.id} className="flex items-center gap-4">
                      <span className="text-sm min-w-[120px]">{trunk.name}</span>
                      <div className="flex-1">
                        <Progress 
                          value={trunk.cps_usage} 
                          className={`h-2 ${
                            trunk.cps_usage > 90 ? '[&>div]:bg-destructive' :
                            trunk.cps_usage > 70 ? '[&>div]:bg-yellow-500' :
                            ''
                          }`}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground min-w-[80px] text-right">
                        {trunk.current_cps}/{trunk.max_cps} CPS
                      </span>
                    </div>
                  ))}
                  {carrier.trunks.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Nenhum trunk configurado
                    </p>
                  )}
                </div>
              </div>
            ))}
            {carrierStats.length === 0 && (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                Nenhum carrier configurado
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
