// RTP Monitor - Simplified

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

    const { action, call_id, stats } = await req.json();

    if (action === 'check_all') {
      const { data: calls } = await supabase
        .from('calls')
        .select('id, current_state, connected_at')
        .in('current_state', ['ANSWERED', 'BRIDGED']);

      const results: Array<{ call_id: string; status: string }> = [];
      const now = Date.now();

      for (const call of (calls || [])) {
        const { data: lastMetric } = await supabase
          .from('call_quality_metrics')
          .select('measured_at')
          .eq('call_id', call.id)
          .order('measured_at', { ascending: false })
          .limit(1)
          .single();

        const timeSinceAnswer = call.connected_at ? now - new Date(call.connected_at).getTime() : 0;

        if (!lastMetric && timeSinceAnswer > 5000) {
          await supabase.from('call_state_transitions').insert({
            call_id: call.id,
            from_state: call.current_state,
            to_state: 'NO_RTP',
            trigger_event: 'RTP_TIMEOUT',
          });
          await supabase.from('calls').update({ current_state: 'NO_RTP', ended_at: new Date().toISOString() }).eq('id', call.id);
          results.push({ call_id: call.id, status: 'no_rtp' });
        } else {
          results.push({ call_id: call.id, status: 'ok' });
        }
      }

      return new Response(JSON.stringify({ success: true, results }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'report_rtp_stats' && call_id && stats) {
      await supabase.from('call_quality_metrics').insert({
        call_id,
        measured_at: new Date().toISOString(),
        total_packets_sent: stats.packets_sent || 0,
        total_packets_lost: stats.packets_lost || 0,
        jitter_ms: stats.jitter_ms,
        rtt_ms: stats.rtt_ms,
      });
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
