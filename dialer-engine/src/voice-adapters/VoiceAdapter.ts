import { EventEmitter } from 'events';
import { OriginateParams } from '../types';
import { VoiceEvent } from '../utils/EventEmitter';

export interface VoiceAdapterConfig {
  host: string;
  port: number;
  [key: string]: unknown;
}

export abstract class VoiceAdapter extends EventEmitter {
  protected config: VoiceAdapterConfig;
  protected connected: boolean = false;
  protected reconnecting: boolean = false;

  constructor(config: VoiceAdapterConfig) {
    super();
    this.config = config;
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract originate(params: OriginateParams): Promise<{ success: boolean; error?: string }>;
  abstract hangup(channelId: string): Promise<void>;
  abstract getActiveChannels(): Promise<string[]>;

  isConnected(): boolean {
    return this.connected;
  }

  protected emitVoiceEvent(event: VoiceEvent): void {
    this.emit('event', event);
  }

  protected async scheduleReconnect(delayMs: number = 5000): Promise<void> {
    if (this.reconnecting) return;
    
    this.reconnecting = true;
    setTimeout(async () => {
      try {
        await this.connect();
        this.reconnecting = false;
      } catch (error) {
        this.reconnecting = false;
        this.scheduleReconnect(Math.min(delayMs * 2, 30000));
      }
    }, delayMs);
  }
}
