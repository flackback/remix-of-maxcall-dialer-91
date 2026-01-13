import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface JambonzCallRequest {
  action: 'originate' | 'hangup' | 'transfer' | 'hold' | 'webhook' | 'status';
  carrier_id: string;
  call_id?: string;
  phone_to?: string;
  phone_from?: string;
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

    const body: JambonzCallRequest = await req.json();
    const { action, carrier_id, call_id, phone_to, phone_from, webhook_data } = body;

    console.log(`[jambonz-handler] Action: ${action}, Carrier: ${carrier_id}`);

    // Get carrier config
    const { data: carrier, error: carrierError } = await supabase
      .from('telephony_carriers')
      .select('*')
      .eq('id', carrier_id)
      .eq('type', 'jambonz')
      .single();

    if (carrierError || !carrier) {
      console.error('[jambonz-handler] Carrier not found:', carrierError);
      return new Response(JSON.stringify({ error: 'Carrier not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const config = carrier.config_json as {
      api_url: string;
      api_key: string;
      account_sid: string;
      application_sid: string;
      sip_trunk?: string;
    };

    if (!config.api_url || !config.api_key) {
      return new Response(JSON.stringify({ error: 'Jambonz configuration incomplete' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const jambonzHeaders = {
      'Authorization': `Bearer ${config.api_key}`,
      'Content-Type': 'application/json',
    };

    let result: any = {};
    const startTime = Date.now();

    switch (action) {
      case 'originate': {
        if (!phone_to || !phone_from) {
          return new Response(JSON.stringify({ error: 'phone_to and phone_from required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.log(`[jambonz-handler] Originating call from ${phone_from} to ${phone_to}`);

        // Jambonz REST API call
        const response = await fetch(`${config.api_url}/v1/Accounts/${config.account_sid}/Calls`, {
          method: 'POST',
          headers: jambonzHeaders,
          body: JSON.stringify({
            application_sid: config.application_sid,
            from: phone_from,
            to: {
              type: 'phone',
              number: phone_to,
              trunk: config.sip_trunk,
            },
            call_hook: `${supabaseUrl}/functions/v1/jambonz-handler`,
            call_status_hook: `${supabaseUrl}/functions/v1/jambonz-handler`,
            speech_synthesis_vendor: 'google',
            speech_synthesis_language: 'pt-BR',
            speech_recognizer_vendor: 'google',
            speech_recognizer_language: 'pt-BR',
            tag: JSON.stringify({ call_id }),
          }),
        });

        result = await response.json();

        if (!response.ok) {
          console.error('[jambonz-handler] Originate failed:', result);
          await updateMetrics(supabase, carrier_id, false, 0, Date.now() - startTime);
          
          return new Response(JSON.stringify({ error: result }), {
            status: response.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.log(`[jambonz-handler] Call initiated: ${result.sid}`);

        // Update call record
        if (call_id) {
          await supabase.from('calls').update({
            telephony_id: result.sid,
            status: 'RINGING',
            ringing_at: new Date().toISOString(),
          }).eq('id', call_id);
        }
        break;
      }

      case 'hangup': {
        if (!call_id) {
          return new Response(JSON.stringify({ error: 'call_id required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { data: call } = await supabase
          .from('calls')
          .select('telephony_id')
          .eq('id', call_id)
          .single();

        if (call?.telephony_id) {
          const response = await fetch(
            `${config.api_url}/v1/Accounts/${config.account_sid}/Calls/${call.telephony_id}`,
            {
              method: 'DELETE',
              headers: jambonzHeaders,
            }
          );
          
          if (response.ok) {
            result = { hungup: true };
          } else {
            result = await response.json();
          }
        }
        break;
      }

      case 'transfer': {
        const { transfer_to } = body as any;
        if (!call_id || !transfer_to) {
          return new Response(JSON.stringify({ error: 'call_id and transfer_to required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { data: call } = await supabase
          .from('calls')
          .select('telephony_id')
          .eq('id', call_id)
          .single();

        if (call?.telephony_id) {
          // Update the call with new instructions
          const response = await fetch(
            `${config.api_url}/v1/Accounts/${config.account_sid}/Calls/${call.telephony_id}`,
            {
              method: 'PUT',
              headers: jambonzHeaders,
              body: JSON.stringify({
                call_hook: {
                  url: `${supabaseUrl}/functions/v1/jambonz-handler`,
                  method: 'POST',
                },
                // Jambonz uses webhooks for call flow control
                // The webhook will receive the transfer instruction
              }),
            }
          );
          result = await response.json();
        }
        break;
      }

      case 'status': {
        // Get current system status
        const response = await fetch(`${config.api_url}/v1/SystemInformation`, {
          headers: jambonzHeaders,
        });
        result = await response.json();
        break;
      }

      case 'webhook': {
        // Handle incoming webhook from Jambonz
        console.log('[jambonz-handler] Webhook received:', webhook_data);

        const callSid = webhook_data?.call_sid;
        const callStatus = webhook_data?.call_status;

        if (callSid) {
          const { data: call } = await supabase
            .from('calls')
            .select('*')
            .eq('telephony_id', callSid)
            .single();

          if (call) {
            switch (callStatus) {
              case 'in-progress':
              case 'answered':
                await supabase.from('calls').update({
                  status: 'TALKING',
                  connected_at: new Date().toISOString(),
                }).eq('id', call.id);
                
                await updateMetrics(supabase, carrier_id, true, 0, Date.now() - startTime);
                break;

              case 'completed':
              case 'no-answer':
              case 'busy':
              case 'failed':
                const duration = webhook_data?.duration || 0;
                await supabase.from('calls').update({
                  status: 'ENDED',
                  ended_at: new Date().toISOString(),
                  duration,
                }).eq('id', call.id);
                
                const wasConnected = callStatus === 'completed' && duration > 0;
                await updateMetrics(supabase, carrier_id, wasConnected, duration, 0);
                break;
            }

            // Log event
            await supabase.from('call_events').insert({
              call_id: call.id,
              event_type: `jambonz.${callStatus}`,
              event_data: webhook_data,
            });
          }
        }

        // Return Jambonz application response (verbs)
        // This controls the call flow
        const tag = webhook_data?.tag ? JSON.parse(webhook_data.tag) : {};
        
        result = [
          {
            verb: 'say',
            text: 'Por favor aguarde enquanto conectamos sua chamada.',
            synthesizer: {
              vendor: 'google',
              language: 'pt-BR',
            },
          },
          {
            verb: 'dial',
            callerId: webhook_data?.from,
            answerOnBridge: true,
            target: [
              {
                type: 'user',
                name: 'agent', // This will be replaced with actual agent SIP endpoint
              },
            ],
          },
        ];
        break;
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[jambonz-handler] Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function updateMetrics(
  supabase: any,
  carrierId: string,
  connected: boolean,
  duration: number,
  latencyMs: number
) {
  const today = new Date().toISOString().split('T')[0];
  const hour = new Date().getHours();

  const { data: existing } = await supabase
    .from('carrier_metrics')
    .select('*')
    .eq('carrier_id', carrierId)
    .eq('date', today)
    .eq('hour', hour)
    .single();

  if (existing) {
    const totalCalls = existing.total_calls + 1;
    const connectedCalls = existing.connected_calls + (connected ? 1 : 0);
    const failedCalls = existing.failed_calls + (connected ? 0 : 1);
    const avgDuration = duration > 0 
      ? Math.round((existing.avg_duration * existing.connected_calls + duration) / connectedCalls)
      : existing.avg_duration;
    const avgLatency = latencyMs > 0
      ? Math.round((existing.avg_latency_ms * existing.total_calls + latencyMs) / totalCalls)
      : existing.avg_latency_ms;

    await supabase.from('carrier_metrics').update({
      total_calls: totalCalls,
      connected_calls: connectedCalls,
      failed_calls: failedCalls,
      avg_duration: avgDuration,
      avg_latency_ms: avgLatency,
      connection_rate: (connectedCalls / totalCalls) * 100,
    }).eq('id', existing.id);
  } else {
    await supabase.from('carrier_metrics').insert({
      carrier_id: carrierId,
      date: today,
      hour,
      total_calls: 1,
      connected_calls: connected ? 1 : 0,
      failed_calls: connected ? 0 : 1,
      avg_duration: duration,
      avg_latency_ms: latencyMs,
      connection_rate: connected ? 100 : 0,
    });
  }
}
