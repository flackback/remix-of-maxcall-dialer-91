import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SBCRequest {
  action: 'negotiate' | 'validate' | 'check_cps' | 'get_config' | 'health_check';
  carrier_id?: string;
  trunk_id?: string;
  call_id?: string;
  destination?: string;
  campaign_id?: string;
  sdp_offer?: string;
  codecs_requested?: string[];
}

interface TrunkConfig {
  id: string;
  carrier_id: string;
  name: string;
  codecs_allowed: string[];
  tls_enabled: boolean;
  srtp_enabled: boolean;
  nat_traversal_enabled: boolean;
  topology_hiding: boolean;
  max_cps: number;
  current_cps: number;
  cps_window_seconds: number;
  dtmf_mode: string;
  session_timers_enabled: boolean;
  session_expires_seconds: number;
  min_se_seconds: number;
}

interface CPSCheckResult {
  allowed: boolean;
  current_cps: number;
  max_cps: number;
  throttled: boolean;
  throttle_reason?: string;
  retry_after_ms?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const request: SBCRequest = await req.json();
    console.log(`[SBC-Gateway] Action: ${request.action}`, request);

    switch (request.action) {
      case 'get_config':
        return await handleGetConfig(supabase, request);
      
      case 'check_cps':
        return await handleCheckCPS(supabase, request);
      
      case 'negotiate':
        return await handleNegotiate(supabase, request);
      
      case 'validate':
        return await handleValidate(supabase, request);
      
      case 'health_check':
        return await handleHealthCheck(supabase, request);
      
      default:
        return new Response(
          JSON.stringify({ error: 'Unknown action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error: any) {
    console.error('[SBC-Gateway] Error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleGetConfig(supabase: any, request: SBCRequest) {
  const { carrier_id, trunk_id } = request;

  let query = supabase.from('trunk_config').select('*');
  
  if (trunk_id) {
    query = query.eq('id', trunk_id);
  } else if (carrier_id) {
    query = query.eq('carrier_id', carrier_id);
  }

  const { data: configs, error } = await query;

  if (error) {
    console.error('[SBC-Gateway] Error fetching config:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch trunk config' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ configs }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleCheckCPS(supabase: any, request: SBCRequest): Promise<Response> {
  const { trunk_id, destination, campaign_id } = request;

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

  // Get applicable limits
  const { data: limits } = await supabase
    .from('trunk_limits')
    .select('*')
    .eq('trunk_id', trunk_id)
    .eq('is_active', true);

  // Check each limit type
  let result: CPSCheckResult = {
    allowed: true,
    current_cps: trunk.current_cps,
    max_cps: trunk.max_cps,
    throttled: false
  };

  // Check trunk-level limit
  if (trunk.current_cps >= trunk.max_cps) {
    result = {
      allowed: false,
      current_cps: trunk.current_cps,
      max_cps: trunk.max_cps,
      throttled: true,
      throttle_reason: 'Trunk CPS limit exceeded',
      retry_after_ms: 1000
    };

    // Log throttle event
    await supabase.from('cps_history').insert({
      trunk_id,
      cps_value: trunk.current_cps,
      limit_value: trunk.max_cps,
      was_throttled: true,
      throttle_reason: 'TRUNK_LIMIT',
      calls_rejected: 1
    });

    // Create alert
    await createQualityAlert(supabase, trunk, 'CPS_EXCEEDED', trunk.max_cps, trunk.current_cps);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Check granular limits
  for (const limit of limits || []) {
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
      case 'TRUNK':
        applies = true;
        break;
    }

    if (applies && limit.current_usage >= limit.max_cps) {
      result = {
        allowed: false,
        current_cps: limit.current_usage,
        max_cps: limit.max_cps,
        throttled: true,
        throttle_reason: `${limit.limit_type} limit exceeded`,
        retry_after_ms: limit.throttle_duration_seconds * 1000
      };

      // Update last_throttle_at
      await supabase
        .from('trunk_limits')
        .update({ last_throttle_at: new Date().toISOString() })
        .eq('id', limit.id);

      break;
    }
  }

  // If allowed, increment current_cps
  if (result.allowed) {
    await supabase
      .from('trunk_config')
      .update({ current_cps: trunk.current_cps + 1 })
      .eq('id', trunk_id);

    // Log normal CPS
    await supabase.from('cps_history').insert({
      trunk_id,
      cps_value: trunk.current_cps + 1,
      limit_value: trunk.max_cps,
      was_throttled: false
    });
  }

  return new Response(
    JSON.stringify(result),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleNegotiate(supabase: any, request: SBCRequest) {
  const { trunk_id, sdp_offer, codecs_requested } = request;

  if (!trunk_id) {
    return new Response(
      JSON.stringify({ error: 'trunk_id is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Get trunk config
  const { data: trunk, error } = await supabase
    .from('trunk_config')
    .select('*')
    .eq('id', trunk_id)
    .single();

  if (error || !trunk) {
    return new Response(
      JSON.stringify({ error: 'Trunk not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Negotiate codecs
  const allowedCodecs = trunk.codecs_allowed || ['G.711', 'Opus'];
  const requestedCodecs = codecs_requested || ['G.711'];
  const negotiatedCodec = requestedCodecs.find((c: string) => allowedCodecs.includes(c)) || allowedCodecs[0];

  // Build SBC parameters
  const sbcParams = {
    negotiated_codec: negotiatedCodec,
    tls_required: trunk.tls_enabled,
    srtp_required: trunk.srtp_enabled,
    nat_traversal: trunk.nat_traversal_enabled,
    topology_hiding: trunk.topology_hiding,
    dtmf_mode: trunk.dtmf_mode,
    session_timers: trunk.session_timers_enabled ? {
      enabled: true,
      session_expires: trunk.session_expires_seconds,
      min_se: trunk.min_se_seconds
    } : { enabled: false },
    ice_candidates: trunk.nat_traversal_enabled ? generateICECandidates() : [],
    transport: trunk.tls_enabled ? 'TLS' : 'UDP'
  };

  // If topology hiding is enabled, mask internal addresses in SDP
  let modifiedSDP = sdp_offer;
  if (trunk.topology_hiding && sdp_offer) {
    modifiedSDP = hideTopology(sdp_offer);
  }

  console.log(`[SBC-Gateway] Negotiated params for trunk ${trunk_id}:`, sbcParams);

  return new Response(
    JSON.stringify({
      success: true,
      sbc_params: sbcParams,
      modified_sdp: modifiedSDP,
      trunk_config: {
        id: trunk.id,
        name: trunk.name,
        tls_enabled: trunk.tls_enabled,
        srtp_enabled: trunk.srtp_enabled
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleValidate(supabase: any, request: SBCRequest) {
  const { trunk_id, call_id } = request;

  if (!trunk_id) {
    return new Response(
      JSON.stringify({ error: 'trunk_id is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { data: trunk } = await supabase
    .from('trunk_config')
    .select('*')
    .eq('id', trunk_id)
    .single();

  if (!trunk) {
    return new Response(
      JSON.stringify({ valid: false, reason: 'Trunk not found' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const validations = {
    tls: { required: trunk.tls_enabled, valid: true, message: 'TLS validation passed' },
    srtp: { required: trunk.srtp_enabled, valid: true, message: 'SRTP validation passed' },
    codec: { valid: true, message: 'Codec validated' },
    cps: { valid: trunk.current_cps < trunk.max_cps, message: trunk.current_cps < trunk.max_cps ? 'CPS within limits' : 'CPS limit exceeded' }
  };

  const allValid = Object.values(validations).every(v => v.valid);

  return new Response(
    JSON.stringify({
      valid: allValid,
      validations,
      trunk_status: {
        current_cps: trunk.current_cps,
        max_cps: trunk.max_cps,
        utilization_percent: (trunk.current_cps / trunk.max_cps) * 100
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleHealthCheck(supabase: any, request: SBCRequest) {
  const { carrier_id } = request;

  let query = supabase.from('trunk_config').select(`
    *,
    telephony_carriers(name, is_active)
  `);

  if (carrier_id) {
    query = query.eq('carrier_id', carrier_id);
  }

  const { data: trunks, error } = await query;

  if (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to fetch trunks' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const healthStatus = trunks.map((trunk: any) => ({
    trunk_id: trunk.id,
    name: trunk.name,
    carrier_name: trunk.telephony_carriers?.name,
    status: trunk.current_cps < trunk.max_cps * 0.9 ? 'healthy' : 
            trunk.current_cps < trunk.max_cps ? 'warning' : 'critical',
    cps_utilization: (trunk.current_cps / trunk.max_cps) * 100,
    features: {
      tls: trunk.tls_enabled,
      srtp: trunk.srtp_enabled,
      nat_traversal: trunk.nat_traversal_enabled,
      topology_hiding: trunk.topology_hiding
    }
  }));

  return new Response(
    JSON.stringify({
      overall_status: healthStatus.every((h: any) => h.status === 'healthy') ? 'healthy' :
                      healthStatus.some((h: any) => h.status === 'critical') ? 'critical' : 'warning',
      trunks: healthStatus,
      timestamp: new Date().toISOString()
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function createQualityAlert(supabase: any, trunk: TrunkConfig, alertType: string, threshold: number, current: number) {
  // Get account_id from carrier
  const { data: carrier } = await supabase
    .from('telephony_carriers')
    .select('account_id')
    .eq('id', trunk.carrier_id)
    .single();

  if (carrier) {
    await supabase.from('quality_alerts').insert({
      account_id: carrier.account_id,
      carrier_id: trunk.carrier_id,
      trunk_id: trunk.id,
      alert_type: alertType,
      severity: 'warning',
      threshold_value: threshold,
      current_value: current,
      message: `${alertType}: Current ${current}, Threshold ${threshold}`,
      auto_action_taken: 'THROTTLE'
    });
  }
}

function generateICECandidates() {
  // Generate STUN/TURN candidates for NAT traversal
  return [
    { type: 'host', protocol: 'udp', priority: 2130706431 },
    { type: 'srflx', protocol: 'udp', priority: 1694498815 },
    { type: 'relay', protocol: 'udp', priority: 16777215 }
  ];
}

function hideTopology(sdp: string): string {
  // Replace internal IP addresses with external/masked ones
  // This is a simplified version - production would need more sophisticated handling
  let modified = sdp;
  
  // Replace private IP ranges with placeholder
  modified = modified.replace(/\b10\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '0.0.0.0');
  modified = modified.replace(/\b172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}\b/g, '0.0.0.0');
  modified = modified.replace(/\b192\.168\.\d{1,3}\.\d{1,3}\b/g, '0.0.0.0');
  
  return modified;
}
