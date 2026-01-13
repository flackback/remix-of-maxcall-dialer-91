import dotenv from 'dotenv';

dotenv.config();

export const config = {
  supabase: {
    url: process.env.SUPABASE_URL || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },
  asterisk: {
    host: process.env.ASTERISK_HOST || '127.0.0.1',
    port: parseInt(process.env.ASTERISK_AMI_PORT || '5038', 10),
    username: process.env.ASTERISK_AMI_USER || 'admin',
    secret: process.env.ASTERISK_AMI_SECRET || '',
    context: process.env.ASTERISK_CONTEXT || 'from-dialer',
  },
  freeswitch: {
    host: process.env.FREESWITCH_HOST || '127.0.0.1',
    port: parseInt(process.env.FREESWITCH_ESL_PORT || '8021', 10),
    password: process.env.FREESWITCH_ESL_PASSWORD || 'ClueCon',
    context: process.env.FREESWITCH_CONTEXT || 'default',
  },
  engine: {
    schedulerIntervalMs: parseInt(process.env.SCHEDULER_INTERVAL_MS || '250', 10),
    executorIntervalMs: parseInt(process.env.EXECUTOR_INTERVAL_MS || '100', 10),
    timerProcessorIntervalMs: parseInt(process.env.TIMER_PROCESSOR_INTERVAL_MS || '500', 10),
    maxConcurrentOriginates: parseInt(process.env.MAX_CONCURRENT_ORIGINATES || '50', 10),
  },
  voiceAdapter: process.env.VOICE_ADAPTER || 'mock',
  logLevel: process.env.LOG_LEVEL || 'info',
  nodeEnv: process.env.NODE_ENV || 'development',
};

export function validateConfig(): void {
  if (!config.supabase.url) throw new Error('SUPABASE_URL is required');
  if (!config.supabase.serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
}
