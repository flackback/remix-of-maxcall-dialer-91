import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Settings, Save, RefreshCw } from 'lucide-react';

interface CampaignSettings {
  id: string;
  name: string;
  dial_mode: string;
  dial_ratio: number;
  adaptive_method: string;
  max_adapt_dial_level: number;
  drop_percentage_target: number;
  max_attempts: number;
  cooldown_minutes: number;
  start_time: string;
  end_time: string;
  work_days: number[];
  available_only_tally: boolean;
}

export function DialerSettings() {
  const [campaigns, setCampaigns] = useState<CampaignSettings[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>('');
  const [settings, setSettings] = useState<CampaignSettings | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  useEffect(() => {
    if (selectedCampaign) {
      const campaign = campaigns.find(c => c.id === selectedCampaign);
      if (campaign) {
        setSettings(campaign);
      }
    }
  }, [selectedCampaign, campaigns]);

  async function fetchCampaigns() {
    const { data, error } = await supabase
      .from('campaigns')
      .select('id, name, dial_mode, dial_ratio, adaptive_method, max_adapt_dial_level, drop_percentage_target, max_attempts, cooldown_minutes, start_time, end_time, work_days, available_only_tally')
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

  async function handleSave() {
    if (!settings) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from('campaigns')
        .update({
          dial_mode: settings.dial_mode as any,
          dial_ratio: settings.dial_ratio,
          adaptive_method: settings.adaptive_method as any,
          max_adapt_dial_level: settings.max_adapt_dial_level,
          drop_percentage_target: settings.drop_percentage_target,
          max_attempts: settings.max_attempts,
          cooldown_minutes: settings.cooldown_minutes,
          start_time: settings.start_time,
          end_time: settings.end_time,
          work_days: settings.work_days,
          available_only_tally: settings.available_only_tally
        })
        .eq('id', settings.id);

      if (error) throw error;
      toast.success('Configurações salvas');
      fetchCampaigns();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar');
    } finally {
      setLoading(false);
    }
  }

  const daysOfWeek = [
    { value: 0, label: 'Dom' },
    { value: 1, label: 'Seg' },
    { value: 2, label: 'Ter' },
    { value: 3, label: 'Qua' },
    { value: 4, label: 'Qui' },
    { value: 5, label: 'Sex' },
    { value: 6, label: 'Sáb' }
  ];

  function toggleDay(day: number) {
    if (!settings) return;
    const currentDays = settings.work_days || [];
    const newDays = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day].sort();
    setSettings({ ...settings, work_days: newDays });
  }

  if (!settings) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center">Selecione uma campanha para configurar</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Campaign Selector */}
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
        <Button variant="outline" onClick={fetchCampaigns}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Dial Mode Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Modo de Discagem
          </CardTitle>
          <CardDescription>Configure o modo e parâmetros do dialer</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Modo de Discagem</Label>
              <Select 
                value={settings.dial_mode || 'POWER'} 
                onValueChange={(val: string) => setSettings({ ...settings, dial_mode: val as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PREVIEW">Preview (Visualização)</SelectItem>
                  <SelectItem value="POWER">Power (Potência)</SelectItem>
                  <SelectItem value="PREDICTIVE">Predictive (Preditivo)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {settings.dial_mode === 'PREVIEW' && 'Agente visualiza o lead antes de discar'}
                {settings.dial_mode === 'POWER' && 'Disca automaticamente com ratio fixo'}
                {settings.dial_mode === 'PREDICTIVE' && 'Ajusta ratio automaticamente baseado em métricas'}
                {settings.dial_mode === 'MANUAL' && 'Agente controla totalmente a discagem'}
              </p>
            </div>

            {settings.dial_mode === 'PREDICTIVE' && (
              <div className="space-y-2">
                <Label>Método Adaptativo</Label>
                <Select 
                  value={settings.adaptive_method || 'AVERAGE'} 
                  onValueChange={(val: string) => setSettings({ ...settings, adaptive_method: val as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AVERAGE">Média (Balanceado)</SelectItem>
                    <SelectItem value="HARD_LIMIT">Hard Limit (Limite Rígido)</SelectItem>
                    <SelectItem value="TAPERED">Tapered (Gradual)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <Label>Dial Ratio Inicial: {settings.dial_ratio?.toFixed(1)}x</Label>
              <Slider
                value={[settings.dial_ratio || 1]}
                onValueChange={([val]) => setSettings({ ...settings, dial_ratio: val })}
                min={1}
                max={5}
                step={0.1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Chamadas simultâneas por agente disponível
              </p>
            </div>

            <div className="space-y-4">
              <Label>Dial Ratio Máximo: {settings.max_adapt_dial_level?.toFixed(1)}x</Label>
              <Slider
                value={[settings.max_adapt_dial_level || 3]}
                onValueChange={([val]) => setSettings({ ...settings, max_adapt_dial_level: val })}
                min={1}
                max={5}
                step={0.1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Limite máximo para ajuste automático
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <Label>Meta de Drop Rate: {settings.drop_percentage_target?.toFixed(1)}%</Label>
              <Slider
                value={[settings.drop_percentage_target || 3]}
                onValueChange={([val]) => setSettings({ ...settings, drop_percentage_target: val })}
                min={0.5}
                max={10}
                step={0.5}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Percentual máximo de chamadas abandonadas (regulamentação: 3%)
              </p>
            </div>

            <div className="space-y-2">
              <Label>Máximo de Tentativas por Lead</Label>
              <Input
                type="number"
                value={settings.max_attempts || 5}
                onChange={(e) => setSettings({ ...settings, max_attempts: parseInt(e.target.value) || 5 })}
                min={1}
                max={20}
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label>Contar Apenas Agentes Disponíveis</Label>
              <p className="text-xs text-muted-foreground">
                Usar apenas agentes com status "Disponível" para cálculo do ratio
              </p>
            </div>
            <Switch
              checked={settings.available_only_tally}
              onCheckedChange={(checked) => setSettings({ ...settings, available_only_tally: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Schedule Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Horário de Operação</CardTitle>
          <CardDescription>Defina quando a campanha pode discar</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label>Início</Label>
              <Input
                type="time"
                value={settings.start_time || '09:00'}
                onChange={(e) => setSettings({ ...settings, start_time: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Fim</Label>
              <Input
                type="time"
                value={settings.end_time || '21:00'}
                onChange={(e) => setSettings({ ...settings, end_time: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Cooldown entre tentativas (min)</Label>
              <Input
                type="number"
                value={settings.cooldown_minutes || 60}
                onChange={(e) => setSettings({ ...settings, cooldown_minutes: parseInt(e.target.value) || 60 })}
                min={5}
                max={1440}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Dias de Operação</Label>
            <div className="flex gap-2">
              {daysOfWeek.map(day => (
                <Button
                  key={day.value}
                  variant={(settings.work_days || []).includes(day.value) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleDay(day.value)}
                  className="w-12"
                >
                  {day.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={loading} className="gap-2">
          <Save className="h-4 w-4" />
          Salvar Configurações
        </Button>
      </div>
    </div>
  );
}
