import { useState, useEffect, useCallback } from 'react';
import { DispositionCard } from '@/components/agent/DispositionCard';
import { EmbeddedSoftphone } from '@/components/agent/EmbeddedSoftphone';
import { ScriptWizard } from '@/components/agent/ScriptWizard';
import { AgentStatusSelector } from '@/components/agent/AgentStatusSelector';
import { DraggableDialog } from '@/components/ui/draggable-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { AgentStatus, PauseReason, Lead, Call } from '@/types';
import { CallState, WebRTCProvider } from '@/hooks/useWebRTC';
import {
  Phone,
  User,
  BookOpen,
  Calendar,
  Clock,
  AlertTriangle,
  XCircle,
  UserX,
  Ban,
  CheckCircle,
  ImageOff,
  Search,
  ExternalLink,
  BarChart3,
  MessageSquare,
  Settings2,
  Send,
} from 'lucide-react';

// Disposition definitions
const dispositions = {
  primary: [
    { id: 'agendar', title: 'AGENDAR', icon: Calendar, variant: 'positive' as const, requiresCallback: true },
    { id: 'retornar', title: 'RETORNAR', icon: Clock, variant: 'info' as const, requiresCallback: true },
    { id: 'ligacao-interrompida', title: 'LIGAÇÃO INTERROMP.', icon: AlertTriangle, variant: 'warning' as const },
    { id: 'sem-interesse', title: 'SEM INTERESSE', icon: XCircle, variant: 'negative' as const },
  ],
  secondary: [
    { id: 'contato-incorreto', title: 'CONTATO INCORRETO', icon: UserX, variant: 'negative' as const },
    { id: 'descartar-lead', title: 'DESCARTAR LEAD', icon: Ban, variant: 'neutral' as const, requiresNotes: true },
    { id: 'ja-compareceu', title: 'JÁ COMPARECEU', icon: CheckCircle, variant: 'negative' as const },
  ],
};

interface Script {
  id: string;
  name: string;
  steps: any[];
}

