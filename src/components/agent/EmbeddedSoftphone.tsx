import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useWebRTC, CallState, WebRTCProvider } from '@/hooks/useWebRTC';
import { useToast } from '@/hooks/use-toast';
import { Dialpad } from './Dialpad';
import {
  Phone,
  PhoneOff,
  Pause,
  Play,
  MicOff,
  Mic,
  PhoneForwarded,
  Clock,
  Bot,
  User,
  Wifi,
  WifiOff,
  Loader2,
  Keyboard,
} from 'lucide-react';

interface EmbeddedSoftphoneProps {
  isInCall?: boolean;
  callerName?: string;
  callerPhone?: string;
  isAiHandoff?: boolean;
  aiSummary?: string;
  carrierId?: string;
  provider?: WebRTCProvider;
  onAnswer?: () => void;
  onHangup?: () => void;
  onHold?: () => void;
  onTransfer?: () => void;
  onMute?: () => void;
  onCallStateChange?: (state: CallState) => void;
}

export function EmbeddedSoftphone({
  isInCall: externalIsInCall,
  callerName: externalCallerName = 'Desconhecido',
  callerPhone: externalCallerPhone = '+55 11 99999-9999',
  isAiHandoff,
  aiSummary,
  carrierId,
  provider = 'telnyx',
  onAnswer,
  onHangup,
  onHold,
  onTransfer,
  onMute,
  onCallStateChange,
}: EmbeddedSoftphoneProps) {
  const { toast } = useToast();
  const [callDuration, setCallDuration] = useState(0);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showDialpad, setShowDialpad] = useState(false);
  const [outboundCallSid, setOutboundCallSid] = useState<string | null>(null);

  const {
    callState,
    isMuted,
    isOnHold,
    callerInfo,
    isConnected,
    connectToGateway,
    disconnect,
    answerCall,
    hangup,
    toggleMute,
    toggleHold,
  } = useWebRTC({
    onCallStateChange: (state) => {
      onCallStateChange?.(state);
    },
    onIncomingCall: (info) => {
      toast({
        title: 'Chamada recebida',
        description: `${info.name} - ${info.phone}`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro WebRTC',
        description: error,
        variant: 'destructive',
      });
    },
  });

  const isInCall = callState === 'connected' || callState === 'on_hold' || externalIsInCall;
  const isRinging = callState === 'ringing';
  const displayCallerName = callerInfo?.name || externalCallerName;
  const displayCallerPhone = callerInfo?.phone || externalCallerPhone;

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (callState === 'connected' && !isOnHold) {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callState, isOnHold]);

  useEffect(() => {
    if (carrierId && !isConnected) {
      handleConnect();
    }
  }, [carrierId]);

  const handleConnect = async () => {
    if (!carrierId) return;
    setIsConnecting(true);
    try {
      await connectToGateway({ provider, carrierId });
    } catch (error) {
      console.error('Failed to connect:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleAnswer = useCallback(() => {
    answerCall();
    onAnswer?.();
  }, [answerCall, onAnswer]);

  const handleHangup = useCallback(() => {
    hangup();
    setCallDuration(0);
    onHangup?.();
  }, [hangup, onHangup]);

  const handleMute = useCallback(() => {
    toggleMute();
    onMute?.();
  }, [toggleMute, onMute]);

  const handleHold = useCallback(() => {
    toggleHold();
    onHold?.();
  }, [toggleHold, onHold]);

  const handleDialpadCallStarted = useCallback((callSid: string, number: string) => {
    setOutboundCallSid(callSid);
    setShowDialpad(false);
    toast({
      title: 'Chamada iniciada',
      description: `Discando para ${number}`,
    });
  }, [toast]);

  const handleDialpadCallEnded = useCallback(() => {
    setOutboundCallSid(null);
  }, [toggleHold, onHold]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getCallStateLabel = () => {
    switch (callState) {
      case 'connecting': return 'Conectando...';
      case 'ringing': return 'Chamando...';
      case 'connected': return 'Conectado';
      case 'on_hold': return 'Em Espera';
      default: return 'Aguardando';
    }
  };

  const getCallStateBadgeVariant = () => {
    switch (callState) {
      case 'connected': return 'ready' as const;
      case 'on_hold': return 'pause' as const;
      case 'ringing': return 'wrapup' as const;
      default: return 'secondary' as const;
    }
  };

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isConnected ? (
            <Badge variant="outline" className="text-xs bg-status-ready/10 text-status-ready border-status-ready/30">
              <Wifi className="h-3 w-3 mr-1" />
              Conectado
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs">
              <WifiOff className="h-3 w-3 mr-1" />
              Offline
            </Badge>
          )}
          {provider && (
            <Badge variant="secondary" className="text-xs">
              {provider.charAt(0).toUpperCase() + provider.slice(1)}
            </Badge>
          )}
        </div>
        {!isConnected && (
          <Button variant="ghost" size="sm" onClick={handleConnect} disabled={isConnecting}>
            {isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Conectar'}
          </Button>
        )}
      </div>

      {/* AI Handoff Banner */}
      {isAiHandoff && (
        <div className="rounded-lg bg-primary/10 p-3 border border-primary/30">
          <div className="flex items-center gap-2 mb-1">
            <Bot className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold text-primary">Transferência da IA</span>
          </div>
          {aiSummary && (
            <p className="text-xs text-muted-foreground leading-relaxed">{aiSummary}</p>
          )}
        </div>
      )}

      {/* Caller Info */}
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-full transition-all',
            isInCall
              ? 'bg-status-ready/20 text-status-ready'
              : isRinging
              ? 'bg-status-wrapup/20 text-status-wrapup animate-pulse'
              : 'bg-muted text-muted-foreground'
          )}
        >
          <User className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold truncate">{displayCallerName}</h3>
          <p className="font-mono text-xs text-muted-foreground">{displayCallerPhone}</p>
          {(isInCall || isRinging || callState === 'connecting') && (
            <div className="mt-1 flex items-center gap-2">
              <Badge variant={getCallStateBadgeVariant()} className="text-[10px] h-5">
                {callState === 'connecting' && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                {getCallStateLabel()}
              </Badge>
              {isInCall && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span className="font-mono">{formatTime(callDuration)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Call Controls */}
      <div className="flex items-center justify-center gap-2">
        {isRinging ? (
          <>
            <Button variant="call" size="icon" className="h-12 w-12 rounded-full" onClick={handleAnswer}>
              <Phone className="h-5 w-5" />
            </Button>
            <Button variant="hangup" size="icon" className="h-12 w-12 rounded-full" onClick={handleHangup}>
              <PhoneOff className="h-5 w-5" />
            </Button>
          </>
        ) : isInCall ? (
          <>
            <Button
              variant={isMuted ? 'destructive' : 'secondary'}
              size="icon"
              className="h-10 w-10 rounded-full"
              onClick={handleMute}
            >
              {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Button
              variant={isOnHold ? 'wrapup' : 'secondary'}
              size="icon"
              className="h-10 w-10 rounded-full"
              onClick={handleHold}
            >
              {isOnHold ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            </Button>
            <Button variant="hangup" size="icon" className="h-12 w-12 rounded-full" onClick={handleHangup}>
              <PhoneOff className="h-5 w-5" />
            </Button>
            <Button variant="secondary" size="icon" className="h-10 w-10 rounded-full" onClick={onTransfer}>
              <PhoneForwarded className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 py-2">
            <div className="text-xs text-muted-foreground">
              {isConnected ? 'Aguardando chamadas...' : 'Conecte ao WebRTC'}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setShowDialpad(true)}
            >
              <Keyboard className="h-4 w-4" />
              Discagem Manual
            </Button>
          </div>
        )}
      </div>

      {/* Dialpad Modal */}
      <Dialpad
        open={showDialpad}
        onOpenChange={setShowDialpad}
        onCallStarted={handleDialpadCallStarted}
        onCallEnded={handleDialpadCallEnded}
      />

      {/* Keyboard shortcuts */}
      <div className="flex justify-center gap-3 text-[9px] text-muted-foreground">
        <span><kbd className="rounded bg-muted px-1 py-0.5 font-mono">A</kbd> Atender</span>
        <span><kbd className="rounded bg-muted px-1 py-0.5 font-mono">E</kbd> Encerrar</span>
        <span><kbd className="rounded bg-muted px-1 py-0.5 font-mono">M</kbd> Mudo</span>
      </div>
    </div>
  );
}
