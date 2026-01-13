// Route Health Updater - Simplified

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

    const { action, carrier_id } = await req.json();

    if (action === 'get_status') {
      const { data: routes } = await supabase
        .from('route_health')
        .select('*')
        .order('health_score', { ascending: false });

      return new Response(JSON.stringify({ routes: routes || [] }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'update_all') {
      const { data: carriers } = await supabase
        .from('telephony_carriers')
        .select('id, name')
        .eq('is_active', true);

      for (const carrier of (carriers || [])) {
        const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        
        const { data: calls } = await supabase
          .from('calls')
          .select('current_state, duration')
          .eq('carrier_id', carrier.id)
          .gte('created_at', last24h);

        const totalCalls = calls?.length || 0;
        const connectedCalls = calls?.filter((c: { current_state: string }) => ['ENDED', 'BRIDGED'].includes(c.current_state)).length || 0;
        const failedCalls = calls?.filter((c: { current_state: string }) => ['FAILED', 'TIMEOUT'].includes(c.current_state)).length || 0;
        const noRTPCalls = calls?.filter((c: { current_state: string }) => c.current_state === 'NO_RTP').length || 0;

        const asr = totalCalls > 0 ? (connectedCalls / totalCalls) * 100 : 0;
        let healthScore = 100;
        healthScore -= Math.max(0, (70 - asr) / 2);
        healthScore -= noRTPCalls * 5;
        healthScore = Math.max(0, Math.min(100, healthScore));

        await supabase.from('route_health').upsert({
          carrier_id: carrier.id,
          health_score: healthScore,
          asr,
          total_calls: totalCalls,
          connected_calls: connectedCalls,
          failed_calls: failedCalls,
          no_rtp_count: noRTPCalls,
          is_degraded: healthScore < 50,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'carrier_id' });
      }

      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'reset_route' && carrier_id) {
      await supabase.from('route_health').update({
        health_score: 100,
        is_degraded: false,
        cooldown_until: null,
      }).eq('carrier_id', carrier_id);
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
