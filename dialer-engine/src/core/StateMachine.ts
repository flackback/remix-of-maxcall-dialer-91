import { CallState, CallEvent, TransitionResult } from '../types';
import { AttemptRepository } from '../database/AttemptRepository';
import { getSupabaseClient } from '../database/SupabaseClient';
import { getApiClient } from '../database/ApiClient';
import { config } from '../config';
import { createChildLogger } from '../utils/Logger';

const logger = createChildLogger('StateMachine');

const STATE_TRANSITIONS: Record<CallState, Partial<Record<CallEvent, CallState>>> = {
  QUEUED: {
    RESERVE: 'RESERVED',
    CANCEL: 'CANCELLED',
    TIMEOUT: 'TIMEOUT',
  },
  RESERVED: {
    ORIGINATE: 'ORIGINATING',
    CANCEL: 'CANCELLED',
    TIMEOUT: 'TIMEOUT',
  },
  ORIGINATING: {
    SIP_100: 'ORIGINATING',
    SIP_180: 'RINGING',
    SIP_183: 'EARLY_MEDIA',
    SIP_200: 'ANSWERED',
    SIP_4XX: 'FAILED',
    SIP_5XX: 'FAILED',
    SIP_6XX: 'FAILED',
    TIMEOUT: 'TIMEOUT',
    CANCEL: 'CANCELLED',
    ERROR: 'FAILED',
  },
  RINGING: {
    SIP_180: 'RINGING',
    SIP_183: 'EARLY_MEDIA',
    SIP_200: 'ANSWERED',
    SIP_4XX: 'FAILED',
    SIP_5XX: 'FAILED',
    BYE: 'NO_ANSWER',
    TIMEOUT: 'NO_ANSWER',
    CANCEL: 'CANCELLED',
    RTP_TIMEOUT: 'NO_RTP',
  },
  EARLY_MEDIA: {
    SIP_200: 'ANSWERED',
    SIP_4XX: 'FAILED',
    SIP_5XX: 'FAILED',
    BYE: 'NO_ANSWER',
    TIMEOUT: 'NO_ANSWER',
    CANCEL: 'CANCELLED',
    RTP_STARTED: 'EARLY_MEDIA',
    RTP_TIMEOUT: 'NO_RTP',
  },
  ANSWERED: {
    AMD_HUMAN: 'AMD_HUMAN',
    AMD_MACHINE: 'AMD_MACHINE',
    AMD_TIMEOUT: 'WAITING_AGENT',
    BRIDGE: 'BRIDGED',
    BYE: 'ENDED',
    HOLD: 'ON_HOLD',
    TRANSFER: 'TRANSFERRED',
    RTP_TIMEOUT: 'NO_RTP',
  },
  AMD_PROCESSING: {
    AMD_HUMAN: 'AMD_HUMAN',
    AMD_MACHINE: 'AMD_MACHINE',
    AMD_TIMEOUT: 'WAITING_AGENT',
    BYE: 'ENDED',
    RTP_TIMEOUT: 'NO_RTP',
  },
  AMD_HUMAN: {
    AGENT_AVAILABLE: 'AGENT_RINGING',
    BYE: 'ENDED',
    TIMEOUT: 'ENDED',
    RTP_TIMEOUT: 'NO_RTP',
  },
  AMD_MACHINE: {
    BYE: 'ENDED',
    TIMEOUT: 'ENDED',
  },
  WAITING_AGENT: {
    AGENT_AVAILABLE: 'AGENT_RINGING',
    BYE: 'ENDED',
    TIMEOUT: 'ENDED',
    RTP_TIMEOUT: 'NO_RTP',
  },
  AGENT_RINGING: {
    AGENT_ANSWER: 'BRIDGED',
    AGENT_REJECT: 'WAITING_AGENT',
    BYE: 'ENDED',
    TIMEOUT: 'WAITING_AGENT',
  },
  BRIDGED: {
    BYE: 'ENDED',
    HOLD: 'ON_HOLD',
    TRANSFER: 'TRANSFERRED',
    RTP_TIMEOUT: 'NO_RTP',
  },
  ON_HOLD: {
    UNHOLD: 'BRIDGED',
    BYE: 'ENDED',
    TRANSFER: 'TRANSFERRED',
  },
  TRANSFERRED: {
    BYE: 'ENDED',
    ERROR: 'FAILED',
  },
  ENDED: {},
  FAILED: {},
  NO_ANSWER: {},
  BUSY: {},
  TIMEOUT: {},
  CANCELLED: {},
  NO_RTP: {},
};

