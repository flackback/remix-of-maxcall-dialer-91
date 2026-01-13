import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Bot, Phone, Clock, TrendingUp, ThumbsUp, AlertTriangle, MessageSquare } from 'lucide-react';

interface AgentStats {
  agent_id: string;
  agent_name: string;
  total_calls: number;
  avg_duration: number;
  avg_satisfaction: number;
  handoff_rate: number;
  conversion_rate: number;
}

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export function AgentPerformanceDashboard() {
  const [selectedAgent, setSelectedAgent] = useState<string>('all');
  const [period, setPeriod] = useState<string>('7d');

  const { data: agents } = useQuery({
    queryKey: ['ai-voice-agents-dashboard'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_voice_agents')
        .select('id, name, total_calls, avg_satisfaction, total_duration_seconds');
      if (error) throw error;
      return data;
    }
  });

  const { data: aiCalls } = useQuery({
    queryKey: ['ai-agent-calls-stats', selectedAgent, period],
    queryFn: async () => {
      const daysAgo = period === '7d' ? 7 : period === '30d' ? 30 : 90;
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - daysAgo);

      let query = supabase
        .from('ai_agent_calls')
        .select(`
          *,
          agent:ai_voice_agents(name)
        `)
        .gte('created_at', fromDate.toISOString())
        .order('created_at', { ascending: false });
      
      if (selectedAgent !== 'all') {
        query = query.eq('agent_id', selectedAgent);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });

  const { data: trainingExamplesCount } = useQuery({
    queryKey: ['training-examples-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('ai_training_examples')
        .select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count || 0;
    }
  });

  // Calculate metrics
  const totalCalls = aiCalls?.length || 0;
  const avgDuration = aiCalls?.reduce((acc, call) => acc + (call.duration_seconds || 0), 0) / (totalCalls || 1);
  const avgSatisfaction = aiCalls?.reduce((acc, call) => acc + (call.satisfaction_score || 0), 0) / (aiCalls?.filter(c => c.satisfaction_score)?.length || 1);
  const handoffRate = (aiCalls?.filter(c => c.handoff_requested)?.length || 0) / (totalCalls || 1) * 100;

  // Sentiment distribution
  const sentimentData = [
    { name: 'Positivo', value: aiCalls?.filter(c => c.sentiment === 'positive').length || 0 },
    { name: 'Neutro', value: aiCalls?.filter(c => c.sentiment === 'neutral').length || 0 },
    { name: 'Negativo', value: aiCalls?.filter(c => c.sentiment === 'negative').length || 0 },
  ];

  // Calls by day
  const callsByDay = aiCalls?.reduce((acc: any[], call) => {
    const day = new Date(call.created_at || '').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' });
    const existing = acc.find(d => d.day === day);
    if (existing) {
      existing.calls++;
      existing.handoffs += call.handoff_requested ? 1 : 0;
    } else {
      acc.push({ day, calls: 1, handoffs: call.handoff_requested ? 1 : 0 });
    }
    return acc;
  }, []) || [];

  // Handoff reasons
  const handoffReasons = aiCalls?.filter(c => c.handoff_reason).reduce((acc: any[], call) => {
    const existing = acc.find(r => r.reason === call.handoff_reason);
    if (existing) {
      existing.count++;
    } else {
      acc.push({ reason: call.handoff_reason, count: 1 });
    }
    return acc;
  }, []).sort((a, b) => b.count - a.count).slice(0, 5) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Performance dos Agentes IA</h2>
          <p className="text-muted-foreground">Métricas e análises de desempenho</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedAgent} onValueChange={setSelectedAgent}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Agente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os agentes</SelectItem>
              {agents?.map(agent => (
                <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 dias</SelectItem>
              <SelectItem value="30d">30 dias</SelectItem>
              <SelectItem value="90d">90 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Ligações</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCalls}</div>
            <p className="text-xs text-muted-foreground">no período</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Duração Média</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.floor(avgDuration / 60)}:{Math.floor(avgDuration % 60).toString().padStart(2, '0')}
            </div>
            <p className="text-xs text-muted-foreground">minutos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Satisfação</CardTitle>
            <ThumbsUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(avgSatisfaction * 20).toFixed(0)}%</div>
            <p className="text-xs text-muted-foreground">média</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Handoff</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{handoffRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">transferências</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Exemplos Treinamento</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{trainingExamplesCount}</div>
            <p className="text-xs text-muted-foreground">exemplos</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ligações por Dia</CardTitle>
            <CardDescription>Volume de atendimentos no período</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={callsByDay}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="day" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="calls" fill="hsl(var(--primary))" name="Ligações" />
                  <Bar dataKey="handoffs" fill="hsl(var(--destructive))" name="Handoffs" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Sentimento</CardTitle>
            <CardDescription>Análise de sentimento das ligações</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sentimentData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {sentimentData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Motivos de Handoff</CardTitle>
            <CardDescription>Principais razões para transferência a humanos</CardDescription>
          </CardHeader>
          <CardContent>
            {handoffReasons.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Nenhum handoff registrado</p>
            ) : (
              <div className="space-y-4">
                {handoffReasons.map((reason, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm">{reason.reason}</span>
                    <Badge variant="secondary">{reason.count}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Agentes por Performance</CardTitle>
            <CardDescription>Ranking de desempenho dos agentes IA</CardDescription>
          </CardHeader>
          <CardContent>
            {agents?.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Nenhum agente configurado</p>
            ) : (
              <div className="space-y-4">
                {agents?.sort((a, b) => (b.avg_satisfaction || 0) - (a.avg_satisfaction || 0)).map((agent, index) => (
                  <div key={agent.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0 ? 'bg-yellow-500/20 text-yellow-500' :
                        index === 1 ? 'bg-gray-400/20 text-gray-400' :
                        index === 2 ? 'bg-orange-500/20 text-orange-500' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{agent.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {agent.total_calls || 0} ligações
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        {agent.avg_satisfaction ? `${(agent.avg_satisfaction * 100).toFixed(0)}%` : 'N/A'}
                      </p>
                      <p className="text-xs text-muted-foreground">satisfação</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
