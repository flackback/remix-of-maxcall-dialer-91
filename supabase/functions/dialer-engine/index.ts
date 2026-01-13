import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DialerRequest {
  campaign_id: string;
  action: 'start' | 'stop' | 'dial_batch' | 'status';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { campaign_id, action } = await req.json() as DialerRequest;

    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaign_id)
      .single();

    if (campaignError || !campaign) {
      throw new Error(`Campaign not found: ${campaignError?.message}`);
    }

    const campaignData = campaign as any;

    switch (action) {
      case 'status':
        return await getCampaignStatus(supabase, campaignData);

      case 'start':
        await supabase
          .from('campaigns')
          .update({ status: 'ACTIVE' })
          .eq('id', campaign_id);
        
        return new Response(JSON.stringify({ status: 'started', campaign_id }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'stop':
        await supabase
          .from('campaigns')
          .update({ status: 'PAUSED' })
          .eq('id', campaign_id);
        
        return new Response(JSON.stringify({ status: 'stopped', campaign_id }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'dial_batch':
        return await dialBatch(supabase, campaignData);

      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error: unknown) {
    console.error('Error in dialer-engine:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function getCampaignStatus(supabase: any, campaign: any) {
  const pacingResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/dial-pacing`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ campaign_id: campaign.id, action: 'get_metrics' }),
  });

  const pacing = await pacingResponse.json();

  const { data: lists } = await supabase
    .from('campaign_lists')
    .select('list_id')
    .eq('campaign_id', campaign.id);

  const listIds = lists?.map((l: any) => l.list_id) || [];

  let totalLeads = 0;
  let dialedLeads = 0;

  if (listIds.length > 0) {
    const { count: total } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .in('list_id', listIds)
      .eq('is_dnc', false);

    const { count: dialed } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .in('list_id', listIds)
      .gt('attempts', 0);

    totalLeads = total || 0;
    dialedLeads = dialed || 0;
  }

  const today = new Date().toISOString().split('T')[0];
  const { data: todayCalls } = await supabase
    .from('calls')
    .select('status, amd_result, duration')
    .eq('campaign_id', campaign.id)
    .gte('created_at', today);

  const callStats = {
    total: todayCalls?.length || 0,
    connected: todayCalls?.filter((c: any) => c.status === 'CONNECTED' || c.status === 'ENDED').length || 0,
    human: todayCalls?.filter((c: any) => c.amd_result === 'HUMAN').length || 0,
    machine: todayCalls?.filter((c: any) => c.amd_result === 'MACHINE').length || 0,
    avg_duration: 0
  };

  const durations = todayCalls?.filter((c: any) => c.duration > 0).map((c: any) => c.duration) || [];
  if (durations.length > 0) {
    callStats.avg_duration = Math.round(durations.reduce((a: number, b: number) => a + b, 0) / durations.length);
  }

  return new Response(JSON.stringify({
    campaign: { id: campaign.id, name: campaign.name, status: campaign.status, dial_mode: campaign.dial_mode },
    leads: { total: totalLeads, dialed: dialedLeads, remaining: totalLeads - dialedLeads, progress: totalLeads > 0 ? Math.round((dialedLeads / totalLeads) * 100) : 0 },
    calls: callStats,
    pacing: pacing.pacing || {},
    metrics: pacing.metrics || {}
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function dialBatch(supabase: any, campaign: any) {
  if (campaign.status !== 'ACTIVE') {
    return new Response(JSON.stringify({ error: 'Campaign is not active', status: campaign.status }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`;
  const currentDay = now.getDay();

  if (campaign.work_days && !campaign.work_days.includes(currentDay)) {
    return new Response(JSON.stringify({ error: 'Outside work days' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (campaign.start_time && campaign.end_time) {
    if (currentTime < campaign.start_time || currentTime > campaign.end_time) {
      return new Response(JSON.stringify({ error: 'Outside work hours' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  const pacingResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/dial-pacing`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ campaign_id: campaign.id, action: 'calculate' }),
  });

  const pacing = await pacingResponse.json();
  const callsToMake = pacing.pacing?.calls_to_dial || 0;

  if (callsToMake <= 0) {
    return new Response(JSON.stringify({ message: 'No calls to make', pacing }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: lists } = await supabase
    .from('campaign_lists')
    .select('list_id, priority')
    .eq('campaign_id', campaign.id)
    .order('priority', { ascending: true });

  if (!lists || lists.length === 0) {
    return new Response(JSON.stringify({ error: 'No lists assigned' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const listIds = lists.map((l: any) => l.list_id);
  const cooldownTime = new Date(Date.now() - (campaign.cooldown_minutes || 60) * 60 * 1000).toISOString();
  
  const { data: leads } = await supabase
    .from('leads')
    .select('id, phone, first_name, last_name, normalized_phone, score, attempts')
    .in('list_id', listIds)
    .eq('is_dnc', false)
    .eq('has_consent', true)
    .lt('attempts', campaign.max_attempts || 5)
    .or(`last_attempt_at.is.null,last_attempt_at.lt.${cooldownTime}`)
    .order('score', { ascending: false })
    .limit(callsToMake);

  if (!leads || leads.length === 0) {
    return new Response(JSON.stringify({ message: 'No leads available' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const dialResults = [];
  
  for (const lead of leads as any[]) {
    try {
      const carrierResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/carrier-router`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: lead.normalized_phone || lead.phone,
          campaign_id: campaign.id,
          account_id: campaign.account_id
        }),
      });

      const carrier = await carrierResponse.json();

      if (!carrier.carrier) {
        dialResults.push({ lead_id: lead.id, status: 'error', error: 'No carrier' });
        continue;
      }

      const { data: call, error: callError } = await supabase
        .from('calls')
        .insert({
          account_id: campaign.account_id,
          campaign_id: campaign.id,
          lead_id: lead.id,
          phone: lead.normalized_phone || lead.phone,
          caller_id: campaign.caller_id,
          direction: 'OUTBOUND',
          status: 'QUEUED'
        })
        .select()
        .single();

      if (callError) {
        dialResults.push({ lead_id: lead.id, status: 'error', error: callError.message });
        continue;
      }

      await supabase
        .from('leads')
        .update({ attempts: lead.attempts + 1, last_attempt_at: new Date().toISOString() })
        .eq('id', lead.id);

      const handlerUrl = carrier.carrier.type === 'telnyx' 
        ? `${Deno.env.get('SUPABASE_URL')}/functions/v1/telnyx-handler`
        : `${Deno.env.get('SUPABASE_URL')}/functions/v1/jambonz-handler`;

      const originateResponse = await fetch(handlerUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'originate',
          carrier_id: carrier.carrier.id,
          call_id: (call as any).id,
          to: lead.normalized_phone || lead.phone,
          from: campaign.caller_id,
          amd_enabled: true
        }),
      });

      const originateResult = await originateResponse.json();

      dialResults.push({
        lead_id: lead.id,
        call_id: (call as any).id,
        status: originateResult.error ? 'error' : 'initiated',
        carrier: carrier.carrier.name,
        error: originateResult.error
      });

    } catch (error: any) {
      console.error(`Error dialing lead ${lead.id}:`, error);
      dialResults.push({ lead_id: lead.id, status: 'error', error: error.message });
    }
  }

  const summary = {
    requested: callsToMake,
    attempted: leads.length,
    initiated: dialResults.filter(r => r.status === 'initiated').length,
    errors: dialResults.filter(r => r.status === 'error').length
  };

  console.log('Dial batch completed:', JSON.stringify(summary));

  return new Response(JSON.stringify({ summary, pacing, results: dialResults }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
