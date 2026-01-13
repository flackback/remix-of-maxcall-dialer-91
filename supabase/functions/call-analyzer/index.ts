import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalyzeRequest {
  call_id: string;
  transcript?: string;
  force_reanalyze?: boolean;
}

interface CallAnalysis {
  summary: string;
  sentiment: 'positive' | 'neutral' | 'negative' | 'mixed';
  quality_score: number;
  key_topics: string[];
  action_items: string[];
  customer_satisfaction: string;
  agent_performance: string;
  compliance_issues: string[];
  recommendations: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { call_id, transcript: providedTranscript, force_reanalyze } = await req.json() as AnalyzeRequest;

    // Fetch call details
    const { data: call, error: callError } = await supabase
      .from('calls')
      .select('*, agents(*), leads(*), campaigns(*), dispositions(*)')
      .eq('id', call_id)
      .single();

    if (callError || !call) {
      throw new Error(`Call not found: ${callError?.message}`);
    }

    const callData = call as any;

    // Check if already analyzed
    if (callData.ai_analyzed_at && !force_reanalyze) {
      return new Response(JSON.stringify({
        already_analyzed: true,
        summary: callData.ai_summary,
        sentiment: callData.ai_sentiment,
        quality_score: callData.ai_quality_score,
        key_topics: callData.ai_key_topics,
        action_items: callData.ai_action_items,
        analyzed_at: callData.ai_analyzed_at
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get transcript - either provided, from call record, or from AI handoff
    let transcript = providedTranscript || callData.transcript;
    
    if (!transcript && callData.is_ai_handled) {
      const { data: handoff } = await supabase
        .from('ai_handoffs')
        .select('transcript')
        .eq('call_id', call_id)
        .single();
      
      if (handoff) {
        transcript = (handoff as any).transcript;
      }
    }

    if (!transcript) {
      return new Response(JSON.stringify({ 
        error: 'No transcript available for analysis',
        suggestion: 'Please provide a transcript or ensure the call has been transcribed'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Analyze with Lovable AI
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const contextInfo = buildContextInfo(callData);

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
            content: `You are an expert call center quality analyst. Analyze call transcripts to provide actionable insights.

ANALYSIS REQUIREMENTS:
1. Summary: 2-3 sentence overview of the call
2. Sentiment: Overall emotional tone (positive/neutral/negative/mixed)
3. Quality Score: 0-100 based on:
   - Agent professionalism (25 points)
   - Problem resolution (25 points)
   - Customer engagement (25 points)
   - Compliance & script adherence (25 points)
4. Key Topics: Main subjects discussed (max 5)
5. Action Items: Follow-up tasks identified
6. Customer Satisfaction: Assessment of customer's satisfaction level
7. Agent Performance: Brief evaluation of agent's performance
8. Compliance Issues: Any policy violations or concerns
9. Recommendations: Suggestions for improvement

Be specific and actionable in your analysis.`
          },
          {
            role: 'user',
            content: `Analyze this call:\n\n${contextInfo}\n\nTRANSCRIPT:\n${transcript}`
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'analyze_call',
              description: 'Provide comprehensive call analysis',
              parameters: {
                type: 'object',
                properties: {
                  summary: { type: 'string', description: '2-3 sentence call summary' },
                  sentiment: { type: 'string', enum: ['positive', 'neutral', 'negative', 'mixed'] },
                  quality_score: { type: 'number', minimum: 0, maximum: 100 },
                  key_topics: { type: 'array', items: { type: 'string' }, maxItems: 5 },
                  action_items: { type: 'array', items: { type: 'string' } },
                  customer_satisfaction: { type: 'string' },
                  agent_performance: { type: 'string' },
                  compliance_issues: { type: 'array', items: { type: 'string' } },
                  recommendations: { type: 'array', items: { type: 'string' } }
                },
                required: ['summary', 'sentiment', 'quality_score', 'key_topics', 'action_items', 'customer_satisfaction', 'agent_performance', 'compliance_issues', 'recommendations']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'analyze_call' } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI analysis failed:', errorText);
      throw new Error('AI analysis failed');
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall?.function?.arguments) {
      throw new Error('Invalid AI response');
    }

    const analysis: CallAnalysis = JSON.parse(toolCall.function.arguments);

    // Update call with analysis results
    const { error: updateError } = await supabase
      .from('calls')
      .update({
        ai_summary: analysis.summary,
        ai_sentiment: analysis.sentiment,
        ai_quality_score: analysis.quality_score,
        ai_key_topics: analysis.key_topics,
        ai_action_items: analysis.action_items,
        ai_analyzed_at: new Date().toISOString(),
        transcript: transcript
      })
      .eq('id', call_id);

    if (updateError) {
      console.error('Error updating call:', updateError);
    }

    // Log analysis event
    await supabase.from('call_events').insert({
      call_id,
      event_type: 'AI_ANALYZED',
      event_data: {
        quality_score: analysis.quality_score,
        sentiment: analysis.sentiment,
        topics_count: analysis.key_topics.length,
        action_items_count: analysis.action_items.length
      }
    });

    console.log('Call analyzed:', JSON.stringify({
      call_id,
      quality_score: analysis.quality_score,
      sentiment: analysis.sentiment
    }));

    return new Response(JSON.stringify({
      success: true,
      analysis,
      analyzed_at: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in call-analyzer:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function buildContextInfo(call: any): string {
  const parts = [];
  
  parts.push(`Call ID: ${call.id}`);
  parts.push(`Direction: ${call.direction}`);
  parts.push(`Duration: ${call.duration || 0} seconds`);
  parts.push(`Status: ${call.status}`);
  
  if (call.leads) {
    parts.push(`Customer: ${call.leads.first_name || ''} ${call.leads.last_name || ''}`);
    if (call.leads.company) parts.push(`Company: ${call.leads.company}`);
  }
  
  if (call.campaigns) {
    parts.push(`Campaign: ${call.campaigns.name}`);
  }
  
  if (call.dispositions) {
    parts.push(`Disposition: ${call.dispositions.name} (${call.dispositions.category})`);
  }
  
  if (call.amd_result) {
    parts.push(`AMD Result: ${call.amd_result}`);
  }

  return parts.join('\n');
}
