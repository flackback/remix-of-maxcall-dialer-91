import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Play, Pause, Settings, BarChart3, Phone, Target, Clock, RefreshCw, Loader2 } from 'lucide-react';

type DialMode = 'PREVIEW' | 'POWER' | 'PREDICTIVE';
type CampaignStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED';

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  dial_mode: DialMode;
  status: CampaignStatus;
  dial_ratio: number;
  max_attempts: number;
  cooldown_minutes: number;
  caller_id: string | null;
  start_time: string;
  end_time: string;
  created_at: string;
}

export default function Campaigns() {
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  // Form state for new campaign
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    mode: 'POWER' as DialMode,
    dialRatio: 1.5,
    maxAttempts: 3,
    cooldownMinutes: 60,
    callerId: '',
    startTime: '08:00',
    endTime: '20:00',
    adaptiveMethod: 'AVERAGE',
    dropPercentageTarget: 3.0,
  });

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast({ title: 'Erro ao carregar campanhas', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCampaign = async (campaign: Campaign) => {
    const newStatus = campaign.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ status: newStatus })
        .eq('id', campaign.id);

      if (error) throw error;

      setCampaigns(campaigns.map(c => 
        c.id === campaign.id ? { ...c, status: newStatus } : c
      ));
      
      toast({
        title: newStatus === 'ACTIVE' ? 'Campanha ativada' : 'Campanha pausada',
        description: campaign.name,
      });
    } catch (error) {
      toast({ title: 'Erro ao atualizar campanha', variant: 'destructive' });
    }
  };

  const handleCreateCampaign = async () => {
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
        .from('campaigns')
        .insert({
          account_id: profile.account_id,
          name: newCampaign.name,
          dial_mode: newCampaign.mode,
          status: 'DRAFT',
          dial_ratio: newCampaign.dialRatio,
          max_attempts: newCampaign.maxAttempts,
          cooldown_minutes: newCampaign.cooldownMinutes,
          caller_id: newCampaign.callerId || null,
          start_time: newCampaign.startTime,
          end_time: newCampaign.endTime,
        })
        .select()
        .single();

      if (error) throw error;

      setCampaigns([data, ...campaigns]);
      setIsCreateOpen(false);
      setNewCampaign({
        name: '',
        mode: 'POWER',
        dialRatio: 1.5,
        maxAttempts: 3,
        cooldownMinutes: 60,
        callerId: '',
        startTime: '08:00',
        endTime: '20:00',
        adaptiveMethod: 'AVERAGE',
        dropPercentageTarget: 3.0,
      });
      toast({ title: 'Campanha criada', description: data.name });
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast({ title: 'Erro ao criar campanha', variant: 'destructive' });
    }
  };

  const getStatusColor = (status: CampaignStatus) => {
    switch (status) {
      case 'ACTIVE': return 'bg-status-ready';
      case 'PAUSED': return 'bg-status-wrapup';
      case 'COMPLETED': return 'bg-muted';
      case 'DRAFT': return 'bg-secondary';
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
      {/* Header Actions */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Badge variant="outline">{campaigns.filter(c => c.status === 'ACTIVE').length} Ativas</Badge>
          <Badge variant="outline">{campaigns.filter(c => c.status === 'PAUSED').length} Pausadas</Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchCampaigns}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nova Campanha
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Criar Nova Campanha</DialogTitle>
                <DialogDescription>
                  Configure os parâmetros da campanha de discagem
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome da Campanha</Label>
                    <Input 
                      value={newCampaign.name}
                      onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                      placeholder="Ex: Vendas Q1 2025"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Modo de Discagem</Label>
                    <Select 
                      value={newCampaign.mode}
                      onValueChange={(v) => setNewCampaign({ ...newCampaign, mode: v as DialMode })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PREVIEW">Preview (Manual)</SelectItem>
                        <SelectItem value="POWER">Power Dial</SelectItem>
                        <SelectItem value="PREDICTIVE">Predictive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Caller ID</Label>
                    <Input 
                      value={newCampaign.callerId}
                      onChange={(e) => setNewCampaign({ ...newCampaign, callerId: e.target.value })}
                      placeholder="+5511999999999"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Método Adaptativo</Label>
                    <Select 
                      value={newCampaign.adaptiveMethod}
                      onValueChange={(v) => setNewCampaign({ ...newCampaign, adaptiveMethod: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="HARD_LIMIT">Hard Limit</SelectItem>
                        <SelectItem value="TAPERED">Tapered</SelectItem>
                        <SelectItem value="AVERAGE">Average</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Dial Ratio: {newCampaign.dialRatio}x</Label>
                    <Slider 
                      value={[newCampaign.dialRatio]}
                      onValueChange={([v]) => setNewCampaign({ ...newCampaign, dialRatio: v })}
                      min={1}
                      max={5}
                      step={0.1}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Tentativas</Label>
                    <Input 
                      type="number"
                      value={newCampaign.maxAttempts}
                      onChange={(e) => setNewCampaign({ ...newCampaign, maxAttempts: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Drop Target: {newCampaign.dropPercentageTarget}%</Label>
                    <Slider 
                      value={[newCampaign.dropPercentageTarget]}
                      onValueChange={([v]) => setNewCampaign({ ...newCampaign, dropPercentageTarget: v })}
                      min={1}
                      max={10}
                      step={0.5}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Horário Início</Label>
                    <Input 
                      type="time"
                      value={newCampaign.startTime}
                      onChange={(e) => setNewCampaign({ ...newCampaign, startTime: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Horário Fim</Label>
                    <Input 
                      type="time"
                      value={newCampaign.endTime}
                      onChange={(e) => setNewCampaign({ ...newCampaign, endTime: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cooldown (min)</Label>
                    <Input 
                      type="number"
                      value={newCampaign.cooldownMinutes}
                      onChange={(e) => setNewCampaign({ ...newCampaign, cooldownMinutes: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreateCampaign} disabled={!newCampaign.name}>Criar Campanha</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Campaign Cards */}
      {campaigns.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Phone className="h-12 w-12 mb-4" />
            <p className="text-lg font-medium">Nenhuma campanha encontrada</p>
            <p className="text-sm">Crie sua primeira campanha para começar</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => (
            <Card key={campaign.id} className="relative overflow-hidden">
              <div className={`absolute top-0 left-0 right-0 h-1 ${getStatusColor(campaign.status)}`} />
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{campaign.name}</CardTitle>
                    <CardDescription>{campaign.description}</CardDescription>
                  </div>
                  <div className="flex gap-1">
                    <Badge variant="outline">{campaign.dial_mode}</Badge>
                    <Badge className={getStatusColor(campaign.status)}>{campaign.status}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Ratio:</span>
                    <span className="font-medium">{campaign.dial_ratio}x</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Tentativas:</span>
                    <span className="font-medium">{campaign.max_attempts}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Horário:</span>
                    <span className="font-medium">{campaign.start_time}-{campaign.end_time}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Cooldown:</span>
                    <span className="font-medium">{campaign.cooldown_minutes}min</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button 
                    variant={campaign.status === 'ACTIVE' ? 'secondary' : 'default'}
                    size="sm"
                    className="flex-1"
                    onClick={() => handleToggleCampaign(campaign)}
                    disabled={campaign.status === 'DRAFT' || campaign.status === 'COMPLETED'}
                  >
                    {campaign.status === 'ACTIVE' ? (
                      <>
                        <Pause className="mr-2 h-4 w-4" />
                        Pausar
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Iniciar
                      </>
                    )}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setSelectedCampaign(campaign)}>
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
