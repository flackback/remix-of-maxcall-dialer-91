import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CallerIdRequest {
  account_id: string;
  campaign_id?: string;
  destination_phone: string;
  carrier_id?: string;
}

interface CallerIdNumber {
  id: string;
  phone_number: string;
  friendly_name: string;
  priority: number;
  weight: number;
  last_used_at: string | null;
  uses_this_hour: number;
  health_score: number;
  stir_shaken_attestation: string | null;
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

    const { account_id, campaign_id, destination_phone, carrier_id }: CallerIdRequest = await req.json();

    console.log(`[CallerIdSelector] Selecting caller ID for account: ${account_id}, destination: ${destination_phone}`);

    // Extract DDD from destination phone (Brazilian format)
    const ddd = extractDDD(destination_phone);
    const currentTime = new Date();
    const currentHour = currentTime.getHours();
    const currentMinutes = currentTime.getMinutes();
    const timeString = `${currentHour.toString().padStart(2, '0')}:${currentMinutes.toString().padStart(2, '0')}:00`;
    const dayOfWeek = currentTime.getDay();

    // Find matching rules
    const { data: rules, error: rulesError } = await supabase
      .from('caller_id_rules')
      .select('*, pool:caller_id_pools(*)')
      .eq('account_id', account_id)
      .eq('is_active', true)
      .order('priority', { ascending: true });

    if (rulesError) {
      console.error('[CallerIdSelector] Error fetching rules:', rulesError);
      throw rulesError;
    }

    // Filter rules by campaign, DDD pattern, time, and day
    const matchingRules = (rules || []).filter(rule => {
      // Campaign match (null means all campaigns)
      if (rule.campaign_id && rule.campaign_id !== campaign_id) return false;
      
      // DDD pattern match
      if (rule.ddd_pattern && !matchesDDDPattern(ddd, rule.ddd_pattern)) return false;
      
      // Time window match
      if (!isWithinTimeWindow(timeString, rule.time_start, rule.time_end)) return false;
      
      // Day of week match
      if (!rule.days_of_week.includes(dayOfWeek)) return false;
      
      return true;
    });

    if (matchingRules.length === 0) {
      console.log('[CallerIdSelector] No matching rules found, using default pool');
      // Try to find a default pool
      const { data: defaultPool } = await supabase
        .from('caller_id_pools')
        .select('*')
        .eq('account_id', account_id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (!defaultPool) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'No caller ID pool available',
            fallback: null
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        );
      }

