import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { 
  Search, RefreshCw, Download, AlertCircle, AlertTriangle, Info, Bug,
  ChevronDown, ChevronRight, Phone, Wifi, Shield, Clock, Filter
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SIPLog {
  id: string;
  carrier_id: string | null;
  session_id: string | null;
  log_level: string;
  category: string;
  message: string;
  sip_method: string | null;
  sip_status_code: number | null;
  sip_status_text: string | null;
  sip_call_id: string | null;
  error_code: string | null;
  error_description: string | null;
  stack_trace: string | null;
  ice_state: string | null;
  created_at: string;
  metadata_json: Record<string, any>;
}

interface Carrier {
  id: string;
  name: string;
}

export function SIPLogsViewer() {
  const [logs, setLogs] = useState<SIPLog[]>([]);
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [carrierFilter, setCarrierFilter] = useState<string>('all');

  useEffect(() => {
    fetchCarriers();
    fetchLogs();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel('sip-logs-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sip_webrtc_logs' },
        (payload) => {
          setLogs(prev => [payload.new as SIPLog, ...prev.slice(0, 199)]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchCarriers = async () => {
    const { data } = await supabase
      .from('telephony_carriers')
      .select('id, name')
      .order('name');
    if (data) setCarriers(data);
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('sip_webrtc_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (levelFilter !== 'all') {
        query = query.eq('log_level', levelFilter);
      }
      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }
      if (carrierFilter !== 'all') {
        query = query.eq('carrier_id', carrierFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setLogs((data || []) as SIPLog[]);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [levelFilter, categoryFilter, carrierFilter]);

  const toggleExpand = (logId: string) => {
    setExpandedLogs(prev => {
      const next = new Set(prev);
      if (next.has(logId)) {
        next.delete(logId);
      } else {
        next.add(logId);
      }
      return next;
    });
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'ERROR': return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'WARN': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'DEBUG': return <Bug className="h-4 w-4 text-muted-foreground" />;
      default: return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getLevelBadge = (level: string) => {
    const variants: Record<string, string> = {
      ERROR: 'bg-destructive text-destructive-foreground',
      WARN: 'bg-yellow-500 text-white',
      INFO: 'bg-blue-500 text-white',
      DEBUG: 'bg-muted text-muted-foreground',
    };
    return <Badge className={variants[level] || variants.INFO}>{level}</Badge>;
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'REGISTRATION':
      case 'AUTH': return <Shield className="h-4 w-4" />;
      case 'INVITE':
      case 'BYE': return <Phone className="h-4 w-4" />;
      case 'ICE':
      case 'TRANSPORT': return <Wifi className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  const filteredLogs = logs.filter(log => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      log.message.toLowerCase().includes(search) ||
      log.sip_call_id?.toLowerCase().includes(search) ||
      log.error_code?.toLowerCase().includes(search) ||
      log.session_id?.toLowerCase().includes(search)
    );
  });

  const exportLogs = () => {
    const csv = [
      ['Timestamp', 'Level', 'Category', 'Message', 'SIP Method', 'Status Code', 'Error Code', 'Session ID'].join(','),
      ...filteredLogs.map(log => [
        log.created_at,
        log.log_level,
        log.category,
        `"${log.message.replace(/"/g, '""')}"`,
        log.sip_method || '',
        log.sip_status_code || '',
        log.error_code || '',
        log.session_id || '',
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sip-logs-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`;
    a.click();
  };

  const errorCount = logs.filter(l => l.log_level === 'ERROR').length;
  const warnCount = logs.filter(l => l.log_level === 'WARN').length;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{logs.length}</p>
                <p className="text-sm text-muted-foreground">Total Logs</p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className={errorCount > 0 ? 'border-destructive' : ''}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-destructive">{errorCount}</p>
                <p className="text-sm text-muted-foreground">Erros</p>
              </div>
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
        <Card className={warnCount > 0 ? 'border-yellow-500' : ''}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-yellow-500">{warnCount}</p>
                <p className="text-sm text-muted-foreground">Warnings</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{carriers.length}</p>
                <p className="text-sm text-muted-foreground">Carriers</p>
              </div>
              <Wifi className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 py-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por mensagem, SIP Call-ID, session..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Nível" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos níveis</SelectItem>
              <SelectItem value="ERROR">ERROR</SelectItem>
              <SelectItem value="WARN">WARN</SelectItem>
              <SelectItem value="INFO">INFO</SelectItem>
              <SelectItem value="DEBUG">DEBUG</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              <SelectItem value="REGISTRATION">Registration</SelectItem>
              <SelectItem value="INVITE">Invite</SelectItem>
              <SelectItem value="BYE">Bye</SelectItem>
              <SelectItem value="ICE">ICE</SelectItem>
              <SelectItem value="AUTH">Auth</SelectItem>
              <SelectItem value="TRANSPORT">Transport</SelectItem>
              <SelectItem value="MEDIA">Media</SelectItem>
            </SelectContent>
          </Select>
          <Select value={carrierFilter} onValueChange={setCarrierFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Carrier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos carriers</SelectItem>
              {carriers.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={fetchLogs} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="outline" onClick={exportLogs}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </CardContent>
      </Card>

      {/* Logs List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Logs SIP/WebRTC
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" title="Tempo real" />
              </CardTitle>
              <CardDescription>
                {filteredLogs.length} logs exibidos
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Filter className="h-12 w-12 mb-4" />
                <p>Nenhum log encontrado</p>
                <p className="text-sm">Ajuste os filtros ou aguarde novos eventos</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredLogs.map((log) => (
                  <Collapsible key={log.id} open={expandedLogs.has(log.id)}>
                    <div className={`rounded-lg border p-3 ${
                      log.log_level === 'ERROR' ? 'border-destructive/50 bg-destructive/5' :
                      log.log_level === 'WARN' ? 'border-yellow-500/50 bg-yellow-500/5' : ''
                    }`}>
                      <CollapsibleTrigger 
                        className="w-full"
                        onClick={() => toggleExpand(log.id)}
                      >
                        <div className="flex items-center gap-3">
                          {expandedLogs.has(log.id) ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                          {getLevelIcon(log.log_level)}
                          <span className="text-xs text-muted-foreground font-mono">
                            {format(new Date(log.created_at), 'HH:mm:ss.SSS', { locale: ptBR })}
                          </span>
                          <Badge variant="outline" className="flex items-center gap-1">
                            {getCategoryIcon(log.category)}
                            {log.category}
                          </Badge>
                          {log.sip_method && (
                            <Badge variant="secondary">{log.sip_method}</Badge>
                          )}
                          {log.sip_status_code && (
                            <Badge variant={log.sip_status_code >= 400 ? 'destructive' : 'default'}>
                              {log.sip_status_code} {log.sip_status_text}
                            </Badge>
                          )}
                          <span className="flex-1 text-left text-sm truncate">
                            {log.message}
                          </span>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="mt-3 pt-3 border-t space-y-2 text-sm">
                          <div className="grid grid-cols-2 gap-4">
                            {log.session_id && (
                              <div>
                                <span className="text-muted-foreground">Session ID:</span>
                                <code className="ml-2 text-xs bg-muted px-1 rounded">{log.session_id}</code>
                              </div>
                            )}
                            {log.sip_call_id && (
                              <div>
                                <span className="text-muted-foreground">SIP Call-ID:</span>
                                <code className="ml-2 text-xs bg-muted px-1 rounded">{log.sip_call_id}</code>
                              </div>
                            )}
                            {log.error_code && (
                              <div>
                                <span className="text-muted-foreground">Error Code:</span>
                                <code className="ml-2 text-xs bg-destructive/20 text-destructive px-1 rounded">{log.error_code}</code>
                              </div>
                            )}
                            {log.ice_state && (
                              <div>
                                <span className="text-muted-foreground">ICE State:</span>
                                <code className="ml-2 text-xs bg-muted px-1 rounded">{log.ice_state}</code>
                              </div>
                            )}
                          </div>
                          {log.error_description && (
                            <div className="bg-destructive/10 rounded p-2 text-destructive">
                              <strong>Error:</strong> {log.error_description}
                            </div>
                          )}
                          {log.stack_trace && (
                            <details className="text-xs">
                              <summary className="cursor-pointer text-muted-foreground">Stack Trace</summary>
                              <pre className="mt-2 bg-muted p-2 rounded overflow-x-auto">
                                {log.stack_trace}
                              </pre>
                            </details>
                          )}
                          {Object.keys(log.metadata_json || {}).length > 0 && (
                            <details className="text-xs">
                              <summary className="cursor-pointer text-muted-foreground">Metadata</summary>
                              <pre className="mt-2 bg-muted p-2 rounded overflow-x-auto">
                                {JSON.stringify(log.metadata_json, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
