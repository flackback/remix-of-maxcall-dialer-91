import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Settings as SettingsIcon, Building, Phone, Shield, Bell, Database, Globe } from 'lucide-react';

export default function Settings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    companyName: 'MaxCall',
    timezone: 'America/Sao_Paulo',
    defaultCallerId: '+5511999999999',
    maxDialRatio: 5.0,
    dropRateTarget: 3.0,
    wrapupDefault: 30,
    amdEnabled: true,
    recordAllCalls: true,
    emailNotifications: true,
    slackNotifications: false,
  });

  const handleSave = () => {
    toast({ title: 'Configurações salvas', description: 'Todas as alterações foram aplicadas' });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">
            <SettingsIcon className="mr-2 h-4 w-4" />
            Geral
          </TabsTrigger>
          <TabsTrigger value="dialer">
            <Phone className="mr-2 h-4 w-4" />
            Discador
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="mr-2 h-4 w-4" />
            Segurança
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="mr-2 h-4 w-4" />
            Notificações
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Informações da Empresa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nome da Empresa</Label>
                  <Input
                    value={settings.companyName}
                    onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fuso Horário</Label>
                  <Select value={settings.timezone} onValueChange={(v) => setSettings({ ...settings, timezone: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/Sao_Paulo">São Paulo (GMT-3)</SelectItem>
                      <SelectItem value="America/Manaus">Manaus (GMT-4)</SelectItem>
                      <SelectItem value="America/Recife">Recife (GMT-3)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Regionalização
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Idioma Padrão</Label>
                  <Select defaultValue="pt-BR">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                      <SelectItem value="en-US">English (US)</SelectItem>
                      <SelectItem value="es">Español</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Formato de Data</Label>
                  <Select defaultValue="DD/MM/YYYY">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dialer Settings */}
        <TabsContent value="dialer" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configurações do Discador (VICIdial-style)</CardTitle>
              <CardDescription>Parâmetros globais para todas as campanhas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Caller ID Padrão</Label>
                  <Input
                    value={settings.defaultCallerId}
                    onChange={(e) => setSettings({ ...settings, defaultCallerId: e.target.value })}
                    placeholder="+5511999999999"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Wrap-up Padrão (segundos)</Label>
                  <Input
                    type="number"
                    value={settings.wrapupDefault}
                    onChange={(e) => setSettings({ ...settings, wrapupDefault: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <Separator />

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Dial Ratio Máximo</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={settings.maxDialRatio}
                    onChange={(e) => setSettings({ ...settings, maxDialRatio: parseFloat(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground">Limite máximo para discagem preditiva</p>
                </div>
                <div className="space-y-2">
                  <Label>Drop Rate Target (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={settings.dropRateTarget}
                    onChange={(e) => setSettings({ ...settings, dropRateTarget: parseFloat(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground">Meta de taxa de abandono máxima</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>AMD (Answering Machine Detection)</Label>
                    <p className="text-sm text-muted-foreground">Detectar caixa postal automaticamente</p>
                  </div>
                  <Switch
                    checked={settings.amdEnabled}
                    onCheckedChange={(v) => setSettings({ ...settings, amdEnabled: v })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Gravar Todas as Chamadas</Label>
                    <p className="text-sm text-muted-foreground">Gravação automática de todas as ligações</p>
                  </div>
                  <Switch
                    checked={settings.recordAllCalls}
                    onCheckedChange={(v) => setSettings({ ...settings, recordAllCalls: v })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Segurança e Auditoria</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Autenticação em Duas Etapas</Label>
                    <p className="text-sm text-muted-foreground">Exigir 2FA para todos os usuários admin</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Log de Auditoria</Label>
                    <p className="text-sm text-muted-foreground">Registrar todas as ações administrativas</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Timeout de Sessão</Label>
                    <p className="text-sm text-muted-foreground">Desconectar após inatividade</p>
                  </div>
                  <Select defaultValue="30">
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutos</SelectItem>
                      <SelectItem value="30">30 minutos</SelectItem>
                      <SelectItem value="60">1 hora</SelectItem>
                      <SelectItem value="never">Nunca</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>LGPD / Conformidade</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Política de Retenção</Label>
                  <p className="text-sm text-muted-foreground">Tempo para manter gravações</p>
                </div>
                <Select defaultValue="365">
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="90">90 dias</SelectItem>
                    <SelectItem value="180">180 dias</SelectItem>
                    <SelectItem value="365">1 ano</SelectItem>
                    <SelectItem value="730">2 anos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>DNC Automático</Label>
                  <p className="text-sm text-muted-foreground">Adicionar automaticamente ao solicitar</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notificações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Notificações por Email</Label>
                  <p className="text-sm text-muted-foreground">Alertas de SLA, relatórios diários</p>
                </div>
                <Switch
                  checked={settings.emailNotifications}
                  onCheckedChange={(v) => setSettings({ ...settings, emailNotifications: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Integração Slack</Label>
                  <p className="text-sm text-muted-foreground">Alertas em tempo real no Slack</p>
                </div>
                <Switch
                  checked={settings.slackNotifications}
                  onCheckedChange={(v) => setSettings({ ...settings, slackNotifications: v })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button onClick={handleSave}>Salvar Configurações</Button>
      </div>
    </div>
  );
}