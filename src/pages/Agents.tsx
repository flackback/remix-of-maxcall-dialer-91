import { useState, useEffect } from 'react';
import { AgentStatusGrid } from '@/components/dashboard/AgentStatusGrid';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Search, Users, Phone, Clock, Target, TrendingUp, RefreshCw, Loader2 } from 'lucide-react';

type AgentStatus = 'READY' | 'BUSY' | 'WRAPUP' | 'PAUSE' | 'OFFLINE';

interface Agent {
  id: string;
  user_id: string;
  extension: string | null;
  status: AgentStatus;
  pause_reason: string | null;
  profile?: {
    full_name: string | null;
    email?: string;
  };
  stats?: {
    calls_handled: number;
    aht: number;
    conversions: number;
    adherence: number;
  };
}

export default function Agents() {
  const { toast } = useToast();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const { data: agentsData, error } = await supabase
        .from('agents')
        .select('id, user_id, extension, status, pause_reason')
        .order('status');

      if (error) throw error;

      // Fetch profiles separately
      const userIds = (agentsData || []).map(a => a.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

      // Fetch stats for each agent (today)
      const today = new Date().toISOString().split('T')[0];
      const agentsWithStats = await Promise.all(
        (agentsData || []).map(async (agent) => {
          const { data: stats } = await supabase
            .from('agent_stats')
            .select('calls_handled, aht, conversions, adherence')
            .eq('agent_id', agent.id)
            .eq('date', today)
            .maybeSingle();

          return {
            ...agent,
            profile: profileMap.get(agent.user_id) as { full_name: string | null } | undefined,
            stats: stats || { calls_handled: 0, aht: 0, conversions: 0, adherence: 100 },
          };
        })
      );

      setAgents(agentsWithStats);
    } catch (error) {
      console.error('Error fetching agents:', error);
      toast({ title: 'Erro ao carregar agentes', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const filteredAgents = agents.filter(agent => {
    const name = agent.profile?.full_name || '';
    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (agent.extension || '').includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || agent.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    all: agents.length,
    READY: agents.filter(a => a.status === 'READY').length,
    BUSY: agents.filter(a => a.status === 'BUSY').length,
    WRAPUP: agents.filter(a => a.status === 'WRAPUP').length,
    PAUSE: agents.filter(a => a.status === 'PAUSE').length,
    OFFLINE: agents.filter(a => a.status === 'OFFLINE').length,
  };

  const getStatusBadge = (status: AgentStatus) => {
    const variants: Record<AgentStatus, string> = {
      READY: 'bg-status-ready',
      BUSY: 'bg-status-busy',
      WRAPUP: 'bg-status-wrapup',
      PAUSE: 'bg-status-pause',
      OFFLINE: 'bg-status-offline',
    };
    return <Badge className={variants[status]}>{status}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        {Object.entries(statusCounts).filter(([key]) => key !== 'all').map(([status, count]) => (
          <Card key={status} className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => setStatusFilter(status)}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-sm text-muted-foreground">{status}</p>
                </div>
                <div className={`h-3 w-3 rounded-full bg-status-${status.toLowerCase()}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 py-4">
          <div className="relative flex-1 min-w-[250px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou ramal..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos ({statusCounts.all})</SelectItem>
              <SelectItem value="READY">Ready ({statusCounts.READY})</SelectItem>
              <SelectItem value="BUSY">Busy ({statusCounts.BUSY})</SelectItem>
              <SelectItem value="WRAPUP">Wrapup ({statusCounts.WRAPUP})</SelectItem>
              <SelectItem value="PAUSE">Pause ({statusCounts.PAUSE})</SelectItem>
              <SelectItem value="OFFLINE">Offline ({statusCounts.OFFLINE})</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchAgents}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
          <Button variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Agente
          </Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="table">
        <TabsList>
          <TabsTrigger value="table">Tabela</TabsTrigger>
          <TabsTrigger value="grid">Grid</TabsTrigger>
        </TabsList>

        <TabsContent value="table" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              {filteredAgents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mb-4" />
                  <p>Nenhum agente encontrado</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Agente</TableHead>
                      <TableHead>Ramal</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Chamadas</TableHead>
                      <TableHead className="text-center">AHT</TableHead>
                      <TableHead className="text-center">Conversões</TableHead>
                      <TableHead className="text-center">Aderência</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAgents.map((agent) => (
                      <TableRow 
                        key={agent.id} 
                        className="cursor-pointer hover:bg-secondary/50"
                        onClick={() => setSelectedAgent(agent)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-primary/20 text-primary text-xs">
                                {(agent.profile?.full_name || 'A').split(' ').map(n => n[0]).join('').substring(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{agent.profile?.full_name || 'Agente'}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono">{agent.extension || '-'}</TableCell>
                        <TableCell>{getStatusBadge(agent.status)}</TableCell>
                        <TableCell className="text-center">{agent.stats?.calls_handled || 0}</TableCell>
                        <TableCell className="text-center font-mono">
                          {Math.floor((agent.stats?.aht || 0) / 60)}:{((agent.stats?.aht || 0) % 60).toString().padStart(2, '0')}
                        </TableCell>
                        <TableCell className="text-center text-metric-positive">{agent.stats?.conversions || 0}</TableCell>
                        <TableCell className="text-center">
                          <span className={(agent.stats?.adherence || 100) >= 90 ? 'text-metric-positive' : 'text-metric-warning'}>
                            {agent.stats?.adherence || 100}%
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="grid" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Status em Tempo Real</CardTitle>
              <CardDescription>
                {filteredAgents.length} agentes exibidos
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredAgents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mb-4" />
                  <p>Nenhum agente encontrado</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {filteredAgents.map((agent) => (
                    <div
                      key={agent.id}
                      className="p-3 rounded-lg border bg-card hover:shadow-md transition-all cursor-pointer"
                      onClick={() => setSelectedAgent(agent)}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`h-2 w-2 rounded-full bg-status-${agent.status.toLowerCase()}`} />
                        <span className="text-xs text-muted-foreground">{agent.status}</span>
                      </div>
                      <p className="text-sm font-medium truncate">{agent.profile?.full_name || 'Agente'}</p>
                      <p className="text-xs text-muted-foreground">Ext. {agent.extension || '-'}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Agent Detail Dialog */}
      <Dialog open={!!selectedAgent} onOpenChange={() => setSelectedAgent(null)}>
        <DialogContent className="max-w-lg">
          {selectedAgent && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/20 text-primary">
                      {(selectedAgent.profile?.full_name || 'A').split(' ').map(n => n[0]).join('').substring(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p>{selectedAgent.profile?.full_name || 'Agente'}</p>
                    <p className="text-sm font-normal text-muted-foreground">Ramal: {selectedAgent.extension || '-'}</p>
                  </div>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  {getStatusBadge(selectedAgent.status)}
                  {selectedAgent.pause_reason && (
                    <Badge variant="outline">{selectedAgent.pause_reason}</Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Chamadas</span>
                      </div>
                      <p className="text-2xl font-bold">{selectedAgent.stats?.calls_handled || 0}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Conversões</span>
                      </div>
                      <p className="text-2xl font-bold text-metric-positive">{selectedAgent.stats?.conversions || 0}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">AHT</span>
                      </div>
                      <p className="text-2xl font-bold">
                        {Math.floor((selectedAgent.stats?.aht || 0) / 60)}:{((selectedAgent.stats?.aht || 0) % 60).toString().padStart(2, '0')}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Aderência</span>
                      </div>
                      <p className="text-2xl font-bold">{selectedAgent.stats?.adherence || 100}%</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
