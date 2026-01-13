import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Phone, Wifi, TestTube, Server, Cloud, Globe, Building, Radio, Cable } from 'lucide-react';
import { SIPConnectionTest } from './SIPConnectionTest';
import { TwilioConnectionTest } from './TwilioConnectionTest';
import { CarrierType, CARRIER_CONFIG } from './CarrierCard';

interface CarrierConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  carrier?: any;
  onSaved: () => void;
}

// All carrier types grouped by category
const CARRIER_TYPES: { value: CarrierType; label: string; icon: React.ReactNode; category: string }[] = [
  // CPaaS Global
  { value: 'telnyx', label: 'Telnyx', icon: <Cloud className="h-4 w-4" />, category: 'CPaaS Global' },
  { value: 'twilio', label: 'Twilio', icon: <Cloud className="h-4 w-4" />, category: 'CPaaS Global' },
  { value: 'vonage', label: 'Vonage', icon: <Globe className="h-4 w-4" />, category: 'CPaaS Global' },
  { value: 'plivo', label: 'Plivo', icon: <Phone className="h-4 w-4" />, category: 'CPaaS Global' },
  { value: 'bandwidth', label: 'Bandwidth', icon: <Radio className="h-4 w-4" />, category: 'CPaaS Global' },
  { value: 'sinch', label: 'Sinch', icon: <Phone className="h-4 w-4" />, category: 'CPaaS Global' },
  { value: 'infobip', label: 'Infobip', icon: <Globe className="h-4 w-4" />, category: 'CPaaS Global' },
  { value: 'jambonz', label: 'Jambonz', icon: <Server className="h-4 w-4" />, category: 'CPaaS Global' },
  // CPaaS Brasil
  { value: 'zenvia', label: 'ZenVia', icon: <Building className="h-4 w-4" />, category: 'CPaaS Brasil' },
  { value: 'totalvoice', label: 'TotalVoice', icon: <Phone className="h-4 w-4" />, category: 'CPaaS Brasil' },
  // SIP/PBX
  { value: 'sip_webrtc', label: 'SIP WebRTC', icon: <Wifi className="h-4 w-4" />, category: 'SIP/PBX' },
  { value: 'sip_generic', label: 'SIP Genérico', icon: <Cable className="h-4 w-4" />, category: 'SIP/PBX' },
  { value: 'asterisk_ami', label: 'Asterisk AMI', icon: <Server className="h-4 w-4" />, category: 'SIP/PBX' },
  { value: 'freeswitch_esl', label: 'FreeSWITCH ESL', icon: <Server className="h-4 w-4" />, category: 'SIP/PBX' },
  { value: 'opensips', label: 'OpenSIPS', icon: <Server className="h-4 w-4" />, category: 'SIP/PBX' },
  { value: 'kamailio', label: 'Kamailio', icon: <Server className="h-4 w-4" />, category: 'SIP/PBX' },
  // Brasil
  { value: 'gsvoip', label: 'GSVoip', icon: <Phone className="h-4 w-4" />, category: 'Brasil' },
  { value: 'mundivox', label: 'MundiVox', icon: <Globe className="h-4 w-4" />, category: 'Brasil' },
  { value: 'directcall', label: 'DirectCall', icon: <Phone className="h-4 w-4" />, category: 'Brasil' },
];

