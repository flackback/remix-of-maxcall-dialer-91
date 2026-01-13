// Engine State Machine - Transições de estado para call_attempts
// Este é o CORAÇÃO do motor de discagem

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Estados possíveis
type CallState = 
  | 'QUEUED' | 'RESERVING' | 'ORIGINATING' | 'RINGING' | 'EARLY_MEDIA'
  | 'ANSWERED' | 'AMD_PROCESSING' | 'BRIDGING' | 'BRIDGED' | 'PLAYING'
  | 'RECORDING' | 'TRANSFERRING' | 'TRANSFERRED' | 'ENDING' | 'ENDED'
  | 'FAILED' | 'NO_RTP' | 'ABANDONED' | 'TIMEOUT' | 'CANCELLED';

// Eventos que causam transições
type CallEvent =
  | 'RESERVE' | 'ORIGINATE_SENT' | 'ORIGINATE_FAILED'
  | 'SIP_100' | 'SIP_180' | 'SIP_183' | 'SIP_200' | 'SIP_4XX' | 'SIP_5XX' | 'SIP_6XX'
  | 'RTP_STARTED' | 'RTP_TIMEOUT' | 'RTP_GONE'
  | 'AMD_HUMAN' | 'AMD_MACHINE' | 'AMD_TIMEOUT'
  | 'AGENT_ASSIGNED' | 'AGENT_TIMEOUT' | 'BRIDGE_COMPLETE'
  | 'PLAY_START' | 'PLAY_END' | 'RECORD_START' | 'RECORD_END'
  | 'TRANSFER_INIT' | 'TRANSFER_COMPLETE' | 'TRANSFER_FAILED'
  | 'BYE' | 'CANCEL' | 'HANGUP'
  | 'RING_TIMEOUT' | 'MAX_DURATION' | 'SYSTEM_ERROR';

// Máquina de estados: state + event -> newState
const STATE_TRANSITIONS: Record<CallState, Partial<Record<CallEvent, CallState>>> = {
  'QUEUED': {
    'RESERVE': 'RESERVING',
    'CANCEL': 'CANCELLED',
  },
  'RESERVING': {
    'ORIGINATE_SENT': 'ORIGINATING',
    'ORIGINATE_FAILED': 'FAILED',
    'CANCEL': 'CANCELLED',
  },
  'ORIGINATING': {
    'SIP_100': 'ORIGINATING',
    'SIP_180': 'RINGING',
    'SIP_183': 'EARLY_MEDIA',
    'SIP_200': 'ANSWERED',
    'SIP_4XX': 'FAILED',
    'SIP_5XX': 'FAILED',
    'SIP_6XX': 'FAILED',
    'RING_TIMEOUT': 'TIMEOUT',
    'CANCEL': 'CANCELLED',
    'SYSTEM_ERROR': 'FAILED',
  },
  'RINGING': {
    'SIP_180': 'RINGING',
    'SIP_183': 'EARLY_MEDIA',
    'SIP_200': 'ANSWERED',
    'SIP_4XX': 'FAILED',
    'SIP_5XX': 'FAILED',
    'RING_TIMEOUT': 'TIMEOUT',
    'BYE': 'ENDED',
    'CANCEL': 'CANCELLED',
  },
  'EARLY_MEDIA': {
    'SIP_200': 'ANSWERED',
    'SIP_4XX': 'FAILED',
    'SIP_5XX': 'FAILED',
    'RING_TIMEOUT': 'TIMEOUT',
    'BYE': 'ENDED',
    'CANCEL': 'CANCELLED',
  },
  'ANSWERED': {
    'RTP_STARTED': 'BRIDGING', // Se não tiver AMD
    'RTP_TIMEOUT': 'NO_RTP',
    'AMD_HUMAN': 'BRIDGING',
    'AMD_MACHINE': 'PLAYING',
    'AMD_TIMEOUT': 'BRIDGING', // Assume human se timeout
    'BYE': 'ENDED',
    'HANGUP': 'ENDING',
    'MAX_DURATION': 'ENDING',
  },
  'AMD_PROCESSING': {
    'AMD_HUMAN': 'BRIDGING',
    'AMD_MACHINE': 'PLAYING',
    'AMD_TIMEOUT': 'BRIDGING',
    'RTP_GONE': 'NO_RTP',
    'BYE': 'ENDED',
  },
  'BRIDGING': {
    'AGENT_ASSIGNED': 'BRIDGED',
    'AGENT_TIMEOUT': 'ABANDONED',
    'RTP_GONE': 'NO_RTP',
    'BYE': 'ENDED',
    'HANGUP': 'ENDING',
  },
  'BRIDGED': {
    'RTP_GONE': 'NO_RTP',
    'TRANSFER_INIT': 'TRANSFERRING',
    'RECORD_START': 'RECORDING',
    'BYE': 'ENDED',
    'HANGUP': 'ENDING',
    'MAX_DURATION': 'ENDING',
  },
  'PLAYING': {
    'PLAY_END': 'ENDING',
    'AGENT_ASSIGNED': 'BRIDGED', // Se agente atender durante playback
    'RTP_GONE': 'NO_RTP',
    'BYE': 'ENDED',
    'HANGUP': 'ENDING',
  },
  'RECORDING': {
    'RECORD_END': 'BRIDGED',
    'RTP_GONE': 'NO_RTP',
    'BYE': 'ENDED',
    'HANGUP': 'ENDING',
    'MAX_DURATION': 'ENDING',
  },
  'TRANSFERRING': {
    'TRANSFER_COMPLETE': 'TRANSFERRED',
    'TRANSFER_FAILED': 'BRIDGED',
    'RTP_GONE': 'NO_RTP',
    'BYE': 'ENDED',
  },
  'TRANSFERRED': {
    'BYE': 'ENDED',
  },
  'ENDING': {
    'BYE': 'ENDED',
  },
  // Estados finais - não têm transições de saída
  'ENDED': {},
  'FAILED': {},
  'NO_RTP': {
    'BYE': 'ENDED', // Pode receber BYE mesmo em NO_RTP
  },
  'ABANDONED': {},
  'TIMEOUT': {},
  'CANCELLED': {},
};

