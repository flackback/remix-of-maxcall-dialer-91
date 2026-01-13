import { useState, useRef, useCallback, useEffect } from 'react';
import { 
  UserAgent, 
  Registerer, 
  Inviter, 
  Invitation, 
  Session, 
  SessionState,
  RegistererState,
  UserAgentOptions,
  URI
} from 'sip.js';

export type SIPCallState = 'idle' | 'registering' | 'registered' | 'connecting' | 'ringing' | 'connected' | 'on_hold' | 'ended' | 'error';

export interface SIPConfig {
  wssUrl: string;
  realm: string;
  username: string;
  password: string;
  displayName?: string;
  outboundProxy?: string;
  iceServers?: RTCIceServer[];
}

export interface UseSIPjsOptions {
  onRegistrationStateChange?: (registered: boolean) => void;
  onCallStateChange?: (state: SIPCallState) => void;
  onIncomingCall?: (callerInfo: { name: string; phone: string }) => void;
  onCallEnded?: () => void;
  onError?: (error: string) => void;
}

export function useSIPjs(options?: UseSIPjsOptions) {
  const [callState, setCallState] = useState<SIPCallState>('idle');
  const [isRegistered, setIsRegistered] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isOnHold, setIsOnHold] = useState(false);
  const [callerInfo, setCallerInfo] = useState<{ name: string; phone: string } | null>(null);
  const [registrationError, setRegistrationError] = useState<string | null>(null);

  const userAgentRef = useRef<UserAgent | null>(null);
  const registererRef = useRef<Registerer | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const configRef = useRef<SIPConfig | null>(null);

  // Update call state and notify
  const updateCallState = useCallback((newState: SIPCallState) => {
    console.log('[SIP.js] Call state changed:', newState);
    setCallState(newState);
    options?.onCallStateChange?.(newState);
    
    if (newState === 'ended') {
      options?.onCallEnded?.();
    }
  }, [options]);

  // Update registration state and notify
  const updateRegistrationState = useCallback((registered: boolean) => {
    console.log('[SIP.js] Registration state:', registered);
    setIsRegistered(registered);
    options?.onRegistrationStateChange?.(registered);
  }, [options]);

  // Initialize audio element
  useEffect(() => {
    remoteAudioRef.current = new Audio();
    remoteAudioRef.current.autoplay = true;
    
    return () => {
      disconnect();
    };
  }, []);

  // Setup remote media handler
  const setupRemoteMedia = useCallback((session: Session) => {
    const sessionDescriptionHandler = session.sessionDescriptionHandler;
    if (!sessionDescriptionHandler) return;

    // Get remote stream from peer connection
    const peerConnection = (sessionDescriptionHandler as any).peerConnection as RTCPeerConnection;
    if (!peerConnection) return;

    peerConnection.ontrack = (event) => {
      console.log('[SIP.js] Remote track received');
      if (remoteAudioRef.current && event.streams[0]) {
        remoteAudioRef.current.srcObject = event.streams[0];
        remoteAudioRef.current.play().catch(err => {
          console.error('[SIP.js] Error playing audio:', err);
        });
      }
    };
  }, []);

  // Handle session state changes
  const setupSessionStateHandler = useCallback((session: Session) => {
    session.stateChange.addListener((state: SessionState) => {
      console.log('[SIP.js] Session state:', state);
      
      switch (state) {
        case SessionState.Establishing:
          updateCallState('connecting');
          break;
        case SessionState.Established:
          updateCallState('connected');
          setupRemoteMedia(session);
          break;
        case SessionState.Terminating:
        case SessionState.Terminated:
          updateCallState('ended');
          cleanupSession();
          break;
      }
    });
  }, [setupRemoteMedia, updateCallState]);

  // Handle incoming calls
  const handleIncomingCall = useCallback((invitation: Invitation) => {
    console.log('[SIP.js] Incoming call from:', invitation.remoteIdentity.uri.toString());
    
    sessionRef.current = invitation;
    
    const callerUri = invitation.remoteIdentity.uri;
    const callerName = invitation.remoteIdentity.displayName || callerUri.user || 'Desconhecido';
    const callerPhone = callerUri.user || callerUri.toString();
    
    setCallerInfo({ name: callerName, phone: callerPhone });
    updateCallState('ringing');
    options?.onIncomingCall?.({ name: callerName, phone: callerPhone });
    
    setupSessionStateHandler(invitation);
  }, [options, setupSessionStateHandler, updateCallState]);

  // Connect and register to SIP server
  const connect = useCallback(async (config: SIPConfig) => {
    console.log('[SIP.js] Connecting to:', config.wssUrl);
    configRef.current = config;
    updateCallState('registering');
    setRegistrationError(null);

    try {
      // Build URI
      const uri = UserAgent.makeURI(`sip:${config.username}@${config.realm}`);
      if (!uri) {
        throw new Error('URI inválida');
      }

      // Configure user agent
      const userAgentOptions: UserAgentOptions = {
        uri,
        transportOptions: {
          server: config.wssUrl,
        },
        authorizationUsername: config.username,
        authorizationPassword: config.password,
        displayName: config.displayName || config.username,
        sessionDescriptionHandlerFactoryOptions: {
          peerConnectionConfiguration: {
            iceServers: config.iceServers || [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
            ],
          },
        },
        delegate: {
          onInvite: handleIncomingCall,
        },
      };

      // Create user agent
      const userAgent = new UserAgent(userAgentOptions);
      userAgentRef.current = userAgent;

      // Start user agent
      await userAgent.start();
      console.log('[SIP.js] User agent started');

      // Create and start registerer
      const registerer = new Registerer(userAgent, {
        expires: 300,
      });
      registererRef.current = registerer;

      // Listen for registration state changes
      registerer.stateChange.addListener((state: RegistererState) => {
        console.log('[SIP.js] Registerer state:', state);
        
        switch (state) {
          case RegistererState.Registered:
            updateRegistrationState(true);
            updateCallState('registered');
            break;
          case RegistererState.Unregistered:
            updateRegistrationState(false);
            if (callState !== 'idle') {
              updateCallState('idle');
            }
            break;
          case RegistererState.Terminated:
            updateRegistrationState(false);
            updateCallState('idle');
            break;
        }
      });

      // Register
      await registerer.register();
      console.log('[SIP.js] Registration sent');

    } catch (error) {
      console.error('[SIP.js] Connection error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro de conexão SIP';
      setRegistrationError(errorMessage);
      updateCallState('error');
      options?.onError?.(errorMessage);
      throw error;
    }
  }, [callState, handleIncomingCall, options, updateCallState, updateRegistrationState]);

  // Disconnect from SIP server
  const disconnect = useCallback(async () => {
    console.log('[SIP.js] Disconnecting');
    
    try {
      // Unregister
      if (registererRef.current) {
        try {
          await registererRef.current.unregister();
        } catch (e) {
          console.log('[SIP.js] Unregister error (ignored):', e);
        }
        registererRef.current = null;
      }

      // Stop user agent
      if (userAgentRef.current) {
        try {
          await userAgentRef.current.stop();
        } catch (e) {
          console.log('[SIP.js] Stop error (ignored):', e);
        }
        userAgentRef.current = null;
      }

      cleanupSession();
      updateRegistrationState(false);
      updateCallState('idle');
      configRef.current = null;
      
    } catch (error) {
      console.error('[SIP.js] Disconnect error:', error);
    }
  }, [updateCallState, updateRegistrationState]);

  // Get user media
  const getUserMedia = useCallback(async () => {
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
      console.error('[SIP.js] Failed to get user media:', error);
      throw new Error('Não foi possível acessar o microfone');
    }
  }, []);

  // Make outbound call
  const makeCall = useCallback(async (phoneNumber: string) => {
    if (!userAgentRef.current) {
      throw new Error('SIP não conectado');
    }

    if (!isRegistered) {
      throw new Error('SIP não registrado');
    }

    console.log('[SIP.js] Making call to:', phoneNumber);
    updateCallState('connecting');

    try {
      // Format target URI
      const config = configRef.current;
      if (!config) throw new Error('Configuração não encontrada');
      
      const targetUri = UserAgent.makeURI(`sip:${phoneNumber}@${config.realm}`);
      if (!targetUri) {
        throw new Error('Número de telefone inválido');
      }

      // Get media stream first
      await getUserMedia();

      // Create inviter (outbound call)
      const inviter = new Inviter(userAgentRef.current, targetUri, {
        sessionDescriptionHandlerOptions: {
          constraints: {
            audio: true,
            video: false,
          },
        },
      });

      sessionRef.current = inviter;
      setupSessionStateHandler(inviter);

      // Send invite
      await inviter.invite();
      updateCallState('ringing');

    } catch (error) {
      console.error('[SIP.js] Failed to make call:', error);
      updateCallState('error');
      cleanupSession();
      throw error;
    }
  }, [getUserMedia, isRegistered, setupSessionStateHandler, updateCallState]);

  // Answer incoming call
  const answerCall = useCallback(async () => {
    const session = sessionRef.current;
    if (!session || !(session instanceof Invitation)) {
      throw new Error('Nenhuma chamada para atender');
    }

    console.log('[SIP.js] Answering call');

    try {
      await getUserMedia();
      
      await session.accept({
        sessionDescriptionHandlerOptions: {
          constraints: {
            audio: true,
            video: false,
          },
        },
      });
      
      updateCallState('connected');
    } catch (error) {
      console.error('[SIP.js] Failed to answer call:', error);
      updateCallState('error');
      throw error;
    }
  }, [getUserMedia, updateCallState]);

  // Reject incoming call
  const rejectCall = useCallback(async () => {
    const session = sessionRef.current;
    if (!session || !(session instanceof Invitation)) {
      return;
    }

    console.log('[SIP.js] Rejecting call');
    
    try {
      await session.reject();
    } catch (error) {
      console.error('[SIP.js] Failed to reject call:', error);
    }
    
    cleanupSession();
    updateCallState('idle');
  }, [updateCallState]);

  // Hang up call
  const hangup = useCallback(async () => {
    const session = sessionRef.current;
    if (!session) {
      updateCallState('idle');
      return;
    }

    console.log('[SIP.js] Hanging up');

    try {
      switch (session.state) {
        case SessionState.Initial:
        case SessionState.Establishing:
          if (session instanceof Inviter) {
            await session.cancel();
          } else if (session instanceof Invitation) {
            await session.reject();
          }
          break;
        case SessionState.Established:
          await session.bye();
          break;
        default:
          break;
      }
    } catch (error) {
      console.error('[SIP.js] Hangup error:', error);
    }

    cleanupSession();
    updateCallState('ended');
  }, [updateCallState]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = isMuted;
        setIsMuted(!isMuted);
        console.log('[SIP.js] Mute toggled:', !isMuted);
      }
    }
  }, [isMuted]);

  // Toggle hold
  const toggleHold = useCallback(async () => {
    const session = sessionRef.current;
    if (!session || session.state !== SessionState.Established) {
      return;
    }

    console.log('[SIP.js] Toggling hold:', !isOnHold);

    try {
      if (isOnHold) {
        // Unhold - re-invite with sendrecv
        await session.invite({
          sessionDescriptionHandlerModifiers: [
            (sessionDescription: any) => {
              // Modify SDP to sendrecv
              const sdp = sessionDescription.sdp.replace(/a=sendonly/g, 'a=sendrecv')
                .replace(/a=inactive/g, 'a=sendrecv');
              return { ...sessionDescription, sdp };
            }
          ],
        });
      } else {
        // Hold - re-invite with sendonly
        await session.invite({
          sessionDescriptionHandlerModifiers: [
            (sessionDescription: any) => {
              // Modify SDP to sendonly
              const sdp = sessionDescription.sdp.replace(/a=sendrecv/g, 'a=sendonly');
              return { ...sessionDescription, sdp };
            }
          ],
        });
      }
      
      setIsOnHold(!isOnHold);
      updateCallState(isOnHold ? 'connected' : 'on_hold');
    } catch (error) {
      console.error('[SIP.js] Hold toggle error:', error);
    }
  }, [isOnHold, updateCallState]);

  // Send DTMF
  const sendDTMF = useCallback((digit: string) => {
    const session = sessionRef.current;
    if (!session || session.state !== SessionState.Established) {
      return;
    }

    console.log('[SIP.js] Sending DTMF:', digit);

    try {
      const sessionDescriptionHandler = session.sessionDescriptionHandler;
      if (sessionDescriptionHandler) {
        // Use INFO method for DTMF
        session.info({
          requestOptions: {
            body: {
              contentDisposition: 'render',
              contentType: 'application/dtmf-relay',
              content: `Signal=${digit}\r\nDuration=100`,
            },
          },
        });
      }
    } catch (error) {
      console.error('[SIP.js] DTMF error:', error);
    }
  }, []);

  // Blind transfer
  const transferCall = useCallback(async (targetNumber: string) => {
    const session = sessionRef.current;
    if (!session || session.state !== SessionState.Established) {
      throw new Error('Nenhuma chamada ativa para transferir');
    }

    const config = configRef.current;
    if (!config) throw new Error('Configuração não encontrada');

    console.log('[SIP.js] Transferring to:', targetNumber);

    try {
      const targetUri = UserAgent.makeURI(`sip:${targetNumber}@${config.realm}`);
      if (!targetUri) {
        throw new Error('Número de destino inválido');
      }

      await session.refer(targetUri);
      console.log('[SIP.js] Transfer initiated');
    } catch (error) {
      console.error('[SIP.js] Transfer error:', error);
      throw error;
    }
  }, []);

  // Cleanup session resources
  const cleanupSession = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }

    sessionRef.current = null;
    setCallerInfo(null);
    setIsMuted(false);
    setIsOnHold(false);
  }, []);

  return {
    // State
    callState,
    isRegistered,
    isMuted,
    isOnHold,
    callerInfo,
    registrationError,
    
    // Connection
    connect,
    disconnect,
    
    // Call actions
    makeCall,
    answerCall,
    rejectCall,
    hangup,
    
    // In-call actions
    toggleMute,
    toggleHold,
    sendDTMF,
    transferCall,
  };
}
