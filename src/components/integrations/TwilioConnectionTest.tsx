import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Phone, 
  RefreshCw,
  TestTube,
  List
} from 'lucide-react';

interface TwilioConnectionTestProps {
  carrierId?: string;
  accountSid?: string;
  authToken?: string;
}

interface TestResult {
  status: 'idle' | 'loading' | 'success' | 'error';
  message?: string;
  data?: any;
}

export function TwilioConnectionTest({ carrierId, accountSid, authToken }: TwilioConnectionTestProps) {
  const { toast } = useToast();
  const [testNumber, setTestNumber] = useState('');
  const [credentialsTest, setCredentialsTest] = useState<TestResult>({ status: 'idle' });
  const [numbersTest, setNumbersTest] = useState<TestResult>({ status: 'idle' });
  const [callTest, setCallTest] = useState<TestResult>({ status: 'idle' });

  const testCredentials = async () => {
    if (!accountSid || !authToken) {
      toast({ title: 'Preencha Account SID e Auth Token', variant: 'destructive' });
      return;
    }

    setCredentialsTest({ status: 'loading' });
    
    try {
      const { data, error } = await supabase.functions.invoke('twilio-handler', {
        body: {
          action: 'verify',
          credentials: { account_sid: accountSid, auth_token: authToken }
        }
      });

      if (error) throw error;
      
      if (data?.success) {
        setCredentialsTest({ 
          status: 'success', 
          message: 'Credenciais válidas!',
          data: data.account
        });
      } else {
        throw new Error(data?.error || 'Credenciais inválidas');
      }
    } catch (error) {
      console.error('Credentials test error:', error);
      setCredentialsTest({ 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Erro ao verificar credenciais'
      });
    }
  };

  const listNumbers = async () => {
    if (!accountSid || !authToken) {
      toast({ title: 'Preencha Account SID e Auth Token', variant: 'destructive' });
      return;
    }

    setNumbersTest({ status: 'loading' });
    
    try {
      const { data, error } = await supabase.functions.invoke('twilio-handler', {
        body: {
          action: 'list_numbers',
          credentials: { account_sid: accountSid, auth_token: authToken }
        }
      });

      if (error) throw error;
      
      if (data?.success) {
        setNumbersTest({ 
          status: 'success', 
          message: `${data.numbers?.length || 0} números encontrados`,
          data: data.numbers
        });
      } else {
        throw new Error(data?.error || 'Erro ao listar números');
      }
    } catch (error) {
      console.error('List numbers error:', error);
      setNumbersTest({ 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Erro ao listar números'
      });
    }
  };

  const makeTestCall = async () => {
    if (!carrierId) {
      toast({ title: 'Salve o carrier antes de fazer uma chamada de teste', variant: 'destructive' });
      return;
    }
    if (!testNumber) {
      toast({ title: 'Digite um número para teste', variant: 'destructive' });
      return;
    }

    setCallTest({ status: 'loading' });
    
    try {
      const { data, error } = await supabase.functions.invoke('twilio-handler', {
        body: {
          action: 'originate',
          carrier_id: carrierId,
          to: testNumber
        }
      });

      if (error) throw error;
      
      if (data?.success) {
        setCallTest({ 
          status: 'success', 
          message: 'Chamada iniciada!',
          data: { call_sid: data.call_sid, status: data.status }
        });
        toast({ title: 'Chamada de teste iniciada', description: `SID: ${data.call_sid}` });
      } else {
        throw new Error(data?.error || 'Erro ao iniciar chamada');
      }
    } catch (error) {
      console.error('Test call error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Erro ao fazer chamada';
      const isTrialError = errorMsg.toLowerCase().includes('unverified') || errorMsg.toLowerCase().includes('trial');
      setCallTest({ 
        status: 'error', 
        message: isTrialError 
          ? 'Conta Trial: verifique o número no painel Twilio antes de ligar'
          : errorMsg
      });
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'loading': return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'success': return <CheckCircle2 className="h-4 w-4 text-status-ready" />;
      case 'error': return <XCircle className="h-4 w-4 text-destructive" />;
      default: return null;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    switch (status) {
      case 'loading': return <Badge variant="secondary">Testando...</Badge>;
      case 'success': return <Badge className="bg-status-ready/20 text-status-ready border-status-ready/30">Sucesso</Badge>;
      case 'error': return <Badge variant="destructive">Falhou</Badge>;
      default: return <Badge variant="outline">Não testado</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Test Credentials */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TestTube className="h-4 w-4" />
              Verificar Credenciais
            </div>
            {getStatusBadge(credentialsTest.status)}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Verifica se Account SID e Auth Token são válidos na API Twilio
          </p>
          <Button 
            onClick={testCredentials} 
            disabled={credentialsTest.status === 'loading'}
            size="sm"
            className="w-full"
          >
            {credentialsTest.status === 'loading' ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Verificando...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Testar Credenciais
              </>
            )}
          </Button>
          {credentialsTest.message && (
            <div className={`flex items-center gap-2 text-sm ${credentialsTest.status === 'error' ? 'text-destructive' : 'text-status-ready'}`}>
              {getStatusIcon(credentialsTest.status)}
              {credentialsTest.message}
            </div>
          )}
          {credentialsTest.data && (
            <div className="text-xs bg-muted/50 rounded p-2 space-y-1">
              <div>Status: <strong>{credentialsTest.data.status}</strong></div>
              <div>Nome: <strong>{credentialsTest.data.friendly_name}</strong></div>
              <div>Tipo: <strong>{credentialsTest.data.type}</strong></div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* List Numbers */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <List className="h-4 w-4" />
              Números Disponíveis
            </div>
            {getStatusBadge(numbersTest.status)}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Lista os números de telefone da sua conta Twilio
          </p>
          <Button 
            onClick={listNumbers} 
            disabled={numbersTest.status === 'loading'}
            size="sm"
            variant="outline"
            className="w-full"
          >
            {numbersTest.status === 'loading' ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Buscando...
              </>
            ) : (
              <>
                <List className="h-4 w-4 mr-2" />
                Listar Números
              </>
            )}
          </Button>
          {numbersTest.message && (
            <div className={`flex items-center gap-2 text-sm ${numbersTest.status === 'error' ? 'text-destructive' : 'text-status-ready'}`}>
              {getStatusIcon(numbersTest.status)}
              {numbersTest.message}
            </div>
          )}
          {numbersTest.data && numbersTest.data.length > 0 && (
            <div className="text-xs space-y-1 max-h-32 overflow-y-auto">
              {numbersTest.data.map((num: any, i: number) => (
                <div key={i} className="flex items-center justify-between bg-muted/50 rounded px-2 py-1">
                  <span className="font-mono">{num.phone_number}</span>
                  <Badge variant="outline" className="text-[10px]">{num.friendly_name}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Call */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Chamada de Teste
            </div>
            {getStatusBadge(callTest.status)}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Faz uma chamada de teste para verificar se a integração está funcionando
          </p>
          <div className="space-y-2">
            <Label className="text-xs">Número para teste</Label>
            <Input
              value={testNumber}
              onChange={(e) => setTestNumber(e.target.value)}
              placeholder="+5511999999999"
              className="font-mono text-sm"
            />
          </div>
          <Button 
            onClick={makeTestCall} 
            disabled={callTest.status === 'loading' || !carrierId}
            size="sm"
            variant="default"
            className="w-full"
          >
            {callTest.status === 'loading' ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Discando...
              </>
            ) : (
              <>
                <Phone className="h-4 w-4 mr-2" />
                Fazer Chamada de Teste
              </>
            )}
          </Button>
          {!carrierId && (
            <p className="text-xs text-muted-foreground text-center">
              Salve o carrier primeiro para fazer chamadas de teste
            </p>
          )}
          {callTest.message && (
            <div className={`flex items-center gap-2 text-sm ${callTest.status === 'error' ? 'text-destructive' : 'text-status-ready'}`}>
              {getStatusIcon(callTest.status)}
              {callTest.message}
            </div>
          )}
          {callTest.data && (
            <div className="text-xs bg-muted/50 rounded p-2">
              <div>Call SID: <code className="text-[10px]">{callTest.data.call_sid}</code></div>
              <div>Status: <strong>{callTest.data.status}</strong></div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
