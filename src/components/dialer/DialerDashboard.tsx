import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Play, 
  Pause, 
  Square, 
  Phone, 
  Users, 
  TrendingUp,
  Activity,
  PhoneCall,
  PhoneOff,
  RefreshCw
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface Campaign {
  id: string;
  name: string;
  status: string;
  dial_mode: string;
  dial_ratio: number;
}

interface DialerStats {
  active_calls: number;
  queued: number;
  ringing: number;
  connected: number;
  completed: number;
  failed: number;
  total_today: number;
  remaining_leads: number;
}

export function DialerDashboard() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>('');
  const [stats, setStats] = useState<DialerStats | null>(null);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  useEffect(() => {
    if (selectedCampaign) {
      fetchStats();
      fetchMetrics();
    }
  }, [selectedCampaign]);

  useEffect(() => {
    if (!autoRefresh || !selectedCampaign) return;
    
    const interval = setInterval(() => {
      fetchStats();
    }, 5000);

    return () => clearInterval(interval);
  }, [autoRefresh, selectedCampaign]);

  async function fetchCampaigns() {
    const { data, error } = await supabase
      .from('campaigns')
      .select('id, name, status, dial_mode, dial_ratio')
      .order('name');

    if (error) {
      toast.error('Erro ao carregar campanhas');
      return;
    }

    setCampaigns(data || []);
    if (data && data.length > 0 && !selectedCampaign) {
      setSelectedCampaign(data[0].id);
    }
  }

  async function fetchStats() {
    if (!selectedCampaign) return;

    try {
      const { data, error } = await supabase.functions.invoke('dialer-engine', {
        body: { action: 'status', campaign_id: selectedCampaign }
      });

      if (error) throw error;
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }

  async function fetchMetrics() {
    if (!selectedCampaign) return;

    try {
      const { data, error } = await supabase.functions.invoke('dial-pacing', {
        body: { action: 'get_metrics', campaign_id: selectedCampaign }
      });

      if (error) throw error;
      if (data.success) {
        setMetrics(data.metrics.slice(0, 20).reverse());
      }
    } catch (error) {
      console.error('Error fetching metrics:', error);
    }
  }

  async function handleCampaignAction(action: 'start' | 'stop' | 'pause' | 'resume') {
    if (!selectedCampaign) return;
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('dialer-engine', {
        body: { action, campaign_id: selectedCampaign }
      });

      if (error) throw error;
      if (data.success) {
        toast.success(data.message);
        fetchCampaigns();
        fetchStats();
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao executar ação');
    } finally {
      setLoading(false);
    }
  }

  async function handleDialBatch() {
    if (!selectedCampaign) return;
    setLoading(true);

    try {
      // First get dial plan
      const { data: planData, error: planError } = await supabase.functions.invoke('dial-pacing', {
        body: { action: 'get_dial_plan', campaign_id: selectedCampaign }
      });

      if (planError) throw planError;

      const leads = planData.dial_plan?.leads?.map((l: any) => l.id) || [];
      
      if (leads.length === 0) {
        toast.info('Nenhum lead disponível para discar');
        return;
      }

      // Then dial the batch
      const { data, error } = await supabase.functions.invoke('dialer-engine', {
        body: { action: 'dial_batch', campaign_id: selectedCampaign, leads }
      });

      if (error) throw error;
      if (data.success) {
        toast.success(`${data.calls_created} chamadas iniciadas`);
        fetchStats();
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao discar');
    } finally {
      setLoading(false);
    }
  }

  async function handleAdjustPacing() {
    if (!selectedCampaign) return;
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('dial-pacing', {
        body: { action: 'adjust_pacing', campaign_id: selectedCampaign }
      });

      if (error) throw error;
      if (data.success) {
        toast.success(`Ratio ajustado: ${data.previous_ratio} → ${data.new_ratio}`);
        fetchCampaigns();
        fetchMetrics();
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao ajustar pacing');
    } finally {
      setLoading(false);
    }
  }

  const currentCampaign = campaigns.find(c => c.id === selectedCampaign);
  const statusColor = {
    'DRAFT': 'secondary',
    'RUNNING': 'default',
    'PAUSED': 'outline',
    'COMPLETED': 'secondary'
  } as const;

  return (
    <div className="space-y-6">
      {/* Campaign Selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="Selecione uma campanha" />
            </SelectTrigger>
            <SelectContent>
              {campaigns.map(campaign => (
                <SelectItem key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {currentCampaign && (
            <div className="flex items-center gap-2">
              <Badge variant={statusColor[currentCampaign.status as keyof typeof statusColor] || 'secondary'}>
                {currentCampaign.status}
              </Badge>
              <Badge variant="outline">{currentCampaign.dial_mode}</Badge>
              <Badge variant="outline">Ratio: {currentCampaign.dial_ratio}x</Badge>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'Auto' : 'Manual'}
          </Button>
        </div>
      </div>

      {/* Control Buttons */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Controles do Dialer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => handleCampaignAction('start')}
              disabled={loading || currentCampaign?.status === 'RUNNING'}
              className="gap-2"
            >
              <Play className="h-4 w-4" />
              Iniciar
            </Button>
            <Button
              variant="outline"
              onClick={() => handleCampaignAction('pause')}
              disabled={loading || currentCampaign?.status !== 'RUNNING'}
              className="gap-2"
            >
              <Pause className="h-4 w-4" />
              Pausar
            </Button>
            <Button
              variant="outline"
              onClick={() => handleCampaignAction('resume')}
              disabled={loading || currentCampaign?.status !== 'PAUSED'}
              className="gap-2"
            >
              <Play className="h-4 w-4" />
              Retomar
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleCampaignAction('stop')}
              disabled={loading || !['RUNNING', 'PAUSED'].includes(currentCampaign?.status || '')}
              className="gap-2"
            >
              <Square className="h-4 w-4" />
              Parar
            </Button>
            <div className="border-l pl-3 ml-3">
              <Button
                variant="default"
                onClick={handleDialBatch}
                disabled={loading || currentCampaign?.status !== 'RUNNING'}
                className="gap-2"
              >
                <Phone className="h-4 w-4" />
                Discar Lote
              </Button>
            </div>
            <Button
              variant="secondary"
              onClick={handleAdjustPacing}
              disabled={loading || currentCampaign?.status !== 'RUNNING'}
              className="gap-2"
            >
              <TrendingUp className="h-4 w-4" />
              Ajustar Pacing
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-primary">{stats.active_calls}</div>
              <div className="text-xs text-muted-foreground">Chamadas Ativas</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-yellow-500">{stats.queued}</div>
              <div className="text-xs text-muted-foreground">Na Fila</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-blue-500">{stats.ringing}</div>
              <div className="text-xs text-muted-foreground">Tocando</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-green-500">{stats.connected}</div>
              <div className="text-xs text-muted-foreground">Conectadas</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{stats.completed}</div>
              <div className="text-xs text-muted-foreground">Completadas</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-red-500">{stats.failed}</div>
              <div className="text-xs text-muted-foreground">Falharam</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{stats.total_today}</div>
              <div className="text-xs text-muted-foreground">Total Hoje</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-muted-foreground">{stats.remaining_leads}</div>
              <div className="text-xs text-muted-foreground">Leads Restantes</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Metrics Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Métricas de Discagem</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={(val) => new Date(val).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  className="text-xs"
                />
                <YAxis className="text-xs" />
                <Tooltip 
                  labelFormatter={(val) => new Date(val).toLocaleString('pt-BR')}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="calls_dialed" 
                  name="Discadas"
                  stroke="hsl(var(--primary))" 
                  fill="hsl(var(--primary))" 
                  fillOpacity={0.2}
                />
                <Area 
                  type="monotone" 
                  dataKey="calls_connected" 
                  name="Conectadas"
                  stroke="hsl(142, 76%, 36%)" 
                  fill="hsl(142, 76%, 36%)" 
                  fillOpacity={0.2}
                />
                <Area 
                  type="monotone" 
                  dataKey="calls_abandoned" 
                  name="Abandonadas"
                  stroke="hsl(0, 84%, 60%)" 
                  fill="hsl(0, 84%, 60%)" 
                  fillOpacity={0.2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">ASR (Answer Seizure Ratio)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-2xl font-bold">
                  {metrics.length > 0 ? metrics[metrics.length - 1]?.asr?.toFixed(1) : 0}%
                </span>
                <span className="text-muted-foreground">Meta: 50%</span>
              </div>
              <Progress 
                value={metrics.length > 0 ? metrics[metrics.length - 1]?.asr : 0} 
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Taxa de Abandono</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-2xl font-bold">
                  {metrics.length > 0 ? metrics[metrics.length - 1]?.drop_rate?.toFixed(1) : 0}%
                </span>
                <span className="text-muted-foreground">Limite: 3%</span>
              </div>
              <Progress 
                value={Math.min((metrics.length > 0 ? metrics[metrics.length - 1]?.drop_rate : 0) * 33.33, 100)} 
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Dial Ratio Atual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-2xl font-bold">
                  {currentCampaign?.dial_ratio?.toFixed(2) || 1}x
                </span>
                <span className="text-muted-foreground">Max: 3.0x</span>
              </div>
              <Progress 
                value={(currentCampaign?.dial_ratio || 1) / 3 * 100} 
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
