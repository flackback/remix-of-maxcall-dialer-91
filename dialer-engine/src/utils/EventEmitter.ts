import { EventEmitter } from 'events';

export interface EngineEvent {
  type: string;
  timestamp: Date;
  data: Record<string, unknown>;
}

export interface VoiceEvent {
  type: 'ORIGINATE_RESPONSE' | 'DIAL' | 'RING' | 'ANSWER' | 'HANGUP' | 'BRIDGE' | 'RTP_START' | 'RTP_TIMEOUT' | 'AMD_RESULT';
  correlationId: string;
  sipCode?: number;
  sipReason?: string;
  amdResult?: 'HUMAN' | 'MACHINE' | 'UNKNOWN';
  data: Record<string, unknown>;
}

class EngineEventBus extends EventEmitter {
  private static instance: EngineEventBus;

  private constructor() {
    super();
    this.setMaxListeners(50);
  }

  static getInstance(): EngineEventBus {
    if (!EngineEventBus.instance) {
      EngineEventBus.instance = new EngineEventBus();
    }
    return EngineEventBus.instance;
  }

  emitEngineEvent(event: EngineEvent): void {
    this.emit('engine:event', event);
    this.emit(`engine:${event.type}`, event);
  }

  emitVoiceEvent(event: VoiceEvent): void {
    this.emit('voice:event', event);
    this.emit(`voice:${event.type}`, event);
  }
}

export const eventBus = EngineEventBus.getInstance();
