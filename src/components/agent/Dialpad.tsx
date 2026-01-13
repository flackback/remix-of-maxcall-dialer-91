import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Phone, 
  PhoneOff, 
  Delete, 
  Loader2,
  History
} from 'lucide-react';

interface DialpadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCallStarted?: (callSid: string, number: string) => void;
  onCallEnded?: () => void;
}

interface Carrier {
  id: string;
  name: string;
  type: string;
}

interface CallHistoryItem {
  number: string;
  timestamp: Date;
  carrier: string;
  status: 'success' | 'failed';
}

const DIAL_BUTTONS = [
  { value: '1', letters: '' },
  { value: '2', letters: 'ABC' },
  { value: '3', letters: 'DEF' },
  { value: '4', letters: 'GHI' },
  { value: '5', letters: 'JKL' },
  { value: '6', letters: 'MNO' },
  { value: '7', letters: 'PQRS' },
  { value: '8', letters: 'TUV' },
  { value: '9', letters: 'WXYZ' },
  { value: '*', letters: '' },
  { value: '0', letters: '+' },
  { value: '#', letters: '' },
];

export function Dialpad({ open, onOpenChange, onCallStarted, onCallEnded }: DialpadProps) {
  const { toast } = useToast();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [selectedCarrier, setSelectedCarrier] = useState<string>('');
  const [isDialing, setIsDialing] = useState(false);
  const [isInCall, setIsInCall] = useState(false);
  const [currentCallSid, setCurrentCallSid] = useState<string | null>(null);
  const [callHistory, setCallHistory] = useState<CallHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Load carriers
  useEffect(() => {
    if (open) {
      loadCarriers();
      loadCallHistory();
    }
  }, [open]);

  const loadCarriers = async () => {
    const { data } = await supabase
      .from('telephony_carriers')
      .select('id, name, type')
      .eq('is_active', true)
      .in('type', ['twilio', 'telnyx', 'vonage', 'plivo']);
    
    if (data && data.length > 0) {
      setCarriers(data);
      if (!selectedCarrier) {
        setSelectedCarrier(data[0].id);
      }
    }
  };

  const loadCallHistory = () => {
    // Load from localStorage
    const saved = localStorage.getItem('dialpad_history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCallHistory(parsed.slice(0, 10)); // Keep last 10 calls
      } catch (e) {
        console.error('Error loading call history:', e);
      }
    }
  };

  const saveToHistory = (number: string, carrier: string, status: 'success' | 'failed') => {
    const newItem: CallHistoryItem = {
      number,
      timestamp: new Date(),
      carrier,
      status
    };
    const updated = [newItem, ...callHistory].slice(0, 10);
    setCallHistory(updated);
    localStorage.setItem('dialpad_history', JSON.stringify(updated));
  };

  const handleDigit = useCallback((digit: string) => {
    setPhoneNumber(prev => prev + digit);
  }, []);

  const handleDelete = useCallback(() => {
    setPhoneNumber(prev => prev.slice(0, -1));
  }, []);

  const handleClear = useCallback(() => {
    setPhoneNumber('');
  }, []);

  const handleCall = async () => {
    if (!phoneNumber) {
      toast({ title: 'Digite um número', variant: 'destructive' });
      return;
    }
    if (!selectedCarrier) {
      toast({ title: 'Selecione um carrier', variant: 'destructive' });
      return;
    }

    setIsDialing(true);
    const carrier = carriers.find(c => c.id === selectedCarrier);

    try {
      const { data, error } = await supabase.functions.invoke('twilio-handler', {
        body: {
          action: 'originate',
          carrier_id: selectedCarrier,
          to: phoneNumber
        }
      });

      if (error) throw error;

      if (data?.success) {
        setIsInCall(true);
        setCurrentCallSid(data.call_sid);
        saveToHistory(phoneNumber, carrier?.name || 'Unknown', 'success');
        onCallStarted?.(data.call_sid, phoneNumber);
        toast({ title: 'Chamada iniciada', description: phoneNumber });
      } else {
        throw new Error(data?.error || 'Erro ao iniciar chamada');
      }
    } catch (error) {
      console.error('Dial error:', error);
      saveToHistory(phoneNumber, carrier?.name || 'Unknown', 'failed');
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      const isTrialError = errorMsg.toLowerCase().includes('unverified') || errorMsg.toLowerCase().includes('trial');
      toast({ 
        title: isTrialError ? 'Número não verificado' : 'Erro ao discar', 
        description: isTrialError 
          ? 'Conta Twilio Trial só pode ligar para números verificados. Verifique o número no painel Twilio ou faça upgrade da conta.'
          : errorMsg,
        variant: 'destructive' 
      });
    } finally {
      setIsDialing(false);
    }
  };

  const handleHangup = async () => {
    if (!currentCallSid || !selectedCarrier) return;

    try {
      const { data, error } = await supabase.functions.invoke('twilio-handler', {
        body: {
          action: 'hangup',
          carrier_id: selectedCarrier,
          call_id: currentCallSid
        }
      });

      if (error) throw error;

      setIsInCall(false);
      setCurrentCallSid(null);
      onCallEnded?.();
      toast({ title: 'Chamada encerrada' });
    } catch (error) {
      console.error('Hangup error:', error);
      toast({ 
        title: 'Erro ao encerrar', 
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive' 
      });
    }
  };

  const handleHistorySelect = (number: string) => {
    setPhoneNumber(number);
    setShowHistory(false);
  };

  // Keyboard support
  useEffect(() => {
    if (!open) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === '*' || e.key === '#') {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleDelete();
      } else if (e.key === 'Enter' && !isInCall) {
        handleCall();
      } else if (e.key === 'Escape' && isInCall) {
        handleHangup();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, isInCall, handleDigit, handleDelete]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Discagem Manual
          </DialogTitle>
          <DialogDescription>
            Digite o número ou use o teclado numérico
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Carrier Selector */}
          <div className="space-y-2">
            <Label className="text-xs">Carrier</Label>
            <Select value={selectedCarrier} onValueChange={setSelectedCarrier}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um carrier" />
              </SelectTrigger>
              <SelectContent>
                {carriers.map(carrier => (
                  <SelectItem key={carrier.id} value={carrier.id}>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">{carrier.type}</Badge>
                      {carrier.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {carriers.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Nenhum carrier configurado. Configure um carrier primeiro.
              </p>
            )}
          </div>

          {/* Phone Number Display */}
          <div className="relative">
            <Input
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+55 11 99999-9999"
              className="text-center text-2xl font-mono h-14 pr-20"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
              {phoneNumber && (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleDelete}>
                  <Delete className="h-4 w-4" />
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8" 
                onClick={() => setShowHistory(!showHistory)}
              >
                <History className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Call History Dropdown */}
          {showHistory && callHistory.length > 0 && (
            <div className="border rounded-lg max-h-40 overflow-y-auto">
              {callHistory.map((item, i) => (
                <button
                  key={i}
                  onClick={() => handleHistorySelect(item.number)}
                  className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/50 text-sm"
                >
                  <span className="font-mono">{item.number}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">{item.carrier}</Badge>
                    <span className={`h-2 w-2 rounded-full ${item.status === 'success' ? 'bg-status-ready' : 'bg-destructive'}`} />
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Dialpad Grid */}
          <div className="grid grid-cols-3 gap-2">
            {DIAL_BUTTONS.map(btn => (
              <Button
                key={btn.value}
                variant="outline"
                className="h-14 text-xl font-semibold relative"
                onClick={() => handleDigit(btn.value)}
                disabled={isDialing}
              >
                {btn.value}
                {btn.letters && (
                  <span className="absolute bottom-1 text-[8px] font-normal text-muted-foreground">
                    {btn.letters}
                  </span>
                )}
              </Button>
            ))}
          </div>

          {/* Call/Hangup Buttons */}
          <div className="flex gap-2">
            {isInCall ? (
              <Button
                variant="destructive"
                className="flex-1 h-14"
                onClick={handleHangup}
              >
                <PhoneOff className="h-5 w-5 mr-2" />
                Encerrar
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  className="h-14"
                  onClick={handleClear}
                  disabled={!phoneNumber}
                >
                  Limpar
                </Button>
                <Button
                  className="flex-1 h-14 bg-status-ready hover:bg-status-ready/90"
                  onClick={handleCall}
                  disabled={isDialing || !phoneNumber || !selectedCarrier}
                >
                  {isDialing ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Discando...
                    </>
                  ) : (
                    <>
                      <Phone className="h-5 w-5 mr-2" />
                      Discar
                    </>
                  )}
                </Button>
              </>
            )}
          </div>

          {/* Keyboard shortcuts */}
          <div className="flex justify-center gap-4 text-[10px] text-muted-foreground">
            <span><kbd className="rounded bg-muted px-1 py-0.5 font-mono">0-9</kbd> Digitar</span>
            <span><kbd className="rounded bg-muted px-1 py-0.5 font-mono">Enter</kbd> Discar</span>
            <span><kbd className="rounded bg-muted px-1 py-0.5 font-mono">Esc</kbd> Desligar</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
