import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AsteriskRequest {
  action: 'originate' | 'hangup' | 'transfer' | 'monitor' | 'status' | 'redirect';
  carrier_id: string;
  call_id?: string;
  channel?: string;
  to?: string;
  from?: string;
  context?: string;
  exten?: string;
  priority?: number;
  variables?: Record<string, string>;
}

// Simple AMI client implementation
class AMIClient {
  private host: string;
  private port: number;
  private username: string;
  private secret: string;
  private actionId: number = 0;

  constructor(host: string, port: number, username: string, secret: string) {
    this.host = host;
    this.port = port;
    this.username = username;
    this.secret = secret;
  }

  private generateActionId(): string {
    return `${Date.now()}-${++this.actionId}`;
  }

  private formatAction(action: string, params: Record<string, string>): string {
    let message = `Action: ${action}\r\n`;
    message += `ActionID: ${this.generateActionId()}\r\n`;
    
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        message += `${key}: ${value}\r\n`;
      }
    }
    
    message += '\r\n';
    return message;
  }

  // Note: In a real implementation, this would use TCP sockets
  // Since Deno Deploy doesn't support raw TCP, we'd need a proxy or different approach
  // This is a simulation for the edge function structure
  async sendAction(action: string, params: Record<string, string>): Promise<any> {
    console.log('AMI Action:', action, params);
    console.log('AMI Message:', this.formatAction(action, params));
    
    // In production, you would:
    // 1. Use a WebSocket proxy to AMI
    // 2. Or use an HTTP-to-AMI bridge
    // 3. Or use Asterisk's built-in ARI (Asterisk REST Interface)
    
    return {
      response: 'Success',
      actionid: this.generateActionId(),
      message: `Action ${action} queued`,
    };
  }

  async login(): Promise<any> {
    return this.sendAction('Login', {
      Username: this.username,
      Secret: this.secret,
    });
  }

  async originate(params: {
    channel: string;
    context: string;
    exten: string;
    priority: string;
    callerid?: string;
    variables?: Record<string, string>;
  }): Promise<any> {
    const actionParams: Record<string, string> = {
      Channel: params.channel,
      Context: params.context,
      Exten: params.exten,
      Priority: params.priority,
      Async: 'true',
    };

    if (params.callerid) {
      actionParams.CallerID = params.callerid;
    }

    if (params.variables) {
      for (const [key, value] of Object.entries(params.variables)) {
        actionParams[`Variable`] = `${key}=${value}`;
      }
    }

    return this.sendAction('Originate', actionParams);
  }

  async hangup(channel: string): Promise<any> {
    return this.sendAction('Hangup', { Channel: channel });
  }

  async redirect(channel: string, context: string, exten: string, priority: string): Promise<any> {
    return this.sendAction('Redirect', {
      Channel: channel,
      Context: context,
      Exten: exten,
      Priority: priority,
    });
  }

  async monitor(channel: string, filename: string): Promise<any> {
    return this.sendAction('Monitor', {
      Channel: channel,
      File: filename,
      Format: 'wav',
      Mix: 'true',
    });
  }

  async coreShowChannels(): Promise<any> {
    return this.sendAction('CoreShowChannels', {});
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const request: AsteriskRequest = await req.json();
    console.log('Asterisk AMI handler request:', request);

    // Fetch carrier config
    const { data: carrier, error: carrierError } = await supabase
      .from('telephony_carriers')
      .select('*')
      .eq('id', request.carrier_id)
      .single();

    if (carrierError || !carrier) {
      throw new Error('Carrier not found');
    }

    const config = carrier.config_json || {};
    const { host, port, username, secret, context: defaultContext } = config;

    if (!host || !username || !secret) {
      throw new Error('Asterisk AMI credentials not configured');
    }

    const ami = new AMIClient(host, parseInt(port || '5038'), username, secret);

    // Login first
    await ami.login();

    let result: any = {};

    switch (request.action) {
      case 'originate': {
        if (!request.to) throw new Error('Destination required');

        const channel = request.channel || `SIP/${request.to}`;
        const context = request.context || defaultContext || 'from-internal';
        
        const response = await ami.originate({
          channel,
          context,
          exten: request.to,
          priority: String(request.priority || 1),
          callerid: request.from,
          variables: request.variables,
        });

        result = {
          success: true,
          message: 'Call originated',
          channel,
          response,
        };

        console.log('Asterisk call originated to:', request.to);
        break;
      }

      case 'hangup': {
        if (!request.channel) throw new Error('Channel required');

        const response = await ami.hangup(request.channel);

        result = {
          success: true,
          message: 'Call hung up',
          response,
        };

        console.log('Asterisk call hung up:', request.channel);
        break;
      }

      case 'transfer':
      case 'redirect': {
        if (!request.channel || !request.to) throw new Error('Channel and destination required');

        const context = request.context || defaultContext || 'from-internal';
        const response = await ami.redirect(
          request.channel,
          context,
          request.to,
          String(request.priority || 1)
        );

        result = {
          success: true,
          message: 'Call transferred',
          response,
        };

        console.log('Asterisk call transferred:', request.channel, 'to', request.to);
        break;
      }

      case 'monitor': {
        if (!request.channel) throw new Error('Channel required');

        const filename = `recording_${Date.now()}`;
        const response = await ami.monitor(request.channel, filename);

        result = {
          success: true,
          message: 'Recording started',
          filename: `${filename}.wav`,
          response,
        };

        console.log('Asterisk recording started:', request.channel);
        break;
      }

      case 'status': {
        const response = await ami.coreShowChannels();

        result = {
          success: true,
          channels: response,
        };
        break;
      }

      default:
        throw new Error(`Unknown action: ${request.action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Asterisk AMI handler error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
