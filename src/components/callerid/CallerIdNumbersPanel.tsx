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
import { Progress } from "@/components/ui/progress";
import { Plus, Phone, Shield, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CallerIdNumber {
  id: string;
  pool_id: string;
  phone_number: string;
  friendly_name: string | null;
  is_active: boolean;
  is_verified: boolean;
  stir_shaken_attestation: string | null;
  priority: number;
  weight: number;
  last_used_at: string | null;
  uses_today: number;
  uses_this_hour: number;
  pool?: {
    name: string;
  };
  health?: Array<{
    health_score: number;
    flagged_as_spam: boolean;
    answer_rate: number;
    block_rate: number;
  }>;
}

export function CallerIdNumbersPanel() {
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedPool, setSelectedPool] = useState<string>("all");
  const [newNumber, setNewNumber] = useState({
    pool_id: "",
    phone_number: "",
    friendly_name: "",
    priority: 1,
    weight: 100
  });

  const { data: pools } = useQuery({
    queryKey: ['caller-id-pools'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('caller_id_pools')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  const { data: numbers, isLoading } = useQuery({
    queryKey: ['caller-id-numbers', selectedPool],
    queryFn: async () => {
      let query = supabase
        .from('caller_id_numbers')
        .select(`
          *,
          pool:caller_id_pools(name),
          health:caller_id_health(health_score, flagged_as_spam, answer_rate, block_rate)
        `)
        .order('created_at', { ascending: false });
      
      if (selectedPool !== "all") {
        query = query.eq('pool_id', selectedPool);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CallerIdNumber[];
    }
  });

  const addNumberMutation = useMutation({
    mutationFn: async (number: typeof newNumber) => {
      const { error } = await supabase
        .from('caller_id_numbers')
        .insert(number);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caller-id-numbers'] });
      queryClient.invalidateQueries({ queryKey: ['caller-id-number-counts'] });
      setIsAddOpen(false);
      setNewNumber({
        pool_id: "",
        phone_number: "",
        friendly_name: "",
        priority: 1,
        weight: 100
      });
      toast.success("Número adicionado com sucesso");
    },
    onError: (error) => {
      toast.error(`Erro ao adicionar número: ${error.message}`);
    }
  });

  const toggleNumberMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('caller_id_numbers')
        .update({ is_active })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caller-id-numbers'] });
    }
  });

  const getHealthColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 50) return "text-yellow-500";
    return "text-red-500";
  };

  const getHealthBadge = (score: number, flagged: boolean) => {
    if (flagged) {
      return <Badge variant="destructive">SPAM</Badge>;
    }
    if (score >= 80) {
      return <Badge className="bg-green-500">Saudável</Badge>;
    }
    if (score >= 50) {
      return <Badge className="bg-yellow-500">Atenção</Badge>;
    }
    return <Badge variant="destructive">Crítico</Badge>;
  };

  if (isLoading) {
    return <div className="animate-pulse h-64 bg-muted rounded-lg" />;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Phone className="h-5 w-5" />
          Números de Caller ID
        </CardTitle>
        <div className="flex gap-2">
          <Select value={selectedPool} onValueChange={setSelectedPool}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filtrar por pool" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os pools</SelectItem>
              {pools?.map((pool) => (
                <SelectItem key={pool.id} value={pool.id}>
                  {pool.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Número
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Número</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Pool</Label>
                  <Select
                    value={newNumber.pool_id}
                    onValueChange={(v) => setNewNumber({ ...newNumber, pool_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um pool" />
                    </SelectTrigger>
                    <SelectContent>
                      {pools?.map((pool) => (
                        <SelectItem key={pool.id} value={pool.id}>
                          {pool.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Número</Label>
                  <Input
                    value={newNumber.phone_number}
                    onChange={(e) => setNewNumber({ ...newNumber, phone_number: e.target.value })}
                    placeholder="+5511999999999"
                  />
                </div>
                <div>
                  <Label>Nome Amigável</Label>
                  <Input
                    value={newNumber.friendly_name}
                    onChange={(e) => setNewNumber({ ...newNumber, friendly_name: e.target.value })}
                    placeholder="Ex: Comercial SP 1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Prioridade</Label>
                    <Input
                      type="number"
                      value={newNumber.priority}
                      onChange={(e) => setNewNumber({ ...newNumber, priority: parseInt(e.target.value) })}
                      min={1}
                      max={10}
                    />
                  </div>
                  <div>
                    <Label>Peso</Label>
                    <Input
                      type="number"
                      value={newNumber.weight}
                      onChange={(e) => setNewNumber({ ...newNumber, weight: parseInt(e.target.value) })}
                      min={1}
                      max={1000}
                    />
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={() => addNumberMutation.mutate(newNumber)}
                  disabled={!newNumber.pool_id || !newNumber.phone_number || addNumberMutation.isPending}
                >
                  Adicionar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>Pool</TableHead>
              <TableHead>STIR/SHAKEN</TableHead>
              <TableHead>Health Score</TableHead>
              <TableHead>Taxa Atend.</TableHead>
              <TableHead>Uso Hoje</TableHead>
              <TableHead>Último Uso</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {numbers?.map((num) => {
              const latestHealth = num.health?.[0];
              const healthScore = latestHealth?.health_score ?? 100;
              const flaggedAsSpam = latestHealth?.flagged_as_spam ?? false;

              return (
                <TableRow key={num.id} className={flaggedAsSpam ? "bg-destructive/10" : ""}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{num.phone_number}</span>
                      {num.friendly_name && (
                        <span className="text-sm text-muted-foreground">{num.friendly_name}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{num.pool?.name}</Badge>
                  </TableCell>
                  <TableCell>
                    {num.stir_shaken_attestation ? (
                      <Badge className={
                        num.stir_shaken_attestation === 'A' ? "bg-green-500" :
                        num.stir_shaken_attestation === 'B' ? "bg-yellow-500" :
                        "bg-orange-500"
                      }>
                        <Shield className="h-3 w-3 mr-1" />
                        {num.stir_shaken_attestation}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={healthScore} className="w-16 h-2" />
                      <span className={getHealthColor(healthScore)}>{healthScore}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {latestHealth?.answer_rate !== undefined ? (
                      <span className={latestHealth.answer_rate >= 30 ? "text-green-500" : "text-yellow-500"}>
                        {latestHealth.answer_rate.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>{num.uses_today}</TableCell>
                  <TableCell>
                    {num.last_used_at ? (
                      formatDistanceToNow(new Date(num.last_used_at), {
                        addSuffix: true,
                        locale: ptBR
                      })
                    ) : (
                      <span className="text-muted-foreground">Nunca</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getHealthBadge(healthScore, flaggedAsSpam)}
                      <Switch
                        checked={num.is_active}
                        onCheckedChange={(checked) =>
                          toggleNumberMutation.mutate({ id: num.id, is_active: checked })
                        }
                        disabled={flaggedAsSpam}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {(!numbers || numbers.length === 0) && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  Nenhum número configurado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
