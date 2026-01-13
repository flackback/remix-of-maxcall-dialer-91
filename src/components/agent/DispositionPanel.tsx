import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import {
  CheckCircle,
  XCircle,
  Clock,
  Ban,
  Calendar,
  Settings2,
  Info,
  AlertTriangle,
  UserX,
  Send,
  HelpCircle,
  Minus,
  Plus,
  Loader2,
} from 'lucide-react';

interface DispositionPanelProps {
  onSubmit: (dispositionId: string, notes?: string, callbackDate?: Date) => void;
  isSubmitting?: boolean;
}

interface Disposition {
  id: string;
  code: string;
  name: string;
  category: string;
  requires_callback: boolean;
  requires_notes: boolean;
}

// Icon mapping
const iconMap: Record<string, any> = {
  'AGENDAR': Calendar,
  'RETORNAR': Clock,
  'LIGACAO_INTERROMPIDA': AlertTriangle,
  'SEM_INTERESSE': XCircle,
  'CONTATO_INCORRETO': UserX,
  'DESCARTAR': Ban,
  'JA_COMPARECEU': CheckCircle,
};

// Color mapping by category
const categoryColors: Record<string, string> = {
  'POSITIVE': 'bg-emerald-500 hover:bg-emerald-600 text-white',
  'CALLBACK': 'bg-blue-500 hover:bg-blue-600 text-white',
  'WARNING': 'bg-amber-400 hover:bg-amber-500 text-white',
  'NEGATIVE': 'bg-red-500 hover:bg-red-600 text-white',
  'NEUTRAL': 'bg-gray-700 hover:bg-gray-800 text-white',
};

export function DispositionPanel({ onSubmit, isSubmitting }: DispositionPanelProps) {
  const [dispositions, setDispositions] = useState<Disposition[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDisposition, setSelectedDisposition] = useState<Disposition | null>(null);
  const [notes, setNotes] = useState('');
  const [callbackDate, setCallbackDate] = useState('');
  const [callbackTime, setCallbackTime] = useState('');

  useEffect(() => {
    fetchDispositions();
  }, []);

  const fetchDispositions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('dispositions')
        .select('id, code, name, category, requires_callback, requires_notes')
        .eq('is_active', true)
        .order('category');

      if (error) throw error;
      setDispositions(data || []);
    } catch (error) {
      console.error('Error fetching dispositions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (!selectedDisposition) return;

    let callback: Date | undefined;
    if (selectedDisposition.requires_callback && callbackDate && callbackTime) {
      callback = new Date(`${callbackDate}T${callbackTime}`);
    }

    onSubmit(selectedDisposition.id, notes || undefined, callback);
  };

  const handleSelect = (item: Disposition) => {
    setSelectedDisposition(item);
    // If no callback nor notes required, submit directly
    if (!item.requires_callback && !item.requires_notes) {
      onSubmit(item.id, undefined, undefined);
    }
  };

  const getIcon = (code: string) => {
    const Icon = iconMap[code] || Info;
    return Icon;
  };

  const getColor = (category: string) => {
    return categoryColors[category] || categoryColors.NEUTRAL;
  };

  // Group dispositions by category
  const groupedDispositions = dispositions.reduce((acc, d) => {
    if (!acc[d.category]) acc[d.category] = [];
    acc[d.category].push(d);
    return acc;
  }, {} as Record<string, Disposition[]>);

  if (loading) {
    return (
      <Card className="bg-card border-border shadow-sm h-full">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border shadow-sm h-full">
      <CardHeader className="pb-3 border-b border-border">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Settings2 className="h-5 w-5 text-muted-foreground" />
            Ações
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Plus className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium px-2">{dispositions.length}</span>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Minus className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <HelpCircle className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-6">
        {dispositions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Settings2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Nenhuma tabulação configurada</p>
            <p className="text-sm">Configure tabulações nas configurações</p>
          </div>
        ) : (
          Object.entries(groupedDispositions).map(([category, items]) => (
            <div key={category}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-muted-foreground tracking-wider">{category}</span>
                <span className="text-xs text-muted-foreground">{items.length} botões</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {items.map((item) => {
                  const Icon = getIcon(item.code);
                  return (
                    <Button
                      key={item.id}
                      className={cn(
                        'h-14 px-6 text-sm font-medium flex items-center gap-3 transition-all shadow-md',
                        getColor(category),
                        selectedDisposition?.id === item.id && 'ring-2 ring-offset-2'
                      )}
                      onClick={() => handleSelect(item)}
                    >
                      <Info className="h-4 w-4 opacity-70" />
                      <Icon className="h-4 w-4" />
                      <span>{item.name}</span>
                    </Button>
                  );
                })}
              </div>
            </div>
          ))
        )}

        {/* Callback fields */}
        {selectedDisposition?.requires_callback && (
          <div className="rounded-lg bg-amber-500/10 p-4 border border-amber-500/30">
            <Label className="text-sm font-medium text-amber-600">Agendar Retorno</Label>
            <div className="mt-3 flex gap-2">
              <Input
                type="date"
                value={callbackDate}
                onChange={(e) => setCallbackDate(e.target.value)}
                className="flex-1"
              />
              <Input
                type="time"
                value={callbackTime}
                onChange={(e) => setCallbackTime(e.target.value)}
                className="w-32"
              />
            </div>
            <Button
              className="w-full mt-3 bg-amber-500 hover:bg-amber-600 text-white"
              onClick={handleSubmit}
              disabled={!callbackDate || !callbackTime || isSubmitting}
            >
              <Send className="mr-2 h-4 w-4" />
              Confirmar Agendamento
            </Button>
          </div>
        )}

        {/* Notes */}
        {selectedDisposition?.requires_notes && !selectedDisposition?.requires_callback && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              Observações <span className="text-destructive">*</span>
            </Label>
            <Textarea
              placeholder="Adicione observações sobre a ligação..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[100px] resize-none"
            />
            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={!notes || isSubmitting}
            >
              <Send className="mr-2 h-4 w-4" />
              Salvar Tabulação
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
