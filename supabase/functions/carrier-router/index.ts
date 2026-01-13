import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RouteRequest {
  phone: string;
  campaign_id?: string;
  account_id: string;
  call_id?: string;
}

interface CarrierMetrics {
  carrier_id: string;
  carrier_name: string;
  carrier_type: string;
  cost_per_minute: number;
  connection_rate: number;
  avg_latency_ms: number;
  max_concurrent_calls: number;
  current_calls?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { phone, campaign_id, account_id, call_id }: RouteRequest = await req.json();

    console.log(`[carrier-router] Routing call to ${phone} for account ${account_id}`);

    // 1. Get active carriers with their recent metrics
    const { data: carriers, error: carriersError } = await supabase
      .from('telephony_carriers')
      .select(`
        id,
        name,
        type,
        config_json,
        cost_per_minute,
        max_concurrent_calls,
        priority
      `)
      .eq('account_id', account_id)
      .eq('is_active', true)
      .order('priority', { ascending: true });

    if (carriersError || !carriers?.length) {
      console.error('[carrier-router] No active carriers found:', carriersError);
      return new Response(JSON.stringify({ 
        error: 'No active carriers configured',
        code: 'NO_CARRIERS'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Get metrics for each carrier (last 24 hours)
    const carrierIds = carriers.map(c => c.id);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const { data: metrics } = await supabase
      .from('carrier_metrics')
      .select('*')
      .in('carrier_id', carrierIds)
      .gte('date', yesterday.toISOString().split('T')[0]);

    // Aggregate metrics by carrier
    const metricsMap: Record<string, CarrierMetrics> = {};
    for (const carrier of carriers) {
      const carrierMetrics = metrics?.filter(m => m.carrier_id === carrier.id) || [];
      const totalCalls = carrierMetrics.reduce((sum, m) => sum + (m.total_calls || 0), 0);
      const connectedCalls = carrierMetrics.reduce((sum, m) => sum + (m.connected_calls || 0), 0);
      const avgLatency = carrierMetrics.length > 0
        ? carrierMetrics.reduce((sum, m) => sum + (m.avg_latency_ms || 0), 0) / carrierMetrics.length
        : 0;

      metricsMap[carrier.id] = {
        carrier_id: carrier.id,
        carrier_name: carrier.name,
        carrier_type: carrier.type,
        cost_per_minute: carrier.cost_per_minute || 0,
        connection_rate: totalCalls > 0 ? (connectedCalls / totalCalls) * 100 : 50,
        avg_latency_ms: avgLatency,
        max_concurrent_calls: carrier.max_concurrent_calls || 100,
      };
    }

    // 3. Get campaign info if provided
    let campaignInfo = null;
    if (campaign_id) {
      const { data: campaign } = await supabase
        .from('campaigns')
        .select('name, dial_mode, dial_ratio')
        .eq('id', campaign_id)
        .single();
      campaignInfo = campaign;
    }

    // 4. Check routing rules
    const ddd = phone.substring(0, 2);
    const currentHour = new Date().getHours();
    const currentDay = new Date().getDay();

    const { data: routes } = await supabase
      .from('carrier_routes')
      .select('*')
      .eq('account_id', account_id)
      .eq('is_active', true)
      .order('priority', { ascending: true });

    // Find matching route
    let matchedRoute = null;
    if (routes) {
      for (const route of routes) {
        const dddMatch = route.ddd_patterns.length === 0 || route.ddd_patterns.includes(ddd);
        const timeMatch = currentHour >= parseInt(route.time_start.split(':')[0]) && 
                          currentHour <= parseInt(route.time_end.split(':')[0]);
        const dayMatch = route.days_of_week.includes(currentDay);

        if (dddMatch && timeMatch && dayMatch) {
          matchedRoute = route;
          break;
        }
      }
    }

    // 5. Call AI for intelligent routing decision
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    let aiDecision = null;
    let aiReasoning = '';

    if (LOVABLE_API_KEY && Object.keys(metricsMap).length > 1) {
      try {
        const prompt = `Você é um sistema de roteamento inteligente de chamadas telefônicas.
Analise os dados abaixo e escolha o melhor carrier para esta chamada.

DADOS DA CHAMADA:
- Telefone destino: ${phone}
- DDD: ${ddd}
- Campanha: ${campaignInfo?.name || 'Não especificada'}
- Modo de discagem: ${campaignInfo?.dial_mode || 'POWER'}
- Horário: ${new Date().toLocaleTimeString('pt-BR')}

CARRIERS DISPONÍVEIS:
${Object.values(metricsMap).map(m => `
- ${m.carrier_name} (${m.carrier_type}):
  * Custo/min: R$ ${m.cost_per_minute.toFixed(4)}
  * Taxa de conexão: ${m.connection_rate.toFixed(1)}%
  * Latência média: ${m.avg_latency_ms.toFixed(0)}ms
  * Capacidade: ${m.max_concurrent_calls} chamadas simultâneas
`).join('')}

${matchedRoute ? `REGRA DE ROTEAMENTO ATIVA: ${matchedRoute.name} (prioriza carrier ${matchedRoute.carrier_id})` : 'Nenhuma regra específica ativa.'}

Responda APENAS com um JSON no formato:
{
  "carrier_id": "uuid-do-carrier-escolhido",
  "reasoning": "Explicação breve da decisão (máx 100 palavras)"
}`;

        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: 'Você é um sistema de roteamento de chamadas. Responda apenas com JSON válido.' },
              { role: 'user', content: prompt }
            ],
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content || '';
          
          // Parse JSON from AI response
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            aiDecision = JSON.parse(jsonMatch[0]);
            aiReasoning = aiDecision.reasoning || '';
            console.log(`[carrier-router] AI decision: ${aiDecision.carrier_id} - ${aiReasoning}`);
          }
        }
      } catch (aiError) {
        console.error('[carrier-router] AI routing error:', aiError);
      }
    }

    // 6. Determine final carrier (AI decision > matched route > priority)
    let selectedCarrier = carriers[0];
    
    if (aiDecision?.carrier_id && carriers.find(c => c.id === aiDecision.carrier_id)) {
      selectedCarrier = carriers.find(c => c.id === aiDecision.carrier_id)!;
    } else if (matchedRoute) {
      const routeCarrier = carriers.find(c => c.id === matchedRoute.carrier_id);
      if (routeCarrier) selectedCarrier = routeCarrier;
    }

    // 7. Log the decision for learning
    if (call_id) {
      await supabase.from('carrier_decisions').insert({
        call_id,
        campaign_id,
        carrier_id: selectedCarrier.id,
        ai_reasoning: aiReasoning,
      });
    }

    console.log(`[carrier-router] Selected carrier: ${selectedCarrier.name} (${selectedCarrier.type})`);

    return new Response(JSON.stringify({
      carrier: {
        id: selectedCarrier.id,
        name: selectedCarrier.name,
        type: selectedCarrier.type,
        config: selectedCarrier.config_json,
      },
      routing: {
        method: aiDecision ? 'ai' : matchedRoute ? 'rule' : 'priority',
        reasoning: aiReasoning || (matchedRoute ? `Matched rule: ${matchedRoute.name}` : 'Default priority'),
      },
      metrics: metricsMap[selectedCarrier.id],
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[carrier-router] Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
