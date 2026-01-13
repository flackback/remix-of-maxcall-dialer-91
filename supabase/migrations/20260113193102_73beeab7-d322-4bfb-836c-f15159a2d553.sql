-- Adiciona colunas necessárias para o controle do motor
ALTER TABLE public.trunk_config ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.caller_id_numbers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Cria a tabela de rate limit (Essencial para o motor funcionar)
CREATE TABLE IF NOT EXISTS public.rate_limit_buckets (
    trunk_id UUID PRIMARY KEY REFERENCES public.trunk_config(id) ON DELETE CASCADE,
    tokens NUMERIC NOT NULL DEFAULT 0,
    max_tokens NUMERIC NOT NULL DEFAULT 1,
    refill_rate NUMERIC NOT NULL DEFAULT 1,
    last_refill_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilita RLS na tabela de rate limit
ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;

-- Política para permitir acesso via service role (Edge Functions)
CREATE POLICY "Service role full access to rate_limit_buckets"
ON public.rate_limit_buckets
FOR ALL
USING (true)
WITH CHECK (true);