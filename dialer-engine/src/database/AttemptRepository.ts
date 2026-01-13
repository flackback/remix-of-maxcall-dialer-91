import { getSupabaseClient } from './SupabaseClient';
import { getApiClient } from './ApiClient';
import { CallAttempt, CallState } from '../types';
import { createChildLogger } from '../utils/Logger';
import { config } from '../config';
import { v4 as uuidv4 } from 'uuid';

const logger = createChildLogger('AttemptRepository');

export class AttemptRepository {
  private useApi(): boolean {
    return !!(config.dialerApi.url && config.dialerApi.key);
  }

  async create(attempt: Partial<CallAttempt>): Promise<CallAttempt> {
    const newAttempt = {
      id: uuidv4(),
      correlation_id: uuidv4(),
      state: 'QUEUED' as CallState,
      sip_codes: [],
      created_at: new Date().toISOString(),
      ...attempt,
    };

    if (this.useApi()) {
      const api = getApiClient();
      const { data, error } = await api.createCallAttempt(newAttempt as Record<string, unknown>);
      
      if (error || !data) {
        logger.error({ error, attempt }, 'Failed to create attempt via API');
        throw new Error(error || 'Unknown error');
      }

      logger.debug({ attemptId: data.id }, 'Created call attempt via API');
      return data as CallAttempt;
    }

    const client = getSupabaseClient();
    const { data, error } = await client
      .from('call_attempts')
      .insert(newAttempt)
      .select()
      .single();

    if (error) {
      logger.error({ error, attempt }, 'Failed to create attempt');
      throw error;
    }

    logger.debug({ attemptId: data.id }, 'Created call attempt');
    return data;
  }

  async findById(attemptId: string): Promise<CallAttempt | null> {
    if (this.useApi()) {
      const api = getApiClient();
      const { data, error } = await api.getCallAttempt(attemptId);
      
      if (error) {
        if (error.includes('PGRST116') || error.includes('not found')) return null;
        logger.error({ error, attemptId }, 'Failed to fetch attempt via API');
        throw new Error(error);
      }

      return data as CallAttempt | null;
    }

    const client = getSupabaseClient();
    const { data, error } = await client
      .from('call_attempts')
      .select('*')
      .eq('id', attemptId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      logger.error({ error, attemptId }, 'Failed to fetch attempt');
      throw error;
    }

    return data;
  }

  async findByCorrelationId(correlationId: string): Promise<CallAttempt | null> {
    if (this.useApi()) {
      const api = getApiClient();
      const { data, error } = await api.getCallAttemptByCorrelation(correlationId);
      
      if (error) {
        if (error.includes('PGRST116') || error.includes('not found')) return null;
        logger.error({ error, correlationId }, 'Failed to fetch attempt by correlation via API');
        throw new Error(error);
      }

      return data as CallAttempt | null;
    }

    const client = getSupabaseClient();
    const { data, error } = await client
      .from('call_attempts')
      .select('*')
      .eq('correlation_id', correlationId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      logger.error({ error, correlationId }, 'Failed to fetch attempt by correlation');
      throw error;
    }

    return data;
  }

  async updateState(
    attemptId: string, 
    newState: CallState, 
    updates: Partial<CallAttempt> = {}
  ): Promise<CallAttempt> {
    const updatePayload = {
      state: newState,
      ...updates,
    };

    if (this.useApi()) {
      const api = getApiClient();
      const { data, error } = await api.updateCallAttempt(attemptId, updatePayload as Record<string, unknown>);
      
      if (error || !data) {
        logger.error({ error, attemptId, newState }, 'Failed to update attempt state via API');
        throw new Error(error || 'Unknown error');
      }

      logger.debug({ attemptId, newState }, 'Updated attempt state via API');
      return data as CallAttempt;
    }

    const client = getSupabaseClient();
    const { data, error } = await client
      .from('call_attempts')
      .update({
        ...updatePayload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', attemptId)
      .select()
      .single();

    if (error) {
      logger.error({ error, attemptId, newState }, 'Failed to update attempt state');
      throw error;
    }

    logger.debug({ attemptId, newState }, 'Updated attempt state');
    return data;
  }

  async appendSipCode(attemptId: string, sipCode: number): Promise<void> {
    if (this.useApi()) {
      const api = getApiClient();
      const { error } = await api.appendSipCode(attemptId, sipCode);
      
      if (error) {
        logger.error({ error, attemptId, sipCode }, 'Failed to append SIP code via API');
      }
      return;
    }

    const client = getSupabaseClient();
    const attempt = await this.findById(attemptId);
    if (!attempt) return;

    const sipCodes = [...(attempt.sip_codes || []), sipCode];

    await client
      .from('call_attempts')
      .update({ sip_codes: sipCodes, updated_at: new Date().toISOString() })
      .eq('id', attemptId);
  }

  async logEvent(
    attemptId: string,
    eventType: string,
    fromState: string,
    toState?: string,
    data?: Record<string, unknown>
  ): Promise<void> {
    if (this.useApi()) {
      const api = getApiClient();
      const { error } = await api.logEvent({
        attempt_id: attemptId,
        event_type: eventType,
        from_state: fromState,
        to_state: toState,
        event_data: data || {},
      });
      
      if (error) {
        logger.error({ error, attemptId, eventType }, 'Failed to log event via API');
      }
      return;
    }

    const client = getSupabaseClient();
    const { error } = await client
      .from('call_attempt_events')
      .insert({
        attempt_id: attemptId,
        event_type: eventType,
        from_state: fromState,
        to_state: toState,
        event_source: 'ENGINE',
        event_data: data || {},
        created_at: new Date().toISOString(),
      });

    if (error) {
      logger.error({ error, attemptId, eventType }, 'Failed to log event');
    }
  }
}
