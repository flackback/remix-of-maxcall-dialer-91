import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AMDRequest {
  callId: string;
  campaignId?: string;
  provider?: 'internal' | 'telnyx' | 'jambonz';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const request: AMDRequest = await req.json();
    console.log(`AMD detection request for call: ${request.callId}`);

    const startTime = Date.now();

    // Simulate detection
    await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 200));

    const random = Math.random();
    let result: string;
    let confidence: number;
    let action: string;

    if (random < 0.65) {
      result = 'human';
      confidence = 85 + Math.random() * 15;
      action = 'connect';
    } else if (random < 0.90) {
      result = 'machine';
      confidence = 75 + Math.random() * 20;
      action = 'hangup';
    } else if (random < 0.95) {
      result = 'fax';
      confidence = 90 + Math.random() * 10;
      action = 'hangup';
    } else {
      result = 'unknown';
      confidence = 40 + Math.random() * 30;
      action = 'retry';
    }

    const detectionTime = Date.now() - startTime;
    confidence = Math.round(confidence * 100) / 100;

    // Store result
    await supabase
      .from('amd_results')
      .insert({
        call_id: request.callId,
        campaign_id: request.campaignId,
        detection_result: result,
        confidence_score: confidence,
        detection_time_ms: detectionTime,
        provider: request.provider || 'internal',
        speech_detected: result === 'human' || result === 'machine',
        beep_detected: result === 'machine' && Math.random() > 0.5,
        action_taken: action,
      });

    // Update call
    await supabase
      .from('calls')
      .update({
        amd_result: result,
        amd_confidence: confidence,
        amd_duration_ms: detectionTime,
      })
      .eq('id', request.callId);

    console.log(`AMD result for ${request.callId}: ${result} (${confidence}% confidence)`);

    return new Response(JSON.stringify({
      success: true,
      result,
      confidence,
      action,
      detectionTimeMs: detectionTime,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('AMD detector error:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
