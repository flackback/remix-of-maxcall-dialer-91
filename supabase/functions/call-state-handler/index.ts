// Call State Machine Handler - Simplified version

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type CallState = 'QUEUED' | 'ORIGINATING' | 'RINGING' | 'EARLY_MEDIA' | 'ANSWERED' | 'BRIDGED' | 'PLAYING' | 'RECORDING' | 'TRANSFER_PENDING' | 'TRANSFERRED' | 'ENDED' | 'FAILED' | 'NO_RTP' | 'ABANDONED' | 'TIMEOUT' | 'CANCELLED';

const STATE_TRANSITIONS: Record<string, Record<string, CallState>> = {
  'QUEUED': { 'ORIGINATE_SENT': 'ORIGINATING', 'ORIGINATE_FAILED': 'FAILED', 'CANCEL': 'CANCELLED' },
  'ORIGINATING': { 'SIP_180': 'RINGING', 'SIP_183': 'EARLY_MEDIA', 'SIP_200': 'ANSWERED', 'SIP_4XX': 'FAILED', 'SIP_5XX': 'FAILED', 'RING_TIMEOUT': 'TIMEOUT', 'CANCEL': 'CANCELLED' },
  'RINGING': { 'SIP_200': 'ANSWERED', 'SIP_4XX': 'FAILED', 'RING_TIMEOUT': 'TIMEOUT', 'CANCEL': 'CANCELLED', 'BYE': 'ENDED' },
  'EARLY_MEDIA': { 'SIP_200': 'ANSWERED', 'SIP_4XX': 'FAILED', 'RING_TIMEOUT': 'TIMEOUT', 'BYE': 'ENDED' },
  'ANSWERED': { 'RTP_STARTED': 'BRIDGED', 'RTP_TIMEOUT': 'NO_RTP', 'AMD_HUMAN': 'BRIDGED', 'AMD_MACHINE': 'PLAYING', 'BYE': 'ENDED' },
  'BRIDGED': { 'RTP_GONE': 'NO_RTP', 'BYE': 'ENDED', 'TRANSFER_INITIATED': 'TRANSFER_PENDING', 'MAX_DURATION': 'ENDED' },
  'PLAYING': { 'RTP_GONE': 'NO_RTP', 'BYE': 'ENDED', 'AGENT_ANSWER': 'BRIDGED' },
  'RECORDING': { 'BYE': 'ENDED' },
  'TRANSFER_PENDING': { 'TRANSFER_COMPLETE': 'TRANSFERRED', 'TRANSFER_FAILED': 'BRIDGED', 'BYE': 'ENDED' },
  'TRANSFERRED': { 'BYE': 'ENDED' },
  'ENDED': {}, 'FAILED': {}, 'NO_RTP': { 'BYE': 'ENDED' }, 'ABANDONED': {}, 'TIMEOUT': {}, 'CANCELLED': {},
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

    const { call_id, event, sip_code, rtp_stats, metadata } = await req.json();

    if (!call_id || !event) {
      return new Response(JSON.stringify({ error: 'Missing call_id or event' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: call } = await supabase.from('calls').select('id, current_state, account_id, started_at').eq('id', call_id).single();

    if (!call) {
      return new Response(JSON.stringify({ error: 'Call not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const currentState = (call.current_state || 'QUEUED') as string;
    const newState = STATE_TRANSITIONS[currentState]?.[event];

    if (!newState) {
      return new Response(JSON.stringify({ error: 'Invalid transition', current_state: currentState, event }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    await supabase.from('call_state_transitions').insert({
      call_id,
      from_state: currentState,
      to_state: newState,
      trigger_event: event,
      sip_code,
      rtp_stats: rtp_stats || {},
      metadata: metadata || {},
    });

    const updateData: Record<string, unknown> = { current_state: newState };
    if (['ENDED', 'FAILED', 'NO_RTP', 'TIMEOUT', 'CANCELLED'].includes(newState)) {
      updateData.ended_at = new Date().toISOString();
    }

    await supabase.from('calls').update(updateData).eq('id', call_id);

    return new Response(JSON.stringify({ success: true, call_id, previous_state: currentState, current_state: newState }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
