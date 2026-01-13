// Engine Scheduler - Loop principal do Power Dialer
// Decide quantas chamadas iniciar por campanha

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SchedulerRequest {
  account_id: string;
  campaign_id?: string; // Se vazio, processa todas as campanhas ativas
}

interface CampaignBudget {
  campaign_id: string;
  campaign_name: string;
  dialer_mode: string;
  agents_available: number;
  current_active_calls: number;
  max_concurrent: number;
  target_cps: number;
  abandon_limit_percent: number;
  dial_ratio: number;
  calls_to_place: number;
  reason: string;
}

interface SchedulerResult {
  success: boolean;
  timestamp: string;
  campaigns_processed: number;
  total_calls_scheduled: number;
  budgets: CampaignBudget[];
  jobs_created: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const request: SchedulerRequest = await req.json();

    if (!request.account_id) {
      return new Response(
        JSON.stringify({ error: 'Missing account_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date();
    const currentDay = now.getDay(); // 0=Dom, 1=Seg, etc.
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:00`;

    // 1) Buscar campanhas ativas
    let campaignsQuery = supabase
      .from('campaigns')
      .select('*')
      .eq('account_id', request.account_id)
      .eq('status', 'ACTIVE');

    if (request.campaign_id) {
      campaignsQuery = campaignsQuery.eq('id', request.campaign_id);
    }

    const { data: campaigns, error: campaignsError } = await campaignsQuery;

    if (campaignsError) {
      throw new Error(`Failed to fetch campaigns: ${campaignsError.message}`);
    }

    const budgets: CampaignBudget[] = [];
    let totalJobsCreated = 0;

    for (const campaign of (campaigns || [])) {
      // Verificar dia de trabalho
      const workDays = campaign.work_days as number[] || [1, 2, 3, 4, 5];
      if (!workDays.includes(currentDay)) {
        budgets.push({
          campaign_id: campaign.id,
          campaign_name: campaign.name,
          dialer_mode: campaign.dialer_mode || 'POWER',
          agents_available: 0,
          current_active_calls: 0,
          max_concurrent: campaign.max_concurrent || 10,
          target_cps: campaign.target_cps || 1,
          abandon_limit_percent: campaign.abandon_limit_percent || 3,
          dial_ratio: campaign.dial_ratio || 1,
          calls_to_place: 0,
          reason: 'Not a work day',
        });
        continue;
      }

      // Verificar horário
      if (currentTime < campaign.start_time || currentTime > campaign.end_time) {
        budgets.push({
          campaign_id: campaign.id,
          campaign_name: campaign.name,
          dialer_mode: campaign.dialer_mode || 'POWER',
          agents_available: 0,
          current_active_calls: 0,
          max_concurrent: campaign.max_concurrent || 10,
          target_cps: campaign.target_cps || 1,
          abandon_limit_percent: campaign.abandon_limit_percent || 3,
          dial_ratio: campaign.dial_ratio || 1,
          calls_to_place: 0,
          reason: 'Outside work hours',
        });
        continue;
      }

      // 2) Contar agentes disponíveis
      const { count: agentsAvailable } = await supabase
        .from('agents')
        .select('id', { count: 'exact', head: true })
        .eq('account_id', campaign.account_id)
        .eq('status', 'AVAILABLE');

      const numAgentsAvailable = agentsAvailable || 0;

      if (numAgentsAvailable === 0 && campaign.dialer_mode !== 'PREVIEW') {
        budgets.push({
          campaign_id: campaign.id,
          campaign_name: campaign.name,
          dialer_mode: campaign.dialer_mode || 'POWER',
          agents_available: 0,
          current_active_calls: 0,
          max_concurrent: campaign.max_concurrent || 10,
          target_cps: campaign.target_cps || 1,
          abandon_limit_percent: campaign.abandon_limit_percent || 3,
          dial_ratio: campaign.dial_ratio || 1,
          calls_to_place: 0,
          reason: 'No agents available',
        });
        continue;
      }

      // 3) Contar chamadas ativas na campanha
      const { count: activeCalls } = await supabase
        .from('call_attempts')
        .select('id', { count: 'exact', head: true })
        .eq('campaign_id', campaign.id)
        .not('state', 'in', '(ENDED,FAILED,NO_RTP,ABANDONED,TIMEOUT,CANCELLED)');

      const numActiveCalls = activeCalls || 0;
      const maxConcurrent = campaign.max_concurrent || 10;

      // Verificar se já está no limite
      if (numActiveCalls >= maxConcurrent) {
        budgets.push({
          campaign_id: campaign.id,
          campaign_name: campaign.name,
          dialer_mode: campaign.dialer_mode || 'POWER',
          agents_available: numAgentsAvailable,
          current_active_calls: numActiveCalls,
          max_concurrent: maxConcurrent,
          target_cps: campaign.target_cps || 1,
          abandon_limit_percent: campaign.abandon_limit_percent || 3,
          dial_ratio: campaign.dial_ratio || 1,
          calls_to_place: 0,
          reason: 'At max concurrent limit',
        });
        continue;
      }

      // 4) Calcular quantas chamadas fazer
      const dialRatio = campaign.dial_ratio || 1.0;
      const availableSlots = maxConcurrent - numActiveCalls;

      let callsToPlace: number;

      switch (campaign.dialer_mode) {
        case 'PREVIEW':
          // Preview: só disca quando agente solicitar
          callsToPlace = 0;
          break;

        case 'PROGRESSIVE':
          // Progressive: 1:1, só se há agente livre
          callsToPlace = Math.min(numAgentsAvailable, availableSlots);
          break;

        case 'PREDICTIVE':
          // Predictive: usa dial_ratio adaptativo
          callsToPlace = Math.min(
            Math.ceil(numAgentsAvailable * dialRatio),
            availableSlots
          );
          break;

        case 'POWER':
        default:
          // Power: ratio fixo (padrão)
          callsToPlace = Math.min(
            Math.ceil(numAgentsAvailable * dialRatio),
            availableSlots
          );
          break;
      }

      // 5) Buscar métricas recentes para ajuste (se preditivo)
      if (campaign.dialer_mode === 'PREDICTIVE' && callsToPlace > 0) {
        const { data: recentMetrics } = await supabase
          .from('campaign_metrics_window')
          .select('abandon_rate, asr')
          .eq('campaign_id', campaign.id)
          .gte('window_start', new Date(Date.now() - 10 * 60 * 1000).toISOString())
          .order('window_start', { ascending: false })
          .limit(1)
          .single();

        if (recentMetrics) {
          const abandonLimit = campaign.abandon_limit_percent || 3;
          
          // Se abandono está alto, reduzir chamadas
          if (recentMetrics.abandon_rate && recentMetrics.abandon_rate > abandonLimit) {
            callsToPlace = Math.max(1, Math.floor(callsToPlace * 0.7));
          }
          
          // Se ASR está baixo, considerar aumentar ratio (com cuidado)
          if (recentMetrics.asr && recentMetrics.asr < 0.2 && numAgentsAvailable > 0) {
            callsToPlace = Math.min(callsToPlace + 1, availableSlots);
          }
        }
      }

      // 6) Reservar leads e criar jobs
      if (callsToPlace > 0) {
        // Reservar leads atomicamente
        const { data: reservedLeads, error: reserveError } = await supabase
          .rpc('reserve_leads_for_campaign', {
            p_campaign_id: campaign.id,
            p_account_id: campaign.account_id,
            p_limit: callsToPlace,
          });

        if (reserveError) {
          console.error(`Failed to reserve leads for campaign ${campaign.id}:`, reserveError);
          callsToPlace = 0;
        } else if (reservedLeads && reservedLeads.length > 0) {
          // Criar call_attempts e originate_jobs
          for (const lead of reservedLeads) {
            // Gerar correlation_id único para idempotência
            const correlationId = `${campaign.id}-${lead.lead_id}-${Date.now()}`;

            // Criar call_attempt
            const { data: attempt, error: attemptError } = await supabase
              .from('call_attempts')
              .insert({
                account_id: campaign.account_id,
                campaign_id: campaign.id,
                lead_id: lead.lead_id,
                phone_e164: lead.phone,
                correlation_id: correlationId,
                state: 'QUEUED',
              })
              .select('id')
              .single();

            if (attemptError || !attempt) {
              console.error('Failed to create attempt:', attemptError);
              continue;
            }

            // Criar originate_job
            const { error: jobError } = await supabase
              .from('originate_jobs')
              .insert({
                attempt_id: attempt.id,
                campaign_id: campaign.id,
                priority: 0,
                status: 'PENDING',
              });

            if (jobError) {
              console.error('Failed to create job:', jobError);
            } else {
              totalJobsCreated++;
            }
          }

          callsToPlace = reservedLeads.length;
        } else {
          // Sem leads disponíveis
          callsToPlace = 0;
        }
      }

      budgets.push({
        campaign_id: campaign.id,
        campaign_name: campaign.name,
        dialer_mode: campaign.dialer_mode || 'POWER',
        agents_available: numAgentsAvailable,
        current_active_calls: numActiveCalls,
        max_concurrent: maxConcurrent,
        target_cps: campaign.target_cps || 1,
        abandon_limit_percent: campaign.abandon_limit_percent || 3,
        dial_ratio: dialRatio,
        calls_to_place: callsToPlace,
        reason: callsToPlace > 0 ? 'Calls scheduled' : 'No leads available',
      });
    }

    const result: SchedulerResult = {
      success: true,
      timestamp: now.toISOString(),
      campaigns_processed: budgets.length,
      total_calls_scheduled: budgets.reduce((sum, b) => sum + b.calls_to_place, 0),
      budgets,
      jobs_created: totalJobsCreated,
    };

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    console.error('Scheduler error:', message);
    
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