      matchingRules.push({ pool_id: defaultPool.id, pool: defaultPool });
    }

    const selectedRule = matchingRules[0];
    const pool = selectedRule.pool;

    console.log(`[CallerIdSelector] Using pool: ${pool.name} (${pool.id})`);

    // Get available numbers from pool with health scores
    const { data: numbers, error: numbersError } = await supabase
      .from('caller_id_numbers')
      .select(`
        *,
        health:caller_id_health(health_score, flagged_as_spam)
      `)
      .eq('pool_id', pool.id)
      .eq('is_active', true)
      .lt('uses_this_hour', pool.max_uses_per_hour);

    if (numbersError) {
      console.error('[CallerIdSelector] Error fetching numbers:', numbersError);
      throw numbersError;
    }

    if (!numbers || numbers.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No available caller IDs in pool',
          pool_id: pool.id
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Filter out numbers on cooldown and flagged as spam
    const cooldownThreshold = new Date(Date.now() - pool.cooldown_seconds * 1000).toISOString();
    const availableNumbers = numbers.filter(num => {
      // Check if flagged as spam
      const latestHealth = num.health?.[0];
      if (latestHealth?.flagged_as_spam) return false;
      
      // Check cooldown
      if (num.last_used_at && num.last_used_at > cooldownThreshold) return false;
      
      return true;
    });

    if (availableNumbers.length === 0) {
      console.log('[CallerIdSelector] All numbers on cooldown or flagged');
      // Return the least recently used number as fallback
      const fallbackNumber = numbers.sort((a, b) => {
        if (!a.last_used_at) return -1;
        if (!b.last_used_at) return 1;
        return new Date(a.last_used_at).getTime() - new Date(b.last_used_at).getTime();
      })[0];

      return new Response(
        JSON.stringify({
          success: true,
          caller_id: fallbackNumber.phone_number,
          caller_id_id: fallbackNumber.id,
          friendly_name: fallbackNumber.friendly_name,
          pool_id: pool.id,
          pool_name: pool.name,
          strategy: pool.rotation_strategy,
          is_fallback: true,
          warning: 'All preferred numbers on cooldown'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Select number based on rotation strategy
    const selectedNumber = selectNumber(availableNumbers, pool.rotation_strategy);

    console.log(`[CallerIdSelector] Selected: ${selectedNumber.phone_number} (strategy: ${pool.rotation_strategy})`);

    // Update usage tracking
    await Promise.all([
      // Update last_used_at and uses_this_hour
      supabase
        .from('caller_id_numbers')
        .update({
          last_used_at: new Date().toISOString(),
          uses_this_hour: selectedNumber.uses_this_hour + 1,
          uses_today: selectedNumber.uses_today + 1
        })
        .eq('id', selectedNumber.id),
      
      // Record usage
      supabase
        .from('caller_id_usage')
        .insert({
          caller_id_number_id: selectedNumber.id,
          campaign_id: campaign_id || null,
          used_at: new Date().toISOString()
        })
    ]);

    return new Response(
      JSON.stringify({
        success: true,
        caller_id: selectedNumber.phone_number,
        caller_id_id: selectedNumber.id,
        friendly_name: selectedNumber.friendly_name,
        pool_id: pool.id,
        pool_name: pool.name,
        strategy: pool.rotation_strategy,
        stir_shaken: selectedNumber.stir_shaken_attestation,
        health_score: selectedNumber.health?.[0]?.health_score || 100,
        is_fallback: false
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[CallerIdSelector] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

function extractDDD(phone: string): string {
  // Remove non-digits
  const digits = phone.replace(/\D/g, '');
  // Brazilian format: +55 + DDD (2 digits) + number
  if (digits.startsWith('55') && digits.length >= 4) {
    return digits.substring(2, 4);
  }
  // Already without country code
  if (digits.length >= 2) {
    return digits.substring(0, 2);
  }
  return '';
}

function matchesDDDPattern(ddd: string, pattern: string): boolean {
  // Simple pattern matching: '11%' matches '11', '%' matches all
  if (pattern === '%') return true;
  if (pattern.endsWith('%')) {
    return ddd.startsWith(pattern.slice(0, -1));
  }
  return ddd === pattern;
}

function isWithinTimeWindow(current: string, start: string, end: string): boolean {
  return current >= start && current <= end;
}

function selectNumber(numbers: any[], strategy: string): any {
  switch (strategy) {
    case 'random':
      return numbers[Math.floor(Math.random() * numbers.length)];
    
    case 'weighted':
      return selectWeighted(numbers);
    
    case 'least_used':
      return numbers.sort((a, b) => a.uses_this_hour - b.uses_this_hour)[0];
    
    case 'highest_health':
      return numbers.sort((a, b) => {
        const healthA = a.health?.[0]?.health_score || 100;
        const healthB = b.health?.[0]?.health_score || 100;
        return healthB - healthA;
      })[0];
    
    case 'round_robin':
    default:
      // Select the one with oldest last_used_at (or never used)
      return numbers.sort((a, b) => {
        if (!a.last_used_at) return -1;
        if (!b.last_used_at) return 1;
        return new Date(a.last_used_at).getTime() - new Date(b.last_used_at).getTime();
      })[0];
  }
}

function selectWeighted(numbers: any[]): any {
  const totalWeight = numbers.reduce((sum, n) => sum + (n.weight || 100), 0);
  let random = Math.random() * totalWeight;
  
  for (const number of numbers) {
    random -= (number.weight || 100);
    if (random <= 0) return number;
  }
  
  return numbers[0];
}
