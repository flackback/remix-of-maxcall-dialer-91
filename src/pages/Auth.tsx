import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Zap, Loader2 } from 'lucide-react';
import { z } from 'zod';

const emailSchema = z.string().email('Email inválido');
const passwordSchema = z.string().min(6, 'Senha deve ter no mínimo 6 caracteres');

function safeParseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const json = atob(padded);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function isLikelyBackendKeyMismatch(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
  if (!url || !key) return false;

  const host = (() => {
    try {
      return new URL(url).host;
    } catch {
      return '';
    }
  })();

  const payload = safeParseJwtPayload(key);
  const ref = typeof payload?.ref === 'string' ? payload.ref : undefined;
  // URL padrão: <ref>.supabase.co (o "ref" precisa bater com o da chave)
  if (!ref || !host) return false;
  return !host.startsWith(`${ref}.`);
}
export default function Auth() {
  const navigate = useNavigate();
  const { signIn, signUp, user, isLoading } = useAuth();
  const { toast } = useToast();
  const backendKeyMismatch = useMemo(() => isLikelyBackendKeyMismatch(), []);
  const [showApiKeyHelp, setShowApiKeyHelp] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; fullName?: string }>({});

  // Redirect if already logged in
  useEffect(() => {
    if (user && !isLoading) {
      navigate('/');
    }
  }, [user, isLoading, navigate]);

  const validate = (isSignUp: boolean) => {
    const newErrors: typeof errors = {};
    
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0].message;
    }
    
    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      newErrors.password = passwordResult.error.errors[0].message;
    }
    
    if (isSignUp && !fullName.trim()) {
      newErrors.fullName = 'Nome é obrigatório';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate(false)) return;
    
    setIsSubmitting(true);
    const { error } = await signIn(email, password);
    setIsSubmitting(false);
    
    if (error) {
      const msg = error.message || '';

      if (msg.toLowerCase().includes('invalid api key')) {
        setShowApiKeyHelp(true);
        toast({
          title: 'Erro ao entrar',
          description: 'Chave pública do backend inválida/mismatch. Isso acontece quando o domínio está servindo uma versão antiga do app ou com configuração de backend diferente. Limpe os dados do site e recarregue; se persistir, republique e confira o domínio conectado ao projeto.',
          variant: 'destructive',
        });
        return;
      }

      if (msg.includes('Invalid login credentials')) {
        toast({
          title: 'Erro ao entrar',
          description: 'Email ou senha incorretos',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Erro ao entrar',
          description: msg,
          variant: 'destructive',
        });
      }
    } else {
      toast({
        title: 'Bem-vindo!',
        description: 'Login realizado com sucesso',
      });
      navigate('/');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate(true)) return;
    
    setIsSubmitting(true);
    const { error } = await signUp(email, password, fullName);
    setIsSubmitting(false);
    
    if (error) {
      const msg = error.message || '';

      if (msg.toLowerCase().includes('invalid api key')) {
        setShowApiKeyHelp(true);
        toast({
          title: 'Erro ao cadastrar',
          description: 'Chave pública do backend inválida/mismatch. Limpe os dados do site (Application → Storage → Clear site data) e recarregue. Se ainda falhar, republique e confira se o domínio está conectado a este projeto.',
          variant: 'destructive',
        });
        return;
      }

      if (msg.includes('already registered')) {
        toast({
          title: 'Email já cadastrado',
          description: 'Este email já possui uma conta. Tente fazer login.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Erro ao cadastrar',
          description: msg,
          variant: 'destructive',
        });
      }
    } else {
      toast({
        title: 'Conta criada!',
        description: 'Você já pode acessar o sistema',
      });
      navigate('/');
    }
  };

  if (isLoading) {
    return (
      <div className="dark min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="dark min-h-screen flex flex-col items-center justify-center bg-background p-4">
      {/* Logo */}
      <div className="mb-8 flex items-center gap-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary glow-primary">
          <Zap className="h-7 w-7 text-primary-foreground" />
        </div>
        <div>
          <span className="text-2xl font-bold text-foreground">MaxCall</span>
          <span className="ml-1 rounded bg-primary/20 px-2 py-0.5 text-xs font-semibold text-primary">PRO</span>
        </div>
      </div>

      {(backendKeyMismatch || showApiKeyHelp) && (
        <div className="mb-4 w-full max-w-md rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <p className="font-medium">Configuração do backend inconsistente</p>
          <p className="mt-1 text-destructive/90">
            O app está recebendo “Invalid API key”, geralmente por versão antiga no domínio ou chave pública diferente da URL do backend.
            Limpe os dados do site e recarregue. Se persistir, republique e confira o domínio conectado ao projeto.
          </p>
        </div>
      )}

      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Acesse sua conta</CardTitle>
          <CardDescription>
            Entre ou crie uma conta para acessar o contact center
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="register">Criar Conta</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={errors.email ? 'border-destructive' : ''}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Senha</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={errors.password ? 'border-destructive' : ''}
                  />
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password}</p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    'Entrar'
                  )}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="register">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="register-name">Nome Completo</Label>
                  <Input
                    id="register-name"
                    type="text"
                    placeholder="João Silva"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className={errors.fullName ? 'border-destructive' : ''}
                  />
                  {errors.fullName && (
                    <p className="text-sm text-destructive">{errors.fullName}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-email">Email</Label>
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={errors.email ? 'border-destructive' : ''}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-password">Senha</Label>
                  <Input
                    id="register-password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={errors.password ? 'border-destructive' : ''}
                  />
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password}</p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Criando conta...
                    </>
                  ) : (
                    'Criar Conta'
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <p className="mt-8 text-sm text-muted-foreground">
        © 2025 MaxCall. Todos os direitos reservados.
      </p>
    </div>
  );
}
