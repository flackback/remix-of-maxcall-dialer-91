// Engine Executor - Executa originates de forma controlada (Simplificado)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { account_id, max_jobs = 10 } = await req.json();

    if (!account_id) {
      return new Response(JSON.stringify({ error: 'Missing account_id' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Buscar jobs pendentes
    const { data: pendingJobs } = await supabase
      .from('originate_jobs')
      .select('id, attempt_id, campaign_id')
      .eq('status', 'PENDING')
      .is('locked_by', null)
      .order('priority', { ascending: false })
      .limit(max_jobs);

    if (!pendingJobs || pendingJobs.length === 0) {
      return new Response(JSON.stringify({ success: true, jobs_processed: 0, results: [] }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const results: Array<{ job_id: string; success: boolean; error?: string }> = [];

    for (const job of pendingJobs) {
      try {
        // Marcar como processando
        await supabase.from('originate_jobs').update({ status: 'PROCESSING', locked_at: new Date().toISOString() }).eq('id', job.id);

        // Buscar attempt
        const { data: attempt } = await supabase.from('call_attempts').select('id, phone_e164, correlation_id').eq('id', job.attempt_id).single();

        if (!attempt) throw new Error('Attempt not found');

        // Buscar trunk com health score
        const { data: trunks } = await supabase.from('trunk_config').select('id, name, carrier_id, max_cps, max_channels').eq('is_active', true).limit(1);

        const selectedTrunk = trunks?.[0];
        if (!selectedTrunk) throw new Error('No trunk available');

        // Tentar consumir token
        const { data: tokenOk } = await supabase.rpc('consume_token', { p_trunk_id: selectedTrunk.id });

        if (!tokenOk) {
          await supabase.from('originate_jobs').update({ status: 'PENDING', locked_by: null }).eq('id', job.id);
          results.push({ job_id: job.id, success: false, error: 'Throttled' });
          continue;
        }

        // Buscar caller ID
        const { data: callerIds } = await supabase.from('caller_id_numbers').select('id, phone_number').eq('carrier_id', selectedTrunk.carrier_id).eq('is_active', true).limit(1);

        // Atualizar attempt
        await supabase.from('call_attempts').update({
          trunk_id: selectedTrunk.id,
          carrier_id: selectedTrunk.carrier_id,
          caller_id_id: callerIds?.[0]?.id,
          caller_id_used: callerIds?.[0]?.phone_number,
          state: 'ORIGINATING',
          originate_at: new Date().toISOString(),
        }).eq('id', attempt.id);

        // Marcar job completo
        await supabase.from('originate_jobs').update({ status: 'COMPLETED', processed_at: new Date().toISOString() }).eq('id', job.id);

        results.push({ job_id: job.id, success: true });

      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown';
        await supabase.from('originate_jobs').update({ status: 'FAILED', error_message: msg }).eq('id', job.id);
        results.push({ job_id: job.id, success: false, error: msg });
      }
    }

    return new Response(JSON.stringify({ success: true, jobs_processed: results.length, results }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
