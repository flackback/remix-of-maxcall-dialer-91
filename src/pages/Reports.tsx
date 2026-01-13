import { useState } from 'react';
import { CallsChart } from '@/components/dashboard/CallsChart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useReportsData } from '@/hooks/useReportsData';
import { Download, Calendar, BarChart3, Users, Phone, Target, Clock, TrendingUp, TrendingDown } from 'lucide-react';

type DateRangeType = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

export default function Reports() {
  const [dateRange, setDateRange] = useState<DateRangeType>('today');
  const [selectedCampaign, setSelectedCampaign] = useState('all');

  const { campaigns, agents, queues, hourlyStats, summary, loading, campaignsList } = useReportsData(dateRange, selectedCampaign);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTrend = (current: number, previous: number) => {
    if (previous === 0) return { value: 0, direction: 'neutral' as const };
    const change = ((current - previous) / previous) * 100;
    return {
      value: Math.abs(change).toFixed(1),
      direction: change > 0 ? 'up' as const : change < 0 ? 'down' as const : 'neutral' as const,
    };
  };

  const handleExport = (type: string) => {
    // Export to CSV
    let csvContent = '';
    let filename = '';

    if (type === 'campaigns') {
      csvContent = 'Campanha,Modo,Tentativas,Contatos,Contact Rate,Conversões,Conv. Rate,AHT,Abandono\n';
      campaigns.forEach(c => {
        csvContent += `${c.name},${c.mode},${c.totalCalls},${c.answered},${c.contactRate.toFixed(1)}%,${c.conversions},${c.conversionRate.toFixed(1)}%,${formatTime(c.aht)},${c.abandonRate.toFixed(1)}%\n`;
      });
      filename = `relatorio-campanhas-${dateRange}.csv`;
    } else if (type === 'agents') {
      csvContent = 'Agente,Equipe,Chamadas,AHT,Conversões,Conv. Rate,Aderência\n';
      agents.forEach(a => {
        csvContent += `${a.name},${a.teamId || 'N/A'},${a.callsHandled},${formatTime(a.aht)},${a.conversions},${a.conversionRate.toFixed(1)}%,${a.adherence.toFixed(1)}%\n`;
      });
      filename = `relatorio-agentes-${dateRange}.csv`;
    } else if (type === 'queues') {
      csvContent = 'Fila,Tipo,Chamadas,Atendidas,Abandonadas,Tempo Médio,SLA Target,SLA Atual\n';
      queues.forEach(q => {
        csvContent += `${q.name},${q.type},${q.totalCalls},${q.answered},${q.abandoned},${q.avgWaitTime}s,${q.slaTarget}s,${q.slaPercentage.toFixed(1)}%\n`;
      });
      filename = `relatorio-filas-${dateRange}.csv`;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  const callsTrend = getTrend(summary.totalCalls, summary.prevTotalCalls);
  const contactTrend = getTrend(summary.contactRate, summary.prevContactRate);
  const ahtTrend = getTrend(summary.avgAht, summary.prevAvgAht);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Filters */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 py-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRangeType)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="yesterday">Ontem</SelectItem>
                <SelectItem value="week">Esta Semana</SelectItem>
                <SelectItem value="month">Este Mês</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Campanha" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas Campanhas</SelectItem>
              {campaignsList.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex-1" />
          <Button variant="outline" onClick={() => handleExport('campaigns')}>
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="campaigns" className="space-y-4">
        <TabsList>
          <TabsTrigger value="campaigns">
            <Phone className="mr-2 h-4 w-4" />
            Campanhas
          </TabsTrigger>
          <TabsTrigger value="agents">
            <Users className="mr-2 h-4 w-4" />
            Agentes
          </TabsTrigger>
          <TabsTrigger value="queues">
            <BarChart3 className="mr-2 h-4 w-4" />
            Filas / SLA
          </TabsTrigger>
        </TabsList>

        {/* Campaigns Report */}
        <TabsContent value="campaigns" className="space-y-4">
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span className="text-sm">Total Chamadas</span>
                </div>
                {loading ? (
                  <Skeleton className="h-8 w-24 mt-1" />
                ) : (
                  <>
                    <p className="text-3xl font-bold">{summary.totalCalls.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      {callsTrend.direction === 'up' && <TrendingUp className="h-3 w-3 text-metric-positive" />}
                      {callsTrend.direction === 'down' && <TrendingDown className="h-3 w-3 text-metric-negative" />}
                      {callsTrend.value}% vs período anterior
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Target className="h-4 w-4" />
                  <span className="text-sm">Contact Rate</span>
                </div>
                {loading ? (
                  <Skeleton className="h-8 w-24 mt-1" />
                ) : (
                  <>
                    <p className="text-3xl font-bold text-metric-positive">{summary.contactRate.toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      {contactTrend.direction === 'up' && <TrendingUp className="h-3 w-3 text-metric-positive" />}
                      {contactTrend.direction === 'down' && <TrendingDown className="h-3 w-3 text-metric-negative" />}
                      {contactTrend.value}% vs período anterior
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-sm">Conversão</span>
                </div>
                {loading ? (
                  <Skeleton className="h-8 w-24 mt-1" />
                ) : (
                  <p className="text-3xl font-bold text-metric-positive">{summary.conversionRate.toFixed(1)}%</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">AHT Médio</span>
                </div>
                {loading ? (
                  <Skeleton className="h-8 w-24 mt-1" />
                ) : (
                  <>
                    <p className="text-3xl font-bold">{formatTime(summary.avgAht)}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      {ahtTrend.direction === 'down' && <TrendingUp className="h-3 w-3 text-metric-positive" />}
                      {ahtTrend.direction === 'up' && <TrendingDown className="h-3 w-3 text-metric-negative" />}
                      {ahtTrend.value}s vs período anterior
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Volume por Hora</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <CallsChart data={hourlyStats} />
              )}
            </CardContent>
          </Card>

          {/* Campaign Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Performance por Campanha</CardTitle>
              <Button variant="outline" size="sm" onClick={() => handleExport('campaigns')}>
                <Download className="mr-2 h-4 w-4" />
                Exportar
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : campaigns.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhum dado disponível para o período selecionado</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campanha</TableHead>
                      <TableHead>Modo</TableHead>
                      <TableHead className="text-center">Tentativas</TableHead>
                      <TableHead className="text-center">Contatos</TableHead>
                      <TableHead className="text-center">Contact Rate</TableHead>
                      <TableHead className="text-center">Conversões</TableHead>
                      <TableHead className="text-center">Conv. Rate</TableHead>
                      <TableHead className="text-center">AHT</TableHead>
                      <TableHead className="text-center">Abandono</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaigns.map((campaign) => (
                      <TableRow key={campaign.id}>
                        <TableCell className="font-medium">{campaign.name}</TableCell>
                        <TableCell><Badge variant="outline">{campaign.mode}</Badge></TableCell>
                        <TableCell className="text-center">{campaign.totalCalls.toLocaleString()}</TableCell>
                        <TableCell className="text-center">{campaign.answered.toLocaleString()}</TableCell>
                        <TableCell className="text-center">
                          <span className={campaign.contactRate >= 60 ? 'text-metric-positive' : 'text-metric-warning'}>
                            {campaign.contactRate.toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell className="text-center text-metric-positive">{campaign.conversions.toLocaleString()}</TableCell>
                        <TableCell className="text-center">
                          <span className={campaign.conversionRate >= 15 ? 'text-metric-positive' : 'text-metric-warning'}>
                            {campaign.conversionRate.toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell className="text-center font-mono">{formatTime(campaign.aht)}</TableCell>
                        <TableCell className="text-center">
                          <span className={campaign.abandonRate <= 3 ? 'text-metric-positive' : 'text-metric-negative'}>
                            {campaign.abandonRate.toFixed(1)}%
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Agents Report */}
        <TabsContent value="agents" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Performance por Agente</CardTitle>
                <CardDescription>Top agentes por produtividade</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => handleExport('agents')}>
                <Download className="mr-2 h-4 w-4" />
                Exportar
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {[...Array(10)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : agents.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhum dado disponível para o período selecionado</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Agente</TableHead>
                      <TableHead>Equipe</TableHead>
                      <TableHead className="text-center">Chamadas</TableHead>
                      <TableHead className="text-center">AHT</TableHead>
                      <TableHead className="text-center">Conversões</TableHead>
                      <TableHead className="text-center">Conv. Rate</TableHead>
                      <TableHead className="text-center">Aderência</TableHead>
                      <TableHead>Performance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agents.slice(0, 20).map((agent) => (
                      <TableRow key={agent.id}>
                        <TableCell className="font-medium">{agent.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {agent.teamId ? `Team ${agent.teamId.split('-')[1] || agent.teamId.slice(0, 8)}` : 'N/A'}
                        </TableCell>
                        <TableCell className="text-center">{agent.callsHandled}</TableCell>
                        <TableCell className="text-center font-mono">{formatTime(agent.aht)}</TableCell>
                        <TableCell className="text-center text-metric-positive">{agent.conversions}</TableCell>
                        <TableCell className="text-center">{agent.conversionRate.toFixed(1)}%</TableCell>
                        <TableCell className="text-center">
                          <span className={agent.adherence >= 90 ? 'text-metric-positive' : 'text-metric-warning'}>
                            {agent.adherence.toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <Progress value={agent.adherence} className="h-2 w-20" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Queues Report */}
        <TabsContent value="queues" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>SLA por Fila</CardTitle>
              <Button variant="outline" size="sm" onClick={() => handleExport('queues')}>
                <Download className="mr-2 h-4 w-4" />
                Exportar
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : queues.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhum dado disponível para o período selecionado</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fila</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-center">Chamadas</TableHead>
                      <TableHead className="text-center">Atendidas</TableHead>
                      <TableHead className="text-center">Abandonadas</TableHead>
                      <TableHead className="text-center">Tempo Médio Espera</TableHead>
                      <TableHead className="text-center">SLA Target</TableHead>
                      <TableHead className="text-center">SLA Atual</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {queues.map((queue) => (
                      <TableRow key={queue.id}>
                        <TableCell className="font-medium">{queue.name}</TableCell>
                        <TableCell><Badge variant="outline">{queue.type}</Badge></TableCell>
                        <TableCell className="text-center">{queue.totalCalls}</TableCell>
                        <TableCell className="text-center">{queue.answered}</TableCell>
                        <TableCell className="text-center text-metric-negative">{queue.abandoned}</TableCell>
                        <TableCell className="text-center font-mono">{queue.avgWaitTime}s</TableCell>
                        <TableCell className="text-center">{queue.slaTarget}s</TableCell>
                        <TableCell className="text-center">
                          <span className={queue.slaPercentage >= 85 ? 'text-metric-positive' : 'text-metric-warning'}>
                            {queue.slaPercentage.toFixed(1)}%
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
