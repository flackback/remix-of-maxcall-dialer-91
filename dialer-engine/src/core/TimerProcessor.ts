import { getSupabaseClient } from '../database/SupabaseClient';
import { getApiClient } from '../database/ApiClient';
import { config } from '../config';
import { StateMachine } from './StateMachine';
import { CallEvent } from '../types';
import { createChildLogger } from '../utils/Logger';

const logger = createChildLogger('TimerProcessor');

interface TimerProcessorConfig {
  intervalMs: number;
}

interface ExpiredTimer {
  timer_id: string;
  attempt_id: string;
  timer_type: string;
  current_state: string;
}

export class TimerProcessor {
  private config: TimerProcessorConfig;
  private stateMachine: StateMachine;
  private interval: NodeJS.Timeout | null = null;
  private running: boolean = false;

  constructor(config: TimerProcessorConfig, stateMachine: StateMachine) {
    this.config = config;
    this.stateMachine = stateMachine;
  }

  start(): void {
    if (this.running) return;
    
    this.running = true;
    this.interval = setInterval(() => this.tick(), this.config.intervalMs);
    logger.info({ intervalMs: this.config.intervalMs }, 'TimerProcessor started');
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.running = false;
    logger.info('TimerProcessor stopped');
  }

  private async tick(): Promise<void> {
    try {
      const useApi = !!(config.dialerApi.url && config.dialerApi.key);

      let expiredTimers: ExpiredTimer[] = [];

      if (useApi) {
        const api = getApiClient();
        const { data, error } = await api.processExpiredTimers();

        if (error) {
          logger.error({ error }, 'Failed to fetch expired timers via API');
          return;
        }

        expiredTimers = (data || []) as ExpiredTimer[];
      } else {
        const client = getSupabaseClient();

        // Use database function to atomically get and mark expired timers
        const { data, error } = await client.rpc('process_expired_timers');

        if (error) {
          logger.error({ error }, 'Failed to fetch expired timers');
          return;
        }

        expiredTimers = (data || []) as ExpiredTimer[];
      }

      if (expiredTimers.length === 0) {
        return;
      }

      // Process each expired timer
      for (const timer of expiredTimers) {
        await this.processTimer(timer);
      }

      logger.info({ count: expiredTimers.length }, 'Processed expired timers');
    } catch (error) {
      logger.error({ error }, 'TimerProcessor tick error');
    }
  }

  private async processTimer(timer: ExpiredTimer): Promise<void> {
    const event = this.mapTimerToEvent(timer.timer_type, timer.current_state);
    
    if (!event) {
      logger.warn({ timerType: timer.timer_type, state: timer.current_state }, 'No event mapping for timer');
      return;
    }

    try {
      await this.stateMachine.transition(timer.attempt_id, event, {
        timerType: timer.timer_type,
        triggeredAt: new Date().toISOString(),
      });

      logger.debug({
        attemptId: timer.attempt_id,
        timerType: timer.timer_type,
        event,
      }, 'Timer triggered state transition');
    } catch (error) {
      logger.error({ error, timer }, 'Failed to process timer');
    }
  }

  private mapTimerToEvent(timerType: string, currentState: string): CallEvent | null {
    const mapping: Record<string, Record<string, CallEvent>> = {
      QUEUE_TIMEOUT: {
        QUEUED: 'TIMEOUT',
      },
      RESERVE_TIMEOUT: {
        RESERVED: 'TIMEOUT',
      },
      ORIGINATE_TIMEOUT: {
        ORIGINATING: 'TIMEOUT',
      },
      RING_TIMEOUT: {
        RINGING: 'TIMEOUT',
        EARLY_MEDIA: 'TIMEOUT',
      },
      RTP_WATCHDOG: {
        RINGING: 'RTP_TIMEOUT',
        EARLY_MEDIA: 'RTP_TIMEOUT',
        ANSWERED: 'RTP_TIMEOUT',
        BRIDGED: 'RTP_TIMEOUT',
      },
      AMD_TIMEOUT: {
        ANSWERED: 'AMD_TIMEOUT',
        AMD_PROCESSING: 'AMD_TIMEOUT',
      },
      AGENT_CONNECT_TIMEOUT: {
        AMD_HUMAN: 'TIMEOUT',
      },
      AGENT_WAIT_TIMEOUT: {
        WAITING_AGENT: 'TIMEOUT',
      },
      AGENT_RING_TIMEOUT: {
        AGENT_RINGING: 'TIMEOUT',
      },
    };

    return mapping[timerType]?.[currentState] || null;
  }
}
