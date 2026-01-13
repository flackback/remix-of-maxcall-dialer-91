import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TelnyxCallRequest {
  action: 'originate' | 'hangup' | 'transfer' | 'hold' | 'answer' | 'webhook';
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

    const body: TelnyxCallRequest = await req.json();
    const { action, carrier_id, call_id, phone_to, phone_from, webhook_data } = body;

    console.log(`[telnyx-handler] Action: ${action}, Carrier: ${carrier_id}`);

    // Get carrier config
    const { data: carrier, error: carrierError } = await supabase
      .from('telephony_carriers')
      .select('*')
      .eq('id', carrier_id)
      .eq('type', 'telnyx')
      .single();

    if (carrierError || !carrier) {
      console.error('[telnyx-handler] Carrier not found:', carrierError);
      return new Response(JSON.stringify({ error: 'Carrier not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const config = carrier.config_json as {
      api_key: string;
      connection_id: string;
      messaging_profile_id?: string;
    };

    if (!config.api_key) {
      return new Response(JSON.stringify({ error: 'Telnyx API key not configured' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const telnyxHeaders = {
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

        console.log(`[telnyx-handler] Originating call from ${phone_from} to ${phone_to}`);

        const response = await fetch('https://api.telnyx.com/v2/calls', {
          method: 'POST',
          headers: telnyxHeaders,
          body: JSON.stringify({
            connection_id: config.connection_id,
            to: phone_to.startsWith('+') ? phone_to : `+55${phone_to}`,
            from: phone_from.startsWith('+') ? phone_from : `+55${phone_from}`,
            webhook_url: `${supabaseUrl}/functions/v1/telnyx-handler`,
            webhook_url_method: 'POST',
            answering_machine_detection: 'detect_beep',
            client_state: btoa(JSON.stringify({ call_id })),
          }),
        });

        result = await response.json();
        
        if (!response.ok) {
          console.error('[telnyx-handler] Originate failed:', result);
          
          // Update metrics for failed call
          await updateMetrics(supabase, carrier_id, false, 0, Date.now() - startTime);
          
          return new Response(JSON.stringify({ error: result }), {
            status: response.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.log(`[telnyx-handler] Call initiated: ${result.data?.call_control_id}`);
        
        // Update call record with telephony ID
        if (call_id) {
          await supabase.from('calls').update({
            telephony_id: result.data?.call_control_id,
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

        // Get telephony_id from call
        const { data: call } = await supabase
          .from('calls')
          .select('telephony_id')
          .eq('id', call_id)
          .single();

        if (call?.telephony_id) {
          const response = await fetch(`https://api.telnyx.com/v2/calls/${call.telephony_id}/actions/hangup`, {
            method: 'POST',
            headers: telnyxHeaders,
          });
          result = await response.json();
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
          const response = await fetch(`https://api.telnyx.com/v2/calls/${call.telephony_id}/actions/transfer`, {
            method: 'POST',
            headers: telnyxHeaders,
            body: JSON.stringify({
              to: transfer_to.startsWith('+') ? transfer_to : `+55${transfer_to}`,
            }),
          });
          result = await response.json();
        }
        break;
      }

      case 'hold': {
        const { hold_action } = body as any; // 'hold' or 'unhold'
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
          const actionPath = hold_action === 'unhold' ? 'unhold' : 'hold';
          const response = await fetch(`https://api.telnyx.com/v2/calls/${call.telephony_id}/actions/${actionPath}`, {
            method: 'POST',
            headers: telnyxHeaders,
          });
          result = await response.json();
        }
        break;
      }

      case 'answer': {
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
          const response = await fetch(`https://api.telnyx.com/v2/calls/${call.telephony_id}/actions/answer`, {
            method: 'POST',
            headers: telnyxHeaders,
          });
          result = await response.json();
        }
        break;
      }

      case 'webhook': {
        // Handle incoming webhook from Telnyx
        console.log('[telnyx-handler] Webhook received:', webhook_data?.event_type);
        
        const event = webhook_data?.data;
        const eventType = webhook_data?.event_type;
        const callControlId = event?.payload?.call_control_id;

        if (callControlId) {
          const { data: call } = await supabase
            .from('calls')
            .select('*')
            .eq('telephony_id', callControlId)
            .single();

          if (call) {
            switch (eventType) {
              case 'call.answered':
                await supabase.from('calls').update({
                  status: 'TALKING',
                  connected_at: new Date().toISOString(),
                }).eq('id', call.id);
                
                // Update metrics for successful connection
                await updateMetrics(supabase, carrier_id, true, 0, Date.now() - startTime);
                break;

              case 'call.hangup':
                const duration = event?.payload?.duration_secs || 0;
                await supabase.from('calls').update({
                  status: 'ENDED',
                  ended_at: new Date().toISOString(),
                  duration,
                }).eq('id', call.id);
                
                // Update metrics with duration
                await updateMetrics(supabase, carrier_id, true, duration, 0);
                break;

              case 'call.machine.detection.ended':
                const machineType = event?.payload?.result;
                if (machineType === 'machine') {
                  // Answering machine detected - hangup
                  await fetch(`https://api.telnyx.com/v2/calls/${callControlId}/actions/hangup`, {
                    method: 'POST',
                    headers: telnyxHeaders,
                  });
                }
                break;
            }

            // Log event
            await supabase.from('call_events').insert({
              call_id: call.id,
              event_type: eventType,
              event_data: event,
            });
          }
        }

        result = { received: true };
        break;
      }
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[telnyx-handler] Error:', error);
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

  // Upsert metrics
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