// Timers a criar por estado
const TIMERS_BY_STATE: Record<CallState, { type: string; seconds: number }[]> = {
  'ORIGINATING': [{ type: 'RING_TIMEOUT', seconds: 30 }],
  'RINGING': [{ type: 'RING_TIMEOUT', seconds: 30 }],
  'EARLY_MEDIA': [{ type: 'RING_TIMEOUT', seconds: 30 }],
  'ANSWERED': [{ type: 'ANSWER_NO_RTP_TIMEOUT', seconds: 5 }],
  'AMD_PROCESSING': [{ type: 'AMD_TIMEOUT', seconds: 5 }],
  'BRIDGING': [{ type: 'AGENT_ASSIGN_TIMEOUT', seconds: 10 }],
  'BRIDGED': [{ type: 'MAX_DURATION', seconds: 1800 }],
  'QUEUED': [],
  'RESERVING': [],
  'PLAYING': [],
  'RECORDING': [],
  'TRANSFERRING': [],
  'TRANSFERRED': [],
  'ENDING': [],
  'ENDED': [],
  'FAILED': [],
  'NO_RTP': [],
  'ABANDONED': [],
  'TIMEOUT': [],
  'CANCELLED': [],
};

// Timers a cancelar ao entrar em estado
const CANCEL_TIMERS_ON_STATE: Record<CallState, string[]> = {
  'ANSWERED': ['RING_TIMEOUT'],
  'BRIDGED': ['AGENT_ASSIGN_TIMEOUT', 'ANSWER_NO_RTP_TIMEOUT'],
  'ENDED': ['RING_TIMEOUT', 'ANSWER_NO_RTP_TIMEOUT', 'AMD_TIMEOUT', 'AGENT_ASSIGN_TIMEOUT', 'MAX_DURATION'],
  'FAILED': ['RING_TIMEOUT', 'ANSWER_NO_RTP_TIMEOUT', 'AMD_TIMEOUT', 'AGENT_ASSIGN_TIMEOUT', 'MAX_DURATION'],
  'NO_RTP': ['MAX_DURATION'],
  'ABANDONED': ['MAX_DURATION'],
  'TIMEOUT': ['RING_TIMEOUT', 'ANSWER_NO_RTP_TIMEOUT', 'AMD_TIMEOUT', 'AGENT_ASSIGN_TIMEOUT'],
  'CANCELLED': ['RING_TIMEOUT', 'ANSWER_NO_RTP_TIMEOUT', 'AMD_TIMEOUT', 'AGENT_ASSIGN_TIMEOUT', 'MAX_DURATION'],
  'QUEUED': [],
  'RESERVING': [],
  'ORIGINATING': [],
  'RINGING': [],
  'EARLY_MEDIA': [],
  'AMD_PROCESSING': [],
  'BRIDGING': [],
  'PLAYING': [],
  'RECORDING': [],
  'TRANSFERRING': [],
  'TRANSFERRED': [],
  'ENDING': [],
};

interface TransitionRequest {
  attempt_id: string;
  event: CallEvent;
  sip_code?: number;
  sip_reason?: string;
  rtp_stats?: Record<string, unknown>;
  event_source?: string;
  event_data?: Record<string, unknown>;
  campaign_timeouts?: {
    ring_timeout_seconds?: number;
    answer_no_rtp_timeout_seconds?: number;
    agent_assign_timeout_seconds?: number;
    max_call_duration_seconds?: number;
  };
}

interface TransitionResult {
  success: boolean;
  attempt_id: string;
  from_state: CallState;
  to_state: CallState;
  event: CallEvent;
  timers_created: string[];
  timers_cancelled: string[];
  error?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const request: TransitionRequest = await req.json();

