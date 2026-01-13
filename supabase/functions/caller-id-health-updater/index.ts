import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HealthUpdateRequest {
  caller_id_number_id: string;
  call_result: 'connected' | 'no_answer' | 'busy' | 'blocked' | 'failed' | 'spam_reported';
  duration_seconds?: number;
}

interface BatchHealthUpdate {
  updates: HealthUpdateRequest[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    const updates: HealthUpdateRequest[] = body.updates || [body];

    console.log(`[CallerIdHealthUpdater] Processing ${updates.length} health updates`);

    const results = await Promise.all(updates.map(async (update) => {
      return processHealthUpdate(supabase, update);
    }));

    // Run daily health score recalculation if needed
    const shouldRecalculate = Math.random() < 0.1; // 10% chance on each call
    if (shouldRecalculate) {
      await recalculateHealthScores(supabase);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: results.length,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[CallerIdHealthUpdater] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

async function processHealthUpdate(supabase: any, update: HealthUpdateRequest) {
  const today = new Date().toISOString().split('T')[0];

  // Get or create today's health record
  const { data: existingHealth, error: fetchError } = await supabase
    .from('caller_id_health')
    .select('*')
    .eq('caller_id_number_id', update.caller_id_number_id)
    .eq('date', today)
    .maybeSingle();

  if (fetchError) {
    console.error('[CallerIdHealthUpdater] Error fetching health:', fetchError);
    throw fetchError;
  }

  const currentHealth = existingHealth || {
    caller_id_number_id: update.caller_id_number_id,
    date: today,
    calls_attempted: 0,
    calls_connected: 0,
    calls_blocked: 0,
    calls_spam_reported: 0,
    health_score: 100,
    flagged_as_spam: false
  };

  // Update counters based on result
  const newHealth = {
    ...currentHealth,
    calls_attempted: currentHealth.calls_attempted + 1
  };

  switch (update.call_result) {
    case 'connected':
      newHealth.calls_connected = currentHealth.calls_connected + 1;
      break;
    case 'blocked':
      newHealth.calls_blocked = currentHealth.calls_blocked + 1;
      break;
    case 'spam_reported':
      newHealth.calls_spam_reported = currentHealth.calls_spam_reported + 1;
      if (currentHealth.calls_spam_reported + 1 >= 3) {
        newHealth.flagged_as_spam = true;
        newHealth.flagged_at = new Date().toISOString();
      }
      break;
  }

  // Calculate rates
  if (newHealth.calls_attempted > 0) {
    newHealth.answer_rate = (newHealth.calls_connected / newHealth.calls_attempted) * 100;
    newHealth.block_rate = (newHealth.calls_blocked / newHealth.calls_attempted) * 100;
  }

  // Calculate health score (0-100)
  newHealth.health_score = calculateHealthScore(newHealth);

  // Upsert health record
  if (existingHealth) {
    const { error: updateError } = await supabase
      .from('caller_id_health')
      .update(newHealth)
      .eq('id', existingHealth.id);

    if (updateError) throw updateError;
  } else {
    const { error: insertError } = await supabase
      .from('caller_id_health')
      .insert(newHealth);

    if (insertError) throw insertError;
  }

  // If flagged as spam, also update the main number record
  if (newHealth.flagged_as_spam) {
    await supabase
      .from('caller_id_numbers')
      .update({ is_active: false })
      .eq('id', update.caller_id_number_id);

    console.log(`[CallerIdHealthUpdater] Number ${update.caller_id_number_id} flagged as spam and deactivated`);
  }

  return {
    caller_id_number_id: update.caller_id_number_id,
    health_score: newHealth.health_score,
    flagged_as_spam: newHealth.flagged_as_spam
  };
}

function calculateHealthScore(health: any): number {
  let score = 100;

  // Penalize for low answer rate (if enough attempts)
  if (health.calls_attempted >= 10) {
    const answerPenalty = Math.max(0, (50 - health.answer_rate) * 0.5);
    score -= answerPenalty;
  }

  // Penalize heavily for blocks
  const blockPenalty = health.calls_blocked * 5;
  score -= blockPenalty;

  // Penalize very heavily for spam reports
  const spamPenalty = health.calls_spam_reported * 20;
  score -= spamPenalty;

  // If flagged as spam, score is 0
  if (health.flagged_as_spam) {
    score = 0;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

async function recalculateHealthScores(supabase: any) {
  console.log('[CallerIdHealthUpdater] Running health score recalculation...');

  // Get all numbers with recent health data
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const { data: healthData, error } = await supabase
    .from('caller_id_health')
    .select('caller_id_number_id, calls_attempted, calls_connected, calls_blocked, calls_spam_reported')
    .gte('date', thirtyDaysAgo);

  if (error) {
    console.error('[CallerIdHealthUpdater] Error fetching health data:', error);
    return;
  }

  // Aggregate by number
  const aggregated = new Map<string, any>();
  for (const record of healthData || []) {
    const existing = aggregated.get(record.caller_id_number_id) || {
      calls_attempted: 0,
      calls_connected: 0,
      calls_blocked: 0,
      calls_spam_reported: 0
    };
    
    aggregated.set(record.caller_id_number_id, {
      calls_attempted: existing.calls_attempted + record.calls_attempted,
      calls_connected: existing.calls_connected + record.calls_connected,
      calls_blocked: existing.calls_blocked + record.calls_blocked,
      calls_spam_reported: existing.calls_spam_reported + record.calls_spam_reported
    });
  }

  console.log(`[CallerIdHealthUpdater] Recalculated scores for ${aggregated.size} numbers`);
}
