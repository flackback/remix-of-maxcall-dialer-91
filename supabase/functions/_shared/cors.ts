// CORS utilities para edge functions
// Implementa CORS restritivo por ambiente

// Domínios permitidos (configurar conforme ambiente)
const ALLOWED_ORIGINS_PROD = [
  // Adicione seus domínios de produção aqui
  'https://lovable.dev',
  'https://*.lovable.app',
];

const ALLOWED_ORIGINS_DEV = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:8080',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
];

/**
 * Verifica se a origem é permitida
 */
function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  
  // Em desenvolvimento, permitir origens de dev
  const isDev = Deno.env.get('ENVIRONMENT') !== 'production';
  const allowedOrigins = isDev 
    ? [...ALLOWED_ORIGINS_DEV, ...ALLOWED_ORIGINS_PROD]
    : ALLOWED_ORIGINS_PROD;

  // Verificar match exato ou wildcard
  for (const allowed of allowedOrigins) {
    if (allowed.includes('*')) {
      // Wildcard match (ex: https://*.lovable.app)
      const regex = new RegExp('^' + allowed.replace(/\*/g, '.*') + '$');
      if (regex.test(origin)) return true;
    } else if (allowed === origin) {
      return true;
    }
  }

  // Permitir qualquer subdomínio lovable.app em produção
  if (origin.endsWith('.lovable.app') || origin.endsWith('.lovable.dev')) {
    return true;
  }

  return false;
}

/**
 * Retorna headers CORS baseado na origem
 * @param req - Request HTTP
 * @param allowCredentials - Se deve permitir credentials (cookies, auth headers)
 */
export function getCorsHeaders(req: Request, allowCredentials = true): Record<string, string> {
  const origin = req.headers.get('origin');
  
  // Se origem não é permitida, retornar headers mínimos
  // Isso fará o browser bloquear a requisição
  if (!isOriginAllowed(origin)) {
    console.warn(`CORS: Origin not allowed: ${origin}`);
    // Em produção, retornar headers vazios para bloquear
    // Em dev, ser mais permissivo para facilitar testes
    const isDev = Deno.env.get('ENVIRONMENT') !== 'production';
    if (!isDev) {
      return {
        'Access-Control-Allow-Origin': 'null',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'content-type',
      };
    }
  }

  const headers: Record<string, string> = {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id',
    'Access-Control-Max-Age': '86400', // 24 horas
  };

  if (allowCredentials && origin) {
    headers['Access-Control-Allow-Credentials'] = 'true';
  }

  return headers;
}

/**
 * Headers CORS públicos (para endpoints que não precisam de auth)
 * Mais restritivo que o padrão
 */
export function getPublicCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin');
  
  return {
    'Access-Control-Allow-Origin': isOriginAllowed(origin) ? (origin || '*') : 'null',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type, x-request-id',
    'Access-Control-Max-Age': '3600',
  };
}

/**
 * Headers CORS para webhooks (origem fixa por provedor)
 */
export function getWebhookCorsHeaders(provider: string): Record<string, string> {
  // Webhooks geralmente não precisam de CORS pois vêm de servers
  // Mas mantemos headers básicos para compatibilidade
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type, x-webhook-signature, x-twilio-signature',
    'Access-Control-Max-Age': '86400',
  };
}

/**
 * Handler para preflight OPTIONS
 */
export function handleCorsOptions(req: Request, corsHeaders: Record<string, string>): Response {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

/**
 * Verifica se é uma requisição preflight
 */
export function isPreflightRequest(req: Request): boolean {
  return req.method === 'OPTIONS';
}

// Headers CORS legados (para compatibilidade durante migração)
// TODO: Remover após migração completa
export const legacyCorsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
