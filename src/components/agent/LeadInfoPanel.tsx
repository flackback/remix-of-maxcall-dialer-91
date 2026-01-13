import { Lead } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  ExternalLink, 
  ImageOff, 
  Settings2, 
  BarChart3, 
  MessageSquare 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface LeadInfoPanelProps {
  lead: Lead | null;
  onConfigureFields?: () => void;
}

export function LeadInfoPanel({ lead, onConfigureFields }: LeadInfoPanelProps) {
  const leadName = lead ? `${lead.firstName} ${lead.lastName}` : 'Lead sem nome';
  
  const fields = [
    { label: 'ID Bitrix', value: lead?.id || '—' },
    { label: 'Nome do Responsável', value: leadName !== 'Lead sem nome' ? leadName : '—' },
    { label: 'Idade', value: '—' },
    { label: 'Scouter', value: '—' },
    { label: 'telefone', value: lead?.phone || '—' },
    { label: 'Endereço', value: lead?.city && lead?.state ? `${lead.city}, ${lead.state}` : '—' },
    { label: 'Data da ultima tabulação', value: lead?.lastAttemptAt ? new Date(lead.lastAttemptAt).toLocaleDateString('pt-BR') : '—' },
    { label: 'Ultima tabulação', value: '—' },
    { label: 'Agente', value: '—' },
  ];

  return (
    <Card className="bg-card border-border shadow-sm h-full">
      <CardContent className="p-6">
        {/* Header with avatar and actions */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex flex-col items-center flex-1">
            {/* Avatar placeholder */}
            <div className="w-32 h-32 rounded-lg border-2 border-dashed border-emerald-400 bg-muted/50 flex flex-col items-center justify-center mb-4">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-2">
                <ImageOff className="h-6 w-6 text-muted-foreground" />
              </div>
              <span className="text-xs text-muted-foreground">Sem Imagem</span>
            </div>
            
            {/* Lead Name */}
            <h2 className="text-xl font-semibold text-foreground">{leadName}</h2>
          </div>
          
          {/* Action buttons */}
          <div className="flex flex-col gap-2">
            <Button variant="outline" size="icon" className="h-9 w-9">
              <Search className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-9 w-9">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Lead fields */}
        <div className="space-y-2 mb-6">
          {fields.map((field, idx) => (
            <div key={idx} className="flex">
              <span className="text-sm font-medium text-foreground min-w-[180px]">{field.label}:</span>
              <span className="text-sm text-muted-foreground">{field.value}</span>
            </div>
          ))}
        </div>

        {/* Action buttons row */}
        <div className="flex gap-2 mb-4">
          <Button variant="outline" className="flex-1 h-12 justify-center">
            <BarChart3 className="h-5 w-5" />
          </Button>
          <Button variant="outline" className="flex-1 h-12 justify-center">
            <MessageSquare className="h-5 w-5" />
          </Button>
        </div>

        {/* Configure buttons */}
        <div className="space-y-2">
          <Button 
            variant="outline" 
            className="w-full justify-center gap-2 h-10"
            onClick={onConfigureFields}
          >
            <Settings2 className="h-4 w-4" />
            Configurar Campos
          </Button>
          <Button 
            variant="outline" 
            className="w-full justify-center gap-2 h-10"
          >
            <Settings2 className="h-4 w-4" />
            Configurar Botões
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
