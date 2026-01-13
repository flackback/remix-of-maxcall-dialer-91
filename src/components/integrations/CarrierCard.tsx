import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Phone, Zap, Settings, Trash2, TrendingUp, Clock, DollarSign, 
  Wifi, Server, Globe, Radio, Cable, Cloud, Smartphone, Building
} from 'lucide-react';

interface CarrierMetrics {
  connection_rate: number;
  avg_latency_ms: number;
  total_calls: number;
}

export type CarrierType = 
  | 'telnyx' | 'jambonz' | 'sip_generic' | 'sip_webrtc'
  | 'twilio' | 'vonage' | 'plivo' | 'bandwidth' | 'sinch' | 'infobip'
  | 'zenvia' | 'totalvoice'
  | 'asterisk_ami' | 'freeswitch_esl' | 'opensips' | 'kamailio'
  | 'gsvoip' | 'mundivox' | 'directcall';

interface Carrier {
  id: string;
  name: string;
  type: CarrierType;
  is_active: boolean;
  cost_per_minute: number;
  max_concurrent_calls: number;
  priority: number;
  metrics?: CarrierMetrics;
}

interface CarrierCardProps {
  carrier: Carrier;
  onConfigure: (carrier: Carrier) => void;
  onToggle: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
}

// Carrier configuration with icons and colors
const CARRIER_CONFIG: Record<CarrierType, { 
  icon: React.ReactNode; 
  color: string; 
  label: string;
  category: 'cpaas_global' | 'cpaas_brasil' | 'sip_pbx' | 'brasil';
}> = {
  // CPaaS Global
  telnyx: { 
    icon: <Zap className="h-5 w-5" />, 
    color: 'emerald', 
    label: 'Telnyx',
    category: 'cpaas_global'
  },
  twilio: { 
    icon: <Cloud className="h-5 w-5" />, 
    color: 'red', 
    label: 'Twilio',
    category: 'cpaas_global'
  },
  vonage: { 
    icon: <Globe className="h-5 w-5" />, 
    color: 'purple', 
    label: 'Vonage',
    category: 'cpaas_global'
  },
  plivo: { 
    icon: <Phone className="h-5 w-5" />, 
    color: 'lime', 
    label: 'Plivo',
    category: 'cpaas_global'
  },
  bandwidth: { 
    icon: <Radio className="h-5 w-5" />, 
    color: 'blue', 
    label: 'Bandwidth',
    category: 'cpaas_global'
  },
  sinch: { 
    icon: <Smartphone className="h-5 w-5" />, 
    color: 'pink', 
    label: 'Sinch',
    category: 'cpaas_global'
  },
  infobip: { 
    icon: <Globe className="h-5 w-5" />, 
    color: 'orange', 
    label: 'Infobip',
    category: 'cpaas_global'
  },
  jambonz: { 
    icon: <Server className="h-5 w-5" />, 
    color: 'indigo', 
    label: 'Jambonz',
    category: 'cpaas_global'
  },
  
  // CPaaS Brasil
  zenvia: { 
    icon: <Building className="h-5 w-5" />, 
    color: 'teal', 
    label: 'ZenVia',
    category: 'cpaas_brasil'
  },
  totalvoice: { 
    icon: <Phone className="h-5 w-5" />, 
    color: 'cyan', 
    label: 'TotalVoice',
    category: 'cpaas_brasil'
  },
  
  // SIP/PBX
  sip_webrtc: { 
    icon: <Wifi className="h-5 w-5" />, 
    color: 'violet', 
    label: 'SIP WebRTC',
    category: 'sip_pbx'
  },
  sip_generic: { 
    icon: <Cable className="h-5 w-5" />, 
    color: 'slate', 
    label: 'SIP Genérico',
    category: 'sip_pbx'
  },
  asterisk_ami: { 
    icon: <Server className="h-5 w-5" />, 
    color: 'amber', 
    label: 'Asterisk AMI',
    category: 'sip_pbx'
  },
  freeswitch_esl: { 
    icon: <Server className="h-5 w-5" />, 
    color: 'green', 
    label: 'FreeSWITCH ESL',
    category: 'sip_pbx'
  },
  opensips: { 
    icon: <Server className="h-5 w-5" />, 
    color: 'rose', 
    label: 'OpenSIPS',
    category: 'sip_pbx'
  },
  kamailio: { 
    icon: <Server className="h-5 w-5" />, 
    color: 'fuchsia', 
    label: 'Kamailio',
    category: 'sip_pbx'
  },
  
  // Brasil Específicos
  gsvoip: { 
    icon: <Phone className="h-5 w-5" />, 
    color: 'sky', 
    label: 'GSVoip',
    category: 'brasil'
  },
  mundivox: { 
    icon: <Globe className="h-5 w-5" />, 
    color: 'yellow', 
    label: 'MundiVox',
    category: 'brasil'
  },
  directcall: { 
    icon: <Phone className="h-5 w-5" />, 
    color: 'stone', 
    label: 'DirectCall',
    category: 'brasil'
  },
};