export default function AgentConsole() {
  const { toast } = useToast();
  const [agentStatus, setAgentStatus] = useState<AgentStatus>('READY');
  const [pauseReason, setPauseReason] = useState<PauseReason | undefined>();
  const [currentCall, setCurrentCall] = useState<Call | null>(null);
  const [currentLead, setCurrentLead] = useState<Lead | null>(null);
  const [callHistory, setCallHistory] = useState<Call[]>([]);
  
  // Disposition state
  const [selectedDisposition, setSelectedDisposition] = useState<any | null>(null);
  const [notes, setNotes] = useState('');
  const [callbackDate, setCallbackDate] = useState('');
  const [callbackTime, setCallbackTime] = useState('');
  
  // WebRTC state
  const [carriers, setCarriers] = useState<any[]>([]);
  const [selectedCarrierId, setSelectedCarrierId] = useState<string>('');
  const [selectedProvider, setSelectedProvider] = useState<WebRTCProvider>('telnyx');
  const [webrtcState, setWebrtcState] = useState<CallState>('idle');
  const [showScript, setShowScript] = useState(false);
  const [script, setScript] = useState<Script | null>(null);
  
  // Load carriers and script on mount
  useEffect(() => {
    const loadData = async () => {
      // Load carriers
      const { data: carriersData } = await supabase
        .from('telephony_carriers')
        .select('id, name, type, is_active')
        .eq('is_active', true);
      
      if (carriersData) {
        setCarriers(carriersData);
        if (carriersData.length > 0) {
          setSelectedCarrierId(carriersData[0].id);
          setSelectedProvider(carriersData[0].type as WebRTCProvider);
        }
      }

      // Load script
      const { data: scriptData } = await supabase
        .from('scripts')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (scriptData) {
        setScript({
          id: scriptData.id,
          name: scriptData.name,
          steps: (scriptData.steps_json as any) || [],
        });
      }
    };

    loadData();
  }, []);

  const handleStatusChange = (status: AgentStatus, reason?: PauseReason) => {
    setAgentStatus(status);
    setPauseReason(reason);
    toast({
      title: 'Status atualizado',
      description: `Agora você está ${status === 'READY' ? 'disponível' : status === 'PAUSE' ? 'em pausa' : status.toLowerCase()}`,
    });
  };

  const handleAnswer = useCallback(() => {
    if (currentCall) {
      setCurrentCall({ ...currentCall, status: 'CONNECTED', connectedAt: new Date() });
    }
  }, [currentCall]);

  const handleHangup = useCallback(() => {
    if (currentCall) {
      setAgentStatus('WRAPUP');
    }
  }, [currentCall]);

  const handleTransfer = useCallback((type: 'blind' | 'warm') => {
    toast({
      title: `Transferência ${type === 'warm' ? 'assistida' : 'direta'}`,
      description: 'Selecione o destino da transferência',
    });
  }, []);

  const handleHold = useCallback(() => {
    if (currentCall) {
      setCurrentCall({
        ...currentCall,
        status: currentCall.status === 'ON_HOLD' ? 'CONNECTED' : 'ON_HOLD',
      });
    }
  }, [currentCall]);

  const handleMute = useCallback(() => {
    toast({ title: 'Microfone alternado' });
  }, []);

  const handleDispositionSelect = (disposition: any) => {
    setSelectedDisposition(disposition);
    // If no callback or notes required, submit directly
    if (!disposition.requiresCallback && !disposition.requiresNotes) {
      handleDispositionSubmit(disposition.id);
    }
  };

  const handleDispositionSubmit = (dispositionId?: string) => {
    const id = dispositionId || selectedDisposition?.id;
    if (!id) return;

    toast({
      title: 'Tabulação registrada',
      description: 'Chamada finalizada com sucesso',
    });

    if (currentCall) {
      setCallHistory([currentCall, ...callHistory.slice(0, 4)]);
    }
    setCurrentCall(null);
    setCurrentLead(null);
    setSelectedDisposition(null);
    setNotes('');
    setCallbackDate('');
    setCallbackTime('');
    setAgentStatus('READY');
  };

  const leadName = currentLead ? `${currentLead.firstName} ${currentLead.lastName}` : 'Aguardando lead';
  
  const leadFields = [
    { label: 'ID', value: currentLead?.id || '—' },
    { label: 'Nome', value: leadName !== 'Aguardando lead' ? leadName : '—' },
    { label: 'Telefone', value: currentLead?.phone || '—' },
    { label: 'Cidade', value: currentLead?.city || '—' },
    { label: 'Estado', value: currentLead?.state || '—' },
    { label: 'Empresa', value: currentLead?.company || '—' },
    { label: 'Última tentativa', value: currentLead?.lastAttemptAt ? new Date(currentLead.lastAttemptAt).toLocaleDateString('pt-BR') : '—' },
    { label: 'Tentativas', value: currentLead?.attempts?.toString() || '0' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Console do Agente</h1>
          <p className="text-muted-foreground">Tabulação de Leads</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Script Toggle Button */}
          <Button
            variant={showScript ? "default" : "outline"}
            size="sm"
            onClick={() => setShowScript(!showScript)}
            className="gap-2"
          >
            <BookOpen className="h-4 w-4" />
            Script
            {showScript && <span className="text-xs opacity-70">ON</span>}
          </Button>
          
          <AgentStatusSelector
            currentStatus={agentStatus}
            pauseReason={pauseReason}
            onStatusChange={handleStatusChange}
            disabled={!!currentCall}
          />
        </div>
      </div>

      {/* Primary Dispositions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {dispositions.primary.map((d) => (
          <DispositionCard
            key={d.id}
            title={d.title}
            icon={<d.icon className="h-5 w-5" />}
            variant={d.variant}
            onClick={() => handleDispositionSelect(d)}
            selected={selectedDisposition?.id === d.id}
          />
        ))}
      </div>

      {/* Secondary Dispositions */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
        {dispositions.secondary.map((d) => (
          <DispositionCard
            key={d.id}
            title={d.title}
            icon={<d.icon className="h-4 w-4" />}
            variant={d.variant}
            size="sm"
            onClick={() => handleDispositionSelect(d)}
            selected={selectedDisposition?.id === d.id}
          />
        ))}
      </div>

      {/* Callback/Notes Panel when required */}
      {selectedDisposition?.requiresCallback && (
        <Card className="border-metric-warning/30 bg-metric-warning/5">
          <CardContent className="pt-6">
            <Label className="text-sm font-medium text-metric-warning">Agendar Retorno</Label>
            <div className="mt-3 flex gap-3">
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
              <Button
                onClick={() => handleDispositionSubmit()}
                disabled={!callbackDate || !callbackTime}
                className="bg-metric-warning hover:bg-metric-warning/90 text-metric-warning-foreground"
              >
                <Send className="mr-2 h-4 w-4" />
                Confirmar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedDisposition?.requiresNotes && (
        <Card>
          <CardContent className="pt-6 space-y-3">
            <Label className="text-sm font-medium">
              Observações <span className="text-destructive">*</span>
            </Label>
            <Textarea
              placeholder="Adicione observações sobre a ligação..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[80px] resize-none"
            />
            <Button onClick={() => handleDispositionSubmit()} disabled={!notes} className="w-full">
              <Send className="mr-2 h-4 w-4" />
              Salvar Tabulação
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Main content: Lead Info + Softphone */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Lead Info */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Dados do Cliente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-6">
              {/* Avatar */}
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 rounded-lg border-2 border-dashed border-primary/40 bg-muted/50 flex flex-col items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-1">
                    <ImageOff className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <span className="text-[10px] text-muted-foreground">Sem Imagem</span>
                </div>
                <h3 className="mt-3 text-lg font-semibold text-center">{leadName}</h3>
                {/* Action buttons */}
                <div className="flex gap-2 mt-3">
                  <Button variant="outline" size="icon" className="h-8 w-8">
                    <Search className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-8 w-8">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-8 w-8">
                    <BarChart3 className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-8 w-8">
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Fields */}
              <div className="flex-1 grid grid-cols-2 gap-x-6 gap-y-2">
                {leadFields.map((field, idx) => (
                  <div key={idx} className="flex flex-col">
                    <span className="text-xs font-medium text-muted-foreground">{field.label}</span>
                    <span className="text-sm text-foreground">{field.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Configure buttons */}
            <div className="flex gap-2 mt-6 pt-4 border-t border-border">
              <Button variant="outline" size="sm" className="gap-2">
                <Settings2 className="h-4 w-4" />
                Configurar Campos
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <Settings2 className="h-4 w-4" />
                Configurar Botões
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Softphone */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Softphone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EmbeddedSoftphone
              isInCall={currentCall?.status === 'CONNECTED'}
              callerName={currentLead ? `${currentLead.firstName} ${currentLead.lastName}` : undefined}
              callerPhone={currentCall?.phone}
              isAiHandoff={currentCall?.isAiHandled}
              aiSummary={currentCall?.aiHandoffSummary}
              carrierId={selectedCarrierId}
              provider={selectedProvider}
              onAnswer={handleAnswer}
              onHangup={handleHangup}
              onTransfer={() => handleTransfer('warm')}
              onHold={handleHold}
              onMute={handleMute}
              onCallStateChange={(state) => setWebrtcState(state)}
            />
          </CardContent>
        </Card>
      </div>

      {/* Draggable Script Popup */}
      {script && (
        <DraggableDialog
          open={showScript}
          onOpenChange={setShowScript}
          title={`Script: ${script.name}`}
          icon={<BookOpen className="h-5 w-5" />}
          defaultPosition={{ x: 16, y: 80 }}
          className="w-[420px]"
        >
          <ScriptWizard 
            script={{ id: script.id, name: script.name, steps: script.steps, campaignId: '' }} 
            leadName={currentLead ? currentLead.firstName : '[Nome]'}
            agentName="Agente"
          />
        </DraggableDialog>
      )}

      {/* Waiting state when no lead */}
      {!currentLead && agentStatus !== 'PAUSE' && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-40">
          <Card className="max-w-md">
            <CardContent className="text-center py-12 px-8">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
                <Phone className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">Aguardando chamada</h3>
              <p className="mt-1 text-sm text-muted-foreground mb-4">
                {agentStatus === 'READY' 
                  ? 'Você está disponível para receber chamadas'
                  : 'Altere seu status para Disponível'}
              </p>
              <AgentStatusSelector
                currentStatus={agentStatus}
                pauseReason={pauseReason}
                onStatusChange={handleStatusChange}
                disabled={!!currentCall}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
