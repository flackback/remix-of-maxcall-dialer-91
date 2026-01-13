import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Zap, Lock, Network, Settings2, Save, RefreshCw } from "lucide-react";

interface TrunkConfig {
  id: string;
  carrier_id: string;
  name: string;
  codecs_allowed: string[];
  tls_enabled: boolean;
  srtp_enabled: boolean;
  nat_traversal_enabled: boolean;
  topology_hiding: boolean;
  max_cps: number;
  current_cps: number;
  cps_window_seconds: number;
  dtmf_mode: string;
  session_timers_enabled: boolean;
  session_expires_seconds: number;
  min_se_seconds: number;
}

interface TrunkConfigPanelProps {
  carrierId: string;
  carrierName: string;
}

const AVAILABLE_CODECS = ['G.711', 'G.711u', 'G.711a', 'Opus', 'G.729', 'G.722', 'PCMU', 'PCMA'];
const DTMF_MODES = ['rfc2833', 'inband', 'info'];

export function TrunkConfigPanel({ carrierId, carrierName }: TrunkConfigPanelProps) {
  const [config, setConfig] = useState<TrunkConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, [carrierId]);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('trunk_config')
        .select('*')
        .eq('carrier_id', carrierId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setConfig(data);
      } else {
        // Create default config
        const { data: newConfig, error: createError } = await supabase
          .from('trunk_config')
          .insert({
            carrier_id: carrierId,
            name: `${carrierName} Trunk`,
            codecs_allowed: ['G.711', 'Opus'],
            tls_enabled: true,
            srtp_enabled: true,
            nat_traversal_enabled: true,
            topology_hiding: true,
            max_cps: 10,
            dtmf_mode: 'rfc2833'
          })
          .select()
          .single();

        if (createError) throw createError;
        setConfig(newConfig);
      }
    } catch (error: any) {
      console.error('Error fetching trunk config:', error);
      toast.error('Erro ao carregar configuração do trunk');
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    if (!config) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('trunk_config')
        .update({
          codecs_allowed: config.codecs_allowed,
          tls_enabled: config.tls_enabled,
          srtp_enabled: config.srtp_enabled,
          nat_traversal_enabled: config.nat_traversal_enabled,
          topology_hiding: config.topology_hiding,
          max_cps: config.max_cps,
          cps_window_seconds: config.cps_window_seconds,
          dtmf_mode: config.dtmf_mode,
          session_timers_enabled: config.session_timers_enabled,
          session_expires_seconds: config.session_expires_seconds,
          min_se_seconds: config.min_se_seconds
        })
        .eq('id', config.id);

      if (error) throw error;
      toast.success('Configuração salva com sucesso');
    } catch (error: any) {
      console.error('Error saving config:', error);
      toast.error('Erro ao salvar configuração');
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (updates: Partial<TrunkConfig>) => {
    if (!config) return;
    setConfig({ ...config, ...updates });
  };

  const toggleCodec = (codec: string) => {
    if (!config) return;
    const codecs = config.codecs_allowed.includes(codec)
      ? config.codecs_allowed.filter(c => c !== codec)
      : [...config.codecs_allowed, codec];
    updateConfig({ codecs_allowed: codecs });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!config) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <p className="text-muted-foreground">Configuração não encontrada</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Configuração SBC - {config.name}
            </CardTitle>
            <CardDescription>
              Configurações avançadas de SBC para {carrierName}
            </CardDescription>
          </div>
          <Button onClick={saveConfig} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="security">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="security">
              <Shield className="h-4 w-4 mr-2" />
              Segurança
            </TabsTrigger>
            <TabsTrigger value="codecs">
              <Zap className="h-4 w-4 mr-2" />
              Codecs
            </TabsTrigger>
            <TabsTrigger value="cps">
              <Network className="h-4 w-4 mr-2" />
              CPS
            </TabsTrigger>
            <TabsTrigger value="advanced">
              <Lock className="h-4 w-4 mr-2" />
              Avançado
            </TabsTrigger>
          </TabsList>

          <TabsContent value="security" className="space-y-6 mt-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label className="text-base font-medium">TLS (Transport Layer Security)</Label>
                  <p className="text-sm text-muted-foreground">
                    Criptografia da sinalização SIP
                  </p>
                </div>
                <Switch
                  checked={config.tls_enabled}
                  onCheckedChange={(checked) => updateConfig({ tls_enabled: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label className="text-base font-medium">SRTP (Secure RTP)</Label>
                  <p className="text-sm text-muted-foreground">
                    Criptografia do áudio
                  </p>
                </div>
                <Switch
                  checked={config.srtp_enabled}
                  onCheckedChange={(checked) => updateConfig({ srtp_enabled: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label className="text-base font-medium">NAT Traversal</Label>
                  <p className="text-sm text-muted-foreground">
                    Suporte a STUN/TURN para redes NAT
                  </p>
                </div>
                <Switch
                  checked={config.nat_traversal_enabled}
                  onCheckedChange={(checked) => updateConfig({ nat_traversal_enabled: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label className="text-base font-medium">Topology Hiding</Label>
                  <p className="text-sm text-muted-foreground">
                    Ocultar IPs internos no SDP
                  </p>
                </div>
                <Switch
                  checked={config.topology_hiding}
                  onCheckedChange={(checked) => updateConfig({ topology_hiding: checked })}
                />
              </div>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-2">Status de Segurança</h4>
              <div className="flex gap-2">
                {config.tls_enabled && <Badge variant="default">TLS Ativo</Badge>}
                {config.srtp_enabled && <Badge variant="default">SRTP Ativo</Badge>}
                {config.nat_traversal_enabled && <Badge variant="secondary">NAT Traversal</Badge>}
                {config.topology_hiding && <Badge variant="secondary">Topology Hidden</Badge>}
                {!config.tls_enabled && !config.srtp_enabled && (
                  <Badge variant="destructive">Sem Criptografia</Badge>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="codecs" className="space-y-6 mt-6">
            <div>
              <Label className="text-base font-medium mb-4 block">Codecs Permitidos</Label>
              <div className="grid grid-cols-4 gap-3">
                {AVAILABLE_CODECS.map(codec => (
                  <button
                    key={codec}
                    onClick={() => toggleCodec(codec)}
                    className={`p-3 border rounded-lg text-sm font-medium transition-colors ${
                      config.codecs_allowed.includes(codec)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background hover:bg-muted'
                    }`}
                  >
                    {codec}
                  </button>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Ordem de preferência: {config.codecs_allowed.join(' → ') || 'Nenhum selecionado'}
              </p>
            </div>

            <div>
              <Label className="text-base font-medium mb-4 block">Modo DTMF</Label>
              <Select
                value={config.dtmf_mode}
                onValueChange={(value) => updateConfig({ dtmf_mode: value })}
              >
                <SelectTrigger className="w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DTMF_MODES.map(mode => (
                    <SelectItem key={mode} value={mode}>
                      {mode.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-2">
                RFC2833 é recomendado para maior compatibilidade
              </p>
            </div>
          </TabsContent>

          <TabsContent value="cps" className="space-y-6 mt-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <Label className="text-base font-medium">Limite de CPS (Calls Per Second)</Label>
                <span className="text-2xl font-bold">{config.max_cps}</span>
              </div>
              <Slider
                value={[config.max_cps]}
                onValueChange={([value]) => updateConfig({ max_cps: value })}
                min={1}
                max={100}
                step={1}
                className="mb-2"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>1 CPS</span>
                <span>100 CPS</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <Label>Janela de Medição (segundos)</Label>
                <Input
                  type="number"
                  value={config.cps_window_seconds}
                  onChange={(e) => updateConfig({ cps_window_seconds: parseInt(e.target.value) || 1 })}
                  min={1}
                  max={60}
                  className="mt-2"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Período para calcular a taxa de chamadas
                </p>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">Uso Atual</h4>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold">{config.current_cps}</span>
                  <span className="text-muted-foreground mb-1">/ {config.max_cps} CPS</span>
                </div>
                <div className="w-full bg-background rounded-full h-2 mt-2">
                  <div 
                    className={`h-2 rounded-full transition-all ${
                      (config.current_cps / config.max_cps) > 0.9 ? 'bg-destructive' :
                      (config.current_cps / config.max_cps) > 0.7 ? 'bg-yellow-500' :
                      'bg-primary'
                    }`}
                    style={{ width: `${Math.min((config.current_cps / config.max_cps) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-6 mt-6">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label className="text-base font-medium">Session Timers</Label>
                <p className="text-sm text-muted-foreground">
                  Manter sessões SIP ativas com re-INVITE periódico
                </p>
              </div>
              <Switch
                checked={config.session_timers_enabled}
                onCheckedChange={(checked) => updateConfig({ session_timers_enabled: checked })}
              />
            </div>

            {config.session_timers_enabled && (
              <div className="grid grid-cols-2 gap-6 p-4 border rounded-lg">
                <div>
                  <Label>Session Expires (segundos)</Label>
                  <Input
                    type="number"
                    value={config.session_expires_seconds}
                    onChange={(e) => updateConfig({ session_expires_seconds: parseInt(e.target.value) || 1800 })}
                    min={90}
                    max={7200}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label>Min-SE (segundos)</Label>
                  <Input
                    type="number"
                    value={config.min_se_seconds}
                    onChange={(e) => updateConfig({ min_se_seconds: parseInt(e.target.value) || 90 })}
                    min={90}
                    max={3600}
                    className="mt-2"
                  />
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