    if (!request.attempt_id || !request.event) {
      return new Response(
        JSON.stringify({ error: 'Missing attempt_id or event' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1) Buscar attempt atual
    const { data: attempt, error: fetchError } = await supabase
      .from('call_attempts')
      .select('id, state, campaign_id')
      .eq('id', request.attempt_id)
      .single();

    if (fetchError || !attempt) {
      return new Response(
        JSON.stringify({ error: 'Attempt not found', details: fetchError }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const currentState = attempt.state as CallState;
    const event = request.event as CallEvent;

    // 2) Verificar se transição é válida
    const possibleTransitions = STATE_TRANSITIONS[currentState];
    const newState = possibleTransitions?.[event];

    if (!newState) {
      // Transição inválida - logar mas não falhar (pode ser evento duplicado)
      console.warn(`Invalid transition: ${currentState} + ${event}`);
      
      return new Response(
        JSON.stringify({ 
          success: false,
          attempt_id: request.attempt_id,
          from_state: currentState,
          to_state: currentState,
          event,
          error: `Invalid transition from ${currentState} with event ${event}`,
          timers_created: [],
          timers_cancelled: [],
        } satisfies TransitionResult),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3) Preparar updates de timestamps baseado no novo estado
    const timestampUpdates: Record<string, string> = {};
    const now = new Date().toISOString();

    switch (newState) {
      case 'RESERVING': timestampUpdates.reserved_at = now; break;
      case 'ORIGINATING': timestampUpdates.originate_at = now; break;
      case 'RINGING': timestampUpdates.ring_at = now; break;
      case 'EARLY_MEDIA': timestampUpdates.early_media_at = now; break;
      case 'ANSWERED': timestampUpdates.answer_at = now; break;
      case 'BRIDGED': timestampUpdates.bridge_at = now; break;
      case 'ENDED':
      case 'FAILED':
      case 'NO_RTP':
      case 'ABANDONED':
      case 'TIMEOUT':
      case 'CANCELLED':
        timestampUpdates.end_at = now;
        break;
    }

    // 4) Atualizar attempt
    const updateData: Record<string, unknown> = {
      state: newState,
      ...timestampUpdates,
    };

    if (request.sip_code) {
      updateData.sip_final_code = request.sip_code;
      updateData.sip_final_reason = request.sip_reason || null;
    }

    const { error: updateError } = await supabase
      .from('call_attempts')
      .update(updateData)
      .eq('id', request.attempt_id);

    if (updateError) {
      throw new Error(`Failed to update attempt: ${updateError.message}`);
    }

    // 5) Registrar evento
    await supabase.from('call_attempt_events').insert({
      attempt_id: request.attempt_id,
      event_type: event,
      from_state: currentState,
      to_state: newState,
      sip_code: request.sip_code,
      sip_reason: request.sip_reason,
      rtp_stats: request.rtp_stats || {},
      event_source: request.event_source || 'SYSTEM',
      event_data: request.event_data || {},
    });

    // 6) Cancelar timers do estado anterior
    const timersToCancel = CANCEL_TIMERS_ON_STATE[newState] || [];
    const cancelledTimers: string[] = [];

    if (timersToCancel.length > 0) {
      const { data: cancelled } = await supabase
        .from('call_attempt_timers')
        .update({ cancelled: true })
        .eq('attempt_id', request.attempt_id)
        .in('timer_type', timersToCancel)
        .eq('fired', false)
        .eq('cancelled', false)
        .select('timer_type');

      cancelledTimers.push(...(cancelled?.map(t => t.timer_type) || []));
    }

    // 7) Criar novos timers
    const timersToCreate = TIMERS_BY_STATE[newState] || [];
    const createdTimers: string[] = [];

    for (const timerDef of timersToCreate) {
      // Usar timeouts da campanha se fornecidos
      let seconds = timerDef.seconds;
      
      if (request.campaign_timeouts) {
        switch (timerDef.type) {
          case 'RING_TIMEOUT':
            seconds = request.campaign_timeouts.ring_timeout_seconds || seconds;
            break;
          case 'ANSWER_NO_RTP_TIMEOUT':
            seconds = request.campaign_timeouts.answer_no_rtp_timeout_seconds || seconds;
            break;
          case 'AGENT_ASSIGN_TIMEOUT':
            seconds = request.campaign_timeouts.agent_assign_timeout_seconds || seconds;
            break;
          case 'MAX_DURATION':
            seconds = request.campaign_timeouts.max_call_duration_seconds || seconds;
            break;
        }
      }

      const firesAt = new Date(Date.now() + seconds * 1000).toISOString();

      await supabase.from('call_attempt_timers').insert({
        attempt_id: request.attempt_id,
        timer_type: timerDef.type,
        fires_at: firesAt,
      });

      createdTimers.push(timerDef.type);
    }

    const result: TransitionResult = {
      success: true,
      attempt_id: request.attempt_id,
      from_state: currentState,
      to_state: newState,
      event,
      timers_created: createdTimers,
      timers_cancelled: cancelledTimers,
    };

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    console.error('State machine error:', message);
    
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
