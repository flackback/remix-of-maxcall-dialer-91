import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { agent_id } = await req.json();

    if (!agent_id) {
      return new Response(
        JSON.stringify({ error: 'agent_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch the agent
    const { data: agent, error: agentError } = await supabase
      .from('ai_voice_agents')
      .select('*')
      .eq('id', agent_id)
      .single();

    if (agentError || !agent) {
      return new Response(
        JSON.stringify({ error: 'Agent not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch training examples for this agent (or general examples)
    const { data: examples, error: examplesError } = await supabase
      .from('ai_training_examples')
      .select('*')
      .or(`agent_id.eq.${agent_id},agent_id.is.null`)
      .eq('account_id', agent.account_id)
      .order('quality_score', { ascending: false })
      .limit(20);

    if (examplesError) {
      console.error('Error fetching examples:', examplesError);
    }

    const positiveExamples = examples?.filter(e => e.is_positive_example) || [];
    const negativeExamples = examples?.filter(e => !e.is_positive_example) || [];

    // Group examples by category
    const examplesByCategory = positiveExamples.reduce((acc: Record<string, any[]>, ex) => {
      if (!acc[ex.category]) acc[ex.category] = [];
      acc[ex.category].push(ex);
      return acc;
    }, {});

    // Build the analysis prompt
    const analysisPrompt = `Você é um especialista em criar prompts para agentes de voz IA.

## Contexto do Agente
- Nome: ${agent.name}
- Descrição: ${agent.description || 'Não especificado'}
- Idioma: ${agent.language || 'pt-BR'}
- Provider: ${agent.provider}

## Prompt Atual (se existir)
${agent.system_prompt || 'Nenhum prompt configurado ainda'}

## Exemplos de Treinamento Positivos (o que FAZER)
${Object.entries(examplesByCategory).map(([category, exs]) => `
### ${category.toUpperCase()}
${exs.map((ex: any) => `
Transcrição (qualidade ${ex.quality_score}/5):
"""
${ex.transcript.slice(0, 500)}
"""
Comportamento esperado: ${ex.expected_behavior || 'Seguir o padrão demonstrado'}
`).join('\n---\n')}`).join('\n')}

## Exemplos Negativos (o que NÃO fazer)
${negativeExamples.map(ex => `
Categoria: ${ex.category}
Transcrição:
"""
${ex.transcript.slice(0, 300)}
"""
Por que é negativo: ${ex.expected_behavior || 'Evitar este padrão'}
`).join('\n---\n') || 'Nenhum exemplo negativo fornecido'}

## Sua Tarefa
Analise os exemplos acima e gere um system prompt otimizado para o agente de voz. O prompt deve:

1. Definir claramente a personalidade e tom de voz
2. Incluir diretrizes baseadas nos padrões positivos identificados
3. Incluir avisos sobre comportamentos a evitar (baseado nos exemplos negativos)
4. Usar variáveis dinâmicas quando apropriado (ex: {{nome_cliente}}, {{valor_divida}})
5. Ser estruturado com seções claras
6. Incluir exemplos de frases/respostas para situações comuns

Responda APENAS com o system prompt gerado, sem explicações adicionais.`;

    // Call Lovable AI to generate the prompt
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: 'Você é um especialista em criar prompts para agentes de voz IA para call centers. Seus prompts são claros, estruturados e otimizados para conversações telefônicas.'
          },
          { role: 'user', content: analysisPrompt }
        ],
        max_tokens: 4000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'AI generation failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const generatedPrompt = aiData.choices?.[0]?.message?.content;

    if (!generatedPrompt) {
      return new Response(
        JSON.stringify({ error: 'No prompt generated' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the generation for analytics
    console.log(`Generated prompt for agent ${agent_id} using ${positiveExamples.length} positive and ${negativeExamples.length} negative examples`);

    return new Response(
      JSON.stringify({ 
        generated_prompt: generatedPrompt,
        examples_used: {
          positive: positiveExamples.length,
          negative: negativeExamples.length,
          categories: Object.keys(examplesByCategory)
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-prompt-generator:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
