import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PacingRequest {
  campaign_id: string;
  action: 'calculate' | 'get_metrics' | 'override';
  override_ratio?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { campaign_id, action, override_ratio } = await req.json() as PacingRequest;

    // Fetch campaign configuration
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaign_id)
      .single();

    if (campaignError || !campaign) {
      throw new Error(`Campaign not found: ${campaignError?.message}`);
    }

    // Get current metrics from the last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const { data: recentMetrics } = await supabase
      .from('dial_metrics')
      .select('*')
      .eq('campaign_id', campaign_id)
      .gte('timestamp', fiveMinutesAgo)
      .order('timestamp', { ascending: false })
      .limit(10);

    // Get available agents for this campaign's queue
    const { data: availableAgents } = await supabase
      .from('agents')
      .select('id, status')
      .eq('status', 'READY');

    const { data: busyAgents } = await supabase
      .from('agents')
      .select('id, status')
      .eq('status', 'BUSY');

    // Get active calls for this campaign
    const { data: activeCalls } = await supabase
      .from('calls')
      .select('id, status')
      .eq('campaign_id', campaign_id)
      .in('status', ['QUEUED', 'RINGING', 'CONNECTED']);

    // Calculate current metrics
    const currentMetrics = {
      agents_available: availableAgents?.length || 0,
      agents_on_call: busyAgents?.length || 0,
      calls_dialed: activeCalls?.filter((c: any) => ['QUEUED', 'RINGING'].includes(c.status)).length || 0,
      calls_ringing: activeCalls?.filter((c: any) => c.status === 'RINGING').length || 0,
      calls_connected: activeCalls?.filter((c: any) => c.status === 'CONNECTED').length || 0,
      calls_abandoned: 0,
      avg_talk_time: 180,
      asr: 0.35
    };

    // Calculate ASR from recent calls
    const { data: recentCalls } = await supabase
      .from('calls')
      .select('status')
      .eq('campaign_id', campaign_id)
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());

    if (recentCalls && recentCalls.length > 0) {
      const connectedCalls = recentCalls.filter((c: any) => c.status === 'CONNECTED' || c.status === 'ENDED').length;
      currentMetrics.asr = connectedCalls / recentCalls.length;
    }

    // Calculate abandoned calls
    const { data: abandonedCalls } = await supabase
      .from('calls')
      .select('id')
      .eq('campaign_id', campaign_id)
      .eq('status', 'ABANDONED')
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());

    currentMetrics.calls_abandoned = abandonedCalls?.length || 0;

    // Calculate drop rate
    const totalConnected = recentCalls?.filter((c: any) => c.status === 'CONNECTED' || c.status === 'ENDED').length || 0;
    const dropRate = totalConnected > 0 
      ? (currentMetrics.calls_abandoned / (totalConnected + currentMetrics.calls_abandoned)) * 100 
      : 0;

    let calculatedDialRatio = (campaign as any).dial_ratio || 1.0;

    if (action === 'calculate' || action === 'get_metrics') {
      const dialMode = (campaign as any).dial_mode || 'POWER';
      const adaptiveMethod = (campaign as any).adaptive_method || 'AVERAGE';
      const maxDialLevel = (campaign as any).max_adapt_dial_level || 3.0;
      const dropTarget = (campaign as any).drop_percentage_target || 3.0;

      if (dialMode === 'PREVIEW') {
        calculatedDialRatio = 1.0;
      } else if (dialMode === 'POWER') {
        calculatedDialRatio = (campaign as any).dial_ratio || 1.5;
      } else if (dialMode === 'PREDICTIVE') {
        const baseRatio = 1 / (currentMetrics.asr || 0.35);
        
        switch (adaptiveMethod) {
          case 'HARD_LIMIT':
            if (dropRate > dropTarget) {
              calculatedDialRatio = Math.max(1.0, baseRatio * 0.7);
            } else {
              calculatedDialRatio = baseRatio;
            }
            break;
            
          case 'TAPERED':
            const dropDifference = dropRate - dropTarget;
            if (dropDifference > 0) {
              const reduction = Math.min(0.5, dropDifference / 10);
              calculatedDialRatio = baseRatio * (1 - reduction);
            } else {
              const increase = Math.min(0.2, Math.abs(dropDifference) / 20);
              calculatedDialRatio = baseRatio * (1 + increase);
            }
            break;
            
          case 'AVERAGE':
          default:
            if (recentMetrics && recentMetrics.length > 0) {
              const avgRatio = recentMetrics.reduce((sum: number, m: any) => sum + (m.current_dial_ratio || 1), 0) / recentMetrics.length;
              
              if (dropRate > dropTarget) {
                calculatedDialRatio = avgRatio * 0.9;
              } else {
                calculatedDialRatio = (avgRatio + baseRatio) / 2;
              }
            } else {
              calculatedDialRatio = baseRatio;
            }
            break;
        }
        
        calculatedDialRatio = Math.min(calculatedDialRatio, maxDialLevel);
        calculatedDialRatio = Math.max(calculatedDialRatio, 1.0);
      }

      if (action === 'calculate' && override_ratio) {
        calculatedDialRatio = Math.min(override_ratio, maxDialLevel);
      }
    }

    const availableAgentCount = (campaign as any).available_only_tally 
      ? currentMetrics.agents_available 
      : currentMetrics.agents_available + currentMetrics.agents_on_call;
    
    const targetCalls = Math.floor(availableAgentCount * calculatedDialRatio);
    const currentActiveCalls = currentMetrics.calls_dialed + currentMetrics.calls_ringing;
    const callsToMake = Math.max(0, targetCalls - currentActiveCalls);

    await supabase
      .from('dial_metrics')
      .insert({
        campaign_id,
        agents_available: currentMetrics.agents_available,
        agents_on_call: currentMetrics.agents_on_call,
        calls_dialed: currentMetrics.calls_dialed,
        calls_ringing: currentMetrics.calls_ringing,
        calls_connected: currentMetrics.calls_connected,
        calls_abandoned: currentMetrics.calls_abandoned,
        current_dial_ratio: calculatedDialRatio,
        drop_rate: dropRate,
        asr: currentMetrics.asr * 100,
        avg_talk_time: currentMetrics.avg_talk_time
      });

    const response = {
      campaign_id,
      dial_mode: (campaign as any).dial_mode,
      adaptive_method: (campaign as any).adaptive_method,
      metrics: {
        ...currentMetrics,
        drop_rate: dropRate,
        drop_target: (campaign as any).drop_percentage_target || 3.0
      },
      pacing: {
        calculated_ratio: calculatedDialRatio,
        max_ratio: (campaign as any).max_adapt_dial_level || 3.0,
        target_active_calls: targetCalls,
        current_active_calls: currentActiveCalls,
        calls_to_dial: callsToMake
      }
    };

    console.log('Pacing calculation:', JSON.stringify(response));

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in dial-pacing:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
