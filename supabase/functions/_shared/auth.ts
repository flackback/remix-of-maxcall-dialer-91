// Middleware de autenticação para edge functions

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface AuthResult {
  user: { id: string; email?: string };
  account_id: string;
  roles: string[];
  is_admin: boolean;
  is_supervisor: boolean;
}

export interface AuthError {
  error: string;
  status: number;
}

export async function validateRequest(
  req: Request,
  supabase: SupabaseClient
): Promise<AuthResult | AuthError> {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return { error: 'Missing authorization header', status: 401 };

    const token = authHeader.replace('Bearer ', '');
    if (!token) return { error: 'Invalid authorization token', status: 401 };

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return { error: 'Invalid or expired token', status: 401 };

    const { data: profile } = await supabase
      .from('profiles')
      .select('account_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.account_id) return { error: 'User profile not found', status: 403 };

    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const roles = (userRoles as Array<{ role: string }> || []).map(r => r.role);

    return {
      user: { id: user.id, email: user.email },
      account_id: profile.account_id,
      roles,
      is_admin: roles.includes('admin'),
      is_supervisor: roles.includes('supervisor'),
    };
  } catch (error) {
    return { error: 'Authentication failed', status: 500 };
  }
}

export function isAuthError(result: AuthResult | AuthError): result is AuthError {
  return 'error' in result;
}

export function requireRole(auth: AuthResult, requiredRole: 'admin' | 'supervisor' | 'agent'): AuthError | null {
  if (requiredRole === 'admin' && !auth.is_admin) return { error: 'Admin role required', status: 403 };
  if (requiredRole === 'supervisor' && !auth.is_admin && !auth.is_supervisor) return { error: 'Supervisor role required', status: 403 };
  return null;
}

export function authErrorResponse(error: AuthError, corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify({ error: error.error }), {
    status: error.status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export async function logSensitiveAction(
  supabase: SupabaseClient,
  params: {
    user_id?: string;
    account_id?: string;
    action: string;
    resource_type?: string;
    resource_id?: string;
    payload?: Record<string, unknown>;
    ip_address?: string;
    user_agent?: string;
    success?: boolean;
    error_message?: string;
  }
): Promise<void> {
  try {
    await supabase.from('sensitive_action_logs').insert({
      user_id: params.user_id,
      account_id: params.account_id,
      action: params.action,
      resource_type: params.resource_type,
      resource_id: params.resource_id,
      payload: params.payload || {},
      ip_address: params.ip_address,
      user_agent: params.user_agent,
      success: params.success ?? true,
      error_message: params.error_message,
    });
  } catch (e) {
    console.error('Failed to log sensitive action:', e);
  }
}

export function getClientIP(req: Request): string | undefined {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
         req.headers.get('x-real-ip') || 
         undefined;
}

export function getUserAgent(req: Request): string | undefined {
  return req.headers.get('user-agent') || undefined;
}
