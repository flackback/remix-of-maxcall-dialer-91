import { useState, useMemo, useEffect } from 'react';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { QueueCard } from '@/components/dashboard/QueueCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useRealtimeSupervisor } from '@/hooks/useRealtimeSupervisor';
import { supabase } from '@/integrations/supabase/client';
import { QueueType } from '@/types';
import { 
  Phone, Users, Headphones, AlertTriangle, Radio, Eye, Volume2, Mic, Search, 
  RefreshCw, Loader2, Power, Clock, Pause, PhoneOff
} from 'lucide-react';

type QueueStrategy = 'LONGEST_IDLE' | 'ROUND_ROBIN' | 'SKILL_WEIGHTED';

interface LocalQueue {
  id: string;
  name: string;
  type: QueueType;
  strategy: QueueStrategy;
  agents: string[];
  stats: {
    waiting: number;
    active: number;
    avgWaitTime: number;
    slaPercentage: number;
    abandoned: number;
  };
}

interface Campaign {
  id: string;
  name: string;
  dial_mode: string;
  status: string;
}

export default function Supervisor() {
  const { toast } = useToast();
  const { agents, calls, metrics, loading, refetch, monitorCall, forceLogoutAgent } = useRealtimeSupervisor();
  
  const [queues, setQueues] = useState<LocalQueue[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [searchAgent, setSearchAgent] = useState('');
  const [selectedQueue, setSelectedQueue] = useState<string>('all');
  const [monitoringCall, setMonitoringCall] = useState<string | null>(null);

  useEffect(() => {
    fetchQueues();
    fetchCampaigns();
  }, []);

  const fetchQueues = async () => {
    const { data } = await supabase
      .from('queues')
      .select('id, name, type, strategy')
      .order('name');
    
    if (data) {
      setQueues(data.map(q => ({
        id: q.id,
        name: q.name,
        type: (q.type || 'INBOUND') as QueueType,
        strategy: (q.strategy || 'ROUND_ROBIN').toUpperCase().replace('-', '_') as QueueStrategy,
        agents: [],
        stats: { waiting: 0, active: 0, avgWaitTime: 0, slaPercentage: 100, abandoned: 0 }
      })));
    }
  };

  const fetchCampaigns = async () => {
    const { data } = await supabase
      .from('campaigns')
      .select('id, name, dial_mode, status')
      .eq('status', 'ACTIVE');
    
    if (data) setCampaigns(data);
  };

  // Filter agents based on search
  const filteredAgents = useMemo(() => {
    return agents.filter(agent => {
      const name = agent.profile?.full_name || '';
      const matchesSearch = name.toLowerCase().includes(searchAgent.toLowerCase()) ||
                           (agent.extension || '').includes(searchAgent);
      return matchesSearch;
    });
  }, [agents, searchAgent]);

  // Active calls from realtime data
  const activeCalls = useMemo(() => {
    return calls.filter(c => c.status === 'CONNECTED');
  }, [calls]);

  const handleMonitor = async (callId: string, type: 'listen' | 'whisper' | 'barge') => {
    const result = await monitorCall(callId, type);
    if (result.success) {
      setMonitoringCall(callId);
      toast({
        title: type === 'listen' ? 'Monitorando' : type === 'whisper' ? 'Sussurrando' : 'Intervindo',
        description: `Você está ${type === 'listen' ? 'ouvindo' : type === 'whisper' ? 'sussurrando para o agente' : 'na chamada'}`,
      });
    } else {
      toast({ title: 'Erro ao iniciar monitoria', variant: 'destructive' });
    }
  };

  const handleStopMonitoring = () => {
    setMonitoringCall(null);
    toast({ title: 'Monitoria encerrada' });
  };

  const handleForceLogout = async (agentId: string) => {
    const result = await forceLogoutAgent(agentId);
    if (result.success) {
      toast({ title: 'Agente deslogado com sucesso' });
    } else {
      toast({ title: 'Erro ao deslogar agente', variant: 'destructive' });
    }
  };

  // Calculate status counts
  const agentsByStatus = {
    ready: agents.filter(a => a.status === 'READY').length,
    busy: agents.filter(a => a.status === 'BUSY').length,
    wrapup: agents.filter(a => a.status === 'WRAPUP').length,
    pause: agents.filter(a => a.status === 'PAUSE').length,
    offline: 0,
  };

  // Format duration
  const formatDuration = (startedAt: string, connectedAt?: string) => {
    const start = connectedAt ? new Date(connectedAt) : new Date(startedAt);
    const duration = Math.floor((Date.now() - start.getTime()) / 1000);
    return `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}`;
  };

  // Get status icon and color
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'READY': return { icon: Headphones, color: 'bg-green-500', label: 'Disponível' };
      case 'BUSY': return { icon: Phone, color: 'bg-red-500', label: 'Em Ligação' };
      case 'WRAPUP': return { icon: Clock, color: 'bg-yellow-500', label: 'Wrap-up' };
      case 'PAUSE': return { icon: Pause, color: 'bg-orange-500', label: 'Pausa' };
      default: return { icon: Power, color: 'bg-gray-500', label: 'Offline' };
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Monitoring Banner */}
      {monitoringCall && (
        <Card className="border-primary bg-primary/5">
          <CardContent className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-destructive animate-pulse" />
              <span className="font-medium">Monitorando chamada ativa</span>
              <Badge variant="outline">Call ID: {monitoringCall}</Badge>
            </div>
            <Button variant="outline" size="sm" onClick={handleStopMonitoring}>
              Encerrar Monitoria
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Top Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <MetricCard
          title="Agentes Online"
          value={loading ? '-' : metrics.agentsOnline}
          subtitle={`${metrics.agentsReady} disponíveis`}
          icon={loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Users className="h-5 w-5" />}
          size="sm"
        />
        <MetricCard
          title="Chamadas Ativas"
          value={loading ? '-' : metrics.activeCalls}
          icon={<Phone className="h-5 w-5" />}
          variant="neutral"
          size="sm"
        />
        <MetricCard
          title="Em Fila"
          value={loading ? '-' : metrics.waitingCalls}
          icon={<Headphones className="h-5 w-5" />}
          variant={metrics.waitingCalls > 10 ? 'warning' : 'neutral'}
          size="sm"
        />
        <MetricCard
          title="SLA"
          value={`${metrics.slaPercentage}%`}
          icon={<AlertTriangle className="h-5 w-5" />}
          variant={metrics.slaPercentage >= 85 ? 'positive' : 'warning'}
          size="sm"
        />
        <MetricCard
          title="Abandonos"
          value={metrics.abandonedToday}
          subtitle={metrics.callsToday > 0 ? `${((metrics.abandonedToday / metrics.callsToday) * 100).toFixed(1)}%` : '0%'}
          icon={<Radio className="h-5 w-5" />}
          variant={metrics.abandonedToday > 50 ? 'negative' : 'neutral'}
          size="sm"
        />
      </div>

      {/* Refresh Button */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={refetch} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="agents" className="space-y-4">
        <TabsList>
          <TabsTrigger value="agents">
            <Users className="mr-2 h-4 w-4" />
            Agentes ({metrics.agentsOnline})
          </TabsTrigger>
          <TabsTrigger value="calls">
            <Phone className="mr-2 h-4 w-4" />
            Chamadas Ativas ({activeCalls.length})
          </TabsTrigger>
          <TabsTrigger value="queues">
            <Headphones className="mr-2 h-4 w-4" />
            Filas
          </TabsTrigger>
        </TabsList>

        {/* Agents Tab */}
        <TabsContent value="agents" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="flex flex-wrap items-center gap-4 py-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar agente ou ramal..."
                  value={searchAgent}
                  onChange={(e) => setSearchAgent(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedQueue} onValueChange={setSelectedQueue}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filtrar por fila" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as filas</SelectItem>
                  {queues.map((queue) => (
                    <SelectItem key={queue.id} value={queue.id}>{queue.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Badge variant="default" className="bg-green-500 text-white">
                  {agentsByStatus.ready} Ready
                </Badge>
                <Badge variant="default" className="bg-red-500 text-white">
                  {agentsByStatus.busy} Busy
                </Badge>
                <Badge variant="default" className="bg-yellow-500 text-white">
                  {agentsByStatus.wrapup} Wrapup
                </Badge>
                <Badge variant="default" className="bg-orange-500 text-white">
                  {agentsByStatus.pause} Pause
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Agent Grid - Realtime */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Status dos Agentes
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" title="Tempo real" />
              </CardTitle>
              <CardDescription>
                Monitoramento em tempo real - Clique para ações
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredAgents.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum agente online</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {filteredAgents.map((agent) => {
                    const config = getStatusConfig(agent.status);
                    const Icon = config.icon;
                    return (
                      <div
                        key={agent.id}
                        className="relative group p-3 rounded-lg border bg-card hover:shadow-md transition-all"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`h-8 w-8 rounded-full ${config.color}/20 flex items-center justify-center`}>
                            <Icon className={`h-4 w-4 ${config.color.replace('bg-', 'text-')}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {agent.profile?.full_name || 'Agente'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Ext. {agent.extension || '-'}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {config.label}
                        </Badge>
                        {agent.pause_reason && (
                          <p className="text-xs text-muted-foreground mt-1">{agent.pause_reason}</p>
                        )}
                        {/* Hover actions */}
                        <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-lg">
                          <Button size="sm" variant="outline" onClick={() => handleForceLogout(agent.id)}>
                            <Power className="h-3 w-3 mr-1" />
                            Deslogar
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Calls Tab */}
        <TabsContent value="calls" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Chamadas em Andamento
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" title="Tempo real" />
              </CardTitle>
              <CardDescription>
                Monitore e intervenha nas chamadas ativas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-4">
                  {activeCalls.map((call) => {
                    const agent = agents.find(a => a.id === call.agent_id);
                    const queue = queues.find(q => q.id === call.queue_id);

                    return (
                      <div
                        key={call.id}
                        className="flex items-center justify-between rounded-lg border border-border bg-card p-4"
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-red-500/20 flex items-center justify-center">
                            <Phone className="h-5 w-5 text-red-500" />
                          </div>
                          <div>
                            <p className="font-medium">{agent?.profile?.full_name || 'Agente'}</p>
                            <p className="text-sm text-muted-foreground font-mono">{call.phone}</p>
                          </div>
                          {queue && <Badge variant="outline">{queue.name}</Badge>}
                          <Badge variant={call.direction === 'INBOUND' ? 'default' : 'secondary'}>
                            {call.direction === 'INBOUND' ? 'Entrada' : 'Saída'}
                          </Badge>
                          {call.is_ai_handled && (
                            <Badge variant="outline" className="border-primary text-primary">
                              IA Handoff
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-mono text-lg">
                            {formatDuration(call.started_at, call.connected_at)}
                          </span>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleMonitor(call.id, 'listen')}
                              className={monitoringCall === call.id ? 'border-primary' : ''}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Ouvir
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleMonitor(call.id, 'whisper')}
                            >
                              <Volume2 className="h-4 w-4 mr-1" />
                              Sussurrar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleMonitor(call.id, 'barge')}
                            >
                              <Mic className="h-4 w-4 mr-1" />
                              Intervir
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {activeCalls.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <PhoneOff className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Nenhuma chamada ativa no momento</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Queues Tab */}
        <TabsContent value="queues" className="space-y-4">
          {queues.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Headphones className="h-12 w-12 mb-4" />
                <p>Nenhuma fila configurada</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {queues.map((queue) => (
                  <QueueCard key={queue.id} queue={{ ...queue, wrapupTime: 30, slaTarget: 20, maxWaitTime: 180 }} />
                ))}
              </div>

              {/* Campaign Summary */}
              {campaigns.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Campanhas Ativas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                      {campaigns.map((campaign) => (
                        <Card key={campaign.id} className="border-border/50">
                          <CardContent className="pt-4">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium">{campaign.name}</h4>
                              <Badge>{campaign.dial_mode}</Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
