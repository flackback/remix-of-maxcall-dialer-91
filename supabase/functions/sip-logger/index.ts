import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SIPLog {
  account_id: string;
  carrier_id?: string;
  trunk_id?: string;
  session_id?: string;
  call_id?: string;
  log_level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  category: 'REGISTRATION' | 'INVITE' | 'BYE' | 'ICE' | 'SRTP' | 'CODEC' | 'AUTH' | 'TRANSPORT' | 'MEDIA' | 'GENERAL';
  message: string;
  sip_method?: string;
  sip_status_code?: number;
  sip_status_text?: string;
  sip_call_id?: string;
  sip_from?: string;
  sip_to?: string;
  ice_candidate?: string;
  ice_state?: string;
  sdp_type?: string;
  sdp_content?: string;
  error_code?: string;
  error_description?: string;
  stack_trace?: string;
  user_agent?: string;
  remote_address?: string;
  metadata_json?: Record<string, any>;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    console.log('[SIP Logger] Received:', JSON.stringify(body).substring(0, 500));

    // Support batch logs
    const logs: SIPLog[] = Array.isArray(body.logs) ? body.logs : [body];

    const processedLogs = [];
    const notifications = [];

    for (const log of logs) {
      // Validate required fields
      if (!log.account_id || !log.message || !log.category) {
        console.warn('[SIP Logger] Skipping invalid log:', log);
        continue;
      }

      // Ensure log_level is valid
      const validLevels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
      if (!validLevels.includes(log.log_level)) {
        log.log_level = 'INFO';
      }

      // Ensure category is valid
      const validCategories = ['REGISTRATION', 'INVITE', 'BYE', 'ICE', 'SRTP', 'CODEC', 'AUTH', 'TRANSPORT', 'MEDIA', 'GENERAL'];
      if (!validCategories.includes(log.category)) {
        log.category = 'GENERAL';
      }

      processedLogs.push({
        account_id: log.account_id,
        carrier_id: log.carrier_id || null,
        trunk_id: log.trunk_id || null,
        session_id: log.session_id || null,
        call_id: log.call_id || null,
        log_level: log.log_level,
        category: log.category,
        message: log.message,
        sip_method: log.sip_method || null,
        sip_status_code: log.sip_status_code || null,
        sip_status_text: log.sip_status_text || null,
        sip_call_id: log.sip_call_id || null,
        sip_from: log.sip_from || null,
        sip_to: log.sip_to || null,
        ice_candidate: log.ice_candidate || null,
        ice_state: log.ice_state || null,
        sdp_type: log.sdp_type || null,
        sdp_content: log.sdp_content || null,
        error_code: log.error_code || null,
        error_description: log.error_description || null,
        stack_trace: log.stack_trace || null,
        user_agent: log.user_agent || null,
        remote_address: log.remote_address || null,
        metadata_json: log.metadata_json || {},
      });

      // Create notifications for ERROR level logs
      if (log.log_level === 'ERROR') {
        const notificationType = log.category === 'REGISTRATION' ? 'SIP_ERROR' :
                                  log.category === 'AUTH' ? 'SIP_ERROR' :
                                  log.sip_status_code && log.sip_status_code >= 500 ? 'CARRIER_DOWN' :
                                  'QUALITY_ALERT';

        notifications.push({
          account_id: log.account_id,
          type: notificationType,
          title: `Erro SIP: ${log.category}`,
          message: log.message.substring(0, 200),
          severity: log.sip_status_code && log.sip_status_code >= 500 ? 'CRITICAL' : 'WARNING',
          related_entity_type: log.carrier_id ? 'carrier' : log.call_id ? 'call' : null,
          related_entity_id: log.carrier_id || log.call_id || null,
          metadata_json: {
            sip_status_code: log.sip_status_code,
            error_code: log.error_code,
            category: log.category,
          },
        });
      }
    }

    // Insert logs
    if (processedLogs.length > 0) {
      const { error: logsError } = await supabase
        .from('sip_webrtc_logs')
        .insert(processedLogs);

      if (logsError) {
        console.error('[SIP Logger] Error inserting logs:', logsError);
        throw logsError;
      }
      console.log(`[SIP Logger] Inserted ${processedLogs.length} logs`);
    }

    // Insert notifications
    if (notifications.length > 0) {
      const { error: notifError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (notifError) {
        console.error('[SIP Logger] Error inserting notifications:', notifError);
        // Don't throw - notifications are secondary
      } else {
        console.log(`[SIP Logger] Created ${notifications.length} notifications`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        logs_inserted: processedLogs.length,
        notifications_created: notifications.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[SIP Logger] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
