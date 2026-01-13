import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

const DIALER_API_KEY = Deno.env.get('DIALER_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Create Supabase client with service role for admin operations
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function validateApiKey(req: Request): boolean {
  const apiKey = req.headers.get('x-api-key');
  return apiKey === DIALER_API_KEY;
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function errorResponse(message: string, status = 400) {
  console.error(`Error: ${message}`);
  return jsonResponse({ error: message }, status);
}

// Route handlers
async function getTrunkConfigs() {
  console.log('Fetching active trunk configs...');
  const { data, error } = await supabase
    .from('trunk_config')
    .select('*')
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching trunk configs:', error);
    return errorResponse(error.message, 500);
  }

  console.log(`Found ${data?.length || 0} active trunks`);
  return jsonResponse({ data });
}

async function getRouteHealth(carrierId?: string) {
  console.log('Fetching route health...', carrierId ? `for carrier ${carrierId}` : 'all');
  let query = supabase.from('route_health').select('*');
  
  if (carrierId) {
    query = query.eq('carrier_id', carrierId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching route health:', error);
    return errorResponse(error.message, 500);
  }

  return jsonResponse({ data });
}

async function reserveLeads(campaignId: string, accountId: string, limit: number) {
  console.log(`Reserving up to ${limit} leads for campaign ${campaignId}`);
  const { data, error } = await supabase.rpc('reserve_leads_for_campaign', {
    p_campaign_id: campaignId,
    p_account_id: accountId,
    p_limit: limit,
  });

  if (error) {
    console.error('Error reserving leads:', error);
    return errorResponse(error.message, 500);
  }

  console.log(`Reserved ${data?.length || 0} leads`);
  return jsonResponse({ data });
}

async function createCallAttempt(attemptData: Record<string, unknown>) {
  console.log('Creating call attempt:', attemptData.phone_e164);
  const { data, error } = await supabase
    .from('call_attempts')
    .insert(attemptData)
    .select()
    .single();

  if (error) {
    console.error('Error creating call attempt:', error);
    return errorResponse(error.message, 500);
  }

  console.log('Created call attempt:', data.id);
  return jsonResponse({ data }, 201);
}

async function updateCallAttempt(attemptId: string, updates: Record<string, unknown>) {
  console.log(`Updating call attempt ${attemptId}:`, updates);
  const { data, error } = await supabase
    .from('call_attempts')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', attemptId)
    .select()
    .single();

  if (error) {
    console.error('Error updating call attempt:', error);
    return errorResponse(error.message, 500);
  }

  return jsonResponse({ data });
}

async function getCallAttempt(attemptId: string) {
  console.log(`Fetching call attempt ${attemptId}`);
  const { data, error } = await supabase
    .from('call_attempts')
    .select('*')
    .eq('id', attemptId)
    .single();

  if (error) {
    console.error('Error fetching call attempt:', error);
    return errorResponse(error.message, 500);
  }

  return jsonResponse({ data });
}

async function getCallAttemptByCorrelation(correlationId: string) {
  console.log(`Fetching call attempt by correlation ${correlationId}`);
  const { data, error } = await supabase
    .from('call_attempts')
    .select('*')
    .eq('correlation_id', correlationId)
    .single();

  if (error) {
    console.error('Error fetching call attempt by correlation:', error);
    return errorResponse(error.message, 500);
  }

  return jsonResponse({ data });
}

async function consumeToken(trunkId: string) {
  console.log(`Consuming token for trunk ${trunkId}`);
  const { data, error } = await supabase.rpc('consume_token', {
    p_trunk_id: trunkId,
  });

  if (error) {
    console.error('Error consuming token:', error);
    return errorResponse(error.message, 500);
  }

  return jsonResponse({ allowed: data });
}

async function processExpiredTimers() {
  console.log('Processing expired timers...');
  const { data, error } = await supabase.rpc('process_expired_timers');

  if (error) {
    console.error('Error processing timers:', error);
    return errorResponse(error.message, 500);
  }

  console.log(`Processed ${data?.length || 0} expired timers`);
  return jsonResponse({ data });
}

async function createAttemptTimer(timerData: Record<string, unknown>) {
  console.log('Creating attempt timer:', timerData);
  const { data, error } = await supabase
    .from('call_attempt_timers')
    .insert(timerData)
    .select()
    .single();

  if (error) {
    console.error('Error creating timer:', error);
    return errorResponse(error.message, 500);
  }

  return jsonResponse({ data }, 201);
}

async function cancelAttemptTimers(attemptId: string, timerType?: string) {
  console.log(`Cancelling timers for attempt ${attemptId}`, timerType ? `type: ${timerType}` : '');
  let query = supabase
    .from('call_attempt_timers')
    .update({ cancelled: true })
    .eq('attempt_id', attemptId)
    .eq('fired', false)
    .eq('cancelled', false);

  if (timerType) {
    query = query.eq('timer_type', timerType);
  }

  const { data, error } = await query.select();

  if (error) {
    console.error('Error cancelling timers:', error);
    return errorResponse(error.message, 500);
  }

  return jsonResponse({ cancelled: data?.length || 0 });
}

async function logAttemptEvent(eventData: Record<string, unknown>) {
  console.log('Logging attempt event:', eventData.event_type);
  const { data, error } = await supabase
    .from('call_attempt_events')
    .insert(eventData)
    .select()
    .single();

  if (error) {
    console.error('Error logging event:', error);
    return errorResponse(error.message, 500);
  }

  return jsonResponse({ data }, 201);
}

async function appendSipCode(attemptId: string, sipCode: number) {
  console.log(`Appending SIP code ${sipCode} to attempt ${attemptId}`);
  
  // First get current sip_codes
  const { data: current, error: fetchError } = await supabase
    .from('call_attempts')
    .select('sip_codes')
    .eq('id', attemptId)
    .single();

  if (fetchError) {
    console.error('Error fetching current sip_codes:', fetchError);
    return errorResponse(fetchError.message, 500);
  }

  const currentCodes = current?.sip_codes || [];
  const newCodes = [...currentCodes, sipCode];

  const { data, error } = await supabase
    .from('call_attempts')
    .update({ sip_codes: newCodes, updated_at: new Date().toISOString() })
    .eq('id', attemptId)
    .select()
    .single();

  if (error) {
    console.error('Error appending SIP code:', error);
    return errorResponse(error.message, 500);
  }

  return jsonResponse({ data });
}

async function getActiveCampaigns(accountId?: string) {
  console.log('Fetching active campaigns...', accountId ? `for account ${accountId}` : '');
  let query = supabase
    .from('campaigns')
    .select('*')
    .eq('status', 'ACTIVE');

  if (accountId) {
    query = query.eq('account_id', accountId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching campaigns:', error);
    return errorResponse(error.message, 500);
  }

  return jsonResponse({ data });
}

async function getAvailableAgents(accountId: string, queueId?: string) {
  console.log(`Fetching available agents for account ${accountId}`);
  let query = supabase
    .from('agents')
    .select('*')
    .eq('account_id', accountId)
    .eq('status', 'available');

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching agents:', error);
    return errorResponse(error.message, 500);
  }

  return jsonResponse({ data });
}

async function updateAgentStatus(agentId: string, status: string, callId?: string) {
  console.log(`Updating agent ${agentId} status to ${status}`);
  const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  
  if (callId !== undefined) {
    updates.current_call_id = callId;
  }

  const { data, error } = await supabase
    .from('agents')
    .update(updates)
    .eq('id', agentId)
    .select()
    .single();

  if (error) {
    console.error('Error updating agent status:', error);
    return errorResponse(error.message, 500);
  }

  return jsonResponse({ data });
}

async function getBucketStates() {
  console.log('Fetching bucket states...');
  const { data, error } = await supabase
    .from('rate_limit_buckets')
    .select('*');

  if (error) {
    console.error('Error fetching bucket states:', error);
    return errorResponse(error.message, 500);
  }

  return jsonResponse({ data });
}

async function upsertBucketState(bucketData: Record<string, unknown>) {
  console.log('Upserting bucket state:', bucketData.trunk_id);
  const { data, error } = await supabase
    .from('rate_limit_buckets')
    .upsert(bucketData, { onConflict: 'trunk_id' })
    .select()
    .single();

  if (error) {
    console.error('Error upserting bucket state:', error);
    return errorResponse(error.message, 500);
  }

  return jsonResponse({ data });
}

async function getActiveAttempts(campaignId?: string) {
  console.log('Fetching active call attempts...', campaignId ? `for campaign ${campaignId}` : '');
  let query = supabase
    .from('call_attempts')
    .select('*')
    .not('state', 'in', '("ENDED","FAILED","TIMEOUT","CANCELLED")');

  if (campaignId) {
    query = query.eq('campaign_id', campaignId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching active attempts:', error);
    return errorResponse(error.message, 500);
  }

  return jsonResponse({ data });
}

async function getCallerIdForCall(accountId: string, poolId: string) {
  console.log(`Selecting caller ID for account ${accountId} pool ${poolId}`);
  const { data, error } = await supabase
    .from('caller_id_numbers')
    .select('*')
    .eq('pool_id', poolId)
    .eq('is_active', true)
    .order('uses_this_hour', { ascending: true })
    .limit(1)
    .single();

  if (error) {
    console.error('Error selecting caller ID:', error);
    return errorResponse(error.message, 500);
  }

  // Increment usage counter
  if (data) {
    await supabase
      .from('caller_id_numbers')
      .update({ 
        uses_this_hour: (data.uses_this_hour || 0) + 1,
        uses_today: (data.uses_today || 0) + 1,
        last_used_at: new Date().toISOString()
      })
      .eq('id', data.id);
  }

  return jsonResponse({ data });
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Validate API key
  if (!validateApiKey(req)) {
    console.error('Invalid API key');
    return errorResponse('Unauthorized', 401);
  }

  const url = new URL(req.url);
  const path = url.pathname.replace('/dialer-api', '').replace(/^\/+|\/+$/g, '');
  const segments = path.split('/').filter(Boolean);
  const method = req.method;

  console.log(`${method} /${path}`);

  try {
    // Route matching
    // GET /trunk-configs
    if (method === 'GET' && segments[0] === 'trunk-configs') {
      return await getTrunkConfigs();
    }

    // GET /route-health[/:carrierId]
    if (method === 'GET' && segments[0] === 'route-health') {
      return await getRouteHealth(segments[1]);
    }

    // POST /reserve-leads
    if (method === 'POST' && segments[0] === 'reserve-leads') {
      const body = await req.json();
      return await reserveLeads(body.campaign_id, body.account_id, body.limit || 10);
    }

    // GET/POST/PATCH /call-attempts
    if (segments[0] === 'call-attempts') {
      if (method === 'GET' && segments[1] === 'by-correlation' && segments[2]) {
        return await getCallAttemptByCorrelation(segments[2]);
      }
      if (method === 'GET' && segments[1] === 'active') {
        const campaignId = url.searchParams.get('campaign_id') || undefined;
        return await getActiveAttempts(campaignId);
      }
      if (method === 'GET' && segments[1]) {
        return await getCallAttempt(segments[1]);
      }
      if (method === 'POST') {
        const body = await req.json();
        return await createCallAttempt(body);
      }
      if (method === 'PATCH' && segments[1]) {
        const body = await req.json();
        return await updateCallAttempt(segments[1], body);
      }
    }

    // POST /call-attempts/:id/sip-code
    if (method === 'POST' && segments[0] === 'call-attempts' && segments[2] === 'sip-code') {
      const body = await req.json();
      return await appendSipCode(segments[1], body.sip_code);
    }

    // POST /consume-token
    if (method === 'POST' && segments[0] === 'consume-token') {
      const body = await req.json();
      return await consumeToken(body.trunk_id);
    }

    // GET /process-timers
    if (method === 'GET' && segments[0] === 'process-timers') {
      return await processExpiredTimers();
    }

    // POST /timers
    if (method === 'POST' && segments[0] === 'timers') {
      const body = await req.json();
      return await createAttemptTimer(body);
    }

    // DELETE /timers/:attemptId
    if (method === 'DELETE' && segments[0] === 'timers' && segments[1]) {
      const timerType = url.searchParams.get('timer_type') || undefined;
      return await cancelAttemptTimers(segments[1], timerType);
    }

    // POST /events
    if (method === 'POST' && segments[0] === 'events') {
      const body = await req.json();
      return await logAttemptEvent(body);
    }

    // GET /campaigns
    if (method === 'GET' && segments[0] === 'campaigns') {
      const accountId = url.searchParams.get('account_id') || undefined;
      return await getActiveCampaigns(accountId);
    }

    // GET /agents
    if (method === 'GET' && segments[0] === 'agents') {
      const accountId = url.searchParams.get('account_id');
      if (!accountId) return errorResponse('account_id required');
      return await getAvailableAgents(accountId);
    }

    // PATCH /agents/:id/status
    if (method === 'PATCH' && segments[0] === 'agents' && segments[2] === 'status') {
      const body = await req.json();
      return await updateAgentStatus(segments[1], body.status, body.call_id);
    }

    // GET/POST /bucket-states
    if (segments[0] === 'bucket-states') {
      if (method === 'GET') {
        return await getBucketStates();
      }
      if (method === 'POST') {
        const body = await req.json();
        return await upsertBucketState(body);
      }
    }

    // POST /caller-id
    if (method === 'POST' && segments[0] === 'caller-id') {
      const body = await req.json();
      return await getCallerIdForCall(body.account_id, body.pool_id);
    }

    return errorResponse('Not found', 404);
  } catch (error: unknown) {
    console.error('Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return errorResponse(message, 500);
  }
});
