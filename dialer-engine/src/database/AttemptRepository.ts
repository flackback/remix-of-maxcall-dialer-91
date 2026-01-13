import { getSupabaseClient } from './SupabaseClient';
import { CallAttempt, CallState } from '../types';
import { createChildLogger } from '../utils/Logger';
import { v4 as uuidv4 } from 'uuid';

const logger = createChildLogger('AttemptRepository');

export class AttemptRepository {
  async create(attempt: Partial<CallAttempt>): Promise<CallAttempt> {
    const client = getSupabaseClient();
    
    const newAttempt = {
      id: uuidv4(),
      correlation_id: uuidv4(),
      state: 'QUEUED' as CallState,
      sip_codes: [],
      created_at: new Date().toISOString(),
      ...attempt,
    };

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
    const client = getSupabaseClient();
    
    const { data, error } = await client
      .from('call_attempts')
      .update({
        state: newState,
        updated_at: new Date().toISOString(),
        ...updates,
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