const TIMERS_BY_STATE: Partial<Record<CallState, Array<{ type: string; durationMs: number }>>> = {
  QUEUED: [{ type: 'QUEUE_TIMEOUT', durationMs: 60000 }],
  RESERVED: [{ type: 'RESERVE_TIMEOUT', durationMs: 5000 }],
  ORIGINATING: [{ type: 'ORIGINATE_TIMEOUT', durationMs: 60000 }],
  RINGING: [
    { type: 'RING_TIMEOUT', durationMs: 45000 },
    { type: 'RTP_WATCHDOG', durationMs: 5000 },
  ],
  EARLY_MEDIA: [
    { type: 'RING_TIMEOUT', durationMs: 45000 },
    { type: 'RTP_WATCHDOG', durationMs: 3000 },
  ],
  ANSWERED: [{ type: 'AMD_TIMEOUT', durationMs: 5000 }],
  AMD_HUMAN: [{ type: 'AGENT_CONNECT_TIMEOUT', durationMs: 30000 }],
  WAITING_AGENT: [{ type: 'AGENT_WAIT_TIMEOUT', durationMs: 120000 }],
  AGENT_RINGING: [{ type: 'AGENT_RING_TIMEOUT', durationMs: 20000 }],
  BRIDGED: [{ type: 'RTP_WATCHDOG', durationMs: 30000 }],
};

const CANCEL_TIMERS_ON_STATE: Partial<Record<CallState, string[]>> = {
  RINGING: ['ORIGINATE_TIMEOUT', 'RESERVE_TIMEOUT', 'QUEUE_TIMEOUT'],
  ANSWERED: ['RING_TIMEOUT', 'RTP_WATCHDOG'],
  AMD_HUMAN: ['AMD_TIMEOUT'],
  AMD_MACHINE: ['AMD_TIMEOUT'],
  BRIDGED: ['AGENT_RING_TIMEOUT', 'AGENT_CONNECT_TIMEOUT', 'AGENT_WAIT_TIMEOUT'],
  ENDED: ['ALL'],
  FAILED: ['ALL'],
  NO_ANSWER: ['ALL'],
  BUSY: ['ALL'],
  TIMEOUT: ['ALL'],
  CANCELLED: ['ALL'],
  NO_RTP: ['ALL'],
};

export class StateMachine {
  private attemptRepo: AttemptRepository;

  constructor(attemptRepo: AttemptRepository) {
    this.attemptRepo = attemptRepo;
  }

