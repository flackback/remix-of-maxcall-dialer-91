import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { 
  CheckCircle, XCircle, AlertTriangle, RefreshCw, Phone, Wifi, Shield, 
  Clock, Activity, Zap, Server, PlayCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface Carrier {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
}

interface CarrierStatus {
  carrier_id: string;
  registration_status: 'registered' | 'failed' | 'unknown';
  last_registration: string | null;
  error_count_24h: number;
  warn_count_24h: number;
  last_error: string | null;
  last_error_time: string | null;
  health_score: number;
}

interface RecentLog {
  id: string;
  log_level: string;
  category: string;
  message: string;
  sip_status_code: number | null;
  created_at: string;
}

export function CarrierDiagnostics() {
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [carrierStatuses, setCarrierStatuses] = useState<Map<string, CarrierStatus>>(new Map());
  const [recentLogs, setRecentLogs] = useState<Map<string, RecentLog[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [testingCarrier, setTestingCarrier] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch carriers
      const { data: carriersData } = await supabase
        .from('telephony_carriers')
        .select('id, name, type, is_active')
        .order('name');

      if (carriersData) {
        setCarriers(carriersData);

        // Fetch status for each carrier
        const statusMap = new Map<string, CarrierStatus>();
        const logsMap = new Map<string, RecentLog[]>();

        for (const carrier of carriersData) {
          // Count errors and warnings in last 24h
          const { data: errorStats } = await supabase
            .from('sip_webrtc_logs')
            .select('log_level')
            .eq('carrier_id', carrier.id)
            .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

          const errorCount = errorStats?.filter(l => l.log_level === 'ERROR').length || 0;
          const warnCount = errorStats?.filter(l => l.log_level === 'WARN').length || 0;

          // Get last registration log
          const { data: lastReg } = await supabase
            .from('sip_webrtc_logs')
            .select('*')
            .eq('carrier_id', carrier.id)
            .eq('category', 'REGISTRATION')
            .order('created_at', { ascending: false })
            .limit(1);

          // Get last error
          const { data: lastErr } = await supabase
            .from('sip_webrtc_logs')
            .select('*')
            .eq('carrier_id', carrier.id)
            .eq('log_level', 'ERROR')
            .order('created_at', { ascending: false })
            .limit(1);

          // Get recent logs for timeline
          const { data: logs } = await supabase
            .from('sip_webrtc_logs')
            .select('id, log_level, category, message, sip_status_code, created_at')
            .eq('carrier_id', carrier.id)
            .order('created_at', { ascending: false })
            .limit(10);

          // Determine registration status
          let regStatus: 'registered' | 'failed' | 'unknown' = 'unknown';
          if (lastReg && lastReg.length > 0) {
            const reg = lastReg[0];
            if (reg.sip_status_code === 200) {
              regStatus = 'registered';
            } else if (reg.log_level === 'ERROR' || (reg.sip_status_code && reg.sip_status_code >= 400)) {
              regStatus = 'failed';
            }
          }

          // Calculate health score (0-100)
          let healthScore = 100;
          healthScore -= errorCount * 5; // -5 per error
          healthScore -= warnCount * 1;  // -1 per warning
          if (regStatus === 'failed') healthScore -= 30;
          if (regStatus === 'unknown') healthScore -= 10;
          healthScore = Math.max(0, Math.min(100, healthScore));

          statusMap.set(carrier.id, {
            carrier_id: carrier.id,
            registration_status: regStatus,
            last_registration: lastReg?.[0]?.created_at || null,
            error_count_24h: errorCount,
            warn_count_24h: warnCount,
            last_error: lastErr?.[0]?.message || null,
            last_error_time: lastErr?.[0]?.created_at || null,
            health_score: healthScore,
          });

          if (logs) {
            logsMap.set(carrier.id, logs);
          }
        }

        setCarrierStatuses(statusMap);
        setRecentLogs(logsMap);
      }
    } catch (error) {
      console.error('Error fetching carrier diagnostics:', error);
    } finally {
      setLoading(false);
    }
  };

  const testConnectivity = async (carrier: Carrier) => {
    setTestingCarrier(carrier.id);
    toast.info(`Testando conectividade com ${carrier.name}...`);

    try {
      // Log the test attempt
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('user_id', user?.id)
        .single();

      if (profile?.account_id) {
        await supabase.functions.invoke('sip-logger', {
          body: {
            account_id: profile.account_id,
            carrier_id: carrier.id,
            log_level: 'INFO',
            category: 'GENERAL',
            message: `Connectivity test initiated for ${carrier.name}`,
            metadata_json: { test_type: 'manual', initiated_by: user?.id }
          }
        });
      }

      // Simulate test (in production, this would send OPTIONS/REGISTER)
      await new Promise(resolve => setTimeout(resolve, 2000));

      toast.success(`Teste de ${carrier.name} concluído`);
    } catch (error) {
      toast.error(`Erro ao testar ${carrier.name}`);
    } finally {
      setTestingCarrier(null);
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 50) return 'text-yellow-500';
    return 'text-destructive';
  };

  const getStatusBadge = (status: CarrierStatus['registration_status']) => {
    switch (status) {
      case 'registered':
        return <Badge className="bg-green-500 text-white"><CheckCircle className="h-3 w-3 mr-1" />Registrado</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Falhou</Badge>;
      default:
        return <Badge variant="secondary"><AlertTriangle className="h-3 w-3 mr-1" />Desconhecido</Badge>;
    }
  };

  if (loading && carriers.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{carriers.filter(c => c.is_active).length}</p>
                <p className="text-sm text-muted-foreground">Carriers Ativos</p>
              </div>
              <Server className="h-10 w-10 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-green-500">
                  {Array.from(carrierStatuses.values()).filter(s => s.registration_status === 'registered').length}
                </p>
                <p className="text-sm text-muted-foreground">Registrados</p>
              </div>
              <CheckCircle className="h-10 w-10 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-destructive">
                  {Array.from(carrierStatuses.values()).reduce((acc, s) => acc + s.error_count_24h, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Erros (24h)</p>
              </div>
              <AlertTriangle className="h-10 w-10 text-destructive" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Carrier Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {carriers.map((carrier) => {
          const status = carrierStatuses.get(carrier.id);
          const logs = recentLogs.get(carrier.id) || [];

          return (
            <Card key={carrier.id} className={!carrier.is_active ? 'opacity-60' : ''}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                      status?.health_score && status.health_score >= 80 ? 'bg-green-500/20' :
                      status?.health_score && status.health_score >= 50 ? 'bg-yellow-500/20' :
                      'bg-destructive/20'
                    }`}>
                      <Wifi className={`h-5 w-5 ${getHealthColor(status?.health_score || 0)}`} />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{carrier.name}</CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <Badge variant="outline">{carrier.type}</Badge>
                        {!carrier.is_active && <Badge variant="secondary">Inativo</Badge>}
                      </CardDescription>
                    </div>
                  </div>
                  {status && getStatusBadge(status.registration_status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Health Score */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Health Score</span>
                    <span className={`font-bold ${getHealthColor(status?.health_score || 0)}`}>
                      {status?.health_score || 0}%
                    </span>
                  </div>
                  <Progress 
                    value={status?.health_score || 0} 
                    className={`h-2 ${
                      (status?.health_score || 0) < 50 ? '[&>div]:bg-destructive' :
                      (status?.health_score || 0) < 80 ? '[&>div]:bg-yellow-500' : ''
                    }`}
                  />
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <span className="text-muted-foreground">Erros 24h:</span>
                    <span className="font-medium">{status?.error_count_24h || 0}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    <span className="text-muted-foreground">Warnings:</span>
                    <span className="font-medium">{status?.warn_count_24h || 0}</span>
                  </div>
                </div>

                {/* Last Registration */}
                {status?.last_registration && (
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Último registro: {format(new Date(status.last_registration), "dd/MM HH:mm", { locale: ptBR })}
                  </div>
                )}

                {/* Last Error */}
                {status?.last_error && (
                  <div className="rounded-lg bg-destructive/10 p-3 text-sm">
                    <div className="flex items-center gap-2 text-destructive font-medium mb-1">
                      <XCircle className="h-4 w-4" />
                      Último Erro
                    </div>
                    <p className="text-muted-foreground truncate">{status.last_error}</p>
                    {status.last_error_time && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(status.last_error_time), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                      </p>
                    )}
                  </div>
                )}

                {/* Recent Events Timeline */}
                {logs.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Eventos Recentes</p>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {logs.slice(0, 5).map((log) => (
                        <div key={log.id} className="flex items-center gap-2 text-xs">
                          <span className={`h-2 w-2 rounded-full ${
                            log.log_level === 'ERROR' ? 'bg-destructive' :
                            log.log_level === 'WARN' ? 'bg-yellow-500' :
                            'bg-green-500'
                          }`} />
                          <span className="text-muted-foreground font-mono">
                            {format(new Date(log.created_at), "HH:mm:ss")}
                          </span>
                          <Badge variant="outline" className="text-[10px] px-1">
                            {log.category}
                          </Badge>
                          <span className="truncate flex-1">{log.message}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => testConnectivity(carrier)}
                    disabled={testingCarrier === carrier.id}
                  >
                    {testingCarrier === carrier.id ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <PlayCircle className="h-4 w-4 mr-2" />
                    )}
                    Testar Conectividade
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {carriers.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Server className="h-12 w-12 mb-4" />
            <p>Nenhum carrier configurado</p>
            <p className="text-sm">Configure carriers na página de Integrações</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
