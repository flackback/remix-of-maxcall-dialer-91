import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useWebRTC, CallState, WebRTCProvider } from '@/hooks/useWebRTC';
import { useToast } from '@/hooks/use-toast';
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
} from 'lucide-react';

interface SoftphoneProps {
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

export function Softphone({
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
}: SoftphoneProps) {
  const { toast } = useToast();
  const [callDuration, setCallDuration] = useState(0);
  const [isConnecting, setIsConnecting] = useState(false);

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

  // Use WebRTC state or external props
  const isInCall = callState === 'connected' || callState === 'on_hold' || externalIsInCall;
  const isRinging = callState === 'ringing';
  const displayCallerName = callerInfo?.name || externalCallerName;
  const displayCallerPhone = callerInfo?.phone || externalCallerPhone;

  // Call duration timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (callState === 'connected' && !isOnHold) {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callState, isOnHold]);

  // Connect to WebRTC gateway on mount if carrier is configured
  useEffect(() => {
    if (carrierId && !isConnected) {
      handleConnect();
    }
  }, [carrierId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'a':
          if (isRinging) handleAnswer();
          break;
        case 'e':
          if (isInCall || isRinging) handleHangup();
          break;
        case 'm':
          if (isInCall) handleMute();
          break;
        case 'h':
          if (isInCall) handleHold();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isInCall, isRinging]);

  const handleConnect = async () => {
    if (!carrierId) {
      toast({
        title: 'Carrier não configurado',
        description: 'Selecione um carrier de telefonia nas configurações',
        variant: 'destructive',
      });
      return;
    }

    setIsConnecting(true);
    try {
      await connectToGateway({
        provider,
        carrierId,
      });
      toast({ title: 'WebRTC conectado' });
    } catch (error) {
      console.error('Failed to connect:', error);
      toast({
        title: 'Erro ao conectar',
        description: 'Não foi possível conectar ao gateway WebRTC',
        variant: 'destructive',
      });
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getCallStateLabel = () => {
    switch (callState) {
      case 'connecting':
        return 'Conectando...';
      case 'ringing':
        return 'Chamando...';
      case 'connected':
        return 'Conectado';
      case 'on_hold':
        return 'Em Espera';
      default:
        return 'Aguardando';
    }
  };

  const getCallStateBadgeVariant = () => {
    switch (callState) {
      case 'connected':
        return 'ready' as const;
      case 'on_hold':
        return 'pause' as const;
      case 'ringing':
        return 'wrapup' as const;
      default:
        return 'secondary' as const;
    }
  };

  return (
    <div
      className={cn(
        'rounded-xl border bg-card p-4 transition-all duration-300',
        isInCall && 'border-status-ready/50 shadow-[0_0_30px_hsl(var(--status-ready)/0.15)]',
        isRinging && 'animate-pulse border-status-wrapup/50'
      )}
    >
      {/* Connection Status */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isConnected ? (
            <Badge variant="outline" className="text-xs bg-green-500/10 text-green-500">
              <Wifi className="h-3 w-3 mr-1" />
              WebRTC
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs">
              <WifiOff className="h-3 w-3 mr-1" />
              Desconectado
            </Badge>
          )}
          {provider && (
            <Badge variant="secondary" className="text-xs">
              {provider.charAt(0).toUpperCase() + provider.slice(1)}
            </Badge>
          )}
        </div>
        {!isConnected && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleConnect}
            disabled={isConnecting}
          >
            {isConnecting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Conectar'
            )}
          </Button>
        )}
      </div>

      {/* AI Handoff Banner */}
      {isAiHandoff && (
        <div className="mb-4 rounded-lg bg-primary/10 p-3 border border-primary/30">
          <div className="flex items-center gap-2 mb-2">
            <Bot className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-primary">Transferência da IA</span>
          </div>
          {aiSummary && (
            <p className="text-xs text-muted-foreground leading-relaxed">{aiSummary}</p>
          )}
        </div>
      )}

      {/* Caller Info */}
      <div className="mb-4 flex items-center gap-4">
        <div
          className={cn(
            'flex h-14 w-14 items-center justify-center rounded-full transition-all',
            isInCall
              ? 'bg-status-ready/20 text-status-ready'
              : isRinging
              ? 'bg-status-wrapup/20 text-status-wrapup animate-pulse'
              : 'bg-muted text-muted-foreground'
          )}
        >
          <User className="h-7 w-7" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold">{displayCallerName}</h3>
          <p className="font-mono text-sm text-muted-foreground">{displayCallerPhone}</p>
          {(isInCall || isRinging || callState === 'connecting') && (
            <div className="mt-1 flex items-center gap-2">
              <Badge variant={getCallStateBadgeVariant()} className="text-xs">
                {callState === 'connecting' && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                {getCallStateLabel()}
              </Badge>
              {isInCall && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span className="font-mono">{formatTime(callDuration)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Call Controls */}
      <div className="flex items-center justify-center gap-3">
        {isRinging ? (
          <>
            <Button
              variant="call"
              size="icon-lg"
              className="h-14 w-14 rounded-full"
              onClick={handleAnswer}
            >
              <Phone className="h-6 w-6" />
            </Button>
            <Button
              variant="hangup"
              size="icon-lg"
              className="h-14 w-14 rounded-full"
              onClick={handleHangup}
            >
              <PhoneOff className="h-6 w-6" />
            </Button>
          </>
        ) : isInCall ? (
          <>
            <Button
              variant={isMuted ? 'destructive' : 'secondary'}
              size="icon"
              className="h-12 w-12 rounded-full"
              onClick={handleMute}
            >
              {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>
            <Button
              variant={isOnHold ? 'wrapup' : 'secondary'}
              size="icon"
              className="h-12 w-12 rounded-full"
              onClick={handleHold}
            >
              {isOnHold ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
            </Button>
            <Button
              variant="hangup"
              size="icon-lg"
              className="h-14 w-14 rounded-full"
              onClick={handleHangup}
            >
              <PhoneOff className="h-6 w-6" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="h-12 w-12 rounded-full"
              onClick={onTransfer}
            >
              <PhoneForwarded className="h-5 w-5" />
            </Button>
          </>
        ) : (
          <div className="text-center text-sm text-muted-foreground py-4">
            {isConnected ? 'Aguardando chamadas...' : 'Conecte ao WebRTC para receber chamadas'}
          </div>
        )}
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="mt-4 flex justify-center gap-4 text-[10px] text-muted-foreground">
        <span><kbd className="rounded bg-muted px-1.5 py-0.5 font-mono">A</kbd> Atender</span>
        <span><kbd className="rounded bg-muted px-1.5 py-0.5 font-mono">E</kbd> Encerrar</span>
        <span><kbd className="rounded bg-muted px-1.5 py-0.5 font-mono">M</kbd> Mudo</span>
        <span><kbd className="rounded bg-muted px-1.5 py-0.5 font-mono">H</kbd> Espera</span>
      </div>
    </div>
  );
}
