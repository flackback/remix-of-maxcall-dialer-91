import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { provider, api_key } = await req.json();

    if (!provider || !api_key) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Provider e API Key são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Verifying ${provider} API key...`);

    let valid = false;
    let userInfo = null;
    let error = null;

    switch (provider) {
      case 'elevenlabs': {
        const response = await fetch('https://api.elevenlabs.io/v1/user', {
          headers: { 'xi-api-key': api_key }
        });
        
        if (response.ok) {
          valid = true;
          userInfo = await response.json();
          console.log('ElevenLabs user:', userInfo.subscription?.tier);
        } else {
          error = `ElevenLabs retornou status ${response.status}`;
          console.error('ElevenLabs error:', error);
        }
        break;
      }

      case 'openai': {
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: { 'Authorization': `Bearer ${api_key}` }
        });
        
        if (response.ok) {
          valid = true;
          const data = await response.json();
          userInfo = { models_count: data.data?.length || 0 };
          console.log('OpenAI models count:', userInfo.models_count);
        } else {
          const errorData = await response.json().catch(() => ({}));
          error = errorData.error?.message || `OpenAI retornou status ${response.status}`;
          console.error('OpenAI error:', error);
        }
        break;
      }

      case 'vapi': {
        const response = await fetch('https://api.vapi.ai/account', {
          headers: { 'Authorization': `Bearer ${api_key}` }
        });
        
        if (response.ok) {
          valid = true;
          userInfo = await response.json();
          console.log('Vapi account verified');
        } else {
          error = `Vapi retornou status ${response.status}`;
          console.error('Vapi error:', error);
        }
        break;
      }

      default:
        error = `Provider '${provider}' não suportado`;
        console.error(error);
    }

    return new Response(
      JSON.stringify({ valid, user_info: userInfo, error }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: unknown) {
    console.error('Error in verify-integration:', err);
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ valid: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
