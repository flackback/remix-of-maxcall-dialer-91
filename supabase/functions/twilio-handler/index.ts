import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TwilioRequest {
  action: 'originate' | 'hangup' | 'transfer' | 'hold' | 'webhook' | 'verify' | 'list_numbers';
  carrier_id?: string;
  call_id?: string;
  to?: string;
  from?: string;
  webhook_data?: any;
  credentials?: {
    account_sid: string;
    auth_token: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const request: TwilioRequest = await req.json();
    console.log('Twilio handler request:', request);

    let account_sid: string;
    let auth_token: string;
    let outgoing_caller_id: string = '';

    // For verify and list_numbers, use credentials from request
    if (request.action === 'verify' || request.action === 'list_numbers') {
      if (!request.credentials?.account_sid || !request.credentials?.auth_token) {
        throw new Error('Credentials required for this action');
      }
      account_sid = request.credentials.account_sid;
      auth_token = request.credentials.auth_token;
    } else {
      // Fetch carrier config for other actions
      if (!request.carrier_id) {
        throw new Error('Carrier ID required');
      }

      const { data: carrier, error: carrierError } = await supabase
        .from('telephony_carriers')
        .select('*')
        .eq('id', request.carrier_id)
        .single();

      if (carrierError || !carrier) {
        throw new Error('Carrier not found');
      }

      const config = carrier.config_json || {};
      account_sid = config.account_sid;
      auth_token = config.auth_token;
      outgoing_caller_id = config.outgoing_caller_id || '';

      if (!account_sid || !auth_token) {
        throw new Error('Twilio credentials not configured');
      }
    }

    const twilioBaseUrl = `https://api.twilio.com/2010-04-01/Accounts/${account_sid}`;
    const authHeader = 'Basic ' + btoa(`${account_sid}:${auth_token}`);

    let result: any = {};

    switch (request.action) {
      case 'originate': {
        if (!request.to) throw new Error('Destination number required');

        const formData = new URLSearchParams();
        formData.append('To', request.to);
        formData.append('From', request.from || outgoing_caller_id || '');
        formData.append('Url', `${supabaseUrl}/functions/v1/twilio-handler?action=webhook&type=answer`);
        formData.append('StatusCallback', `${supabaseUrl}/functions/v1/twilio-handler?action=webhook&type=status`);
        formData.append('StatusCallbackEvent', 'initiated ringing answered completed');

        const response = await fetch(`${twilioBaseUrl}/Calls.json`, {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData,
        });

        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.message || 'Failed to originate call');
        }

        result = {
          success: true,
          call_sid: data.sid,
          status: data.status,
        };

        console.log('Twilio call originated:', data.sid);
        break;
      }

      case 'hangup': {
        if (!request.call_id) throw new Error('Call ID required');

        const formData = new URLSearchParams();
        formData.append('Status', 'completed');

        const response = await fetch(`${twilioBaseUrl}/Calls/${request.call_id}.json`, {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData,
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || 'Failed to hangup call');
        }

        result = { success: true, message: 'Call ended' };
        console.log('Twilio call hung up:', request.call_id);
        break;
      }

      case 'transfer': {
        if (!request.call_id || !request.to) throw new Error('Call ID and destination required');

        // Update call with new TwiML to transfer
        const twiml = `<Response><Dial>${request.to}</Dial></Response>`;
        const formData = new URLSearchParams();
        formData.append('Twiml', twiml);

        const response = await fetch(`${twilioBaseUrl}/Calls/${request.call_id}.json`, {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData,
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || 'Failed to transfer call');
        }

        result = { success: true, message: 'Call transferred' };
        console.log('Twilio call transferred:', request.call_id, 'to', request.to);
        break;
      }

      case 'hold': {
        if (!request.call_id) throw new Error('Call ID required');

        // Put call on hold with music
        const twiml = `<Response><Play loop="0">http://com.twilio.music.classical.s3.amazonaws.com/BusssyNights.mp3</Play></Response>`;
        const formData = new URLSearchParams();
        formData.append('Twiml', twiml);

        const response = await fetch(`${twilioBaseUrl}/Calls/${request.call_id}.json`, {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData,
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || 'Failed to hold call');
        }

        result = { success: true, message: 'Call on hold' };
        console.log('Twilio call on hold:', request.call_id);
        break;
      }

      case 'webhook': {
        // Handle Twilio webhooks
        const webhookType = new URL(req.url).searchParams.get('type');
        console.log('Twilio webhook received:', webhookType, request.webhook_data);

        if (webhookType === 'answer') {
          // Return TwiML for answered call
          return new Response(
            `<?xml version="1.0" encoding="UTF-8"?>
            <Response>
              <Say language="pt-BR">Conectando sua chamada, por favor aguarde.</Say>
              <Pause length="1"/>
            </Response>`,
            { 
              headers: { 
                ...corsHeaders, 
                'Content-Type': 'application/xml' 
              } 
            }
          );
        }

        result = { success: true, received: webhookType };
        break;
      }

      case 'verify': {
        // Verify Twilio credentials by fetching account info
        const response = await fetch(`${twilioBaseUrl}.json`, {
          method: 'GET',
          headers: {
            'Authorization': authHeader,
          },
        });

        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.message || 'Invalid credentials');
        }

        result = {
          success: true,
          account: {
            sid: data.sid,
            friendly_name: data.friendly_name,
            status: data.status,
            type: data.type,
            date_created: data.date_created,
          }
        };

        console.log('Twilio credentials verified:', data.sid);
        break;
      }

      case 'list_numbers': {
        // List phone numbers in the account
        const response = await fetch(`${twilioBaseUrl}/IncomingPhoneNumbers.json`, {
          method: 'GET',
          headers: {
            'Authorization': authHeader,
          },
        });

        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.message || 'Failed to list numbers');
        }

        result = {
          success: true,
          numbers: (data.incoming_phone_numbers || []).map((num: any) => ({
            sid: num.sid,
            phone_number: num.phone_number,
            friendly_name: num.friendly_name,
            capabilities: num.capabilities,
          }))
        };

        console.log('Twilio numbers listed:', result.numbers.length);
        break;
      }

      default:
        throw new Error(`Unknown action: ${request.action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Twilio handler error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
