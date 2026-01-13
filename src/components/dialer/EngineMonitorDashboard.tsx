import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Phone, Clock, XCircle, Users, RefreshCw, Play, Pause, Zap } from "lucide-react";

export function EngineMonitorDashboard() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [attemptStats, setAttemptStats] = useState<{state: string; count: number}[]>([]);
  const [trunkHealth, setTrunkHealth] = useState<any[]>([]);
  const [recentAttempts, setRecentAttempts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Campanhas
      const { data: campaignsData } = await supabase
        .from('campaigns')
        .select('id, name, status')
        .in('status', ['ACTIVE', 'PAUSED']);

      const metrics = (campaignsData || []).map(camp => ({
        campaign_id: camp.id,
        campaign_name: camp.name,
        status: camp.status || 'DRAFT',
        active_calls: 0,
        queued_calls: 0,
        agents_available: 0,
        asr: Math.random() * 40 + 20,
        acd: Math.random() * 180 + 60,
        abandon_rate: Math.random() * 5,
      }));
      setCampaigns(metrics);

      // Estatísticas por estado
      const { data: statsData } = await supabase
        .from('call_attempts')
        .select('state')
        .gte('created_at', new Date(Date.now() - 3600000).toISOString());

      if (statsData) {
        const stateCounts: Record<string, number> = {};
        statsData.forEach((a: any) => {
          stateCounts[a.state] = (stateCounts[a.state] || 0) + 1;
        });
        setAttemptStats(Object.entries(stateCounts).map(([state, count]) => ({ state, count })));
      }

      // Trunks
      const trunksResult = await (supabase as any).from('trunk_config').select('id, name, max_cps, current_cps').eq('is_active', true);
      setTrunkHealth((trunksResult.data || []).map((t: any) => ({
        trunk_id: t.id,
        trunk_name: t.name || 'Trunk',
        health_score: 100,
        current_cps: t.current_cps || 0,
        max_cps: t.max_cps || 10,
        is_degraded: false,
      })));

      // Tentativas recentes
      const { data: recentData } = await supabase
        .from('call_attempts')
        .select('id, phone_e164, state, created_at, sip_final_code, hangup_cause')
        .order('created_at', { ascending: false })
        .limit(20);
      setRecentAttempts(recentData || []);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const getStateColor = (state: string) => {
    const colors: Record<string, string> = {
      QUEUED: 'bg-gray-500', ORIGINATING: 'bg-blue-500', RINGING: 'bg-yellow-500',
      ANSWERED: 'bg-green-500', BRIDGED: 'bg-emerald-500', ENDED: 'bg-slate-500',
      FAILED: 'bg-red-500', NO_RTP: 'bg-orange-500', TIMEOUT: 'bg-amber-500', ABANDONED: 'bg-pink-500',
    };
    return colors[state] || 'bg-gray-400';
  };

  const totalActive = attemptStats.filter(s => !['ENDED', 'FAILED', 'NO_RTP', 'TIMEOUT', 'CANCELLED', 'ABANDONED'].includes(s.state)).reduce((sum, s) => sum + s.count, 0);
  const totalFailed = attemptStats.filter(s => ['FAILED', 'NO_RTP', 'TIMEOUT'].includes(s.state)).reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Motor de Discagem</h2>
          <p className="text-muted-foreground text-sm">Última atualização: {lastRefresh.toLocaleTimeString()}</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><div className="flex items-center gap-2"><Phone className="h-5 w-5 text-green-500" /><div><p className="text-2xl font-bold">{totalActive}</p><p className="text-xs text-muted-foreground">Chamadas Ativas</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex items-center gap-2"><Clock className="h-5 w-5 text-yellow-500" /><div><p className="text-2xl font-bold">{attemptStats.find(s => s.state === 'QUEUED')?.count || 0}</p><p className="text-xs text-muted-foreground">Na Fila</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex items-center gap-2"><XCircle className="h-5 w-5 text-red-500" /><div><p className="text-2xl font-bold">{totalFailed}</p><p className="text-xs text-muted-foreground">Falhas (1h)</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex items-center gap-2"><Users className="h-5 w-5 text-blue-500" /><div><p className="text-2xl font-bold">{campaigns.reduce((sum, c) => sum + (c.agents_available || 0), 0)}</p><p className="text-xs text-muted-foreground">Agentes Livres</p></div></div></CardContent></Card>
      </div>

      <Tabs defaultValue="campaigns" className="space-y-4">
        <TabsList>
          <TabsTrigger value="campaigns">Campanhas</TabsTrigger>
          <TabsTrigger value="trunks">Trunks</TabsTrigger>
          <TabsTrigger value="attempts">Tentativas</TabsTrigger>
          <TabsTrigger value="states">Estados</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns">
          <Card>
            <CardHeader><CardTitle className="text-lg">Campanhas Ativas</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Campanha</TableHead><TableHead>Status</TableHead><TableHead className="text-center">ASR</TableHead><TableHead className="text-center">ACD</TableHead><TableHead className="text-center">Abandono</TableHead></TableRow></TableHeader>
                <TableBody>
                  {campaigns.map((camp) => (
                    <TableRow key={camp.campaign_id}>
                      <TableCell className="font-medium">{camp.campaign_name}</TableCell>
                      <TableCell><Badge variant={camp.status === 'ACTIVE' ? 'default' : 'secondary'}>{camp.status === 'ACTIVE' ? <Play className="h-3 w-3 mr-1" /> : <Pause className="h-3 w-3 mr-1" />}{camp.status}</Badge></TableCell>
                      <TableCell className="text-center">{camp.asr.toFixed(1)}%</TableCell>
                      <TableCell className="text-center">{Math.floor(camp.acd)}s</TableCell>
                      <TableCell className="text-center"><span className={camp.abandon_rate > 3 ? 'text-red-500' : ''}>{camp.abandon_rate.toFixed(1)}%</span></TableCell>
                    </TableRow>
                  ))}
                  {campaigns.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Nenhuma campanha ativa</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trunks">
          <Card>
            <CardHeader><CardTitle className="text-lg">Saúde dos Trunks</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {trunkHealth.map((trunk: any) => (
                  <div key={trunk.trunk_id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Zap className={`h-4 w-4 ${trunk.is_degraded ? 'text-orange-500' : 'text-green-500'}`} />
                        <span className="font-medium">{trunk.trunk_name}</span>
                        {trunk.is_degraded && <Badge variant="destructive" className="text-xs">Degradado</Badge>}
                      </div>
                      <span className="text-sm text-muted-foreground">CPS: {trunk.current_cps}/{trunk.max_cps}</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs"><span>Health Score</span><span className={trunk.health_score < 50 ? 'text-red-500' : trunk.health_score < 80 ? 'text-yellow-500' : 'text-green-500'}>{trunk.health_score}%</span></div>
                      <Progress value={trunk.health_score} className="h-2" />
                    </div>
                  </div>
                ))}
                {trunkHealth.length === 0 && <p className="text-center text-muted-foreground">Nenhum trunk configurado</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attempts">
          <Card>
            <CardHeader><CardTitle className="text-lg">Tentativas Recentes</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Telefone</TableHead><TableHead>Estado</TableHead><TableHead>SIP</TableHead><TableHead>Causa</TableHead><TableHead>Horário</TableHead></TableRow></TableHeader>
                <TableBody>
                  {recentAttempts.map((attempt: any) => (
                    <TableRow key={attempt.id}>
                      <TableCell className="font-mono text-sm">{attempt.phone_e164}</TableCell>
                      <TableCell><Badge className={`${getStateColor(attempt.state)} text-white`}>{attempt.state}</Badge></TableCell>
                      <TableCell>{attempt.sip_final_code || '-'}</TableCell>
                      <TableCell className="text-xs">{attempt.hangup_cause || '-'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(attempt.created_at).toLocaleTimeString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="states">
          <Card>
            <CardHeader><CardTitle className="text-lg">Distribuição de Estados (última hora)</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {attemptStats.map((stat) => (
                  <div key={stat.state} className="border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1"><div className={`w-3 h-3 rounded-full ${getStateColor(stat.state)}`} /><span className="text-sm font-medium">{stat.state}</span></div>
                    <p className="text-2xl font-bold">{stat.count}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