export function CarrierConfigDialog({ open, onOpenChange, carrier, onSaved }: CarrierConfigDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'config' | 'test'>('config');
  const [carrierType, setCarrierType] = useState<CarrierType>('telnyx');
  
  const [formData, setFormData] = useState({
    name: '',
    cost_per_minute: '0.05',
    max_concurrent_calls: '100',
    priority: '1',
  });

  // Config states for each carrier type
  const [telnyxConfig, setTelnyxConfig] = useState({
    api_key: '', connection_id: '', messaging_profile_id: '',
  });

  const [twilioConfig, setTwilioConfig] = useState({
    account_sid: '', auth_token: '', twiml_app_sid: '', outgoing_caller_id: '',
  });

  const [vonageConfig, setVonageConfig] = useState({
    api_key: '', api_secret: '', application_id: '', private_key: '',
  });

  const [plivoConfig, setPlivoConfig] = useState({
    auth_id: '', auth_token: '', outbound_trunk_sid: '',
  });

  const [bandwidthConfig, setBandwidthConfig] = useState({
    account_id: '', api_token: '', api_secret: '', application_id: '',
  });

  const [sinchConfig, setSinchConfig] = useState({
    app_key: '', app_secret: '', calling_number: '',
  });

  const [infobipConfig, setInfobipConfig] = useState({
    api_key: '', base_url: '', application_id: '',
  });

  const [jambonzConfig, setJambonzConfig] = useState({
    api_url: '', api_key: '', account_sid: '', application_sid: '', sip_trunk: '',
  });

  const [zenviaConfig, setZenviaConfig] = useState({
    api_token: '', from_number: '', webhook_url: '',
  });

  const [totalvoiceConfig, setTotalvoiceConfig] = useState({
    access_token: '', central_id: '',
  });

  const [sipWebrtcConfig, setSipWebrtcConfig] = useState({
    wss_url: '', realm: '', username: '', password: '', display_name: '',
    outbound_proxy: '', register_expires: '300',
    ice_servers: [] as { urls: string }[],
    codecs: ['opus', 'PCMU', 'PCMA'],
    dtmf_mode: 'info', enable_srtp: false,
  });

  const [sipGenericConfig, setSipGenericConfig] = useState({
    host: '', port: '5060', username: '', password: '', realm: '', transport: 'udp',
  });

  const [asteriskConfig, setAsteriskConfig] = useState({
    host: '', port: '5038', username: '', secret: '', context: 'from-internal',
  });

  const [freeswitchConfig, setFreeswitchConfig] = useState({
    host: '', port: '8021', password: '', dialplan_context: 'default',
  });

  const [opensipsConfig, setOpensipsConfig] = useState({
    mi_host: '', mi_port: '8888', domain: '', auth_user: '', auth_password: '',
  });

  const [kamailioConfig, setKamailioConfig] = useState({
    jsonrpc_url: '', auth_user: '', auth_password: '',
  });

  const [gsvoipConfig, setGsvoipConfig] = useState({
    sip_server: '', username: '', password: '', realm: '',
  });

  const [mundivoxConfig, setMundivoxConfig] = useState({
    api_url: '', api_key: '', sip_trunk: '',
  });

  const [directcallConfig, setDirectcallConfig] = useState({
    api_url: '', token: '', trunk_id: '',
  });

  useEffect(() => {
    if (carrier) {
      setCarrierType(carrier.type);
      setFormData({
        name: carrier.name,
        cost_per_minute: String(carrier.cost_per_minute || '0.05'),
        max_concurrent_calls: String(carrier.max_concurrent_calls || '100'),
        priority: String(carrier.priority || '1'),
      });

      // Load carrier-specific config
      const config = carrier.config_json || {};
      switch (carrier.type) {
        case 'telnyx': setTelnyxConfig(config); break;
        case 'twilio': setTwilioConfig(config); break;
        case 'vonage': setVonageConfig(config); break;
        case 'plivo': setPlivoConfig(config); break;
        case 'bandwidth': setBandwidthConfig(config); break;
        case 'sinch': setSinchConfig(config); break;
        case 'infobip': setInfobipConfig(config); break;
        case 'jambonz': setJambonzConfig(config); break;
        case 'zenvia': setZenviaConfig(config); break;
        case 'totalvoice': setTotalvoiceConfig(config); break;
        case 'sip_webrtc': setSipWebrtcConfig({ ...sipWebrtcConfig, ...config }); break;
        case 'sip_generic': setSipGenericConfig(config); break;
        case 'asterisk_ami': setAsteriskConfig(config); break;
        case 'freeswitch_esl': setFreeswitchConfig(config); break;
        case 'opensips': setOpensipsConfig(config); break;
        case 'kamailio': setKamailioConfig(config); break;
        case 'gsvoip': setGsvoipConfig(config); break;
        case 'mundivox': setMundivoxConfig(config); break;
        case 'directcall': setDirectcallConfig(config); break;
      }
    } else {
      resetForm();
    }
    setActiveTab('config');
  }, [carrier, open]);

  const resetForm = () => {
    setFormData({ name: '', cost_per_minute: '0.05', max_concurrent_calls: '100', priority: '1' });
    setTelnyxConfig({ api_key: '', connection_id: '', messaging_profile_id: '' });
    setTwilioConfig({ account_sid: '', auth_token: '', twiml_app_sid: '', outgoing_caller_id: '' });
    setVonageConfig({ api_key: '', api_secret: '', application_id: '', private_key: '' });
    setPlivoConfig({ auth_id: '', auth_token: '', outbound_trunk_sid: '' });
    setBandwidthConfig({ account_id: '', api_token: '', api_secret: '', application_id: '' });
    setSinchConfig({ app_key: '', app_secret: '', calling_number: '' });
    setInfobipConfig({ api_key: '', base_url: '', application_id: '' });
    setJambonzConfig({ api_url: '', api_key: '', account_sid: '', application_sid: '', sip_trunk: '' });
    setZenviaConfig({ api_token: '', from_number: '', webhook_url: '' });
    setTotalvoiceConfig({ access_token: '', central_id: '' });
    setSipWebrtcConfig({
      wss_url: '', realm: '', username: '', password: '', display_name: '',
      outbound_proxy: '', register_expires: '300', ice_servers: [],
      codecs: ['opus', 'PCMU', 'PCMA'], dtmf_mode: 'info', enable_srtp: false,
    });
    setSipGenericConfig({ host: '', port: '5060', username: '', password: '', realm: '', transport: 'udp' });
    setAsteriskConfig({ host: '', port: '5038', username: '', secret: '', context: 'from-internal' });
    setFreeswitchConfig({ host: '', port: '8021', password: '', dialplan_context: 'default' });
    setOpensipsConfig({ mi_host: '', mi_port: '8888', domain: '', auth_user: '', auth_password: '' });
    setKamailioConfig({ jsonrpc_url: '', auth_user: '', auth_password: '' });
    setGsvoipConfig({ sip_server: '', username: '', password: '', realm: '' });
    setMundivoxConfig({ api_url: '', api_key: '', sip_trunk: '' });
    setDirectcallConfig({ api_url: '', token: '', trunk_id: '' });
  };

  const getConfigJson = (): any => {
    switch (carrierType) {
      case 'telnyx': return telnyxConfig;
      case 'twilio': return twilioConfig;
      case 'vonage': return vonageConfig;
      case 'plivo': return plivoConfig;
      case 'bandwidth': return bandwidthConfig;
      case 'sinch': return sinchConfig;
      case 'infobip': return infobipConfig;
      case 'jambonz': return jambonzConfig;
      case 'zenvia': return zenviaConfig;
      case 'totalvoice': return totalvoiceConfig;
      case 'sip_webrtc': return sipWebrtcConfig;
      case 'sip_generic': return sipGenericConfig;
      case 'asterisk_ami': return asteriskConfig;
      case 'freeswitch_esl': return freeswitchConfig;
      case 'opensips': return opensipsConfig;
      case 'kamailio': return kamailioConfig;
      case 'gsvoip': return gsvoipConfig;
      case 'mundivox': return mundivoxConfig;
      case 'directcall': return directcallConfig;
      default: return {};
    }
  };

  const handleSave = async () => {
    if (!formData.name) {
      toast({ title: 'Nome é obrigatório', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: profile } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('user_id', user.id)
        .single();

      let accountId = profile?.account_id;

      // Se não tem account_id, tentar buscar conta padrão ou criar uma
      if (!accountId) {
        // Buscar primeira conta ativa
        const { data: defaultAccount } = await supabase
          .from('accounts')
          .select('id')
          .eq('is_active', true)
          .limit(1)
          .single();

        if (defaultAccount?.id) {
          // Vincular perfil à conta encontrada
          await supabase
            .from('profiles')
            .update({ account_id: defaultAccount.id })
            .eq('user_id', user.id);
          accountId = defaultAccount.id;
          toast({ 
            title: 'Conta vinculada automaticamente',
            description: 'Seu perfil foi associado a uma conta existente.'
          });
        } else {
          // Criar nova conta para o usuário
          const { data: newAccount, error: createError } = await supabase
            .from('accounts')
            .insert({ name: `Conta de ${user.email}`, is_active: true })
            .select('id')
            .single();

          if (createError || !newAccount) {
            throw new Error('Não foi possível criar uma conta. Contate o suporte.');
          }

          await supabase
            .from('profiles')
            .update({ account_id: newAccount.id })
            .eq('user_id', user.id);
          accountId = newAccount.id;
          toast({ 
            title: 'Nova conta criada',
            description: 'Uma conta foi criada automaticamente para você.'
          });
        }
      }

      const carrierData = {
        name: formData.name,
        type: carrierType,
        config_json: getConfigJson(),
        cost_per_minute: parseFloat(formData.cost_per_minute),
        max_concurrent_calls: parseInt(formData.max_concurrent_calls),
        priority: parseInt(formData.priority),
        account_id: accountId,
      };

      if (carrier?.id) {
        const { error } = await supabase
          .from('telephony_carriers')
          .update(carrierData)
          .eq('id', carrier.id);
        if (error) throw error;
        toast({ title: 'Carrier atualizado com sucesso!' });
      } else {
        const { error } = await supabase
          .from('telephony_carriers')
          .insert(carrierData);
        if (error) throw error;
        toast({ title: 'Carrier adicionado com sucesso!' });
      }

      onSaved();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving carrier:', error);
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({ 
        title: 'Erro ao salvar carrier', 
        description: errorMsg.includes('row-level security') 
          ? 'Você não tem permissão para criar carriers. Verifique se está logado como administrador.'
          : errorMsg,
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  const addIceServer = () => {
    setSipWebrtcConfig(prev => ({
      ...prev,
      ice_servers: [...prev.ice_servers, { urls: '' }],
    }));
  };

  const removeIceServer = (index: number) => {
    setSipWebrtcConfig(prev => ({
      ...prev,
      ice_servers: prev.ice_servers.filter((_, i) => i !== index),
    }));
  };

  const updateIceServer = (index: number, value: string) => {
    setSipWebrtcConfig(prev => ({
      ...prev,
      ice_servers: prev.ice_servers.map((server, i) => 
        i === index ? { urls: value } : server
      ),
    }));
  };

  const toggleCodec = (codec: string) => {
    setSipWebrtcConfig(prev => ({
      ...prev,
      codecs: prev.codecs.includes(codec)
        ? prev.codecs.filter(c => c !== codec)
        : [...prev.codecs, codec],
    }));
  };

  const supportsTest = ['sip_webrtc', 'twilio'].includes(carrierType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            {carrier ? 'Editar Carrier' : 'Adicionar Carrier'}
          </DialogTitle>
          <DialogDescription>
            Configure as credenciais e parâmetros do carrier de telefonia
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'config' | 'test')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="config" className="gap-2">
              <Phone className="h-4 w-4" />
              Configuração
            </TabsTrigger>
            <TabsTrigger value="test" className="gap-2" disabled={!supportsTest}>
              <TestTube className="h-4 w-4" />
              Teste de Conexão
            </TabsTrigger>
          </TabsList>

          <TabsContent value="config" className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome do Carrier</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Minha Operadora"
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={carrierType}
                  onValueChange={(v) => setCarrierType(v as CarrierType)}
                  disabled={!!carrier}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {['CPaaS Global', 'CPaaS Brasil', 'SIP/PBX', 'Brasil'].map(category => (
                      <div key={category}>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                          {category}
                        </div>
                        {CARRIER_TYPES.filter(t => t.category === category).map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              {type.icon}
                              {type.label}
                            </div>
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Custo/min (R$)</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={formData.cost_per_minute}
                  onChange={(e) => setFormData({ ...formData, cost_per_minute: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Chamadas Simultâneas</Label>
                <Input
                  type="number"
                  value={formData.max_concurrent_calls}
                  onChange={(e) => setFormData({ ...formData, max_concurrent_calls: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                />
              </div>
            </div>

            {/* Carrier-specific configurations */}
            {carrierType === 'telnyx' && (
              <CarrierConfigSection title="Configuração Telnyx">
                <ConfigField label="API Key" type="password" value={telnyxConfig.api_key} onChange={(v) => setTelnyxConfig({ ...telnyxConfig, api_key: v })} placeholder="KEY..." />
                <ConfigField label="Connection ID" value={telnyxConfig.connection_id} onChange={(v) => setTelnyxConfig({ ...telnyxConfig, connection_id: v })} placeholder="ID da conexão de voz" />
                <ConfigField label="Messaging Profile ID (opcional)" value={telnyxConfig.messaging_profile_id} onChange={(v) => setTelnyxConfig({ ...telnyxConfig, messaging_profile_id: v })} placeholder="Para envio de SMS" />
              </CarrierConfigSection>
            )}

            {carrierType === 'twilio' && (
              <CarrierConfigSection title="Configuração Twilio">
                <ConfigField label="Account SID" value={twilioConfig.account_sid} onChange={(v) => setTwilioConfig({ ...twilioConfig, account_sid: v })} placeholder="ACxxxxxxx" />
                <ConfigField label="Auth Token" type="password" value={twilioConfig.auth_token} onChange={(v) => setTwilioConfig({ ...twilioConfig, auth_token: v })} placeholder="Token de autenticação" />
                <ConfigField label="TwiML App SID (opcional)" value={twilioConfig.twiml_app_sid} onChange={(v) => setTwilioConfig({ ...twilioConfig, twiml_app_sid: v })} placeholder="APxxxxxxx" />
                <ConfigField label="Outgoing Caller ID" value={twilioConfig.outgoing_caller_id} onChange={(v) => setTwilioConfig({ ...twilioConfig, outgoing_caller_id: v })} placeholder="+55XXXXXXXXXXX" />
              </CarrierConfigSection>
            )}

            {carrierType === 'vonage' && (
              <CarrierConfigSection title="Configuração Vonage">
                <ConfigField label="API Key" value={vonageConfig.api_key} onChange={(v) => setVonageConfig({ ...vonageConfig, api_key: v })} placeholder="API Key" />
                <ConfigField label="API Secret" type="password" value={vonageConfig.api_secret} onChange={(v) => setVonageConfig({ ...vonageConfig, api_secret: v })} placeholder="API Secret" />
                <ConfigField label="Application ID" value={vonageConfig.application_id} onChange={(v) => setVonageConfig({ ...vonageConfig, application_id: v })} placeholder="UUID da aplicação" />
                <ConfigField label="Private Key" type="textarea" value={vonageConfig.private_key} onChange={(v) => setVonageConfig({ ...vonageConfig, private_key: v })} placeholder="-----BEGIN PRIVATE KEY-----" />
              </CarrierConfigSection>
            )}

            {carrierType === 'plivo' && (
              <CarrierConfigSection title="Configuração Plivo">
                <ConfigField label="Auth ID" value={plivoConfig.auth_id} onChange={(v) => setPlivoConfig({ ...plivoConfig, auth_id: v })} placeholder="Auth ID" />
                <ConfigField label="Auth Token" type="password" value={plivoConfig.auth_token} onChange={(v) => setPlivoConfig({ ...plivoConfig, auth_token: v })} placeholder="Auth Token" />
                <ConfigField label="Outbound Trunk SID" value={plivoConfig.outbound_trunk_sid} onChange={(v) => setPlivoConfig({ ...plivoConfig, outbound_trunk_sid: v })} placeholder="Trunk SID" />
              </CarrierConfigSection>
            )}

            {carrierType === 'bandwidth' && (
              <CarrierConfigSection title="Configuração Bandwidth">
                <ConfigField label="Account ID" value={bandwidthConfig.account_id} onChange={(v) => setBandwidthConfig({ ...bandwidthConfig, account_id: v })} placeholder="Account ID" />
                <ConfigField label="API Token" value={bandwidthConfig.api_token} onChange={(v) => setBandwidthConfig({ ...bandwidthConfig, api_token: v })} placeholder="API Token" />
                <ConfigField label="API Secret" type="password" value={bandwidthConfig.api_secret} onChange={(v) => setBandwidthConfig({ ...bandwidthConfig, api_secret: v })} placeholder="API Secret" />
                <ConfigField label="Application ID" value={bandwidthConfig.application_id} onChange={(v) => setBandwidthConfig({ ...bandwidthConfig, application_id: v })} placeholder="Application ID" />
              </CarrierConfigSection>
            )}

            {carrierType === 'sinch' && (
              <CarrierConfigSection title="Configuração Sinch">
                <ConfigField label="App Key" value={sinchConfig.app_key} onChange={(v) => setSinchConfig({ ...sinchConfig, app_key: v })} placeholder="App Key" />
                <ConfigField label="App Secret" type="password" value={sinchConfig.app_secret} onChange={(v) => setSinchConfig({ ...sinchConfig, app_secret: v })} placeholder="App Secret" />
                <ConfigField label="Calling Number" value={sinchConfig.calling_number} onChange={(v) => setSinchConfig({ ...sinchConfig, calling_number: v })} placeholder="+55XXXXXXXXXXX" />
              </CarrierConfigSection>
            )}

            {carrierType === 'infobip' && (
              <CarrierConfigSection title="Configuração Infobip">
                <ConfigField label="API Key" type="password" value={infobipConfig.api_key} onChange={(v) => setInfobipConfig({ ...infobipConfig, api_key: v })} placeholder="API Key" />
                <ConfigField label="Base URL" value={infobipConfig.base_url} onChange={(v) => setInfobipConfig({ ...infobipConfig, base_url: v })} placeholder="https://xxxxx.api.infobip.com" />
                <ConfigField label="Application ID" value={infobipConfig.application_id} onChange={(v) => setInfobipConfig({ ...infobipConfig, application_id: v })} placeholder="Application ID" />
              </CarrierConfigSection>
            )}

            {carrierType === 'jambonz' && (
              <CarrierConfigSection title="Configuração Jambonz">
                <ConfigField label="API URL" value={jambonzConfig.api_url} onChange={(v) => setJambonzConfig({ ...jambonzConfig, api_url: v })} placeholder="https://api.jambonz.us" />
                <ConfigField label="API Key" type="password" value={jambonzConfig.api_key} onChange={(v) => setJambonzConfig({ ...jambonzConfig, api_key: v })} placeholder="Bearer token" />
                <ConfigField label="Account SID" value={jambonzConfig.account_sid} onChange={(v) => setJambonzConfig({ ...jambonzConfig, account_sid: v })} placeholder="UUID da conta" />
                <ConfigField label="Application SID" value={jambonzConfig.application_sid} onChange={(v) => setJambonzConfig({ ...jambonzConfig, application_sid: v })} placeholder="UUID da aplicação" />
                <ConfigField label="SIP Trunk" value={jambonzConfig.sip_trunk} onChange={(v) => setJambonzConfig({ ...jambonzConfig, sip_trunk: v })} placeholder="Nome do trunk SIP" />
              </CarrierConfigSection>
            )}

            {carrierType === 'zenvia' && (
              <CarrierConfigSection title="Configuração ZenVia">
                <ConfigField label="API Token" type="password" value={zenviaConfig.api_token} onChange={(v) => setZenviaConfig({ ...zenviaConfig, api_token: v })} placeholder="Token de API" />
                <ConfigField label="From Number" value={zenviaConfig.from_number} onChange={(v) => setZenviaConfig({ ...zenviaConfig, from_number: v })} placeholder="+55XXXXXXXXXXX" />
                <ConfigField label="Webhook URL (opcional)" value={zenviaConfig.webhook_url} onChange={(v) => setZenviaConfig({ ...zenviaConfig, webhook_url: v })} placeholder="https://..." />
              </CarrierConfigSection>
            )}

            {carrierType === 'totalvoice' && (
              <CarrierConfigSection title="Configuração TotalVoice">
                <ConfigField label="Access Token" type="password" value={totalvoiceConfig.access_token} onChange={(v) => setTotalvoiceConfig({ ...totalvoiceConfig, access_token: v })} placeholder="Token de acesso" />
                <ConfigField label="Central ID" value={totalvoiceConfig.central_id} onChange={(v) => setTotalvoiceConfig({ ...totalvoiceConfig, central_id: v })} placeholder="ID da central" />
              </CarrierConfigSection>
            )}

            {carrierType === 'sip_webrtc' && (
              <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-2">
                  <Wifi className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Configuração SIP WebRTC</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <ConfigField label="WebSocket URL *" value={sipWebrtcConfig.wss_url} onChange={(v) => setSipWebrtcConfig({ ...sipWebrtcConfig, wss_url: v })} placeholder="wss://webrtc.exemplo.com" hint="URL do servidor WebSocket SIP" />
                  <ConfigField label="Realm/Domínio *" value={sipWebrtcConfig.realm} onChange={(v) => setSipWebrtcConfig({ ...sipWebrtcConfig, realm: v })} placeholder="exemplo.com" hint="Domínio SIP para autenticação" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <ConfigField label="Usuário/Ramal" value={sipWebrtcConfig.username} onChange={(v) => setSipWebrtcConfig({ ...sipWebrtcConfig, username: v })} placeholder="1001" />
                  <ConfigField label="Senha" type="password" value={sipWebrtcConfig.password} onChange={(v) => setSipWebrtcConfig({ ...sipWebrtcConfig, password: v })} placeholder="********" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <ConfigField label="Nome de Exibição" value={sipWebrtcConfig.display_name} onChange={(v) => setSipWebrtcConfig({ ...sipWebrtcConfig, display_name: v })} placeholder="Agente 001" />
                  <ConfigField label="Outbound Proxy (opcional)" value={sipWebrtcConfig.outbound_proxy} onChange={(v) => setSipWebrtcConfig({ ...sipWebrtcConfig, outbound_proxy: v })} placeholder="sip:proxy.exemplo.com" />
                </div>
                {/* ICE Servers */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Servidores ICE (STUN/TURN)</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addIceServer}>+ Adicionar</Button>
                  </div>
                  {sipWebrtcConfig.ice_servers.length === 0 && (
                    <p className="text-xs text-muted-foreground">Se não configurar, servidores STUN do Google serão usados</p>
                  )}
                  {sipWebrtcConfig.ice_servers.map((server, index) => (
                    <div key={index} className="flex gap-2">
                      <Input value={server.urls} onChange={(e) => updateIceServer(index, e.target.value)} placeholder="stun:stun.exemplo.com:3478" />
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeIceServer(index)}>×</Button>
                    </div>
                  ))}
                </div>
                {/* Codecs */}
                <div className="space-y-2">
                  <Label>Codecs de Áudio</Label>
                  <div className="flex flex-wrap gap-2">
                    {['opus', 'PCMU', 'PCMA', 'G722'].map((codec) => (
                      <Badge key={codec} variant={sipWebrtcConfig.codecs.includes(codec) ? 'default' : 'outline'} className="cursor-pointer" onClick={() => toggleCodec(codec)}>
                        {codec}
                      </Badge>
                    ))}
                  </div>
                </div>
                {/* Advanced Options */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Modo DTMF</Label>
                    <Select value={sipWebrtcConfig.dtmf_mode} onValueChange={(v) => setSipWebrtcConfig({ ...sipWebrtcConfig, dtmf_mode: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="info">INFO (RFC 2976)</SelectItem>
                        <SelectItem value="rfc2833">RFC 2833 (In-band)</SelectItem>
                        <SelectItem value="inband">In-band Audio</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <ConfigField label="Tempo de Registro (s)" type="number" value={sipWebrtcConfig.register_expires} onChange={(v) => setSipWebrtcConfig({ ...sipWebrtcConfig, register_expires: v })} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Habilitar SRTP</Label>
                    <p className="text-xs text-muted-foreground">Criptografia de mídia</p>
                  </div>
                  <Switch checked={sipWebrtcConfig.enable_srtp} onCheckedChange={(v) => setSipWebrtcConfig({ ...sipWebrtcConfig, enable_srtp: v })} />
                </div>
              </div>
            )}

            {carrierType === 'sip_generic' && (
              <CarrierConfigSection title="Configuração SIP Genérico">
                <ConfigField label="Host" value={sipGenericConfig.host} onChange={(v) => setSipGenericConfig({ ...sipGenericConfig, host: v })} placeholder="sip.exemplo.com" />
                <ConfigField label="Porta" value={sipGenericConfig.port} onChange={(v) => setSipGenericConfig({ ...sipGenericConfig, port: v })} placeholder="5060" />
                <ConfigField label="Usuário" value={sipGenericConfig.username} onChange={(v) => setSipGenericConfig({ ...sipGenericConfig, username: v })} placeholder="Usuário SIP" />
                <ConfigField label="Senha" type="password" value={sipGenericConfig.password} onChange={(v) => setSipGenericConfig({ ...sipGenericConfig, password: v })} placeholder="********" />
                <ConfigField label="Realm" value={sipGenericConfig.realm} onChange={(v) => setSipGenericConfig({ ...sipGenericConfig, realm: v })} placeholder="Domínio SIP" />
                <div className="space-y-2">
                  <Label>Transporte</Label>
                  <Select value={sipGenericConfig.transport} onValueChange={(v) => setSipGenericConfig({ ...sipGenericConfig, transport: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="udp">UDP</SelectItem>
                      <SelectItem value="tcp">TCP</SelectItem>
                      <SelectItem value="tls">TLS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CarrierConfigSection>
            )}

            {carrierType === 'asterisk_ami' && (
              <CarrierConfigSection title="Configuração Asterisk AMI">
                <ConfigField label="Host" value={asteriskConfig.host} onChange={(v) => setAsteriskConfig({ ...asteriskConfig, host: v })} placeholder="192.168.1.100" />
                <ConfigField label="Porta AMI" value={asteriskConfig.port} onChange={(v) => setAsteriskConfig({ ...asteriskConfig, port: v })} placeholder="5038" />
                <ConfigField label="Username" value={asteriskConfig.username} onChange={(v) => setAsteriskConfig({ ...asteriskConfig, username: v })} placeholder="admin" />
                <ConfigField label="Secret" type="password" value={asteriskConfig.secret} onChange={(v) => setAsteriskConfig({ ...asteriskConfig, secret: v })} placeholder="********" />
                <ConfigField label="Context" value={asteriskConfig.context} onChange={(v) => setAsteriskConfig({ ...asteriskConfig, context: v })} placeholder="from-internal" hint="Contexto do dialplan para chamadas" />
              </CarrierConfigSection>
            )}

            {carrierType === 'freeswitch_esl' && (
              <CarrierConfigSection title="Configuração FreeSWITCH ESL">
                <ConfigField label="Host" value={freeswitchConfig.host} onChange={(v) => setFreeswitchConfig({ ...freeswitchConfig, host: v })} placeholder="192.168.1.100" />
                <ConfigField label="Porta ESL" value={freeswitchConfig.port} onChange={(v) => setFreeswitchConfig({ ...freeswitchConfig, port: v })} placeholder="8021" />
                <ConfigField label="Password" type="password" value={freeswitchConfig.password} onChange={(v) => setFreeswitchConfig({ ...freeswitchConfig, password: v })} placeholder="ClueCon" />
                <ConfigField label="Dialplan Context" value={freeswitchConfig.dialplan_context} onChange={(v) => setFreeswitchConfig({ ...freeswitchConfig, dialplan_context: v })} placeholder="default" />
              </CarrierConfigSection>
            )}

            {carrierType === 'opensips' && (
              <CarrierConfigSection title="Configuração OpenSIPS">
                <ConfigField label="MI Host" value={opensipsConfig.mi_host} onChange={(v) => setOpensipsConfig({ ...opensipsConfig, mi_host: v })} placeholder="192.168.1.100" />
                <ConfigField label="MI Port" value={opensipsConfig.mi_port} onChange={(v) => setOpensipsConfig({ ...opensipsConfig, mi_port: v })} placeholder="8888" />
                <ConfigField label="Domain" value={opensipsConfig.domain} onChange={(v) => setOpensipsConfig({ ...opensipsConfig, domain: v })} placeholder="sip.exemplo.com" />
                <ConfigField label="Auth User" value={opensipsConfig.auth_user} onChange={(v) => setOpensipsConfig({ ...opensipsConfig, auth_user: v })} placeholder="admin" />
                <ConfigField label="Auth Password" type="password" value={opensipsConfig.auth_password} onChange={(v) => setOpensipsConfig({ ...opensipsConfig, auth_password: v })} placeholder="********" />
              </CarrierConfigSection>
            )}

            {carrierType === 'kamailio' && (
              <CarrierConfigSection title="Configuração Kamailio">
                <ConfigField label="JSONRPC URL" value={kamailioConfig.jsonrpc_url} onChange={(v) => setKamailioConfig({ ...kamailioConfig, jsonrpc_url: v })} placeholder="http://192.168.1.100:5060/RPC" />
                <ConfigField label="Auth User" value={kamailioConfig.auth_user} onChange={(v) => setKamailioConfig({ ...kamailioConfig, auth_user: v })} placeholder="admin" />
                <ConfigField label="Auth Password" type="password" value={kamailioConfig.auth_password} onChange={(v) => setKamailioConfig({ ...kamailioConfig, auth_password: v })} placeholder="********" />
              </CarrierConfigSection>
            )}

            {carrierType === 'gsvoip' && (
              <CarrierConfigSection title="Configuração GSVoip">
                <ConfigField label="SIP Server" value={gsvoipConfig.sip_server} onChange={(v) => setGsvoipConfig({ ...gsvoipConfig, sip_server: v })} placeholder="sip.gsvoip.com.br" />
                <ConfigField label="Username" value={gsvoipConfig.username} onChange={(v) => setGsvoipConfig({ ...gsvoipConfig, username: v })} placeholder="Usuário" />
                <ConfigField label="Password" type="password" value={gsvoipConfig.password} onChange={(v) => setGsvoipConfig({ ...gsvoipConfig, password: v })} placeholder="********" />
                <ConfigField label="Realm" value={gsvoipConfig.realm} onChange={(v) => setGsvoipConfig({ ...gsvoipConfig, realm: v })} placeholder="gsvoip.com.br" />
              </CarrierConfigSection>
            )}

            {carrierType === 'mundivox' && (
              <CarrierConfigSection title="Configuração MundiVox">
                <ConfigField label="API URL" value={mundivoxConfig.api_url} onChange={(v) => setMundivoxConfig({ ...mundivoxConfig, api_url: v })} placeholder="https://api.mundivox.com.br" />
                <ConfigField label="API Key" type="password" value={mundivoxConfig.api_key} onChange={(v) => setMundivoxConfig({ ...mundivoxConfig, api_key: v })} placeholder="API Key" />
                <ConfigField label="SIP Trunk" value={mundivoxConfig.sip_trunk} onChange={(v) => setMundivoxConfig({ ...mundivoxConfig, sip_trunk: v })} placeholder="Nome do trunk" />
              </CarrierConfigSection>
            )}

            {carrierType === 'directcall' && (
              <CarrierConfigSection title="Configuração DirectCall">
                <ConfigField label="API URL" value={directcallConfig.api_url} onChange={(v) => setDirectcallConfig({ ...directcallConfig, api_url: v })} placeholder="https://api.directcall.com.br" />
                <ConfigField label="Token" type="password" value={directcallConfig.token} onChange={(v) => setDirectcallConfig({ ...directcallConfig, token: v })} placeholder="Token de acesso" />
                <ConfigField label="Trunk ID" value={directcallConfig.trunk_id} onChange={(v) => setDirectcallConfig({ ...directcallConfig, trunk_id: v })} placeholder="ID do trunk" />
              </CarrierConfigSection>
            )}
          </TabsContent>

          <TabsContent value="test" className="py-4">
            {carrierType === 'sip_webrtc' && (
              <SIPConnectionTest
                config={{
                  wssUrl: sipWebrtcConfig.wss_url,
                  realm: sipWebrtcConfig.realm,
                  username: sipWebrtcConfig.username,
                  password: sipWebrtcConfig.password,
                  displayName: sipWebrtcConfig.display_name,
                }}
                onTestComplete={(success) => {
                  if (success) toast({ title: 'Conexão SIP verificada com sucesso!' });
                }}
              />
            )}
            {carrierType === 'twilio' && (
              <TwilioConnectionTest
                carrierId={carrier?.id}
                accountSid={twilioConfig.account_sid}
                authToken={twilioConfig.auth_token}
              />
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {carrier ? 'Salvar Alterações' : 'Adicionar Carrier'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Helper components
function CarrierConfigSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4 p-4 rounded-lg border">
      <h3 className="font-semibold">{title}</h3>
      <div className="grid grid-cols-2 gap-4">
        {children}
      </div>
    </div>
  );
}

function ConfigField({ 
  label, value, onChange, placeholder, type = 'text', hint 
}: { 
  label: string; 
  value: string; 
  onChange: (v: string) => void; 
  placeholder?: string; 
  type?: 'text' | 'password' | 'number' | 'textarea';
  hint?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {type === 'textarea' ? (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
        />
      ) : (
        <Input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      )}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