export function CarrierCard({ carrier, onConfigure, onToggle, onDelete }: CarrierCardProps) {
  const config = CARRIER_CONFIG[carrier.type] || {
    icon: <Phone className="h-5 w-5" />,
    color: 'slate',
    label: carrier.type,
    category: 'sip_pbx'
  };

  const colorClasses: Record<string, string> = {
    emerald: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
    red: 'bg-red-500/10 text-red-500 border-red-500/30',
    purple: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
    lime: 'bg-lime-500/10 text-lime-500 border-lime-500/30',
    blue: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
    pink: 'bg-pink-500/10 text-pink-500 border-pink-500/30',
    orange: 'bg-orange-500/10 text-orange-500 border-orange-500/30',
    indigo: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/30',
    teal: 'bg-teal-500/10 text-teal-500 border-teal-500/30',
    cyan: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/30',
    violet: 'bg-violet-500/10 text-violet-500 border-violet-500/30',
    slate: 'bg-slate-500/10 text-slate-500 border-slate-500/30',
    amber: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
    green: 'bg-green-500/10 text-green-500 border-green-500/30',
    rose: 'bg-rose-500/10 text-rose-500 border-rose-500/30',
    fuchsia: 'bg-fuchsia-500/10 text-fuchsia-500 border-fuchsia-500/30',
    sky: 'bg-sky-500/10 text-sky-500 border-sky-500/30',
    yellow: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30',
    stone: 'bg-stone-500/10 text-stone-500 border-stone-500/30',
  };

  const iconColorClasses: Record<string, string> = {
    emerald: 'text-emerald-500',
    red: 'text-red-500',
    purple: 'text-purple-500',
    lime: 'text-lime-500',
    blue: 'text-blue-500',
    pink: 'text-pink-500',
    orange: 'text-orange-500',
    indigo: 'text-indigo-500',
    teal: 'text-teal-500',
    cyan: 'text-cyan-500',
    violet: 'text-violet-500',
    slate: 'text-slate-500',
    amber: 'text-amber-500',
    green: 'text-green-500',
    rose: 'text-rose-500',
    fuchsia: 'text-fuchsia-500',
    sky: 'text-sky-500',
    yellow: 'text-yellow-500',
    stone: 'text-stone-500',
  };

  return (
    <Card className={`relative transition-all ${!carrier.is_active ? 'opacity-60' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-secondary ${iconColorClasses[config.color] || ''}`}>
              {config.icon}
            </div>
            <div>
              <CardTitle className="text-base">{carrier.name}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className={colorClasses[config.color] || ''}>
                  {config.label}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  Prioridade: {carrier.priority}
                </Badge>
              </div>
            </div>
          </div>
          <Switch
            checked={carrier.is_active}
            onCheckedChange={(checked) => onToggle(carrier.id, checked)}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Metrics */}
        {carrier.metrics && (
          <div className="grid grid-cols-3 gap-2 p-3 rounded-lg bg-muted/50">
            <div className="text-center">
              <TrendingUp className="h-4 w-4 mx-auto text-green-500 mb-1" />
              <p className="text-lg font-semibold">{carrier.metrics.connection_rate.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">Conexão</p>
            </div>
            <div className="text-center">
              <Clock className="h-4 w-4 mx-auto text-blue-500 mb-1" />
              <p className="text-lg font-semibold">{carrier.metrics.avg_latency_ms}ms</p>
              <p className="text-xs text-muted-foreground">Latência</p>
            </div>
            <div className="text-center">
              <Phone className="h-4 w-4 mx-auto text-purple-500 mb-1" />
              <p className="text-lg font-semibold">{carrier.metrics.total_calls}</p>
              <p className="text-xs text-muted-foreground">Chamadas</p>
            </div>
          </div>
        )}

        {/* Cost info */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground flex items-center gap-1">
            <DollarSign className="h-4 w-4" />
            Custo/min
          </span>
          <span className="font-medium">R$ {carrier.cost_per_minute.toFixed(4)}</span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Chamadas simultâneas</span>
          <span className="font-medium">{carrier.max_concurrent_calls}</span>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={() => onConfigure(carrier)}
          >
            <Settings className="mr-2 h-4 w-4" />
            Configurar
          </Button>
          <Button 
            variant="outline" 
            size="icon"
            className="text-destructive hover:text-destructive"
            onClick={() => onDelete(carrier.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Export helper for categorization
export function getCarrierCategory(type: CarrierType): string {
  return CARRIER_CONFIG[type]?.category || 'sip_pbx';
}

export { CARRIER_CONFIG };
