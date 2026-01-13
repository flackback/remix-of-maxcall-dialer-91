import { MetricCard } from '@/components/dashboard/MetricCard';
import { QueueCard } from '@/components/dashboard/QueueCard';
import { LiveCallsTable } from '@/components/dashboard/LiveCallsTable';
import { CallsChart } from '@/components/dashboard/CallsChart';
import { AgentStatusGrid } from '@/components/dashboard/AgentStatusGrid';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useDashboardData } from '@/hooks/useDashboardData';
import { Phone, PhoneIncoming, PhoneOff, Users, Clock, TrendingUp, Target, Zap } from 'lucide-react';

const Index = () => {
  const { metrics: m, queues, calls, agents, hourlyStats, loading } = useDashboardData();

  // Transform agents for AgentStatusGrid
  const agentsForGrid = agents.map(a => ({
    id: a.id,
    name: a.name,
    email: '',
    extension: a.extension,
    sipUser: '',
    status: a.status as any,
    skills: [],
    currentCallId: a.currentCallId || undefined,
    teamId: '',
    stats: { callsHandled: 0, avgHandleTime: 0, avgWrapupTime: 0, conversions: 0, adherence: 100 },
  }));

  // Transform queues for QueueCard
  const queuesForCard = queues.map(q => ({
    id: q.id,
    name: q.name,
    type: q.type as any,
    strategy: 'ROUND_ROBIN' as const,
    wrapupTime: 30,
    slaTarget: q.slaTarget,
    maxWaitTime: 120,
    agents: [],
    stats: {
      waiting: q.waiting,
      active: q.active,
      avgWaitTime: q.avgWaitTime,
      slaPercentage: q.slaPercentage,
      abandoned: q.abandoned,
    },
  }));

  // Transform calls for LiveCallsTable
  const callsForTable = calls.map(c => ({
    id: c.id,
    direction: c.direction as any,
    status: c.status as any,
    leadId: '',
    agentId: '',
    queueId: '',
    campaignId: '',
    phone: c.phone,
    callerId: '',
    startedAt: c.startedAt,
    isAiHandled: false,
  }));

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-80 lg:col-span-2" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Chamadas Hoje"
          value={m.callsToday.toLocaleString()}
          icon={<Phone className="h-5 w-5" />}
          trend={{ value: 12, direction: 'up', label: 'vs ontem' }}
          variant="neutral"
        />
        <MetricCard
          title="Atendidas"
          value={m.answeredToday.toLocaleString()}
          subtitle={`${m.callsToday > 0 ? ((m.answeredToday / m.callsToday) * 100).toFixed(1) : 0}% contact rate`}
          icon={<PhoneIncoming className="h-5 w-5" />}
          variant="positive"
        />
        <MetricCard
          title="Abandonadas"
          value={m.abandonedToday}
          subtitle={`${m.callsToday > 0 ? ((m.abandonedToday / m.callsToday) * 100).toFixed(1) : 0}% taxa`}
          icon={<PhoneOff className="h-5 w-5" />}
          variant={m.abandonedToday > 50 ? 'negative' : 'warning'}
        />
        <MetricCard
          title="Conversão"
          value={`${m.conversionRate.toFixed(1)}%`}
          icon={<Target className="h-5 w-5" />}
          trend={{ value: 3.2, direction: 'up', label: 'vs semana' }}
          variant="positive"
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          title="Agentes Ativos"
          value={m.activeAgents}
          subtitle={`${m.readyAgents} disponíveis`}
          icon={<Users className="h-5 w-5" />}
          size="sm"
        />
        <MetricCard
          title="Chamadas Ativas"
          value={m.activeCalls}
          subtitle={`${m.waitingCalls} em fila`}
          icon={<Zap className="h-5 w-5" />}
          variant="neutral"
          size="sm"
        />
        <MetricCard
          title="Tempo Médio"
          value={`${Math.floor(m.avgHandleTime / 60)}:${Math.round(m.avgHandleTime % 60).toString().padStart(2, '0')}`}
          subtitle="AHT"
          icon={<Clock className="h-5 w-5" />}
          size="sm"
        />
        <MetricCard
          title="SLA"
          value={`${m.slaPercentage.toFixed(1)}%`}
          icon={<TrendingUp className="h-5 w-5" />}
          variant={m.slaPercentage >= 85 ? 'positive' : 'warning'}
          size="sm"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Volume de Chamadas por Hora</CardTitle>
          </CardHeader>
          <CardContent>
            <CallsChart data={hourlyStats} />
          </CardContent>
        </Card>

        {/* Agent Status */}
        <Card>
          <CardHeader>
            <CardTitle>Status dos Agentes</CardTitle>
          </CardHeader>
          <CardContent>
            <AgentStatusGrid agents={agentsForGrid.slice(0, 30)} compact />
            <div className="mt-4 grid grid-cols-2 gap-3 text-center">
              <div className="rounded-lg bg-status-ready/10 p-2">
                <p className="text-2xl font-bold text-status-ready">{m.readyAgents}</p>
                <p className="text-xs text-muted-foreground">Disponíveis</p>
              </div>
              <div className="rounded-lg bg-status-busy/10 p-2">
                <p className="text-2xl font-bold text-status-busy">{m.busyAgents}</p>
                <p className="text-xs text-muted-foreground">Em Ligação</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Queues */}
      {queuesForCard.length > 0 && (
        <div>
          <h2 className="mb-4 text-lg font-semibold">Filas</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {queuesForCard.map((queue) => (
              <QueueCard key={queue.id} queue={queue} />
            ))}
          </div>
        </div>
      )}

      {/* Live Calls */}
      {callsForTable.length > 0 && (
        <LiveCallsTable calls={callsForTable} />
      )}
    </div>
  );
};

export default Index;
