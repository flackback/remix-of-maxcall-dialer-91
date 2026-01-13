import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Check for WebSocket upgrade
  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { status: 400 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  let providerSocket: WebSocket | null = null;
  let carrierId: string | null = null;
  let carrierConfig: any = null;

  console.log('[webrtc-gateway] Client connected');

  socket.onopen = () => {
    console.log('[webrtc-gateway] Socket opened');
  };

  socket.onmessage = async (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log('[webrtc-gateway] Received:', data.type);

      switch (data.type) {
        case 'auth':
          await handleAuth(data);
          break;
        case 'call':
          await handleCall(data);
          break;
        case 'answer-call':
          await handleAnswerCall(data);
          break;
        case 'hangup':
          await handleHangup(data);
          break;
        case 'hold':
        case 'unhold':
          await handleHoldUnhold(data);
          break;
        case 'transfer':
          await handleTransfer(data);
          break;
        case 'ice-candidate':
          forwardToProvider(data);
          break;
        case 'answer':
          forwardToProvider(data);
          break;
      }
    } catch (error) {
      console.error('[webrtc-gateway] Error handling message:', error);
      socket.send(JSON.stringify({
        type: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  };

  socket.onclose = () => {
    console.log('[webrtc-gateway] Client disconnected');
    if (providerSocket) {
      providerSocket.close();
    }
  };

  socket.onerror = (error) => {
    console.error('[webrtc-gateway] Socket error:', error);
  };

  // Handle authentication and carrier connection
  async function handleAuth(data: any) {
    const { provider, credentials } = data;
    
    // Validate credentials against stored carrier config
    if (credentials.carrierId) {
      const { data: carrier, error } = await supabase
        .from('telephony_carriers')
        .select('*')
        .eq('id', credentials.carrierId)
        .single();

      if (error || !carrier) {
        socket.send(JSON.stringify({
          type: 'error',
          message: 'Carrier not found',
        }));
        return;
      }

      carrierId = carrier.id;
      carrierConfig = carrier.config_json;
    }

    // Connect to provider based on type
    if (provider === 'telnyx') {
      await connectToTelnyx(credentials);
    } else if (provider === 'jambonz') {
      await connectToJambonz(credentials);
    }

    socket.send(JSON.stringify({ type: 'auth-success' }));
  }

  // Connect to Telnyx WebRTC
  async function connectToTelnyx(credentials: any) {
    console.log('[webrtc-gateway] Connecting to Telnyx');
    
    const telnyxWsUrl = 'wss://rtc.telnyx.com';
    providerSocket = new WebSocket(telnyxWsUrl);

    providerSocket.onopen = () => {
      console.log('[webrtc-gateway] Connected to Telnyx');
      
      // Authenticate with Telnyx
      providerSocket?.send(JSON.stringify({
        type: 'login',
        login_token: credentials.apiKey || carrierConfig?.api_key,
      }));
    };

    providerSocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleProviderMessage(data, 'telnyx');
      } catch (e) {
        console.error('[webrtc-gateway] Failed to parse Telnyx message:', e);
      }
    };

    providerSocket.onerror = (error) => {
      console.error('[webrtc-gateway] Telnyx error:', error);
      socket.send(JSON.stringify({
        type: 'error',
        message: 'Telnyx connection error',
      }));
    };
  }

  // Connect to Jambonz
  async function connectToJambonz(credentials: any) {
    console.log('[webrtc-gateway] Connecting to Jambonz');
    
    const jambonzWsUrl = carrierConfig?.ws_url || 
      `${carrierConfig?.api_url?.replace('https', 'wss')}/api/v1/ws`;
    
    providerSocket = new WebSocket(jambonzWsUrl);

    providerSocket.onopen = () => {
      console.log('[webrtc-gateway] Connected to Jambonz');
      
      // Authenticate with Jambonz
      providerSocket?.send(JSON.stringify({
        type: 'auth',
        account_sid: carrierConfig?.account_sid,
        api_key: carrierConfig?.api_key,
      }));
    };

    providerSocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleProviderMessage(data, 'jambonz');
      } catch (e) {
        console.error('[webrtc-gateway] Failed to parse Jambonz message:', e);
      }
    };

    providerSocket.onerror = (error) => {
      console.error('[webrtc-gateway] Jambonz error:', error);
      socket.send(JSON.stringify({
        type: 'error',
        message: 'Jambonz connection error',
      }));
    };
  }

  // Handle messages from provider
  function handleProviderMessage(data: any, provider: string) {
    console.log(`[webrtc-gateway] ${provider} message:`, data.type || data.method);

    // Map provider-specific events to our unified format
    if (provider === 'telnyx') {
      switch (data.type) {
        case 'telnyx_rtc.media':
          if (data.offer) {
            socket.send(JSON.stringify({
              type: 'offer',
              sdp: data.offer,
            }));
          }
          break;
        case 'telnyx_rtc.ringing':
          socket.send(JSON.stringify({
            type: 'incoming-call',
            callId: data.call_control_id,
            callerName: data.caller_id_name,
            callerPhone: data.caller_id_number,
          }));
          break;
        case 'telnyx_rtc.hangup':
          socket.send(JSON.stringify({ type: 'call-ended' }));
          break;
        case 'telnyx_rtc.ice_candidate':
          socket.send(JSON.stringify({
            type: 'ice-candidate',
            candidate: data.candidate,
          }));
          break;
      }
    } else if (provider === 'jambonz') {
      switch (data.type) {
        case 'session:new':
          socket.send(JSON.stringify({
            type: 'incoming-call',
            callId: data.call_sid,
            callerName: data.caller_name,
            callerPhone: data.from,
          }));
          break;
        case 'session:offer':
          socket.send(JSON.stringify({
            type: 'offer',
            sdp: data.sdp,
          }));
          break;
        case 'session:ended':
          socket.send(JSON.stringify({ type: 'call-ended' }));
          break;
      }
    }
  }

  // Forward message to provider
  function forwardToProvider(data: any) {
    if (providerSocket?.readyState === WebSocket.OPEN) {
      providerSocket.send(JSON.stringify(data));
    }
  }

  // Handle outbound call
  async function handleCall(data: any) {
    const { to, from, sdp } = data;
    console.log('[webrtc-gateway] Initiating call to:', to);

    if (providerSocket?.readyState === WebSocket.OPEN) {
      // Forward call request to provider
      providerSocket.send(JSON.stringify({
        type: 'call',
        to,
        from,
        sdp,
      }));
    } else {
      socket.send(JSON.stringify({
        type: 'error',
        message: 'Not connected to provider',
      }));
    }
  }

  // Handle answer call
  async function handleAnswerCall(data: any) {
    console.log('[webrtc-gateway] Answering call:', data.callId);
    forwardToProvider({ type: 'answer', call_id: data.callId });
  }

  // Handle hangup
  async function handleHangup(data: any) {
    console.log('[webrtc-gateway] Hanging up:', data.callId);
    forwardToProvider({ type: 'hangup', call_id: data.callId });
  }

  // Handle hold/unhold
  async function handleHoldUnhold(data: any) {
    console.log('[webrtc-gateway] Hold/unhold:', data.type);
    forwardToProvider(data);
  }

  // Handle transfer
  async function handleTransfer(data: any) {
    console.log('[webrtc-gateway] Transferring to:', data.target);
    forwardToProvider(data);
  }

  return response;
});
