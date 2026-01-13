import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Wifi, 
  WifiOff, 
  Phone, 
  PhoneOff, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  AlertTriangle,
  Mic,
  Volume2,
  RefreshCw
} from 'lucide-react';
import { useSIPjs, SIPConfig } from '@/hooks/useSIPjs';
import { useToast } from '@/hooks/use-toast';

interface TestStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'warning';
  message?: string;
  duration?: number;
}

interface SIPConnectionTestProps {
  config?: Partial<SIPConfig>;
  onTestComplete?: (success: boolean) => void;
}

export function SIPConnectionTest({ config: initialConfig, onTestComplete }: SIPConnectionTestProps) {
  const { toast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [testProgress, setTestProgress] = useState(0);
  const [testSteps, setTestSteps] = useState<TestStep[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  
  const [config, setConfig] = useState<SIPConfig>({
    wssUrl: initialConfig?.wssUrl || '',
    realm: initialConfig?.realm || '',
    username: initialConfig?.username || '',
    password: initialConfig?.password || '',
    displayName: initialConfig?.displayName || '',
  });

  const {
    isRegistered,
    callState,
    connect,
    disconnect,
    registrationError,
  } = useSIPjs({
    onRegistrationStateChange: (registered) => {
      addLog(`[SIP] Registration state: ${registered ? 'Registered' : 'Unregistered'}`);
    },
    onError: (error) => {
      addLog(`[SIP] Error: ${error}`);
    },
  });

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  }, []);

  const updateStep = useCallback((id: string, updates: Partial<TestStep>) => {
    setTestSteps(prev => prev.map(step => 
      step.id === id ? { ...step, ...updates } : step
    ));
  }, []);

  const runTests = async () => {
    if (!config.wssUrl || !config.realm || !config.username || !config.password) {
      toast({
        title: 'Configuração incompleta',
        description: 'Preencha todos os campos obrigatórios',
        variant: 'destructive',
      });
      return;
    }

    setIsRunning(true);
    setTestProgress(0);
    setLogs([]);
    
    const steps: TestStep[] = [
      { id: 'websocket', name: 'Conexão WebSocket', status: 'pending' },
      { id: 'sip_register', name: 'Registro SIP', status: 'pending' },
      { id: 'microphone', name: 'Acesso ao Microfone', status: 'pending' },
      { id: 'audio_output', name: 'Saída de Áudio', status: 'pending' },
    ];
    
    setTestSteps(steps);
    addLog('Iniciando testes de conectividade...');

    let allPassed = true;

    try {
      // Test 1: WebSocket Connection
      updateStep('websocket', { status: 'running' });
      addLog(`Testando conexão WebSocket: ${config.wssUrl}`);
      setTestProgress(10);
      
      const wsStartTime = Date.now();
      const wsTestResult = await testWebSocketConnection(config.wssUrl);
      const wsDuration = Date.now() - wsStartTime;
      
      if (wsTestResult.success) {
        updateStep('websocket', { 
          status: 'success', 
          message: `Conectado em ${wsDuration}ms`,
          duration: wsDuration 
        });
        addLog(`WebSocket conectado com sucesso (${wsDuration}ms)`);
      } else {
        updateStep('websocket', { 
          status: 'error', 
          message: wsTestResult.error 
        });
        addLog(`Erro WebSocket: ${wsTestResult.error}`);
        allPassed = false;
      }
      setTestProgress(25);

      // Test 2: SIP Registration
      if (wsTestResult.success) {
        updateStep('sip_register', { status: 'running' });
        addLog('Tentando registro SIP...');
        
        const sipStartTime = Date.now();
        
        try {
          await connect(config);
          
          // Wait for registration (max 10 seconds)
          const registered = await waitForRegistration(5000);
          const sipDuration = Date.now() - sipStartTime;
          
          if (registered) {
            updateStep('sip_register', { 
              status: 'success', 
              message: `Registrado em ${sipDuration}ms`,
              duration: sipDuration 
            });
            addLog(`Registro SIP bem-sucedido (${sipDuration}ms)`);
          } else {
            updateStep('sip_register', { 
              status: 'error', 
              message: registrationError || 'Timeout de registro' 
            });
            addLog(`Erro de registro: ${registrationError || 'Timeout'}`);
            allPassed = false;
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
          updateStep('sip_register', { 
            status: 'error', 
            message: errorMsg 
          });
          addLog(`Erro de registro: ${errorMsg}`);
          allPassed = false;
        }
      } else {
        updateStep('sip_register', { 
          status: 'error', 
          message: 'WebSocket não conectado' 
        });
      }
      setTestProgress(50);

      // Test 3: Microphone Access
      updateStep('microphone', { status: 'running' });
      addLog('Testando acesso ao microfone...');
      
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const tracks = stream.getAudioTracks();
        
        if (tracks.length > 0) {
          updateStep('microphone', { 
            status: 'success', 
            message: `Dispositivo: ${tracks[0].label || 'Padrão'}` 
          });
          addLog(`Microfone acessado: ${tracks[0].label || 'Dispositivo padrão'}`);
          
          // Cleanup
          stream.getTracks().forEach(track => track.stop());
        } else {
          updateStep('microphone', { 
            status: 'warning', 
            message: 'Nenhum dispositivo de áudio encontrado' 
          });
          addLog('Aviso: Nenhum dispositivo de áudio encontrado');
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Erro de acesso';
        updateStep('microphone', { 
          status: 'error', 
          message: errorMsg 
        });
        addLog(`Erro de microfone: ${errorMsg}`);
        allPassed = false;
      }
      setTestProgress(75);

      // Test 4: Audio Output
      updateStep('audio_output', { status: 'running' });
      addLog('Testando saída de áudio...');
      
      try {
        const audioDevices = await navigator.mediaDevices.enumerateDevices();
        const audioOutputs = audioDevices.filter(d => d.kind === 'audiooutput');
        
        if (audioOutputs.length > 0) {
          updateStep('audio_output', { 
            status: 'success', 
            message: `${audioOutputs.length} dispositivo(s) encontrado(s)` 
          });
          addLog(`Dispositivos de saída: ${audioOutputs.length}`);
        } else {
          updateStep('audio_output', { 
            status: 'warning', 
            message: 'Nenhum dispositivo de saída listado' 
          });
          addLog('Aviso: Nenhum dispositivo de saída listado');
        }
      } catch (error) {
        updateStep('audio_output', { 
          status: 'warning', 
          message: 'Não foi possível enumerar dispositivos' 
        });
        addLog('Aviso: Enumeração de dispositivos não suportada');
      }
      setTestProgress(100);

    } catch (error) {
      addLog(`Erro geral: ${error}`);
      allPassed = false;
    } finally {
      // Cleanup
      try {
        await disconnect();
      } catch (e) {
        // Ignore cleanup errors
      }
      
      setIsRunning(false);
      addLog(allPassed ? 'Todos os testes passaram!' : 'Alguns testes falharam');
      onTestComplete?.(allPassed);
      
      toast({
        title: allPassed ? 'Testes concluídos' : 'Testes concluídos com erros',
        description: allPassed 
          ? 'Conexão SIP configurada corretamente' 
          : 'Verifique os logs para mais detalhes',
        variant: allPassed ? 'default' : 'destructive',
      });
    }
  };

  const testWebSocketConnection = async (url: string): Promise<{ success: boolean; error?: string }> => {
    return new Promise((resolve) => {
      try {
        const ws = new WebSocket(url);
        const timeout = setTimeout(() => {
          ws.close();
          resolve({ success: false, error: 'Timeout de conexão (5s)' });
        }, 5000);

        ws.onopen = () => {
          clearTimeout(timeout);
          ws.close();
          resolve({ success: true });
        };

        ws.onerror = () => {
          clearTimeout(timeout);
          resolve({ success: false, error: 'Erro de conexão WebSocket' });
        };

        ws.onclose = (event) => {
          if (!event.wasClean && event.code !== 1000) {
            clearTimeout(timeout);
            resolve({ success: false, error: `Conexão fechada: código ${event.code}` });
          }
        };
      } catch (error) {
        resolve({ success: false, error: 'URL WebSocket inválida' });
      }
    });
  };

  const waitForRegistration = (timeout: number): Promise<boolean> => {
    return new Promise((resolve) => {
      if (isRegistered) {
        resolve(true);
        return;
      }

      const checkInterval = setInterval(() => {
        if (isRegistered) {
          clearInterval(checkInterval);
          resolve(true);
        }
      }, 100);

      setTimeout(() => {
        clearInterval(checkInterval);
        resolve(isRegistered);
      }, timeout);
    });
  };

  const getStatusIcon = (status: TestStep['status']) => {
    switch (status) {
      case 'pending':
        return <div className="h-4 w-4 rounded-full bg-muted" />;
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />;
    }
  };

  const getStatusBadge = (status: TestStep['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pendente</Badge>;
      case 'running':
        return <Badge variant="outline">Executando...</Badge>;
      case 'success':
        return <Badge className="bg-green-500">Sucesso</Badge>;
      case 'warning':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-500">Aviso</Badge>;
      case 'error':
        return <Badge variant="destructive">Erro</Badge>;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wifi className="h-5 w-5" />
          Teste de Conectividade SIP
        </CardTitle>
        <CardDescription>
          Verifique se a configuração WebRTC/SIP está funcionando corretamente
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Configuration Form */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>WebSocket URL *</Label>
            <Input
              value={config.wssUrl}
              onChange={(e) => setConfig({ ...config, wssUrl: e.target.value })}
              placeholder="wss://webrtc.crivel.com.br"
              disabled={isRunning}
            />
          </div>
          <div className="space-y-2">
            <Label>Realm/Domínio *</Label>
            <Input
              value={config.realm}
              onChange={(e) => setConfig({ ...config, realm: e.target.value })}
              placeholder="crivel.com.br"
              disabled={isRunning}
            />
          </div>
          <div className="space-y-2">
            <Label>Usuário/Ramal *</Label>
            <Input
              value={config.username}
              onChange={(e) => setConfig({ ...config, username: e.target.value })}
              placeholder="1001"
              disabled={isRunning}
            />
          </div>
          <div className="space-y-2">
            <Label>Senha *</Label>
            <Input
              type="password"
              value={config.password}
              onChange={(e) => setConfig({ ...config, password: e.target.value })}
              placeholder="********"
              disabled={isRunning}
            />
          </div>
        </div>

        <div className="flex justify-between items-center">
          <Button 
            onClick={runTests} 
            disabled={isRunning}
            className="gap-2"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Executando Testes...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Executar Testes
              </>
            )}
          </Button>
          
          {testProgress > 0 && (
            <span className="text-sm text-muted-foreground">
              Progresso: {testProgress}%
            </span>
          )}
        </div>

        {testProgress > 0 && (
          <Progress value={testProgress} className="h-2" />
        )}

        {/* Test Results */}
        {testSteps.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="font-medium">Resultados dos Testes</h4>
              {testSteps.map((step) => (
                <div 
                  key={step.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(step.status)}
                    <div>
                      <p className="font-medium">{step.name}</p>
                      {step.message && (
                        <p className="text-sm text-muted-foreground">{step.message}</p>
                      )}
                    </div>
                  </div>
                  {getStatusBadge(step.status)}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Logs */}
        {logs.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="font-medium">Logs</h4>
              <ScrollArea className="h-48 rounded-md border bg-muted/30 p-3">
                <div className="space-y-1 font-mono text-xs">
                  {logs.map((log, index) => (
                    <div key={index} className="text-muted-foreground">
                      {log}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
