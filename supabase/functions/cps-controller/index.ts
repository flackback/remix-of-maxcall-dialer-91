import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CPSRequest {
  action: 'acquire' | 'release' | 'status' | 'reset' | 'get_history' | 'set_limits';
  trunk_id?: string;
  campaign_id?: string;
  destination?: string;
  limit_config?: {
    max_cps: number;
    burst_limit?: number;
    throttle_duration_seconds?: number;
  };
}

interface SlidingWindow {
  trunk_id: string;
  timestamps: number[];
  window_size_ms: number;
}

// In-memory sliding windows (would use Redis in production)
const slidingWindows: Map<string, SlidingWindow> = new Map();

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const request: CPSRequest = await req.json();
    console.log(`[CPS-Controller] Action: ${request.action}`, request);

    switch (request.action) {
      case 'acquire':
        return await handleAcquire(supabase, request);
      
      case 'release':
        return await handleRelease(supabase, request);
      
      case 'status':
        return await handleStatus(supabase, request);
      
      case 'reset':
        return await handleReset(supabase, request);
      
      case 'get_history':
        return await handleGetHistory(supabase, request);
      
      case 'set_limits':
        return await handleSetLimits(supabase, request);
      
      default:
        return new Response(
          JSON.stringify({ error: 'Unknown action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error: any) {
    console.error('[CPS-Controller] Error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleAcquire(supabase: any, request: CPSRequest) {
  const { trunk_id, campaign_id, destination } = request;

  if (!trunk_id) {
    return new Response(
      JSON.stringify({ error: 'trunk_id is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Get trunk config
  const { data: trunk, error: trunkError } = await supabase
    .from('trunk_config')
    .select('*')
    .eq('id', trunk_id)
    .single();

  if (trunkError || !trunk) {
    return new Response(
      JSON.stringify({ error: 'Trunk not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Get or create sliding window
  let window = slidingWindows.get(trunk_id);
  const now = Date.now();
  const windowSizeMs = (trunk.cps_window_seconds || 1) * 1000;

  if (!window) {
    window = {
      trunk_id,
      timestamps: [],
      window_size_ms: windowSizeMs
    };
    slidingWindows.set(trunk_id, window);
  }

  // Clean old timestamps outside the window
  window.timestamps = window.timestamps.filter(ts => now - ts < windowSizeMs);

  // Calculate current CPS
  const currentCPS = window.timestamps.length;

  // Check if we can acquire
  if (currentCPS >= trunk.max_cps) {
    // Check for burst allowance
    const { data: burstLimit } = await supabase
      .from('trunk_limits')
      .select('burst_limit, throttle_duration_seconds')
      .eq('trunk_id', trunk_id)
      .eq('limit_type', 'TRUNK')
      .eq('is_active', true)
      .single();

    const effectiveBurstLimit = burstLimit?.burst_limit || trunk.max_cps;

    if (currentCPS >= effectiveBurstLimit) {
      // Throttled - log and return
      await logCPSEvent(supabase, trunk_id, currentCPS, trunk.max_cps, true, 'LIMIT_EXCEEDED');

      return new Response(
        JSON.stringify({
          acquired: false,
          current_cps: currentCPS,
          max_cps: trunk.max_cps,
          burst_limit: effectiveBurstLimit,
          throttled: true,
          retry_after_ms: burstLimit?.throttle_duration_seconds ? burstLimit.throttle_duration_seconds * 1000 : 1000,
          reason: 'CPS limit exceeded, including burst allowance'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Within burst allowance
    console.log(`[CPS-Controller] Using burst allowance: ${currentCPS}/${effectiveBurstLimit}`);
  }

  // Check granular limits (campaign, destination, DDD)
  const granularCheck = await checkGranularLimits(supabase, trunk_id, campaign_id, destination);
  if (!granularCheck.allowed) {
    return new Response(
      JSON.stringify({
        acquired: false,
        ...granularCheck,
        throttled: true
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Acquire the slot
  window.timestamps.push(now);

  // Update trunk current_cps in database
  await supabase
    .from('trunk_config')
    .update({ current_cps: window.timestamps.length })
    .eq('id', trunk_id);

  // Increment granular limit usage
  if (granularCheck.limit_id) {
    await supabase
      .from('trunk_limits')
      .update({ current_usage: granularCheck.current_usage + 1 })
      .eq('id', granularCheck.limit_id);
  }

  // Log normal acquisition
  await logCPSEvent(supabase, trunk_id, window.timestamps.length, trunk.max_cps, false);

  return new Response(
    JSON.stringify({
      acquired: true,
      current_cps: window.timestamps.length,
      max_cps: trunk.max_cps,
      utilization_percent: (window.timestamps.length / trunk.max_cps) * 100,
      slot_expires_ms: windowSizeMs
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleRelease(supabase: any, request: CPSRequest) {
  const { trunk_id } = request;

  if (!trunk_id) {
    return new Response(
      JSON.stringify({ error: 'trunk_id is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const window = slidingWindows.get(trunk_id);
  if (window && window.timestamps.length > 0) {
    // Remove oldest timestamp (FIFO)
    window.timestamps.shift();

    // Update database
    await supabase
      .from('trunk_config')
      .update({ current_cps: window.timestamps.length })
      .eq('id', trunk_id);
  }

  return new Response(
    JSON.stringify({
      released: true,
      current_cps: window?.timestamps.length || 0
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleStatus(supabase: any, request: CPSRequest) {
  const { trunk_id } = request;

  let query = supabase.from('trunk_config').select(`
    *,
    telephony_carriers(name, is_active),
    trunk_limits(*)
  `);

  if (trunk_id) {
    query = query.eq('id', trunk_id);
  }

  const { data: trunks, error } = await query;

  if (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to fetch trunk status' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const status = trunks.map((trunk: any) => {
    const window = slidingWindows.get(trunk.id);
    const realtimeCPS = window?.timestamps.filter(ts => Date.now() - ts < 1000).length || 0;

    return {
      trunk_id: trunk.id,
      name: trunk.name,
      carrier_name: trunk.telephony_carriers?.name,
      max_cps: trunk.max_cps,
      current_cps: trunk.current_cps,
      realtime_cps: realtimeCPS,
      utilization_percent: (trunk.current_cps / trunk.max_cps) * 100,
      status: trunk.current_cps < trunk.max_cps * 0.7 ? 'healthy' :
              trunk.current_cps < trunk.max_cps * 0.9 ? 'warning' :
              trunk.current_cps < trunk.max_cps ? 'high' : 'throttled',
      limits: trunk.trunk_limits?.map((l: any) => ({
        type: l.limit_type,
        max_cps: l.max_cps,
        current_usage: l.current_usage,
        burst_limit: l.burst_limit,
        is_active: l.is_active
      })) || []
    };
  });

  return new Response(
    JSON.stringify({ trunks: trunk_id ? status[0] : status }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleReset(supabase: any, request: CPSRequest) {
  const { trunk_id } = request;

  if (!trunk_id) {
    return new Response(
      JSON.stringify({ error: 'trunk_id is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Clear sliding window
  slidingWindows.delete(trunk_id);

  // Reset database counters
  await supabase
    .from('trunk_config')
    .update({ current_cps: 0 })
    .eq('id', trunk_id);

  await supabase
    .from('trunk_limits')
    .update({ current_usage: 0 })
    .eq('trunk_id', trunk_id);

  console.log(`[CPS-Controller] Reset CPS counters for trunk ${trunk_id}`);

  return new Response(
    JSON.stringify({ reset: true, trunk_id }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleGetHistory(supabase: any, request: CPSRequest) {
  const { trunk_id } = request;

  if (!trunk_id) {
    return new Response(
      JSON.stringify({ error: 'trunk_id is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: history, error } = await supabase
    .from('cps_history')
    .select('*')
    .eq('trunk_id', trunk_id)
    .gte('timestamp', last24h)
    .order('timestamp', { ascending: true });

  if (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to fetch history' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Aggregate by minute for visualization
  const minuteStats: Record<string, any> = {};
  for (const h of history) {
    const minute = new Date(h.timestamp).toISOString().slice(0, 16);
    if (!minuteStats[minute]) {
      minuteStats[minute] = {
        max_cps: 0,
        avg_cps: 0,
        throttle_count: 0,
        samples: 0,
        total_cps: 0
      };
    }
    minuteStats[minute].max_cps = Math.max(minuteStats[minute].max_cps, h.cps_value);
    minuteStats[minute].total_cps += h.cps_value;
    minuteStats[minute].samples++;
    if (h.was_throttled) minuteStats[minute].throttle_count++;
  }

  const aggregated = Object.entries(minuteStats).map(([minute, stats]: [string, any]) => ({
    timestamp: minute,
    max_cps: stats.max_cps,
    avg_cps: stats.total_cps / stats.samples,
    throttle_count: stats.throttle_count,
    samples: stats.samples
  }));

  // Calculate summary
  const summary = history.length > 0 ? {
    total_samples: history.length,
    throttle_events: history.filter((h: any) => h.was_throttled).length,
    peak_cps: Math.max(...history.map((h: any) => h.cps_value)),
    avg_cps: history.reduce((a: number, b: any) => a + b.cps_value, 0) / history.length,
    throttle_rate: (history.filter((h: any) => h.was_throttled).length / history.length) * 100
  } : null;

  return new Response(
    JSON.stringify({ history: aggregated, summary }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleSetLimits(supabase: any, request: CPSRequest) {
  const { trunk_id, limit_config } = request;

  if (!trunk_id || !limit_config) {
    return new Response(
      JSON.stringify({ error: 'trunk_id and limit_config are required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Update trunk max_cps
  const { error: trunkError } = await supabase
    .from('trunk_config')
    .update({ max_cps: limit_config.max_cps })
    .eq('id', trunk_id);

  if (trunkError) {
    return new Response(
      JSON.stringify({ error: 'Failed to update trunk limits' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Update or create trunk-level limit
  if (limit_config.burst_limit || limit_config.throttle_duration_seconds) {
    await supabase
      .from('trunk_limits')
      .upsert({
        trunk_id,
        limit_type: 'TRUNK',
        max_cps: limit_config.max_cps,
        burst_limit: limit_config.burst_limit || limit_config.max_cps * 1.2,
        throttle_duration_seconds: limit_config.throttle_duration_seconds || 60,
        is_active: true
      }, { onConflict: 'trunk_id,limit_type' });
  }

  console.log(`[CPS-Controller] Updated limits for trunk ${trunk_id}:`, limit_config);

  return new Response(
    JSON.stringify({ success: true, trunk_id, limit_config }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function checkGranularLimits(
  supabase: any,
  trunk_id: string,
  campaign_id?: string,
  destination?: string
): Promise<{ allowed: boolean; reason?: string; limit_id?: string; current_usage: number }> {
  const { data: limits } = await supabase
    .from('trunk_limits')
    .select('*')
    .eq('trunk_id', trunk_id)
    .eq('is_active', true);

  if (!limits || limits.length === 0) {
    return { allowed: true, current_usage: 0 };
  }

  for (const limit of limits) {
    let applies = false;

    switch (limit.limit_type) {
      case 'CAMPAIGN':
        applies = campaign_id === limit.limit_scope_id;
        break;
      case 'DESTINATION':
        applies = destination === limit.limit_scope_pattern;
        break;
      case 'DDD':
        const ddd = destination?.substring(0, 2);
        applies = ddd === limit.limit_scope_pattern;
        break;
    }

    if (applies && limit.current_usage >= limit.max_cps) {
      return {
        allowed: false,
        reason: `${limit.limit_type} limit exceeded for ${limit.limit_scope_pattern || limit.limit_scope_id}`,
        limit_id: limit.id,
        current_usage: limit.current_usage
      };
    }

    if (applies) {
      return {
        allowed: true,
        limit_id: limit.id,
        current_usage: limit.current_usage
      };
    }
  }

  return { allowed: true, current_usage: 0 };
}

async function logCPSEvent(
  supabase: any,
  trunk_id: string,
  cps_value: number,
  limit_value: number,
  was_throttled: boolean,
  throttle_reason?: string
) {
  // Only log periodically to avoid too much data (every 10th event or throttles)
  if (!was_throttled && Math.random() > 0.1) return;

  await supabase.from('cps_history').insert({
    trunk_id,
    cps_value,
    limit_value,
    was_throttled,
    throttle_reason
  });
}
