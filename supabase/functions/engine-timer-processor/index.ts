// Engine Timer Processor - Processa timers expirados (Simplificado)

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

    // Buscar timers expirados
    const { data: expiredTimers } = await supabase.rpc('process_expired_timers');

    if (!expiredTimers || expiredTimers.length === 0) {
      return new Response(JSON.stringify({ success: true, timers_processed: 0 }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const results: Array<{ timer_id: string; fired: boolean }> = [];
    const stateUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/engine-state-machine`;

    for (const timer of expiredTimers) {
      let event: string | null = null;

      // Mapear timer para evento
      if (timer.timer_type === 'RING_TIMEOUT' && ['ORIGINATING', 'RINGING', 'EARLY_MEDIA'].includes(timer.current_state)) {
        event = 'RING_TIMEOUT';
      } else if (timer.timer_type === 'ANSWER_NO_RTP_TIMEOUT' && timer.current_state === 'ANSWERED') {
        event = 'RTP_TIMEOUT';
      } else if (timer.timer_type === 'AGENT_ASSIGN_TIMEOUT' && timer.current_state === 'BRIDGING') {
        event = 'AGENT_TIMEOUT';
      } else if (timer.timer_type === 'MAX_DURATION' && ['BRIDGED', 'RECORDING', 'PLAYING'].includes(timer.current_state)) {
        event = 'MAX_DURATION';
      }

      if (event) {
        await fetch(stateUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
          body: JSON.stringify({ attempt_id: timer.attempt_id, event, event_source: 'TIMER' }),
        });
        results.push({ timer_id: timer.timer_id, fired: true });
      } else {
        results.push({ timer_id: timer.timer_id, fired: false });
      }
    }

    return new Response(JSON.stringify({ success: true, timers_processed: results.length, results }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
