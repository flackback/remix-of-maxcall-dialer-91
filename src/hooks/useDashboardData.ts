import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface DashboardMetrics {
  activeAgents: number;
  readyAgents: number;
  busyAgents: number;
  pausedAgents: number;
  activeCalls: number;
  waitingCalls: number;
  callsToday: number;
  answeredToday: number;
  abandonedToday: number;
  avgWaitTime: number;
  avgHandleTime: number;
  slaPercentage: number;
  contactRate: number;
  conversionRate: number;
}

export interface QueueData {
  id: string;
  name: string;
  type: string;
  waiting: number;
  active: number;
  avgWaitTime: number;
  slaPercentage: number;
  abandoned: number;
  slaTarget: number;
}

export interface CallData {
  id: string;
  direction: string;
  status: string;
  phone: string;
  agentName: string;
  queueName: string;
  campaignName: string;
  duration: number;
  startedAt: Date;
}

export interface AgentData {
  id: string;
  name: string;
  status: string;
  extension: string;
  currentCallId: string | null;
}

export interface HourlyStat {
  hour: string;
  calls: number;
  answered: number;
  abandoned: number;
  aht: number;
}

export function useDashboardData() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    activeAgents: 0,
    readyAgents: 0,
    busyAgents: 0,
    pausedAgents: 0,
    activeCalls: 0,
    waitingCalls: 0,
    callsToday: 0,
    answeredToday: 0,
    abandonedToday: 0,
    avgWaitTime: 0,
    avgHandleTime: 0,
    slaPercentage: 0,
    contactRate: 0,
    conversionRate: 0,
  });
  const [queues, setQueues] = useState<QueueData[]>([]);
  const [calls, setCalls] = useState<CallData[]>([]);
  const [agents, setAgents] = useState<AgentData[]>([]);
  const [hourlyStats, setHourlyStats] = useState<HourlyStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchDashboardData = async () => {
      setLoading(true);

      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Fetch agents
        const { data: agentsData } = await supabase
          .from('agents')
          .select('id, status, extension, current_call_id, user_id');

        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, full_name');

        const profilesMap = new Map(profilesData?.map(p => [p.user_id, p.full_name]) || []);

        const agentsList: AgentData[] = (agentsData || []).map(a => ({
          id: a.id,
          name: profilesMap.get(a.user_id) || 'Agente',
          status: a.status || 'OFFLINE',
          extension: a.extension || '',
          currentCallId: a.current_call_id,
        }));

        setAgents(agentsList);

        // Calculate agent metrics
        const activeAgents = agentsList.filter(a => a.status !== 'OFFLINE').length;
        const readyAgents = agentsList.filter(a => a.status === 'READY').length;
        const busyAgents = agentsList.filter(a => a.status === 'BUSY' || a.status === 'ON_CALL').length;
        const pausedAgents = agentsList.filter(a => a.status === 'PAUSE').length;

        // Fetch today's calls
        const { data: callsData } = await supabase
          .from('calls')
          .select('id, direction, status, phone, agent_id, queue_id, campaign_id, duration, started_at, connected_at')
          .gte('created_at', today.toISOString());

        // Fetch queues
        const { data: queuesData } = await supabase
          .from('queues')
          .select('id, name, type, sla_target');

        // Fetch campaigns
        const { data: campaignsData } = await supabase
          .from('campaigns')
          .select('id, name');

        const queuesMap = new Map(queuesData?.map(q => [q.id, q.name]) || []);
        const campaignsMap = new Map(campaignsData?.map(c => [c.id, c.name]) || []);
        const agentsMap = new Map(agentsList.map(a => [a.id, a.name]));

        // Process calls
        const callsList: CallData[] = (callsData || [])
          .filter(c => c.status !== 'ENDED' && c.status !== 'ABANDONED')
          .slice(0, 25)
          .map(c => ({
            id: c.id,
            direction: c.direction,
            status: c.status || 'QUEUED',
            phone: c.phone,
            agentName: c.agent_id ? agentsMap.get(c.agent_id) || 'N/A' : 'N/A',
            queueName: c.queue_id ? queuesMap.get(c.queue_id) || 'N/A' : 'N/A',
            campaignName: c.campaign_id ? campaignsMap.get(c.campaign_id) || 'N/A' : 'N/A',
            duration: c.duration || 0,
            startedAt: new Date(c.started_at),
          }));

        setCalls(callsList);

        // Calculate call metrics
        const totalCalls = callsData?.length || 0;
        const answeredCalls = callsData?.filter(c => c.connected_at).length || 0;
        const abandonedCalls = callsData?.filter(c => c.status === 'ABANDONED').length || 0;
        const activeCalls = callsData?.filter(c => c.status === 'CONNECTED' || c.status === 'ON_HOLD').length || 0;
        const waitingCalls = callsData?.filter(c => c.status === 'QUEUED' || c.status === 'RINGING').length || 0;

        const totalDuration = callsData?.reduce((sum, c) => sum + (c.duration || 0), 0) || 0;
        const avgHandleTime = answeredCalls > 0 ? totalDuration / answeredCalls : 0;
        const contactRate = totalCalls > 0 ? (answeredCalls / totalCalls) * 100 : 0;
        const slaPercentage = totalCalls > 0 ? ((totalCalls - abandonedCalls) / totalCalls) * 100 : 100;

        // Process queues
        const queuesList: QueueData[] = (queuesData || []).map(q => {
          const queueCalls = callsData?.filter(c => c.queue_id === q.id) || [];
          const queueActive = queueCalls.filter(c => c.status === 'CONNECTED').length;
          const queueWaiting = queueCalls.filter(c => c.status === 'QUEUED' || c.status === 'RINGING').length;
          const queueAbandoned = queueCalls.filter(c => c.status === 'ABANDONED').length;
          const queueAnswered = queueCalls.filter(c => c.connected_at).length;

          return {
            id: q.id,
            name: q.name,
            type: q.type || 'INBOUND',
            waiting: queueWaiting,
            active: queueActive,
            avgWaitTime: 0,
            slaPercentage: queueCalls.length > 0 ? (queueAnswered / queueCalls.length) * 100 : 100,
            abandoned: queueAbandoned,
            slaTarget: q.sla_target || 20,
          };
        });

        setQueues(queuesList);

        // Build hourly stats
        const hourlyMap = new Map<string, { calls: number; answered: number; abandoned: number; duration: number }>();
        for (let h = 8; h <= 20; h++) {
          hourlyMap.set(`${h.toString().padStart(2, '0')}:00`, { calls: 0, answered: 0, abandoned: 0, duration: 0 });
        }

        callsData?.forEach(call => {
          const hour = new Date(call.started_at).getHours();
          const key = `${hour.toString().padStart(2, '0')}:00`;
          if (hourlyMap.has(key)) {
            const stats = hourlyMap.get(key)!;
            stats.calls++;
            if (call.connected_at) {
              stats.answered++;
              stats.duration += call.duration || 0;
            }
            if (call.status === 'ABANDONED') stats.abandoned++;
          }
        });

        const hourlyList: HourlyStat[] = Array.from(hourlyMap.entries()).map(([hour, stats]) => ({
          hour,
          calls: stats.calls,
          answered: stats.answered,
          abandoned: stats.abandoned,
          aht: stats.answered > 0 ? Math.round(stats.duration / stats.answered) : 0,
        }));

        setHourlyStats(hourlyList);

        // Set metrics
        setMetrics({
          activeAgents,
          readyAgents,
          busyAgents,
          pausedAgents,
          activeCalls,
          waitingCalls,
          callsToday: totalCalls,
          answeredToday: answeredCalls,
          abandonedToday: abandonedCalls,
          avgWaitTime: 0,
          avgHandleTime,
          slaPercentage,
          contactRate,
          conversionRate: 0,
        });

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();

    // Set up realtime subscription
    const channel = supabase
      .channel('dashboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calls' }, () => {
        fetchDashboardData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agents' }, () => {
        fetchDashboardData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return { metrics, queues, calls, agents, hourlyStats, loading };
}
