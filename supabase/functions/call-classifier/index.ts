import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ClassifyRequest {
  call_id: string;
  carrier_type: 'telnyx' | 'jambonz';
  audio_url?: string;
  transcript?: string;
  carrier_amd_result?: {
    result: string;
    confidence?: number;
    duration_ms?: number;
  };
  use_ai?: boolean;
}

type AMDResult = 'HUMAN' | 'MACHINE' | 'FAX' | 'NO_ANSWER' | 'BUSY' | 'FAILED' | 'UNKNOWN';

interface ClassificationResult {
  result: AMDResult;
  confidence: number;
  duration_ms: number;
  method: 'carrier' | 'ai' | 'hybrid';
  action: string;
  reasoning?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const request = await req.json() as ClassifyRequest;
    const { call_id, carrier_type, carrier_amd_result, transcript, use_ai } = request;

    // Fetch call details
    const { data: call, error: callError } = await supabase
      .from('calls')
      .select('*, campaigns(*)')
      .eq('id', call_id)
      .single();

    if (callError || !call) {
      throw new Error(`Call not found: ${callError?.message}`);
    }

    // Fetch AMD settings for the campaign
    let amdSettings: any = {
      amd_enabled: true,
      amd_provider: 'carrier',
      machine_action: 'hangup',
      machine_message: null,
      fax_action: 'hangup',
      no_answer_action: 'reschedule',
      max_detection_time_ms: 5000
    };

    if ((call as any).campaign_id) {
      const { data: settings } = await supabase
        .from('campaign_amd_settings')
        .select('*')
        .eq('campaign_id', (call as any).campaign_id)
        .single();

      if (settings) {
        amdSettings = settings;
      }
    }

    let classification: ClassificationResult;
    const startTime = Date.now();

    if (carrier_amd_result && !use_ai) {
      classification = processCarrierAMD(carrier_amd_result, carrier_type);
    } else if (use_ai || amdSettings.amd_provider === 'ai') {
      classification = await classifyWithAI(transcript || '');
    } else if (carrier_amd_result && amdSettings.amd_provider === 'ai') {
      const carrierResult = processCarrierAMD(carrier_amd_result, carrier_type);
      const aiResult = await classifyWithAI(transcript || '');
      
      if (aiResult.confidence > carrierResult.confidence) {
        classification = { ...aiResult, method: 'hybrid' };
      } else {
        classification = { ...carrierResult, method: 'hybrid' };
      }
    } else {
      classification = {
        result: 'UNKNOWN',
        confidence: 0,
        duration_ms: Date.now() - startTime,
        method: 'carrier',
        action: 'connect'
      };
    }

    classification.action = determineAction(classification.result, amdSettings);
    classification.duration_ms = Date.now() - startTime;

    await supabase
      .from('calls')
      .update({
        amd_result: classification.result,
        amd_confidence: classification.confidence,
        amd_duration_ms: classification.duration_ms
      })
      .eq('id', call_id);

    await supabase.from('call_events').insert({
      call_id,
      event_type: 'AMD_CLASSIFIED',
      event_data: {
        result: classification.result,
        confidence: classification.confidence,
        method: classification.method,
        action: classification.action,
        reasoning: classification.reasoning
      }
    });

    console.log('AMD Classification:', JSON.stringify({
      call_id,
      result: classification.result,
      confidence: classification.confidence,
      action: classification.action
    }));

    return new Response(JSON.stringify(classification), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in call-classifier:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function processCarrierAMD(
  carrierResult: { result: string; confidence?: number; duration_ms?: number },
  carrierType: 'telnyx' | 'jambonz'
): ClassificationResult {
  let result: AMDResult = 'UNKNOWN';
  const confidence = carrierResult.confidence || 0.8;

  if (carrierType === 'telnyx') {
    const telnyxMapping: Record<string, AMDResult> = {
      'human': 'HUMAN',
      'machine': 'MACHINE',
      'fax': 'FAX',
      'not_sure': 'UNKNOWN',
      'no_speech': 'MACHINE'
    };
    result = telnyxMapping[carrierResult.result.toLowerCase()] || 'UNKNOWN';
  } else if (carrierType === 'jambonz') {
    const jambonzMapping: Record<string, AMDResult> = {
      'human': 'HUMAN',
      'machine': 'MACHINE',
      'fax': 'FAX',
      'noAnswer': 'NO_ANSWER',
      'busy': 'BUSY',
      'failed': 'FAILED'
    };
    result = jambonzMapping[carrierResult.result] || 'UNKNOWN';
  }

  return {
    result,
    confidence,
    duration_ms: carrierResult.duration_ms || 0,
    method: 'carrier',
    action: 'pending'
  };
}

async function classifyWithAI(transcript: string): Promise<ClassificationResult> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  
  if (!apiKey || !transcript) {
    return {
      result: 'UNKNOWN',
      confidence: 0,
      duration_ms: 0,
      method: 'ai',
      action: 'connect'
    };
  }

  const startTime = Date.now();

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an expert call classifier. Analyze the transcript and classify who answered.

CLASSIFICATION RULES:
- HUMAN: Live person, natural conversation, direct responses
- MACHINE: Voicemail greeting, automated message, "leave a message after the beep"
- FAX: Fax tones, modem sounds
- NO_ANSWER: No speech, only ringing
- BUSY: Busy signal

Respond with JSON: { "result": "HUMAN"|"MACHINE"|"FAX"|"NO_ANSWER"|"BUSY", "confidence": 0.0-1.0, "reasoning": "..." }`
          },
          {
            role: 'user',
            content: `Classify this transcript:\n\n${transcript}`
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'classify_call',
              description: 'Classify who answered the call',
              parameters: {
                type: 'object',
                properties: {
                  result: { type: 'string', enum: ['HUMAN', 'MACHINE', 'FAX', 'NO_ANSWER', 'BUSY'] },
                  confidence: { type: 'number', minimum: 0, maximum: 1 },
                  reasoning: { type: 'string' }
                },
                required: ['result', 'confidence', 'reasoning']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'classify_call' } }
      }),
    });

    if (!response.ok) {
      throw new Error('AI classification failed');
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall?.function?.arguments) {
      const args = JSON.parse(toolCall.function.arguments);
      return {
        result: args.result as AMDResult,
        confidence: args.confidence,
        duration_ms: Date.now() - startTime,
        method: 'ai',
        action: 'pending',
        reasoning: args.reasoning
      };
    }

    throw new Error('Invalid AI response');
  } catch (error) {
    console.error('AI classification error:', error);
    return {
      result: 'UNKNOWN',
      confidence: 0,
      duration_ms: Date.now() - startTime,
      method: 'ai',
      action: 'connect'
    };
  }
}

function determineAction(result: AMDResult, settings: any): string {
  switch (result) {
    case 'HUMAN': return 'connect';
    case 'MACHINE': return settings.machine_action || 'hangup';
    case 'FAX': return settings.fax_action || 'hangup';
    case 'NO_ANSWER': return settings.no_answer_action || 'reschedule';
    case 'BUSY': return 'reschedule';
    case 'FAILED': return 'reschedule';
    default: return 'connect';
  }
}
