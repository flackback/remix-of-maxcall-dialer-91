// Engine Reconciler - Processa eventos da camada de voz (Simplificado)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { events } = await req.json();

    if (!events || !Array.isArray(events)) {
      return new Response(JSON.stringify({ error: 'Missing events' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const results: Array<{ correlation_id: string; success: boolean; error?: string }> = [];

    for (const event of events) {
      try {
        const { data: attempt } = await supabase.from('call_attempts').select('id, state, trunk_id, carrier_id').eq('correlation_id', event.correlation_id).single();

        if (!attempt) {
          results.push({ correlation_id: event.correlation_id, success: false, error: 'Not found' });
          continue;
        }

        // Mapear evento para state machine event
        let stateEvent: string | null = null;
        if (event.sip_code === 180) stateEvent = 'SIP_180';
        else if (event.sip_code === 183) stateEvent = 'SIP_183';
        else if (event.sip_code === 200) stateEvent = 'SIP_200';
        else if (event.sip_code >= 400 && event.sip_code < 500) stateEvent = 'SIP_4XX';
        else if (event.sip_code >= 500) stateEvent = 'SIP_5XX';
        else if (event.event_type === 'RTP_START') stateEvent = 'RTP_STARTED';
        else if (event.event_type === 'RTP_TIMEOUT') stateEvent = 'RTP_TIMEOUT';
        else if (event.event_type === 'CHANNEL_HANGUP') stateEvent = 'BYE';
        else if (event.event_type === 'AMD_RESULT') stateEvent = event.amd_result === 'HUMAN' ? 'AMD_HUMAN' : 'AMD_MACHINE';

        if (stateEvent) {
          const stateUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/engine-state-machine`;
          await fetch(stateUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
            body: JSON.stringify({ attempt_id: attempt.id, event: stateEvent, sip_code: event.sip_code, event_source: 'VOICE' }),
          });
        }

        // Gravar evento
        await supabase.from('call_attempt_events').insert({
          attempt_id: attempt.id,
          event_type: event.event_type,
          from_state: attempt.state,
          sip_code: event.sip_code,
          event_source: 'VOICE',
          event_data: event,
        });

        results.push({ correlation_id: event.correlation_id, success: true });

      } catch (error) {
        results.push({ correlation_id: event.correlation_id, success: false, error: error instanceof Error ? error.message : 'Error' });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
