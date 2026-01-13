import * as net from 'net';
import { VoiceAdapter, VoiceAdapterConfig } from './VoiceAdapter';
import { OriginateParams } from '../types';
import { createChildLogger } from '../utils/Logger';
import { VoiceEvent } from '../utils/EventEmitter';

const logger = createChildLogger('ESLAdapter');

interface ESLConfig extends VoiceAdapterConfig {
  password: string;
  context: string;
}

interface ESLEvent {
  'Event-Name'?: string;
  'Unique-ID'?: string;
  'Channel-Call-UUID'?: string;
  'variable_correlation_id'?: string;
  'Answer-State'?: string;
  'Channel-State'?: string;
  'Hangup-Cause'?: string;
  [key: string]: string | undefined;
}

export class ESLAdapter extends VoiceAdapter {
  private socket: net.Socket | null = null;
  private buffer: string = '';
  private authenticated: boolean = false;

  constructor(config: ESLConfig) {
    super(config);
  }

  private get eslConfig(): ESLConfig {
    return this.config as ESLConfig;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      logger.info({ host: this.config.host, port: this.config.port }, 'Connecting to FreeSWITCH ESL');

      this.socket = net.createConnection({
        host: this.config.host,
        port: this.config.port,
      });

      this.socket.setEncoding('utf8');

      this.socket.on('connect', () => {
        logger.info('ESL TCP connection established');
      });

      this.socket.on('data', (data: string) => {
        this.handleData(data, resolve, reject);
      });

      this.socket.on('close', () => {
        logger.warn('ESL connection closed');
        this.connected = false;
        this.authenticated = false;
        this.scheduleReconnect();
      });

      this.socket.on('error', (error) => {
        logger.error({ error }, 'ESL socket error');
        this.connected = false;
        reject(error);
      });
    });
  }

  async disconnect(): Promise<void> {
    if (this.socket) {
      this.sendCommand('exit');
      this.socket.destroy();
      this.socket = null;
    }
    this.connected = false;
    this.authenticated = false;
    logger.info('ESL disconnected');
  }

  private sendCommand(command: string): void {
    if (!this.socket) return;
    this.socket.write(`${command}\n\n`);
    logger.trace({ command }, 'Sent ESL command');
  }

  private handleData(data: string, resolve?: (value: void) => void, reject?: (reason: Error) => void): void {
    this.buffer += data;

    // Split by double newline
    const messages = this.buffer.split('\n\n');
    this.buffer = messages.pop() || '';

    for (const msg of messages) {
      if (!msg.trim()) continue;
      
      const event = this.parseMessage(msg);
      this.handleEvent(event, resolve, reject);
    }
  }

  private parseMessage(message: string): ESLEvent {
    const event: ESLEvent = {};
    const lines = message.split('\n');

    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim();
        const value = decodeURIComponent(line.substring(colonIndex + 1).trim());
        event[key] = value;
      }
    }

    return event;
  }

  private handleEvent(event: ESLEvent, resolve?: (value: void) => void, reject?: (reason: Error) => void): void {
    // Handle auth challenge
    if (event['Content-Type'] === 'auth/request') {
      this.sendCommand(`auth ${this.eslConfig.password}`);
      return;
    }

    // Handle auth response
    if (event['Reply-Text']?.includes('+OK')) {
      if (!this.authenticated) {
        this.authenticated = true;
        this.connected = true;
        logger.info('ESL authentication successful');
        
        // Subscribe to events
        this.sendCommand('event plain CHANNEL_CREATE CHANNEL_ANSWER CHANNEL_HANGUP CHANNEL_BRIDGE CUSTOM sofia::amd');
        
        resolve?.();
      }
      return;
    }

    if (event['Reply-Text']?.includes('-ERR')) {
      reject?.(new Error('ESL authentication failed'));
      return;
    }

    // Handle channel events
    if (event['Event-Name']) {
      this.processEvent(event);
    }
  }

  private processEvent(event: ESLEvent): void {
    const correlationId = event['variable_correlation_id'] || event['Channel-Call-UUID'] || event['Unique-ID'];
    if (!correlationId) return;

    let voiceEvent: VoiceEvent | null = null;

    switch (event['Event-Name']) {
      case 'CHANNEL_CREATE':
        voiceEvent = {
          type: 'DIAL',
          correlationId,
          data: event,
        };
        break;

      case 'CHANNEL_PROGRESS':
        voiceEvent = {
          type: 'RING',
          correlationId,
          sipCode: 180,
          data: event,
        };
        break;

      case 'CHANNEL_PROGRESS_MEDIA':
        voiceEvent = {
          type: 'RING',
          correlationId,
          sipCode: 183,
          data: event,
        };
        break;

      case 'CHANNEL_ANSWER':
        voiceEvent = {
          type: 'ANSWER',
          correlationId,
          sipCode: 200,
          data: event,
        };
        break;

      case 'CHANNEL_BRIDGE':
        voiceEvent = {
          type: 'BRIDGE',
          correlationId,
          data: event,
        };
        break;

      case 'CHANNEL_HANGUP':
        const sipCode = this.mapHangupCauseToSipCode(event['Hangup-Cause'] || 'NORMAL_CLEARING');
        voiceEvent = {
          type: 'HANGUP',
          correlationId,
          sipCode,
          sipReason: event['Hangup-Cause'],
          data: event,
        };
        break;

      case 'CUSTOM':
        if (event['Event-Subclass'] === 'sofia::amd') {
          voiceEvent = {
            type: 'AMD_RESULT',
            correlationId,
            amdResult: event['AMD-Result'] === 'HUMAN' ? 'HUMAN' :
                       event['AMD-Result'] === 'MACHINE' ? 'MACHINE' : 'UNKNOWN',
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

  private mapHangupCauseToSipCode(cause: string): number {
    const causeMap: Record<string, number> = {
      'NORMAL_CLEARING': 200,
      'USER_BUSY': 486,
      'NO_USER_RESPONSE': 480,
      'NO_ANSWER': 480,
      'CALL_REJECTED': 603,
      'NUMBER_CHANGED': 410,
      'UNALLOCATED_NUMBER': 404,
      'DESTINATION_OUT_OF_ORDER': 502,
      'NETWORK_OUT_OF_ORDER': 503,
      'NORMAL_TEMPORARY_FAILURE': 503,
      'ORIGINATOR_CANCEL': 487,
    };
    return causeMap[cause] || 500;
  }

  async originate(params: OriginateParams): Promise<{ success: boolean; error?: string }> {
    try {
      const variables = [
        `correlation_id=${params.correlationId}`,
        `origination_caller_id_number=${params.callerId}`,
        ...(params.callerIdName ? [`origination_caller_id_name=${params.callerIdName}`] : []),
        ...(params.variables ? Object.entries(params.variables).map(([k, v]) => `${k}=${v}`) : []),
      ];

      const variableStr = variables.length > 0 ? `{${variables.join(',')}}` : '';
      const dialString = `${variableStr}sofia/gateway/${params.trunk}/${params.destination}`;
      
      const command = `bgapi originate ${dialString} &park()`;
      this.sendCommand(command);

      logger.info({ correlationId: params.correlationId, destination: params.destination }, 'Originate sent via ESL');
      return { success: true };
    } catch (error) {
      logger.error({ error, params }, 'Originate error');
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async hangup(channelId: string): Promise<void> {
    this.sendCommand(`api uuid_kill ${channelId}`);
    logger.info({ channelId }, 'Hangup sent via ESL');
  }

  async getActiveChannels(): Promise<string[]> {
    this.sendCommand('api show channels');
    return [];
  }
}
