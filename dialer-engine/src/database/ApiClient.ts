import { createChildLogger } from '../utils/Logger';
import { config } from '../config';

const logger = createChildLogger('ApiClient');

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export class DialerApiClient {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = config.dialerApi.url;
    this.apiKey = config.dialerApi.key;
    
    if (!this.baseUrl || !this.apiKey) {
      logger.warn('Dialer API not configured - falling back to direct Supabase connection');
    }
  }

  private async request<T>(
    method: string,
    path: string,
    body?: Record<string, unknown>
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}/${path}`;
    
    try {
      logger.debug({ method, path }, 'API request');
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const json = await response.json();

      if (!response.ok) {
        logger.error({ status: response.status, error: json.error }, 'API error');
        return { error: json.error || `HTTP ${response.status}` };
      }

      return { data: json.data };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ error: message, url }, 'API request failed');
      return { error: message };
    }
  }

  isConfigured(): boolean {
    return !!(this.baseUrl && this.apiKey);
  }

  // Trunk configs
  async getTrunkConfigs() {
    return this.request<TrunkConfig[]>('GET', 'trunk-configs');
  }

  // Route health
  async getRouteHealth(carrierId?: string) {
    const path = carrierId ? `route-health/${carrierId}` : 'route-health';
    return this.request<RouteHealth[]>('GET', path);
  }

  // Reserve leads
  async reserveLeads(campaignId: string, accountId: string, limit: number) {
    return this.request<Lead[]>('POST', 'reserve-leads', {
      campaign_id: campaignId,
      account_id: accountId,
      limit,
    });
  }

  // Call attempts
  async createCallAttempt(attempt: Partial<CallAttempt>) {
    return this.request<CallAttempt>('POST', 'call-attempts', attempt as Record<string, unknown>);
  }

  async getCallAttempt(attemptId: string) {
    return this.request<CallAttempt>('GET', `call-attempts/${attemptId}`);
  }

  async getCallAttemptByCorrelation(correlationId: string) {
    return this.request<CallAttempt>('GET', `call-attempts/by-correlation/${correlationId}`);
  }

  async updateCallAttempt(attemptId: string, updates: Partial<CallAttempt>) {
    return this.request<CallAttempt>('PATCH', `call-attempts/${attemptId}`, updates as Record<string, unknown>);
  }

  async getActiveAttempts(campaignId?: string) {
    const path = campaignId ? `call-attempts/active?campaign_id=${campaignId}` : 'call-attempts/active';
    return this.request<CallAttempt[]>('GET', path);
  }

  async appendSipCode(attemptId: string, sipCode: number) {
    return this.request<CallAttempt>('POST', `call-attempts/${attemptId}/sip-code`, { sip_code: sipCode });
  }

  // Token bucket
  async consumeToken(trunkId: string) {
    return this.request<{ allowed: boolean }>('POST', 'consume-token', { trunk_id: trunkId });
  }

  // Timers
  async processExpiredTimers() {
    return this.request<ExpiredTimer[]>('GET', 'process-timers');
  }

  async createTimer(timer: Partial<AttemptTimer>) {
    return this.request<AttemptTimer>('POST', 'timers', timer as Record<string, unknown>);
  }

  async cancelTimers(attemptId: string, timerType?: string) {
    const path = timerType ? `timers/${attemptId}?timer_type=${timerType}` : `timers/${attemptId}`;
    return this.request<{ cancelled: number }>('DELETE', path);
  }

  // Events
  async logEvent(event: Partial<AttemptEvent>) {
    return this.request<AttemptEvent>('POST', 'events', event as Record<string, unknown>);
  }

  // Campaigns
  async getActiveCampaigns(accountId?: string) {
    const path = accountId ? `campaigns?account_id=${accountId}` : 'campaigns';
    return this.request<Campaign[]>('GET', path);
  }

  // Agents
  async getAvailableAgents(accountId: string) {
    return this.request<Agent[]>('GET', `agents?account_id=${accountId}`);
  }

  async updateAgentStatus(agentId: string, status: string, callId?: string) {
    return this.request<Agent>('PATCH', `agents/${agentId}/status`, { status, call_id: callId });
  }

  // Bucket states
  async getBucketStates() {
    return this.request<BucketState[]>('GET', 'bucket-states');
  }

  async upsertBucketState(state: Partial<BucketState>) {
    return this.request<BucketState>('POST', 'bucket-states', state as Record<string, unknown>);
  }

  // Caller ID
  async getCallerIdForCall(accountId: string, poolId: string) {
    return this.request<CallerId>('POST', 'caller-id', { account_id: accountId, pool_id: poolId });
  }
}

// Types
export interface TrunkConfig {
  id: string;
  account_id: string;
  name: string;
  sip_host: string;
  sip_port: number;
  cps_limit: number;
  max_channels: number;
  is_active: boolean;
}

export interface RouteHealth {
  id: string;
  carrier_id: string;
  health_score: number;
  is_degraded: boolean;
  total_calls: number;
  connected_calls: number;
  failed_calls: number;
}

export interface Lead {
  lead_id: string;
  phone: string;
}

export interface CallAttempt {
  id: string;
  account_id: string;
  campaign_id?: string;
  lead_id?: string;
  phone_e164: string;
  state: string;
  correlation_id?: string;
  trunk_id?: string;
  carrier_id?: string;
  caller_id_used?: string;
  sip_codes?: number[];
  sip_final_code?: number;
  sip_final_reason?: string;
  originate_at?: string;
  ring_at?: string;
  answer_at?: string;
  bridge_at?: string;
  end_at?: string;
  duration_ms?: number;
  hangup_cause?: string;
  amd_result?: string;
  amd_confidence?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ExpiredTimer {
  timer_id: string;
  attempt_id: string;
  timer_type: string;
  current_state: string;
}

export interface AttemptTimer {
  id: string;
  attempt_id: string;
  timer_type: string;
  fires_at: string;
  fired: boolean;
  cancelled: boolean;
}

export interface AttemptEvent {
  id: string;
  attempt_id: string;
  event_type: string;
  from_state?: string;
  to_state?: string;
  event_data?: Record<string, unknown>;
}

export interface Campaign {
  id: string;
  account_id: string;
  name: string;
  status: string;
}

export interface Agent {
  id: string;
  account_id: string;
  user_id: string;
  status: string;
  current_call_id?: string;
}

export interface BucketState {
  id: string;
  trunk_id: string;
  tokens: number;
  max_tokens: number;
  refill_rate: number;
  last_refill_at: string;
}

export interface CallerId {
  id: string;
  phone_number: string;
  pool_id: string;
  is_active: boolean;
}

// Singleton instance
let apiClientInstance: DialerApiClient | null = null;

export function getApiClient(): DialerApiClient {
  if (!apiClientInstance) {
    apiClientInstance = new DialerApiClient();
  }
  return apiClientInstance;
}
