import { useState, useEffect } from 'react';
import { QueueCard } from '@/components/dashboard/QueueCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Settings, Users, RefreshCw, Loader2, Phone } from 'lucide-react';

type QueueType = 'INBOUND' | 'OUTBOUND' | 'CALLBACK' | 'AI_TRIAGE';
type QueueStrategy = 'LONGEST_IDLE' | 'ROUND_ROBIN' | 'SKILL_WEIGHTED';

interface Queue {
  id: string;
  name: string;
  type: QueueType;
  strategy: QueueStrategy;
  wrapup_time: number;
  sla_target: number;
  max_wait_time: number;
  agents: string[];
  stats: {
    waiting: number;
    active: number;
    avgWaitTime: number;
    slaPercentage: number;
    abandoned: number;
  };
}

export default function Queues() {
  const { toast } = useToast();
  const [queues, setQueues] = useState<Queue[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedQueue, setSelectedQueue] = useState<Queue | null>(null);

  const [newQueue, setNewQueue] = useState({
    name: '',
    type: 'INBOUND' as QueueType,
    strategy: 'LONGEST_IDLE' as QueueStrategy,
    wrapupTime: 30,
    slaTarget: 20,
    maxWaitTime: 180,
  });

  useEffect(() => {
    fetchQueues();
  }, []);

  const fetchQueues = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('queues')
        .select('*')
        .order('name');

      if (error) throw error;

      // Transform data to match expected format
      const transformedQueues = (data || []).map(q => ({
        ...q,
        agents: [], // Would need to fetch from queue_agents table
        stats: {
          waiting: 0,
          active: 0,
          avgWaitTime: 0,
          slaPercentage: 100,
          abandoned: 0,
        },
      }));

      setQueues(transformedQueues);
    } catch (error) {
      console.error('Error fetching queues:', error);
      toast({ title: 'Erro ao carregar filas', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQueue = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('user_id', user?.id)
        .single();

      if (!profile?.account_id) {
        toast({ title: 'Erro: conta não encontrada', variant: 'destructive' });
        return;
      }

      const { data, error } = await supabase
        .from('queues')
        .insert({
          account_id: profile.account_id,
          name: newQueue.name,
          type: newQueue.type,
          strategy: newQueue.strategy,
          wrapup_time: newQueue.wrapupTime,
          sla_target: newQueue.slaTarget,
          max_wait_time: newQueue.maxWaitTime,
        })
        .select()
        .single();

      if (error) throw error;

      const newQueueWithStats = {
        ...data,
        agents: [],
        stats: { waiting: 0, active: 0, avgWaitTime: 0, slaPercentage: 100, abandoned: 0 },
      };

      setQueues([...queues, newQueueWithStats]);
      setIsCreateOpen(false);
      setNewQueue({
        name: '',
        type: 'INBOUND',
        strategy: 'LONGEST_IDLE',
        wrapupTime: 30,
        slaTarget: 20,
        maxWaitTime: 180,
      });
      toast({ title: 'Fila criada', description: data.name });
    } catch (error) {
      console.error('Error creating queue:', error);
      toast({ title: 'Erro ao criar fila', variant: 'destructive' });
    }
  };

  const getQueueTypeLabel = (type: QueueType) => {
    switch (type) {
      case 'INBOUND': return 'Receptivo';
      case 'OUTBOUND': return 'Ativo';
      case 'CALLBACK': return 'Callback';
      case 'AI_TRIAGE': return 'IA Triagem';
    }
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
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Badge variant="outline">{queues.length} Filas</Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchQueues}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nova Fila
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Nova Fila</DialogTitle>
                <DialogDescription>
                  Configure os parâmetros da fila de atendimento
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Nome da Fila</Label>
                  <Input 
                    value={newQueue.name}
                    onChange={(e) => setNewQueue({ ...newQueue, name: e.target.value })}
                    placeholder="Ex: Vendas Premium"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select 
                      value={newQueue.type}
                      onValueChange={(v) => setNewQueue({ ...newQueue, type: v as QueueType })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INBOUND">Receptivo</SelectItem>
                        <SelectItem value="OUTBOUND">Ativo</SelectItem>
                        <SelectItem value="CALLBACK">Callback</SelectItem>
                        <SelectItem value="AI_TRIAGE">IA Triagem</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Estratégia</Label>
                    <Select 
                      value={newQueue.strategy}
                      onValueChange={(v) => setNewQueue({ ...newQueue, strategy: v as QueueStrategy })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LONGEST_IDLE">Longest Idle</SelectItem>
                        <SelectItem value="ROUND_ROBIN">Round Robin</SelectItem>
                        <SelectItem value="SKILL_WEIGHTED">Skill Weighted</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Wrap-up (s)</Label>
                    <Input 
                      type="number"
                      value={newQueue.wrapupTime}
                      onChange={(e) => setNewQueue({ ...newQueue, wrapupTime: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>SLA Target (s)</Label>
                    <Input 
                      type="number"
                      value={newQueue.slaTarget}
                      onChange={(e) => setNewQueue({ ...newQueue, slaTarget: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Wait (s)</Label>
                    <Input 
                      type="number"
                      value={newQueue.maxWaitTime}
                      onChange={(e) => setNewQueue({ ...newQueue, maxWaitTime: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreateQueue} disabled={!newQueue.name}>Criar Fila</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Queue Cards */}
      {queues.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Phone className="h-12 w-12 mb-4" />
            <p className="text-lg font-medium">Nenhuma fila encontrada</p>
            <p className="text-sm">Crie sua primeira fila para começar</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {queues.map((queue) => (
              <QueueCard key={queue.id} queue={{ ...queue, wrapupTime: queue.wrapup_time, slaTarget: queue.sla_target, maxWaitTime: queue.max_wait_time }} />
            ))}
          </div>

          {/* Queue Details Table */}
          <Card>
            <CardHeader>
              <CardTitle>Detalhes das Filas</CardTitle>
              <CardDescription>Configuração e estatísticas</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fila</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Estratégia</TableHead>
                    <TableHead className="text-center">Agentes</TableHead>
                    <TableHead className="text-center">Em Fila</TableHead>
                    <TableHead className="text-center">SLA</TableHead>
                    <TableHead className="text-center">Tempo Médio</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {queues.map((queue) => (
                    <TableRow key={queue.id}>
                      <TableCell className="font-medium">{queue.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{getQueueTypeLabel(queue.type)}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{queue.strategy}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          {queue.agents.length}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={queue.stats.waiting > 5 ? 'destructive' : 'secondary'}>
                          {queue.stats.waiting}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={queue.stats.slaPercentage >= 85 ? 'text-metric-positive' : 'text-metric-warning'}>
                          {queue.stats.slaPercentage}%
                        </span>
                      </TableCell>
                      <TableCell className="text-center font-mono">
                        {queue.stats.avgWaitTime}s
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedQueue(queue)}>
                          <Settings className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