  async transition(
    attemptId: string,
    event: CallEvent,
    data?: Record<string, unknown>
  ): Promise<TransitionResult> {
    const attempt = await this.attemptRepo.findById(attemptId);
    if (!attempt) {
      logger.error({ attemptId }, 'Attempt not found for transition');
      return {
        success: false,
        fromState: 'QUEUED' as CallState,
        toState: 'QUEUED' as CallState,
        timersCreated: [],
        timersCancelled: [],
      };
    }

    const currentState = attempt.state as CallState;
    const transitions = STATE_TRANSITIONS[currentState];
    const newState = transitions?.[event];

    if (!newState) {
      logger.debug({ attemptId, currentState, event }, 'No transition defined (ignored)');
      return {
        success: true,
        fromState: currentState,
        toState: currentState,
        timersCreated: [],
        timersCancelled: [],
      };
    }

    // Build updates based on new state
    const updates: Record<string, unknown> = {};
    const now = new Date().toISOString();

    switch (newState) {
      case 'ORIGINATING':
        updates.originate_at = now;
        break;
      case 'RINGING':
        updates.ring_at = now;
        break;
      case 'ANSWERED':
        updates.answer_at = now;
        break;
      case 'BRIDGED':
        updates.bridge_at = now;
        break;
      case 'ENDED':
      case 'FAILED':
      case 'NO_ANSWER':
      case 'BUSY':
      case 'TIMEOUT':
      case 'CANCELLED':
      case 'NO_RTP':
        updates.end_at = now;
        if (data?.sipCode) updates.sip_final_code = data.sipCode;
        if (data?.sipReason) updates.sip_final_reason = data.sipReason;
        break;
    }

    // AMD result
    if (data?.amdResult) {
      updates.amd_result = data.amdResult;
    }

    // Update state in database
    await this.attemptRepo.updateState(attemptId, newState, updates);

    // Log transition event
    await this.attemptRepo.logEvent(attemptId, event, currentState, newState, data);

    // Handle timers
    const timersCancelled = await this.cancelTimers(attemptId, newState);
    const timersCreated = await this.createTimers(attemptId, newState);

    logger.info({ attemptId, fromState: currentState, toState: newState, event }, 'State transition');

    return {
      success: true,
      fromState: currentState,
      toState: newState,
      timersCreated,
      timersCancelled,
    };
  }

  private useApi(): boolean {
    return !!(config.dialerApi.url && config.dialerApi.key);
  }

  private async cancelTimers(attemptId: string, newState: CallState): Promise<string[]> {
    const timerTypes = CANCEL_TIMERS_ON_STATE[newState];
    if (!timerTypes) return [];

    if (this.useApi()) {
      const api = getApiClient();

      // Cancel all timers for this attempt
      if (timerTypes.includes('ALL')) {
        const { error } = await api.cancelTimers(attemptId);
        if (error) {
          logger.error({ error, attemptId }, 'Failed to cancel timers via API');
        }
        return ['ALL'];
      }

      const results = await Promise.all(timerTypes.map(async (timerType) => {
        const { error } = await api.cancelTimers(attemptId, timerType);
        if (error) {
          logger.error({ error, attemptId, timerType }, 'Failed to cancel timer via API');
          return false;
        }
        return true;
      }));

      return results.some(Boolean) ? timerTypes : [];
    }

    const client = getSupabaseClient();

    if (timerTypes.includes('ALL')) {
      await client
        .from('call_attempt_timers')
        .update({ cancelled: true })
        .eq('attempt_id', attemptId)
        .eq('fired', false);
      return ['ALL'];
    }

    await client
      .from('call_attempt_timers')
      .update({ cancelled: true })
      .eq('attempt_id', attemptId)
      .eq('fired', false)
      .in('timer_type', timerTypes);

    return timerTypes;
  }

  private async createTimers(attemptId: string, newState: CallState): Promise<string[]> {
    const timers = TIMERS_BY_STATE[newState];
    if (!timers) return [];

    const timerRecords = timers.map(t => ({
      attempt_id: attemptId,
      timer_type: t.type,
      fires_at: new Date(Date.now() + t.durationMs).toISOString(),
      fired: false,
      cancelled: false,
    }));

    if (this.useApi()) {
      const api = getApiClient();

      const results = await Promise.all(timerRecords.map(async (timer) => {
        const { error } = await api.createTimer(timer);
        if (error) {
          logger.error({ error, attemptId, timerType: timer.timer_type }, 'Failed to create timer via API');
          return false;
        }
        return true;
      }));

      return results.some(Boolean) ? timers.map(t => t.type) : [];
    }

    const client = getSupabaseClient();
    const { error } = await client.from('call_attempt_timers').insert(timerRecords);

    if (error) {
      logger.error({ error, attemptId }, 'Failed to create timers');
      return [];
    }

    return timers.map(t => t.type);
  }
}
