import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type WebRTCProvider = 'telnyx' | 'jambonz' | 'sip';
export type CallState = 'idle' | 'connecting' | 'ringing' | 'connected' | 'on_hold' | 'ended';

interface WebRTCConfig {
  provider: WebRTCProvider;
  carrierId: string;
  sipUri?: string;
  wsUrl?: string;
  username?: string;
  password?: string;
}

interface UseWebRTCOptions {
  onCallStateChange?: (state: CallState) => void;
  onIncomingCall?: (callerInfo: { name: string; phone: string }) => void;
  onCallEnded?: () => void;
  onError?: (error: string) => void;
}

export function useWebRTC(options?: UseWebRTCOptions) {
  const { toast } = useToast();
  const [callState, setCallState] = useState<CallState>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [isOnHold, setIsOnHold] = useState(false);
  const [currentCallId, setCurrentCallId] = useState<string | null>(null);
  const [callerInfo, setCallerInfo] = useState<{ name: string; phone: string } | null>(null);
  
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const configRef = useRef<WebRTCConfig | null>(null);

  // Update state and notify
  const updateCallState = useCallback((newState: CallState) => {
    setCallState(newState);
    options?.onCallStateChange?.(newState);
    
    if (newState === 'ended') {
      options?.onCallEnded?.();
    }
  }, [options]);

  // Initialize audio elements
  useEffect(() => {
    remoteAudioRef.current = new Audio();
    remoteAudioRef.current.autoplay = true;
    
    return () => {
      cleanup();
    };
  }, []);

  // Get user media
  const getUserMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      localStreamRef.current = stream;
      return stream;
    } catch (error) {
      console.error('[WebRTC] Failed to get user media:', error);
      toast({
        title: 'Erro de áudio',
        description: 'Não foi possível acessar o microfone',
        variant: 'destructive',
      });
      throw error;
    }
  };

  // Create peer connection
  const createPeerConnection = useCallback(() => {
    const config: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    };

    const pc = new RTCPeerConnection(config);

    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'ice-candidate',
          candidate: event.candidate,
        }));
      }
    };

    pc.ontrack = (event) => {
      console.log('[WebRTC] Remote track received');
      if (remoteAudioRef.current && event.streams[0]) {
        remoteAudioRef.current.srcObject = event.streams[0];
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('[WebRTC] Connection state:', pc.connectionState);
      
      switch (pc.connectionState) {
        case 'connected':
          updateCallState('connected');
          break;
        case 'disconnected':
        case 'failed':
        case 'closed':
          updateCallState('ended');
          break;
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [updateCallState]);

  // Connect to WebRTC gateway via WebSocket
  const connectToGateway = useCallback(async (config: WebRTCConfig) => {
    configRef.current = config;

    // Get carrier config from backend
    const { data: carrier, error } = await supabase
      .from('telephony_carriers')
      .select('*')
      .eq('id', config.carrierId)
      .single();

    if (error || !carrier) {
      throw new Error('Carrier não encontrado');
    }

    const carrierConfig = carrier.config_json as any;

    // Determine WebSocket URL based on provider
    let wsUrl: string;
    
    if (config.provider === 'telnyx') {
      // Telnyx WebRTC uses their own WebSocket
      wsUrl = 'wss://rtc.telnyx.com';
    } else if (config.provider === 'jambonz') {
      // Jambonz WebRTC endpoint
      wsUrl = carrierConfig.ws_url || `${carrierConfig.api_url?.replace('https', 'wss')}/ws`;
    } else {
      // Generic SIP WebSocket
      wsUrl = config.wsUrl || '';
    }

    if (!wsUrl) {
      throw new Error('WebSocket URL não configurada');
    }

    console.log('[WebRTC] Connecting to gateway:', wsUrl);

    return new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WebRTC] WebSocket connected');
        
        // Send authentication
        ws.send(JSON.stringify({
          type: 'auth',
          provider: config.provider,
          credentials: {
            apiKey: carrierConfig.api_key,
            connectionId: carrierConfig.connection_id,
          },
        }));
        
        resolve();
      };

      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          await handleWebSocketMessage(data);
        } catch (error) {
          console.error('[WebRTC] Failed to parse message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('[WebRTC] WebSocket error:', error);
        options?.onError?.('Erro de conexão WebSocket');
        reject(error);
      };

      ws.onclose = () => {
        console.log('[WebRTC] WebSocket closed');
        if (callState !== 'idle' && callState !== 'ended') {
          updateCallState('ended');
        }
      };
    });
  }, [callState, options, updateCallState]);

  // Handle WebSocket messages
  const handleWebSocketMessage = useCallback(async (data: any) => {
    console.log('[WebRTC] Received message:', data.type);

    switch (data.type) {
      case 'auth-success':
        console.log('[WebRTC] Authenticated successfully');
        break;

      case 'incoming-call':
        setCallerInfo({
          name: data.callerName || 'Desconhecido',
          phone: data.callerPhone || data.from,
        });
        setCurrentCallId(data.callId);
        updateCallState('ringing');
        options?.onIncomingCall?.({
          name: data.callerName || 'Desconhecido',
          phone: data.callerPhone || data.from,
        });
        break;

      case 'offer':
        await handleOffer(data.sdp);
        break;

      case 'answer':
        await handleAnswer(data.sdp);
        break;

      case 'ice-candidate':
        await handleIceCandidate(data.candidate);
        break;

      case 'call-ended':
        updateCallState('ended');
        cleanup();
        break;

      case 'error':
        console.error('[WebRTC] Error:', data.message);
        options?.onError?.(data.message);
        break;
    }
  }, [options, updateCallState]);

  // Handle incoming offer
  const handleOffer = async (sdp: RTCSessionDescriptionInit) => {
    const pc = createPeerConnection();
    const stream = await getUserMedia();
    
    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
    });

    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    wsRef.current?.send(JSON.stringify({
      type: 'answer',
      sdp: answer,
    }));
  };

  // Handle answer to our offer
  const handleAnswer = async (sdp: RTCSessionDescriptionInit) => {
    if (peerConnectionRef.current) {
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
    }
  };

  // Handle ICE candidate
  const handleIceCandidate = async (candidate: RTCIceCandidateInit) => {
    if (peerConnectionRef.current) {
      await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
    }
  };

  // Make outbound call
  const makeCall = useCallback(async (phoneNumber: string, callerId?: string) => {
    if (!configRef.current) {
      throw new Error('WebRTC não inicializado');
    }

    console.log('[WebRTC] Making call to:', phoneNumber);
    updateCallState('connecting');

    try {
      const pc = createPeerConnection();
      const stream = await getUserMedia();
      
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false,
      });
      await pc.setLocalDescription(offer);

      wsRef.current?.send(JSON.stringify({
        type: 'call',
        to: phoneNumber,
        from: callerId,
        sdp: offer,
      }));

      updateCallState('ringing');
    } catch (error) {
      console.error('[WebRTC] Failed to make call:', error);
      updateCallState('ended');
      throw error;
    }
  }, [createPeerConnection, updateCallState]);

  // Answer incoming call
  const answerCall = useCallback(async () => {
    console.log('[WebRTC] Answering call');
    
    wsRef.current?.send(JSON.stringify({
      type: 'answer-call',
      callId: currentCallId,
    }));

    updateCallState('connected');
  }, [currentCallId, updateCallState]);

  // Hang up call
  const hangup = useCallback(() => {
    console.log('[WebRTC] Hanging up');
    
    wsRef.current?.send(JSON.stringify({
      type: 'hangup',
      callId: currentCallId,
    }));

    updateCallState('ended');
    cleanup();
  }, [currentCallId, updateCallState]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = isMuted;
        setIsMuted(!isMuted);
      }
    }
  }, [isMuted]);

  // Toggle hold
  const toggleHold = useCallback(() => {
    wsRef.current?.send(JSON.stringify({
      type: isOnHold ? 'unhold' : 'hold',
      callId: currentCallId,
    }));
    
    setIsOnHold(!isOnHold);
    updateCallState(isOnHold ? 'connected' : 'on_hold');
  }, [currentCallId, isOnHold, updateCallState]);

  // Transfer call
  const transferCall = useCallback((targetNumber: string) => {
    wsRef.current?.send(JSON.stringify({
      type: 'transfer',
      callId: currentCallId,
      target: targetNumber,
    }));
  }, [currentCallId]);

  // Cleanup resources
  const cleanup = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    setCurrentCallId(null);
    setCallerInfo(null);
    setIsMuted(false);
    setIsOnHold(false);
  }, []);

  // Disconnect from gateway
  const disconnect = useCallback(() => {
    cleanup();
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    configRef.current = null;
    updateCallState('idle');
  }, [cleanup, updateCallState]);

  return {
    // State
    callState,
    isMuted,
    isOnHold,
    callerInfo,
    currentCallId,
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
    
    // Actions
    connectToGateway,
    disconnect,
    makeCall,
    answerCall,
    hangup,
    toggleMute,
    toggleHold,
    transferCall,
  };
}
