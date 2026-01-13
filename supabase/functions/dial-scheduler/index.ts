// Dial Scheduler - Simplified

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

    const { action, campaign_id, account_id } = await req.json();

    if (action === 'tick') {
      const now = new Date();
      const currentDay = now.getDay();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:00`;

      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('*')
        .eq('account_id', account_id)
        .eq('status', 'ACTIVE');

      const results: Array<{ campaign_id: string; calls_scheduled: number; reason?: string }> = [];

      for (const campaign of (campaigns || [])) {
        const workDays = campaign.work_days as number[] || [1,2,3,4,5];
        if (!workDays.includes(currentDay)) {
          results.push({ campaign_id: campaign.id, calls_scheduled: 0, reason: 'Not a work day' });
          continue;
        }

        if (currentTime < campaign.start_time || currentTime > campaign.end_time) {
          results.push({ campaign_id: campaign.id, calls_scheduled: 0, reason: 'Outside work hours' });
          continue;
        }

        const { data: agents } = await supabase
          .from('agents')
          .select('id')
          .eq('account_id', campaign.account_id)
          .eq('status', 'AVAILABLE');

        const availableAgents = agents?.length || 0;
        if (availableAgents === 0) {
          results.push({ campaign_id: campaign.id, calls_scheduled: 0, reason: 'No agents available' });
          continue;
        }

        const dialRatio = campaign.dial_ratio || 1;
        const callsToMake = Math.ceil(availableAgents * dialRatio);

        results.push({ campaign_id: campaign.id, calls_scheduled: callsToMake });
      }

      return new Response(JSON.stringify({ success: true, results }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    if (action === 'start_campaign' && campaign_id) {
      await supabase.from('campaigns').update({ status: 'ACTIVE' }).eq('id', campaign_id);
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'stop_campaign' && campaign_id) {
      await supabase.from('campaigns').update({ status: 'PAUSED' }).eq('id', campaign_id);
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
