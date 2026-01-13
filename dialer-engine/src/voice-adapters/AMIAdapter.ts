import * as net from 'net';
import { VoiceAdapter, VoiceAdapterConfig } from './VoiceAdapter';
import { OriginateParams } from '../types';
import { createChildLogger } from '../utils/Logger';
import { VoiceEvent } from '../utils/EventEmitter';

const logger = createChildLogger('AMIAdapter');

interface AMIConfig extends VoiceAdapterConfig {
  username: string;
  secret: string;
  context: string;
}

interface AMIEvent {
  Event?: string;
  ActionID?: string;
  Response?: string;
  Message?: string;
  Uniqueid?: string;
  Channel?: string;
  ChannelState?: string;
  ChannelStateDesc?: string;
  CallerIDNum?: string;
  CallerIDName?: string;
  ConnectedLineNum?: string;
  Cause?: string;
  'Cause-txt'?: string;
  [key: string]: string | undefined;
}

export class AMIAdapter extends VoiceAdapter {
  private socket: net.Socket | null = null;
  private buffer: string = '';
  private actionCallbacks: Map<string, (event: AMIEvent) => void> = new Map();
  private actionIdCounter: number = 0;

  constructor(config: AMIConfig) {
    super(config);
  }

  private get amiConfig(): AMIConfig {
    return this.config as AMIConfig;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      logger.info({ host: this.config.host, port: this.config.port }, 'Connecting to AMI');

      this.socket = net.createConnection({
        host: this.config.host,
        port: this.config.port,
      });

      this.socket.setEncoding('utf8');

      this.socket.on('connect', async () => {
        logger.info('TCP connection established');
        try {
          await this.login();
          this.connected = true;
          logger.info('AMI login successful');
          resolve();
        } catch (error) {
          reject(error);
        }
      });

      this.socket.on('data', (data: string) => {
        this.handleData(data);
      });

      this.socket.on('close', () => {
        logger.warn('AMI connection closed');
        this.connected = false;
        this.scheduleReconnect();
      });

      this.socket.on('error', (error) => {
        logger.error({ error }, 'AMI socket error');
        this.connected = false;
        reject(error);
      });
    });
  }

  async disconnect(): Promise<void> {
    if (this.socket) {
      await this.sendAction('Logoff', {});
      this.socket.destroy();
      this.socket = null;
    }
    this.connected = false;
    logger.info('AMI disconnected');
  }

  private async login(): Promise<void> {
    const response = await this.sendAction('Login', {
      Username: this.amiConfig.username,
      Secret: this.amiConfig.secret,
    });

    if (response.Response !== 'Success') {
      throw new Error(`AMI login failed: ${response.Message}`);
    }
  }

  private sendAction(action: string, params: Record<string, string>): Promise<AMIEvent> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Not connected'));
        return;
      }

      const actionId = `${Date.now()}-${++this.actionIdCounter}`;
      
      let message = `Action: ${action}\r\nActionID: ${actionId}\r\n`;
      for (const [key, value] of Object.entries(params)) {
        message += `${key}: ${value}\r\n`;
      }
      message += '\r\n';

      this.actionCallbacks.set(actionId, resolve);

      // Timeout for action response
      setTimeout(() => {
        if (this.actionCallbacks.has(actionId)) {
          this.actionCallbacks.delete(actionId);
          reject(new Error(`Action ${action} timed out`));
        }
      }, 10000);

      this.socket.write(message);
      logger.trace({ action, actionId }, 'Sent AMI action');
    });
  }

  private handleData(data: string): void {
    this.buffer += data;
    
    // Split by double CRLF (message separator)
    const messages = this.buffer.split('\r\n\r\n');
    this.buffer = messages.pop() || '';

    for (const msg of messages) {
      if (!msg.trim()) continue;
      
      const event = this.parseMessage(msg);
      this.handleEvent(event);
    }
  }

  private parseMessage(message: string): AMIEvent {
    const event: AMIEvent = {};
    const lines = message.split('\r\n');

    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim();
        event[key] = value;
      }
    }

    return event;
  }

  private handleEvent(event: AMIEvent): void {
    // Handle action responses
    if (event.ActionID && event.Response) {
      const callback = this.actionCallbacks.get(event.ActionID);
      if (callback) {
        this.actionCallbacks.delete(event.ActionID);
        callback(event);
        return;
      }
    }

    // Handle async events
    if (event.Event) {
      this.processEvent(event);
    }
  }

  private processEvent(event: AMIEvent): void {
    const correlationId = this.extractCorrelationId(event);
    if (!correlationId) return;

    let voiceEvent: VoiceEvent | null = null;

    switch (event.Event) {
      case 'OriginateResponse':
        voiceEvent = {
          type: 'ORIGINATE_RESPONSE',
          correlationId,
          data: event,
        };
        break;

      case 'Newchannel':
        voiceEvent = {
          type: 'DIAL',
          correlationId,
          data: event,
        };
        break;

      case 'Ringing':
        voiceEvent = {
          type: 'RING',
          correlationId,
          sipCode: 180,
          data: event,
        };
        break;

      case 'Answer':
        voiceEvent = {
          type: 'ANSWER',
          correlationId,
          sipCode: 200,
          data: event,
        };
        break;

      case 'Bridge':
      case 'BridgeEnter':
        voiceEvent = {
          type: 'BRIDGE',
          correlationId,
          data: event,
        };
        break;

      case 'Hangup':
        const sipCode = this.mapCauseToSipCode(event.Cause || '0');
        voiceEvent = {
          type: 'HANGUP',
          correlationId,
          sipCode,
          sipReason: event['Cause-txt'],
          data: event,
        };
        break;

      case 'VarSet':
        if (event.Variable === 'AMD_STATUS') {
          voiceEvent = {
            type: 'AMD_RESULT',
            correlationId,
            amdResult: event.Value === 'HUMAN' ? 'HUMAN' : 
                       event.Value === 'MACHINE' ? 'MACHINE' : 'UNKNOWN',
            data: event,
          };
        }
        break;
    }

    if (voiceEvent) {
      logger.debug({ event: voiceEvent.type, correlationId }, 'Emitting voice event');
      this.emitVoiceEvent(voiceEvent);
    }
  }

  private extractCorrelationId(event: AMIEvent): string | null {
    // Try to extract from channel variables or Uniqueid
    if (event.CORRELATION_ID) return event.CORRELATION_ID;
    if (event.Uniqueid) return event.Uniqueid;
    return null;
  }

  private mapCauseToSipCode(cause: string): number {
    const causeMap: Record<string, number> = {
      '0': 0,     // Not defined
      '1': 404,   // Unallocated number
      '16': 200,  // Normal clearing
      '17': 486,  // User busy
      '18': 480,  // No user responding
      '19': 480,  // No answer
      '21': 603,  // Call rejected
      '27': 502,  // Destination out of order
      '34': 503,  // No circuit available
      '38': 503,  // Network out of order
    };
    return causeMap[cause] || 500;
  }

  async originate(params: OriginateParams): Promise<{ success: boolean; error?: string }> {
    try {
      const variables: string[] = [
        `CORRELATION_ID=${params.correlationId}`,
        ...(params.variables ? Object.entries(params.variables).map(([k, v]) => `${k}=${v}`) : []),
      ];

      const response = await this.sendAction('Originate', {
        Channel: `PJSIP/${params.destination}@${params.trunk}`,
        Context: params.context || this.amiConfig.context,
        Exten: params.destination,
        Priority: '1',
        CallerID: params.callerIdName 
          ? `"${params.callerIdName}" <${params.callerId}>` 
          : params.callerId,
        Variable: variables.join(','),
        Async: 'true',
        Timeout: '60000',
      });

      if (response.Response === 'Success') {
        logger.info({ correlationId: params.correlationId, destination: params.destination }, 'Originate sent');
        return { success: true };
      } else {
        logger.error({ response, params }, 'Originate failed');
        return { success: false, error: response.Message };
      }
    } catch (error) {
      logger.error({ error, params }, 'Originate error');
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async hangup(channelId: string): Promise<void> {
    await this.sendAction('Hangup', { Channel: channelId });
    logger.info({ channelId }, 'Hangup sent');
  }

  async getActiveChannels(): Promise<string[]> {
    const response = await this.sendAction('CoreShowChannels', {});
    // Parse active channels from response
    return [];
  }
}
