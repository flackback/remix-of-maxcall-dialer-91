import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config';
import { createChildLogger } from '../utils/Logger';

const logger = createChildLogger('SupabaseClient');

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    supabaseInstance = createClient(
      config.supabase.url,
      config.supabase.serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
    logger.info('Supabase client initialized');
  }
  return supabaseInstance;
}

export async function testConnection(): Promise<boolean> {
  try {
    const client = getSupabaseClient();
    const { error } = await client.from('accounts').select('id').limit(1);
    if (error) throw error;
    logger.info('Supabase connection test successful');
    return true;
  } catch (error) {
    logger.error({ error }, 'Supabase connection test failed');
    return false;
  }
}
