export type CallState = 
  | 'QUEUED'
  | 'RESERVED'
  | 'ORIGINATING'
  | 'RINGING'
  | 'EARLY_MEDIA'
  | 'ANSWERED'
  | 'AMD_PROCESSING'
  | 'AMD_HUMAN'
  | 'AMD_MACHINE'
  | 'WAITING_AGENT'
  | 'AGENT_RINGING'
  | 'BRIDGED'
  | 'ON_HOLD'
  | 'TRANSFERRED'
  | 'ENDED'
  | 'FAILED'
  | 'NO_ANSWER'
  | 'BUSY'
  | 'TIMEOUT'
  | 'CANCELLED'
  | 'NO_RTP';

export type CallEvent =
  | 'RESERVE'
  | 'ORIGINATE'
  | 'SIP_100'
  | 'SIP_180'
  | 'SIP_183'
  | 'SIP_200'
  | 'SIP_4XX'
  | 'SIP_5XX'
  | 'SIP_6XX'
  | 'RTP_STARTED'
  | 'RTP_TIMEOUT'
  | 'AMD_HUMAN'
  | 'AMD_MACHINE'
  | 'AMD_TIMEOUT'
  | 'AGENT_AVAILABLE'
  | 'AGENT_ANSWER'
  | 'AGENT_REJECT'
  | 'BRIDGE'
  | 'HOLD'
  | 'UNHOLD'
  | 'TRANSFER'
  | 'BYE'
  | 'CANCEL'
  | 'TIMEOUT'
  | 'ERROR';

export interface Campaign {
  id: string;
  account_id: string;
  name: string;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED';
  dialer_mode: 'PREVIEW' | 'PROGRESSIVE' | 'POWER' | 'PREDICTIVE';
  dial_ratio: number;
  max_concurrent: number;
  work_days: number[];
  work_start: string;
  work_end: string;
  priority: number;
}

export interface CallAttempt {
  id: string;
  account_id: string;
  campaign_id: string;
  lead_id: string;
  phone_e164: string;
  state: CallState;
  trunk_id?: string;
  carrier_id?: string;
  caller_id_used?: string;
  correlation_id?: string;
  sip_codes: number[];
  sip_final_code?: number;
  amd_result?: string;
  created_at: string;
  originate_at?: string;
  ring_at?: string;
  answer_at?: string;
  end_at?: string;
}

export interface OriginateJob {
  id: string;
  attempt_id: string;
  campaign_id: string;
  priority: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  created_at: string;
}

export interface TrunkConfig {
  id: string;
  name: string;
  carrier_id: string;
  max_cps: number;
  max_channels: number;
  is_active: boolean;
}

export interface RouteHealth {
  id: string;
  carrier_id: string;
  trunk_id?: string;
  health_score: number;
  is_degraded: boolean;
  total_calls: number;
  connected_calls: number;
  failed_calls: number;
}

export interface TransitionResult {
  success: boolean;
  fromState: CallState;
  toState: CallState;
  timersCreated: string[];
  timersCancelled: string[];
}

export interface OriginateParams {
  correlationId: string;
  destination: string;
  callerId: string;
  callerIdName?: string;
  trunk: string;
  context?: string;
  variables?: Record<string, string>;
}
