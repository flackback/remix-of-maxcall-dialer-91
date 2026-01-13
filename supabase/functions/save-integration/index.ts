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
    
    // Client with user token for auth
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    // Service client for privileged operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get authenticated user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's account_id
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('account_id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile?.account_id) {
      console.error('Profile error:', profileError);
      return new Response(
        JSON.stringify({ error: 'Conta não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { provider, api_key, api_secret, config_json } = await req.json();

    if (!provider || !api_key) {
      return new Response(
        JSON.stringify({ error: 'Provider e API Key são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Saving ${provider} integration for account ${profile.account_id}`);

    // Get encryption key from environment
    const encryptionKey = Deno.env.get('INTEGRATION_ENCRYPTION_KEY') || 'default-encryption-key-change-me';

    // Encrypt API key using database function
    const { data: encryptedKey, error: encryptError } = await supabaseAdmin
      .rpc('encrypt_api_key', { plain_key: api_key, encryption_key: encryptionKey });

    if (encryptError) {
      console.error('Encryption error:', encryptError);
      return new Response(
        JSON.stringify({ error: 'Erro ao encriptar chave' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Encrypt API secret if provided
    let encryptedSecret = null;
    if (api_secret) {
      const { data: secretData, error: secretError } = await supabaseAdmin
        .rpc('encrypt_api_key', { plain_key: api_secret, encryption_key: encryptionKey });
      
      if (!secretError) {
        encryptedSecret = secretData;
      }
    }

    // Verify the key with the provider first
    const verifyResponse = await fetch(`${supabaseUrl}/functions/v1/verify-integration`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
      },
      body: JSON.stringify({ provider, api_key })
    });

    const verifyResult = await verifyResponse.json();
    const isVerified = verifyResult.valid === true;

    // Upsert integration
    const { data: integration, error: upsertError } = await supabaseAdmin
      .from('account_integrations')
      .upsert({
        account_id: profile.account_id,
        provider,
        api_key_encrypted: encryptedKey,
        api_secret_encrypted: encryptedSecret,
        config_json: config_json || {},
        is_active: true,
        is_verified: isVerified,
        last_verified_at: isVerified ? new Date().toISOString() : null,
        verification_error: isVerified ? null : verifyResult.error,
        created_by: user.id,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'account_id,provider'
      })
      .select()
      .single();

    if (upsertError) {
      console.error('Upsert error:', upsertError);
      return new Response(
        JSON.stringify({ error: 'Erro ao salvar integração' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Integration ${provider} saved successfully, verified: ${isVerified}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        integration: {
          id: integration.id,
          provider: integration.provider,
          is_verified: integration.is_verified,
          is_active: integration.is_active
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: unknown) {
    console.error('Error in save-integration:', err);
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
