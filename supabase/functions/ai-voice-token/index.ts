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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get authenticated user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's account_id
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('account_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.account_id) {
      return new Response(
        JSON.stringify({ error: 'Conta não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { provider, agent_id } = await req.json();

    if (!provider) {
      return new Response(
        JSON.stringify({ error: 'Provider é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generating ${provider} token for account ${profile.account_id}`);

    // Get integration for this account and provider
    const { data: integration, error: integrationError } = await supabaseAdmin
      .from('account_integrations')
      .select('*')
      .eq('account_id', profile.account_id)
      .eq('provider', provider)
      .eq('is_active', true)
      .single();

    if (integrationError || !integration) {
      console.error('Integration not found:', integrationError);
      return new Response(
        JSON.stringify({ error: `Integração ${provider} não configurada` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!integration.is_verified) {
      return new Response(
        JSON.stringify({ error: `Integração ${provider} não verificada` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Decrypt API key
    const encryptionKey = Deno.env.get('INTEGRATION_ENCRYPTION_KEY') || 'default-encryption-key-change-me';
    
    const { data: decryptedKey, error: decryptError } = await supabaseAdmin
      .rpc('decrypt_api_key', { 
        encrypted_key: integration.api_key_encrypted, 
        encryption_key: encryptionKey 
      });

    if (decryptError || !decryptedKey) {
      console.error('Decryption error:', decryptError);
      return new Response(
        JSON.stringify({ error: 'Erro ao decriptar chave' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update usage stats
    await supabaseAdmin
      .from('account_integrations')
      .update({ 
        last_used_at: new Date().toISOString(),
        total_requests: (integration.total_requests || 0) + 1
      })
      .eq('id', integration.id);

    // Generate ephemeral token based on provider
    let token = null;
    let expiresAt = null;

    switch (provider) {
      case 'elevenlabs': {
        // Use agent_id from request or from config
        const targetAgentId = agent_id || integration.config_json?.agent_id;
        
        if (!targetAgentId) {
          return new Response(
            JSON.stringify({ error: 'Agent ID é obrigatório para ElevenLabs' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const response = await fetch(
          `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${targetAgentId}`,
          {
            headers: { 'xi-api-key': decryptedKey }
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error('ElevenLabs token error:', errorText);
          return new Response(
            JSON.stringify({ error: `ElevenLabs: ${response.status}` }),
            { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const data = await response.json();
        token = data.signed_url;
        expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 min
        break;
      }

      case 'openai': {
        // For OpenAI Realtime, we generate ephemeral token
        const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${decryptedKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-4o-realtime-preview-2024-12-17',
            voice: 'alloy'
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('OpenAI token error:', errorText);
          return new Response(
            JSON.stringify({ error: `OpenAI: ${response.status}` }),
            { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const data = await response.json();
        token = data.client_secret?.value;
        expiresAt = data.expires_at;
        break;
      }

      case 'vapi': {
        // Vapi uses the API key directly for WebSocket connection
        // Return a temporary token reference
        token = decryptedKey; // In production, consider a more secure approach
        expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: `Provider '${provider}' não suportado` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    console.log(`Token generated successfully for ${provider}`);

    return new Response(
      JSON.stringify({ 
        token, 
        expires_at: expiresAt,
        provider,
        config: integration.config_json
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: unknown) {
    console.error('Error in ai-voice-token:', err);
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
