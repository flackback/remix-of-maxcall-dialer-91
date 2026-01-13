import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Phone, Settings, Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface CallerIdPool {
  id: string;
  name: string;
  description: string | null;
  region: string | null;
  is_active: boolean;
  rotation_strategy: string;
  cooldown_seconds: number;
  max_uses_per_hour: number;
  created_at: string;
}

export function CallerIdPoolsPanel() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newPool, setNewPool] = useState({
    name: "",
    description: "",
    region: "",
    rotation_strategy: "round_robin",
    cooldown_seconds: 300,
    max_uses_per_hour: 100
  });

  const { data: pools, isLoading } = useQuery({
    queryKey: ['caller-id-pools'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('caller_id_pools')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as CallerIdPool[];
    }
  });

  const { data: numberCounts } = useQuery({
    queryKey: ['caller-id-number-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('caller_id_numbers')
        .select('pool_id, is_active');
      
      if (error) throw error;
      
      const counts: Record<string, { total: number; active: number }> = {};
      for (const num of data || []) {
        if (!counts[num.pool_id]) {
          counts[num.pool_id] = { total: 0, active: 0 };
        }
        counts[num.pool_id].total++;
        if (num.is_active) counts[num.pool_id].active++;
      }
      return counts;
    }
  });

  const createPoolMutation = useMutation({
    mutationFn: async (pool: typeof newPool) => {
      const { data: profile } = await supabase.auth.getUser();
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('user_id', profile.user?.id)
        .single();

      const { error } = await supabase
        .from('caller_id_pools')
        .insert({
          ...pool,
          account_id: userProfile?.account_id
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caller-id-pools'] });
      setIsCreateOpen(false);
      setNewPool({
        name: "",
        description: "",
        region: "",
        rotation_strategy: "round_robin",
        cooldown_seconds: 300,
        max_uses_per_hour: 100
      });
      toast.success("Pool criado com sucesso");
    },
    onError: (error) => {
      toast.error(`Erro ao criar pool: ${error.message}`);
    }
  });

  const togglePoolMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('caller_id_pools')
        .update({ is_active })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caller-id-pools'] });
    }
  });

  const deletePoolMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('caller_id_pools')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caller-id-pools'] });
      toast.success("Pool excluído com sucesso");
    },
    onError: (error) => {
      toast.error(`Erro ao excluir pool: ${error.message}`);
    }
  });

  const strategyLabels: Record<string, string> = {
    round_robin: "Round Robin",
    random: "Aleatório",
    weighted: "Por Peso",
    least_used: "Menos Usado",
    highest_health: "Maior Health"
  };

  if (isLoading) {
    return <div className="animate-pulse h-64 bg-muted rounded-lg" />;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Phone className="h-5 w-5" />
          Pools de Caller ID
        </CardTitle>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Novo Pool
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Pool de Caller ID</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome</Label>
                <Input
                  value={newPool.name}
                  onChange={(e) => setNewPool({ ...newPool, name: e.target.value })}
                  placeholder="Ex: Números SP"
                />
              </div>
              <div>
                <Label>Descrição</Label>
                <Input
                  value={newPool.description}
                  onChange={(e) => setNewPool({ ...newPool, description: e.target.value })}
                  placeholder="Descrição do pool"
                />
              </div>
              <div>
                <Label>Região</Label>
                <Input
                  value={newPool.region}
                  onChange={(e) => setNewPool({ ...newPool, region: e.target.value })}
                  placeholder="Ex: SP, RJ, Nacional"
                />
              </div>
              <div>
                <Label>Estratégia de Rotação</Label>
                <Select
                  value={newPool.rotation_strategy}
                  onValueChange={(v) => setNewPool({ ...newPool, rotation_strategy: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="round_robin">Round Robin</SelectItem>
                    <SelectItem value="random">Aleatório</SelectItem>
                    <SelectItem value="weighted">Por Peso</SelectItem>
                    <SelectItem value="least_used">Menos Usado</SelectItem>
                    <SelectItem value="highest_health">Maior Health Score</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Cooldown (seg)</Label>
                  <Input
                    type="number"
                    value={newPool.cooldown_seconds}
                    onChange={(e) => setNewPool({ ...newPool, cooldown_seconds: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Max Usos/Hora</Label>
                  <Input
                    type="number"
                    value={newPool.max_uses_per_hour}
                    onChange={(e) => setNewPool({ ...newPool, max_uses_per_hour: parseInt(e.target.value) })}
                  />
                </div>
              </div>
              <Button
                className="w-full"
                onClick={() => createPoolMutation.mutate(newPool)}
                disabled={!newPool.name || createPoolMutation.isPending}
              >
                Criar Pool
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Região</TableHead>
              <TableHead>Estratégia</TableHead>
              <TableHead>Números</TableHead>
              <TableHead>Cooldown</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pools?.map((pool) => (
              <TableRow key={pool.id}>
                <TableCell className="font-medium">{pool.name}</TableCell>
                <TableCell>
                  {pool.region ? (
                    <Badge variant="outline">{pool.region}</Badge>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>{strategyLabels[pool.rotation_strategy] || pool.rotation_strategy}</TableCell>
                <TableCell>
                  <span className="text-primary font-medium">
                    {numberCounts?.[pool.id]?.active || 0}
                  </span>
                  <span className="text-muted-foreground">
                    /{numberCounts?.[pool.id]?.total || 0}
                  </span>
                </TableCell>
                <TableCell>{pool.cooldown_seconds}s</TableCell>
                <TableCell>
                  <Switch
                    checked={pool.is_active}
                    onCheckedChange={(checked) => 
                      togglePoolMutation.mutate({ id: pool.id, is_active: checked })
                    }
                  />
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon">
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deletePoolMutation.mutate(pool.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {(!pools || pools.length === 0) && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Nenhum pool de Caller ID configurado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
