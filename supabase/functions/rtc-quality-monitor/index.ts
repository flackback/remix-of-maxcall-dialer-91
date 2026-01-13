import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QualityMetrics {
  call_id: string;
  carrier_id?: string;
  trunk_id?: string;
  jitter_ms: number;
  packet_loss_percent: number;
  rtt_ms: number;
  codec_used?: string;
  bitrate_kbps?: number;
  packets_sent?: number;
  packets_lost?: number;
}

interface QualityThresholds {
  jitter_warning: number;
  jitter_critical: number;
  packet_loss_warning: number;
  packet_loss_critical: number;
  rtt_warning: number;
  rtt_critical: number;
  mos_warning: number;
  mos_critical: number;
}

const DEFAULT_THRESHOLDS: QualityThresholds = {
  jitter_warning: 30,
  jitter_critical: 50,
  packet_loss_warning: 1,
  packet_loss_critical: 3,
  rtt_warning: 200,
  rtt_critical: 400,
  mos_warning: 3.5,
  mos_critical: 3.0
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, ...data } = await req.json();
    console.log(`[RTC-Quality-Monitor] Action: ${action}`, data);

    switch (action) {
      case 'report_metrics':
        return await handleReportMetrics(supabase, data);
      
      case 'get_call_quality':
        return await handleGetCallQuality(supabase, data);
      
      case 'get_carrier_quality':
        return await handleGetCarrierQuality(supabase, data);
      
      case 'get_alerts':
        return await handleGetAlerts(supabase, data);
      
      case 'acknowledge_alert':
        return await handleAcknowledgeAlert(supabase, data);
      
      case 'get_dashboard_data':
        return await handleGetDashboardData(supabase, data);
      
      default:
        return new Response(
          JSON.stringify({ error: 'Unknown action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error: any) {
    console.error('[RTC-Quality-Monitor] Error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleReportMetrics(supabase: any, metrics: QualityMetrics) {
  const { call_id, carrier_id, trunk_id, jitter_ms, packet_loss_percent, rtt_ms, codec_used, bitrate_kbps, packets_sent, packets_lost } = metrics;

  if (!call_id) {
    return new Response(
      JSON.stringify({ error: 'call_id is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Calculate MOS score
  const mosScore = calculateMOS(jitter_ms, packet_loss_percent, rtt_ms);

  // Check if we have existing metrics for this call
  const { data: existingMetrics } = await supabase
    .from('call_quality_metrics')
    .select('*')
    .eq('call_id', call_id)
    .order('measured_at', { ascending: false })
    .limit(1);

  const previousMetrics = existingMetrics?.[0];

  // Calculate aggregates
  const newSamplesCollected = (previousMetrics?.samples_collected || 0) + 1;
  const totalPacketsSent = (previousMetrics?.total_packets_sent || 0) + (packets_sent || 0);
  const totalPacketsLost = (previousMetrics?.total_packets_lost || 0) + (packets_lost || 0);

  // Insert new metrics
  const { data: insertedMetrics, error: insertError } = await supabase
    .from('call_quality_metrics')
    .insert({
      call_id,
      carrier_id,
      trunk_id,
      jitter_ms,
      packet_loss_percent,
      rtt_ms,
      mos_score: mosScore,
      codec_used,
      bitrate_kbps,
      samples_collected: newSamplesCollected,
      min_jitter_ms: previousMetrics ? Math.min(previousMetrics.min_jitter_ms || jitter_ms, jitter_ms) : jitter_ms,
      max_jitter_ms: previousMetrics ? Math.max(previousMetrics.max_jitter_ms || jitter_ms, jitter_ms) : jitter_ms,
      avg_jitter_ms: previousMetrics 
        ? ((previousMetrics.avg_jitter_ms * previousMetrics.samples_collected) + jitter_ms) / newSamplesCollected 
        : jitter_ms,
      min_rtt_ms: previousMetrics ? Math.min(previousMetrics.min_rtt_ms || rtt_ms, rtt_ms) : rtt_ms,
      max_rtt_ms: previousMetrics ? Math.max(previousMetrics.max_rtt_ms || rtt_ms, rtt_ms) : rtt_ms,
      avg_rtt_ms: previousMetrics 
        ? Math.round(((previousMetrics.avg_rtt_ms * previousMetrics.samples_collected) + rtt_ms) / newSamplesCollected)
        : rtt_ms,
      total_packets_sent: totalPacketsSent,
      total_packets_lost: totalPacketsLost
    })
    .select()
    .single();

  if (insertError) {
    console.error('[RTC-Quality-Monitor] Error inserting metrics:', insertError);
    return new Response(
      JSON.stringify({ error: 'Failed to save metrics' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Check thresholds and create alerts if needed
  const alerts = await checkThresholdsAndAlert(supabase, {
    ...metrics,
    mos_score: mosScore
  }, DEFAULT_THRESHOLDS);

  console.log(`[RTC-Quality-Monitor] Metrics saved for call ${call_id}, MOS: ${mosScore}, Alerts: ${alerts.length}`);

  return new Response(
    JSON.stringify({
      success: true,
      metrics: insertedMetrics,
      mos_score: mosScore,
      quality_status: getQualityStatus(mosScore),
      alerts_created: alerts.length
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleGetCallQuality(supabase: any, data: { call_id: string }) {
  const { call_id } = data;

  const { data: metrics, error } = await supabase
    .from('call_quality_metrics')
    .select('*')
    .eq('call_id', call_id)
    .order('measured_at', { ascending: true });

  if (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to fetch metrics' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Calculate summary
  const latestMetrics = metrics[metrics.length - 1];
  const summary = latestMetrics ? {
    current_mos: latestMetrics.mos_score,
    avg_jitter: latestMetrics.avg_jitter_ms,
    avg_rtt: latestMetrics.avg_rtt_ms,
    total_packet_loss: latestMetrics.total_packets_lost,
    samples: latestMetrics.samples_collected,
    quality_status: getQualityStatus(latestMetrics.mos_score)
  } : null;

  return new Response(
    JSON.stringify({ metrics, summary }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleGetCarrierQuality(supabase: any, data: { carrier_id: string; hours?: number }) {
  const { carrier_id, hours = 24 } = data;
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  const { data: metrics, error } = await supabase
    .from('call_quality_metrics')
    .select('*')
    .eq('carrier_id', carrier_id)
    .gte('measured_at', since)
    .order('measured_at', { ascending: true });

  if (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to fetch carrier metrics' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Aggregate by hour
  const hourlyStats: Record<string, any> = {};
  for (const m of metrics) {
    const hour = new Date(m.measured_at).toISOString().slice(0, 13);
    if (!hourlyStats[hour]) {
      hourlyStats[hour] = { samples: 0, mos_sum: 0, jitter_sum: 0, rtt_sum: 0, loss_sum: 0 };
    }
    hourlyStats[hour].samples++;
    hourlyStats[hour].mos_sum += m.mos_score;
    hourlyStats[hour].jitter_sum += m.jitter_ms;
    hourlyStats[hour].rtt_sum += m.rtt_ms;
    hourlyStats[hour].loss_sum += m.packet_loss_percent;
  }

  const hourlyData = Object.entries(hourlyStats).map(([hour, stats]: [string, any]) => ({
    hour,
    avg_mos: stats.mos_sum / stats.samples,
    avg_jitter: stats.jitter_sum / stats.samples,
    avg_rtt: stats.rtt_sum / stats.samples,
    avg_loss: stats.loss_sum / stats.samples,
    samples: stats.samples
  }));

  return new Response(
    JSON.stringify({ 
      carrier_id,
      period_hours: hours,
      hourly_data: hourlyData,
      overall: metrics.length > 0 ? {
        avg_mos: metrics.reduce((a: number, b: any) => a + b.mos_score, 0) / metrics.length,
        total_samples: metrics.length
      } : null
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleGetAlerts(supabase: any, data: { account_id?: string; unacknowledged_only?: boolean; limit?: number }) {
  const { account_id, unacknowledged_only = false, limit = 50 } = data;

  let query = supabase
    .from('quality_alerts')
    .select(`
      *,
      telephony_carriers(name),
      trunk_config(name)
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (account_id) {
    query = query.eq('account_id', account_id);
  }

  if (unacknowledged_only) {
    query = query.is('acknowledged_at', null);
  }

  const { data: alerts, error } = await query;

  if (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to fetch alerts' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ alerts }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleAcknowledgeAlert(supabase: any, data: { alert_id: string; user_id: string }) {
  const { alert_id, user_id } = data;

  const { error } = await supabase
    .from('quality_alerts')
    .update({
      acknowledged_at: new Date().toISOString(),
      acknowledged_by: user_id
    })
    .eq('id', alert_id);

  if (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to acknowledge alert' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleGetDashboardData(supabase: any, data: { account_id: string }) {
  const { account_id } = data;
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Get carriers for this account
  const { data: carriers } = await supabase
    .from('telephony_carriers')
    .select('id, name')
    .eq('account_id', account_id);

  const carrierIds = carriers?.map((c: any) => c.id) || [];

  // Get recent metrics for these carriers
  const { data: metrics } = await supabase
    .from('call_quality_metrics')
    .select('*')
    .in('carrier_id', carrierIds)
    .gte('measured_at', last24h);

  // Get active alerts
  const { data: alerts } = await supabase
    .from('quality_alerts')
    .select('*')
    .eq('account_id', account_id)
    .is('acknowledged_at', null)
    .order('created_at', { ascending: false })
    .limit(10);

  // Get CPS history for trunks
  const { data: trunks } = await supabase
    .from('trunk_config')
    .select('id, name, current_cps, max_cps, carrier_id')
    .in('carrier_id', carrierIds);

  // Calculate overall stats
  const overallStats = metrics && metrics.length > 0 ? {
    avg_mos: metrics.reduce((a: number, b: any) => a + b.mos_score, 0) / metrics.length,
    avg_jitter: metrics.reduce((a: number, b: any) => a + b.jitter_ms, 0) / metrics.length,
    avg_rtt: metrics.reduce((a: number, b: any) => a + b.rtt_ms, 0) / metrics.length,
    avg_packet_loss: metrics.reduce((a: number, b: any) => a + b.packet_loss_percent, 0) / metrics.length,
    total_samples: metrics.length
  } : null;

  // Per-carrier stats
  const carrierStats = carriers?.map((carrier: any) => {
    const carrierMetrics = metrics?.filter((m: any) => m.carrier_id === carrier.id) || [];
    const carrierTrunks = trunks?.filter((t: any) => t.carrier_id === carrier.id) || [];
    
    return {
      carrier_id: carrier.id,
      carrier_name: carrier.name,
      avg_mos: carrierMetrics.length > 0 
        ? carrierMetrics.reduce((a: number, b: any) => a + b.mos_score, 0) / carrierMetrics.length 
        : null,
      samples: carrierMetrics.length,
      trunks: carrierTrunks.map((t: any) => ({
        id: t.id,
        name: t.name,
        cps_usage: (t.current_cps / t.max_cps) * 100,
        current_cps: t.current_cps,
        max_cps: t.max_cps
      }))
    };
  });

  return new Response(
    JSON.stringify({
      overall_stats: overallStats,
      carrier_stats: carrierStats,
      active_alerts: alerts,
      quality_status: overallStats ? getQualityStatus(overallStats.avg_mos) : 'unknown'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

function calculateMOS(jitter: number, packetLoss: number, rtt: number): number {
  // E-Model simplified calculation
  // R = R0 - Is - Id - Ie-eff + A
  // MOS = 1 + 0.035*R + R*(R-60)*(100-R)*7*10^-6
  
  const R0 = 93.2; // Base value
  
  // Delay impairment
  const d = rtt / 2; // One-way delay
  const Id = 0.024 * d + 0.11 * (d - 177.3) * (d > 177.3 ? 1 : 0);
  
  // Equipment impairment (simplified for G.711)
  const Ie = 0;
  const Bpl = 25; // Packet loss robustness
  const Ie_eff = Ie + (95 - Ie) * packetLoss / (packetLoss + Bpl);
  
  // Jitter contribution (simplified)
  const jitterImpairment = jitter * 0.2;
  
  // Calculate R
  let R = R0 - Id - Ie_eff - jitterImpairment;
  R = Math.max(0, Math.min(100, R));
  
  // Convert to MOS
  let MOS: number;
  if (R < 0) {
    MOS = 1;
  } else if (R > 100) {
    MOS = 4.5;
  } else {
    MOS = 1 + 0.035 * R + R * (R - 60) * (100 - R) * 7 * Math.pow(10, -6);
  }
  
  return Math.round(MOS * 10) / 10; // Round to 1 decimal
}

function getQualityStatus(mos: number): string {
  if (mos >= 4.0) return 'excellent';
  if (mos >= 3.5) return 'good';
  if (mos >= 3.0) return 'fair';
  if (mos >= 2.5) return 'poor';
  return 'bad';
}

async function checkThresholdsAndAlert(
  supabase: any, 
  metrics: QualityMetrics & { mos_score: number },
  thresholds: QualityThresholds
): Promise<any[]> {
  const alerts: any[] = [];

  // Get account_id from call
  const { data: call } = await supabase
    .from('calls')
    .select('account_id')
    .eq('id', metrics.call_id)
    .single();

  if (!call) return alerts;

  const createAlert = async (type: string, severity: string, threshold: number, current: number, action: string) => {
    const { data } = await supabase.from('quality_alerts').insert({
      account_id: call.account_id,
      carrier_id: metrics.carrier_id,
      trunk_id: metrics.trunk_id,
      call_id: metrics.call_id,
      alert_type: type,
      severity,
      threshold_value: threshold,
      current_value: current,
      message: `${type}: Current ${current.toFixed(2)}, Threshold ${threshold}`,
      auto_action_taken: action
    }).select().single();
    
    if (data) alerts.push(data);
  };

  // Check jitter
  if (metrics.jitter_ms >= thresholds.jitter_critical) {
    await createAlert('HIGH_JITTER', 'critical', thresholds.jitter_critical, metrics.jitter_ms, 'NOTIFY');
  } else if (metrics.jitter_ms >= thresholds.jitter_warning) {
    await createAlert('HIGH_JITTER', 'warning', thresholds.jitter_warning, metrics.jitter_ms, 'NONE');
  }

  // Check packet loss
  if (metrics.packet_loss_percent >= thresholds.packet_loss_critical) {
    await createAlert('PACKET_LOSS', 'critical', thresholds.packet_loss_critical, metrics.packet_loss_percent, 'NOTIFY');
  } else if (metrics.packet_loss_percent >= thresholds.packet_loss_warning) {
    await createAlert('PACKET_LOSS', 'warning', thresholds.packet_loss_warning, metrics.packet_loss_percent, 'NONE');
  }

  // Check RTT
  if (metrics.rtt_ms >= thresholds.rtt_critical) {
    await createAlert('HIGH_RTT', 'critical', thresholds.rtt_critical, metrics.rtt_ms, 'NOTIFY');
  } else if (metrics.rtt_ms >= thresholds.rtt_warning) {
    await createAlert('HIGH_RTT', 'warning', thresholds.rtt_warning, metrics.rtt_ms, 'NONE');
  }

  // Check MOS
  if (metrics.mos_score <= thresholds.mos_critical) {
    await createAlert('LOW_MOS', 'critical', thresholds.mos_critical, metrics.mos_score, 'NOTIFY');
  } else if (metrics.mos_score <= thresholds.mos_warning) {
    await createAlert('LOW_MOS', 'warning', thresholds.mos_warning, metrics.mos_score, 'NONE');
  }

  return alerts;
}
