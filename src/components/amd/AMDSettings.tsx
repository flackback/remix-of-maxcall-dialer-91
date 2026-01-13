import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  Settings,
  Bot,
  Clock,
  MessageSquare,
  Save,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

interface AMDSettings {
  amd_enabled: boolean;
  amd_provider: string;
  max_detection_time_ms: number;
  machine_action: string;
  machine_message: string | null;
  fax_action: string;
  no_answer_action: string;
}

interface Campaign {
  id: string;
  name: string;
}

export function AMDSettings() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>("");
  const [settings, setSettings] = useState<AMDSettings>({
    amd_enabled: true,
    amd_provider: 'internal',
    max_detection_time_ms: 5000,
    machine_action: 'hangup',
    machine_message: null,
    fax_action: 'hangup',
    no_answer_action: 'reschedule',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  useEffect(() => {
    if (selectedCampaign) {
      fetchSettings();
    }
  }, [selectedCampaign]);

  const fetchCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setCampaigns(data || []);
      
      if (data && data.length > 0) {
        setSelectedCampaign(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('campaign_amd_settings')
        .select('*')
        .eq('campaign_id', selectedCampaign)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setSettings({
          amd_enabled: data.amd_enabled ?? true,
          amd_provider: data.amd_provider ?? 'internal',
          max_detection_time_ms: data.max_detection_time_ms ?? 5000,
          machine_action: data.machine_action ?? 'hangup',
          machine_message: data.machine_message,
          fax_action: data.fax_action ?? 'hangup',
          no_answer_action: data.no_answer_action ?? 'reschedule',
        });
      }
    } catch (error) {
      console.error('Error fetching AMD settings:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('campaign_amd_settings')
        .upsert({
          campaign_id: selectedCampaign,
          ...settings,
        }, {
          onConflict: 'campaign_id',
        });

      if (error) throw error;
      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Error saving AMD settings:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Campaign Selector */}
      <div className="flex items-center gap-4">
        <div className="w-64">
          <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
            <SelectTrigger>
              <SelectValue placeholder="Selecionar campanha" />
            </SelectTrigger>
            <SelectContent>
              {campaigns.map((campaign) => (
                <SelectItem key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configurações Gerais
            </CardTitle>
            <CardDescription>
              Configure a detecção de secretária eletrônica
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>AMD Habilitado</Label>
                <p className="text-sm text-muted-foreground">
                  Ativar detecção de secretária eletrônica
                </p>
              </div>
              <Switch
                checked={settings.amd_enabled}
                onCheckedChange={(checked) => 
                  setSettings(prev => ({ ...prev, amd_enabled: checked }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Provedor AMD</Label>
              <Select
                value={settings.amd_provider}
                onValueChange={(value) => 
                  setSettings(prev => ({ ...prev, amd_provider: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="internal">AMD Interno</SelectItem>
                  <SelectItem value="telnyx">Telnyx AMD</SelectItem>
                  <SelectItem value="jambonz">Jambonz AMD</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Tempo Máximo de Detecção</Label>
                <span className="text-sm text-muted-foreground">
                  {settings.max_detection_time_ms}ms
                </span>
              </div>
              <Slider
                value={[settings.max_detection_time_ms]}
                onValueChange={([value]) => 
                  setSettings(prev => ({ ...prev, max_detection_time_ms: value }))
                }
                min={2000}
                max={10000}
                step={500}
              />
              <p className="text-xs text-muted-foreground">
                Tempo máximo para detectar antes de assumir resultado
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Action Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Ações por Resultado
            </CardTitle>
            <CardDescription>
              Defina o que fazer quando detectar cada tipo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Ação para Secretária Eletrônica</Label>
              <Select
                value={settings.machine_action}
                onValueChange={(value) => 
                  setSettings(prev => ({ ...prev, machine_action: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hangup">Desligar</SelectItem>
                  <SelectItem value="leave_message">Deixar Mensagem</SelectItem>
                  <SelectItem value="reschedule">Reagendar</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {settings.machine_action === 'leave_message' && (
              <div className="space-y-2">
                <Label>Mensagem para Secretária</Label>
                <Textarea
                  value={settings.machine_message || ''}
                  onChange={(e) => 
                    setSettings(prev => ({ ...prev, machine_message: e.target.value }))
                  }
                  placeholder="Digite a mensagem que será deixada na secretária eletrônica..."
                  rows={3}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Ação para Fax</Label>
              <Select
                value={settings.fax_action}
                onValueChange={(value) => 
                  setSettings(prev => ({ ...prev, fax_action: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hangup">Desligar</SelectItem>
                  <SelectItem value="mark_invalid">Marcar como Inválido</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Ação para Não Atendeu</Label>
              <Select
                value={settings.no_answer_action}
                onValueChange={(value) => 
                  setSettings(prev => ({ ...prev, no_answer_action: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reschedule">Reagendar</SelectItem>
                  <SelectItem value="mark_failed">Marcar como Falha</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Salvar Configurações
        </Button>
      </div>
    </div>
  );
}
