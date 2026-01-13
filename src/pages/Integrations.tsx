import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CarrierCard, getCarrierCategory, CarrierType } from '@/components/integrations/CarrierCard';
import { CarrierConfigDialog } from '@/components/integrations/CarrierConfigDialog';
import { AIRoutingCard } from '@/components/integrations/AIRoutingCard';
import { IntegrationCard } from '@/components/integrations/IntegrationCard';
import { IntegrationConfigDialog } from '@/components/integrations/IntegrationConfigDialog';
import { 
  Phone, Plus, Key, Loader2, Mic, Bot, PhoneCall, 
  Cloud, Server, Globe, Building 
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const AI_PROVIDERS = [
  {
    provider: 'elevenlabs',
    title: 'ElevenLabs',
    description: 'Agentes de voz conversacional',
    icon: <Mic className="h-5 w-5" />,
    docsUrl: 'https://elevenlabs.io/docs'
  },
  {
    provider: 'openai',
    title: 'OpenAI Realtime',
    description: 'GPT-4o para conversação em tempo real',
    icon: <Bot className="h-5 w-5" />,
    docsUrl: 'https://platform.openai.com/docs'
  },
  {
    provider: 'vapi',
    title: 'Vapi',
    description: 'Plataforma de agentes de voz',
    icon: <PhoneCall className="h-5 w-5" />,
    docsUrl: 'https://docs.vapi.ai'
  }
];

const CARRIER_CATEGORIES = [
  { id: 'all', label: 'Todos', icon: <Phone className="h-4 w-4" /> },
  { id: 'cpaas_global', label: 'CPaaS Global', icon: <Cloud className="h-4 w-4" /> },
  { id: 'cpaas_brasil', label: 'CPaaS Brasil', icon: <Building className="h-4 w-4" /> },
  { id: 'sip_pbx', label: 'SIP/PBX', icon: <Server className="h-4 w-4" /> },
  { id: 'brasil', label: 'Brasil', icon: <Globe className="h-4 w-4" /> },
];

export default function Integrations() {
  const { toast } = useToast();
  const [carriers, setCarriers] = useState<any[]>([]);
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedCarrier, setSelectedCarrier] = useState<any>(null);
  const [aiRoutingEnabled, setAiRoutingEnabled] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  
  // AI Integration dialog state
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [selectedProviderTitle, setSelectedProviderTitle] = useState<string>('');

  const fetchCarriers = async () => {
    try {
      const { data, error } = await supabase
        .from('telephony_carriers')
        .select('*')
        .order('priority');

      if (error) throw error;
      setCarriers(data || []);
    } catch (error) {
      console.error('Error fetching carriers:', error);
    }
  };

  const fetchIntegrations = async () => {
    try {
      const { data, error } = await supabase
        .from('account_integrations')
        .select('*');

      if (error) throw error;
      setIntegrations(data || []);
    } catch (error) {
      console.error('Error fetching integrations:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchCarriers(), fetchIntegrations()]);
      setLoading(false);
    };
    loadData();
  }, []);

  const handleConfigure = (carrier: any) => {
    setSelectedCarrier(carrier);
    setConfigDialogOpen(true);
  };

  const handleAddNew = () => {
    setSelectedCarrier(null);
    setConfigDialogOpen(true);
  };

  const handleToggle = async (id: string, active: boolean) => {
    const { error } = await supabase
      .from('telephony_carriers')
      .update({ is_active: active })
      .eq('id', id);

    if (error) {
      toast({ title: 'Erro ao atualizar', variant: 'destructive' });
    } else {
      fetchCarriers();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este carrier?')) return;
    
    const { error } = await supabase
      .from('telephony_carriers')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: 'Erro ao remover', variant: 'destructive' });
    } else {
      toast({ title: 'Carrier removido' });
      fetchCarriers();
    }
  };

  const handleConfigureAI = (provider: string, title: string) => {
    setSelectedProvider(provider);
    setSelectedProviderTitle(title);
    setAiDialogOpen(true);
  };

  const getIntegration = (provider: string) => {
    return integrations.find(i => i.provider === provider);
  };

  // Filter carriers by category
  const filteredCarriers = activeCategory === 'all' 
    ? carriers 
    : carriers.filter(c => getCarrierCategory(c.type as CarrierType) === activeCategory);

  // Count carriers by category
  const getCategoryCount = (categoryId: string) => {
    if (categoryId === 'all') return carriers.length;
    return carriers.filter(c => getCarrierCategory(c.type as CarrierType) === categoryId).length;
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* AI Voice Integrations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Integrações de IA de Voz
          </CardTitle>
          <CardDescription>
            Configure suas chaves de API para usar agentes de IA. Cada empresa configura suas próprias credenciais.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {AI_PROVIDERS.map((p) => {
                const integration = getIntegration(p.provider);
                return (
                  <IntegrationCard
                    key={p.provider}
                    provider={p.provider}
                    title={p.title}
                    description={p.description}
                    icon={p.icon}
                    configured={!!integration}
                    verified={integration?.is_verified || false}
                    onConfigure={() => handleConfigureAI(p.provider, p.title)}
                    docsUrl={p.docsUrl}
                  />
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Routing Card */}
      <AIRoutingCard
        enabled={aiRoutingEnabled}
        onToggle={setAiRoutingEnabled}
        stats={{ total_decisions: 0, cost_savings: 0, accuracy: 0 }}
      />

      {/* Carriers Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Carriers de Telefonia
          </h2>
          <Button onClick={handleAddNew}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Carrier
          </Button>
        </div>

        {/* Category Tabs */}
        <Tabs value={activeCategory} onValueChange={setActiveCategory} className="mb-4">
          <TabsList className="grid w-full grid-cols-5">
            {CARRIER_CATEGORIES.map(cat => (
              <TabsTrigger key={cat.id} value={cat.id} className="gap-2">
                {cat.icon}
                <span className="hidden sm:inline">{cat.label}</span>
                <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full">
                  {getCategoryCount(cat.id)}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredCarriers.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Phone className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                {activeCategory === 'all' 
                  ? 'Nenhum carrier configurado' 
                  : `Nenhum carrier ${CARRIER_CATEGORIES.find(c => c.id === activeCategory)?.label} configurado`}
              </p>
              <Button onClick={handleAddNew}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Carrier
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredCarriers.map((carrier) => (
              <CarrierCard
                key={carrier.id}
                carrier={carrier}
                onConfigure={handleConfigure}
                onToggle={handleToggle}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* API Keys */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Chaves de API
          </CardTitle>
          <CardDescription>Webhooks para integrações externas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div>
              <p className="font-medium">API Key Principal</p>
              <p className="text-sm text-muted-foreground font-mono">yd_live_••••••••</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">Copiar</Button>
              <Button variant="outline" size="sm">Regenerar</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <CarrierConfigDialog
        open={configDialogOpen}
        onOpenChange={setConfigDialogOpen}
        carrier={selectedCarrier}
        onSaved={fetchCarriers}
      />

      <IntegrationConfigDialog
        open={aiDialogOpen}
        onOpenChange={setAiDialogOpen}
        provider={selectedProvider}
        title={selectedProviderTitle}
        integration={getIntegration(selectedProvider)}
        onSaved={fetchIntegrations}
      />
    </div>
  );
}
