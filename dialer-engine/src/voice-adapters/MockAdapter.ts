import { VoiceAdapter, VoiceAdapterConfig } from './VoiceAdapter';
import { OriginateParams } from '../types';
import { createChildLogger } from '../utils/Logger';

const logger = createChildLogger('MockAdapter');

export class MockAdapter extends VoiceAdapter {
  private activeChannels: Map<string, { correlationId: string; startedAt: Date }> = new Map();

  constructor(config: VoiceAdapterConfig) {
    super(config);
  }

  async connect(): Promise<void> {
    this.connected = true;
    logger.info('MockAdapter connected (simulation mode)');
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.activeChannels.clear();
    logger.info('MockAdapter disconnected');
  }

  async originate(params: OriginateParams): Promise<{ success: boolean; error?: string }> {
    logger.info({ correlationId: params.correlationId, destination: params.destination }, 'Mock originate');

    // Simulate call flow
    this.simulateCallFlow(params);

    return { success: true };
  }

  private simulateCallFlow(params: OriginateParams): void {
    const correlationId = params.correlationId;
    this.activeChannels.set(correlationId, { correlationId, startedAt: new Date() });

    // Emit events with realistic timing
    setTimeout(() => {
      this.emitVoiceEvent({
        type: 'DIAL',
        correlationId,
        data: { destination: params.destination },
      });
    }, 100);

    setTimeout(() => {
      this.emitVoiceEvent({
        type: 'RING',
        correlationId,
        sipCode: 180,
        data: {},
      });
    }, 500);

    // Random outcome
    const outcome = Math.random();
    
    if (outcome < 0.6) {
      // 60% - Answer
      setTimeout(() => {
        this.emitVoiceEvent({
          type: 'ANSWER',
          correlationId,
          sipCode: 200,
          data: {},
        });

        // AMD result after answer
        setTimeout(() => {
          this.emitVoiceEvent({
            type: 'AMD_RESULT',
            correlationId,
            amdResult: Math.random() < 0.85 ? 'HUMAN' : 'MACHINE',
            data: {},
          });
        }, 2000);

        // Hangup after some time
        setTimeout(() => {
          this.emitVoiceEvent({
            type: 'HANGUP',
            correlationId,
            sipCode: 200,
            sipReason: 'Normal Clearing',
            data: {},
          });
          this.activeChannels.delete(correlationId);
        }, 10000 + Math.random() * 50000);
      }, 3000 + Math.random() * 5000);
      
    } else if (outcome < 0.8) {
      // 20% - No answer
      setTimeout(() => {
        this.emitVoiceEvent({
          type: 'HANGUP',
          correlationId,
          sipCode: 480,
          sipReason: 'No Answer',
          data: {},
        });
        this.activeChannels.delete(correlationId);
      }, 30000);
      
    } else if (outcome < 0.9) {
      // 10% - Busy
      setTimeout(() => {
        this.emitVoiceEvent({
          type: 'HANGUP',
          correlationId,
          sipCode: 486,
          sipReason: 'User Busy',
          data: {},
        });
        this.activeChannels.delete(correlationId);
      }, 2000);
      
    } else {
      // 10% - Failed
      setTimeout(() => {
        this.emitVoiceEvent({
          type: 'HANGUP',
          correlationId,
          sipCode: 503,
          sipReason: 'Service Unavailable',
          data: {},
        });
        this.activeChannels.delete(correlationId);
      }, 1000);
    }
  }

  async hangup(channelId: string): Promise<void> {
    if (this.activeChannels.has(channelId)) {
      this.activeChannels.delete(channelId);
      this.emitVoiceEvent({
        type: 'HANGUP',
        correlationId: channelId,
        sipCode: 200,
        sipReason: 'Normal Clearing',
        data: {},
      });
    }
    logger.info({ channelId }, 'Mock hangup');
  }

  async getActiveChannels(): Promise<string[]> {
    return Array.from(this.activeChannels.keys());
  }
}
