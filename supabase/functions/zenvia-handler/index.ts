import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ZenViaRequest {
  action: 'originate' | 'hangup' | 'webhook';
  carrier_id: string;
  call_id?: string;
  to?: string;
  from?: string;
  webhook_data?: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const request: ZenViaRequest = await req.json();
    console.log('ZenVia handler request:', request);

    // Fetch carrier config
    const { data: carrier, error: carrierError } = await supabase
      .from('telephony_carriers')
      .select('*')
      .eq('id', request.carrier_id)
      .single();

    if (carrierError || !carrier) {
      throw new Error('Carrier not found');
    }

    const config = carrier.config_json || {};
    const { api_token, from_number, webhook_url } = config;

    if (!api_token) {
      throw new Error('ZenVia API token not configured');
    }

    const zenViaBaseUrl = 'https://api.zenvia.com/v2';

    let result: any = {};

    switch (request.action) {
      case 'originate': {
        if (!request.to) throw new Error('Destination number required');

        const callPayload = {
          from: request.from || from_number,
          to: request.to,
          callbackUrl: webhook_url || `${supabaseUrl}/functions/v1/zenvia-handler`,
        };

        const response = await fetch(`${zenViaBaseUrl}/channels/voice/messages`, {
          method: 'POST',
          headers: {
            'X-API-TOKEN': api_token,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(callPayload),
        });

        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.message || data.error || 'Failed to originate call');
        }

        result = {
          success: true,
          call_id: data.id,
          status: data.status,
        };

        console.log('ZenVia call originated:', data.id);
        break;
      }

      case 'hangup': {
        if (!request.call_id) throw new Error('Call ID required');

        // ZenVia doesn't have a direct hangup API, call will end naturally
        // or we can use the TTS to say goodbye and end
        console.log('ZenVia hangup requested for:', request.call_id);
        
        result = { 
          success: true, 
          message: 'Hangup requested - call will end' 
        };
        break;
      }

      case 'webhook': {
        // Handle ZenVia webhooks
        console.log('ZenVia webhook received:', request.webhook_data);

        const webhookData = request.webhook_data;
        
        if (webhookData) {
          // Process call events from ZenVia
          const event = webhookData.type;
          const callId = webhookData.id;
          
          console.log(`ZenVia event: ${event} for call ${callId}`);

          // Update call status in database if needed
          if (callId && event) {
            // Map ZenVia events to our call status
            const statusMap: Record<string, string> = {
              'CALL_RINGING': 'RINGING',
              'CALL_ANSWERED': 'IN_PROGRESS',
              'CALL_COMPLETED': 'COMPLETED',
              'CALL_FAILED': 'FAILED',
            };

            const ourStatus = statusMap[event];
            if (ourStatus) {
              await supabase
                .from('calls')
                .update({ status: ourStatus })
                .eq('telephony_id', callId);
            }
          }
        }

        result = { success: true, received: true };
        break;
      }

      default:
        throw new Error(`Unknown action: ${request.action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('ZenVia handler error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
