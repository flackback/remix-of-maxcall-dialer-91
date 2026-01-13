import { AttemptRepository } from '../database/AttemptRepository';
import { StateMachine } from './StateMachine';
import { RouteHealthManager } from '../health/RouteHealthManager';
import { VoiceAdapter } from '../voice-adapters/VoiceAdapter';
import { VoiceEvent } from '../utils/EventEmitter';
import { CallEvent } from '../types';
import { createChildLogger } from '../utils/Logger';

const logger = createChildLogger('Reconciler');

export class Reconciler {
  private attemptRepo: AttemptRepository;
  private stateMachine: StateMachine;
  private healthManager: RouteHealthManager;
  private voiceAdapter: VoiceAdapter;
  private running: boolean = false;

  constructor(
    attemptRepo: AttemptRepository,
    stateMachine: StateMachine,
    healthManager: RouteHealthManager,
    voiceAdapter: VoiceAdapter
  ) {
    this.attemptRepo = attemptRepo;
    this.stateMachine = stateMachine;
    this.healthManager = healthManager;
    this.voiceAdapter = voiceAdapter;
  }

  start(): void {
    if (this.running) return;
    
    this.running = true;
    
    // Subscribe to voice adapter events
    this.voiceAdapter.on('event', (event: VoiceEvent) => {
      this.handleEvent(event).catch(error => {
        logger.error({ error, event }, 'Error handling voice event');
      });
    });

    logger.info('Reconciler started (event-driven)');
  }

  stop(): void {
    this.voiceAdapter.removeAllListeners('event');
    this.running = false;
    logger.info('Reconciler stopped');
  }

  private async handleEvent(event: VoiceEvent): Promise<void> {
    logger.debug({ eventType: event.type, correlationId: event.correlationId }, 'Received voice event');

    // Find attempt by correlation ID
    const attempt = await this.attemptRepo.findByCorrelationId(event.correlationId);
    if (!attempt) {
      logger.warn({ correlationId: event.correlationId }, 'Attempt not found for voice event');
      return;
    }

    // Map voice event to state machine event
    const stateEvent = this.mapToStateEvent(event);
    if (!stateEvent) {
      logger.debug({ eventType: event.type }, 'No state event mapping');
      return;
    }

    // Execute state transition
    const result = await this.stateMachine.transition(attempt.id, stateEvent, {
      sipCode: event.sipCode,
      sipReason: event.sipReason,
      amdResult: event.amdResult,
      eventData: event.data,
    });

    // Handle health updates based on outcome
    if (result.success && attempt.trunk_id) {
      this.updateRouteHealth(attempt.trunk_id, result.toState, event.sipCode);
    }

    // Append SIP code if present
    if (event.sipCode && event.sipCode > 0) {
      await this.attemptRepo.appendSipCode(attempt.id, event.sipCode);
    }

    logger.info({
      attemptId: attempt.id,
      eventType: event.type,
      fromState: result.fromState,
      toState: result.toState,
    }, 'Processed voice event');
  }

  private mapToStateEvent(event: VoiceEvent): CallEvent | null {
    switch (event.type) {
      case 'DIAL':
        return 'SIP_100';

      case 'RING':
        if (event.sipCode === 183) return 'SIP_183';
        return 'SIP_180';

      case 'ANSWER':
        return 'SIP_200';

      case 'HANGUP':
        if (!event.sipCode) return 'BYE';
        if (event.sipCode === 200 || event.sipCode === 0) return 'BYE';
        if (event.sipCode >= 400 && event.sipCode < 500) return 'SIP_4XX';
        if (event.sipCode >= 500 && event.sipCode < 600) return 'SIP_5XX';
        if (event.sipCode >= 600) return 'SIP_6XX';
        return 'BYE';

      case 'BRIDGE':
        return 'BRIDGE';

      case 'RTP_START':
        return 'RTP_STARTED';

      case 'RTP_TIMEOUT':
        return 'RTP_TIMEOUT';

      case 'AMD_RESULT':
        if (event.amdResult === 'HUMAN') return 'AMD_HUMAN';
        if (event.amdResult === 'MACHINE') return 'AMD_MACHINE';
        return 'AMD_TIMEOUT';

      default:
        return null;
    }
  }

  private updateRouteHealth(trunkId: string, toState: string, sipCode?: number): void {
    // Penalize on failures
    if (['FAILED', 'NO_RTP', 'TIMEOUT'].includes(toState)) {
      const penalty = toState === 'NO_RTP' ? 10 : toState === 'FAILED' ? 5 : 3;
      this.healthManager.penalize(trunkId, penalty, `State: ${toState}, SIP: ${sipCode}`);
    }

    // Recover on success
    if (toState === 'ENDED' && sipCode === 200) {
      this.healthManager.recover(trunkId, 0.5);
    }

    // Penalize on SIP errors
    if (sipCode && sipCode >= 500) {
      this.healthManager.penalize(trunkId, 3, `SIP ${sipCode}`);
    }
  }
}
