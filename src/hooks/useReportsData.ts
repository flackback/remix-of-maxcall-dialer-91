import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfDay, endOfDay, subDays, startOfWeek, startOfMonth, format } from 'date-fns';

export interface CampaignReport {
  id: string;
  name: string;
  mode: string;
  totalCalls: number;
  answered: number;
  contactRate: number;
  conversions: number;
  conversionRate: number;
  aht: number;
  abandonRate: number;
}

export interface AgentReport {
  id: string;
  name: string;
  teamId: string | null;
  callsHandled: number;
  aht: number;
  conversions: number;
  conversionRate: number;
  adherence: number;
}

export interface QueueReport {
  id: string;
  name: string;
  type: string;
  totalCalls: number;
  answered: number;
  abandoned: number;
  avgWaitTime: number;
  slaTarget: number;
  slaPercentage: number;
}

export interface HourlyStat {
  hour: string;
  calls: number;
  answered: number;
  abandoned: number;
  aht: number;
}

export interface ReportsSummary {
  totalCalls: number;
  contactRate: number;
  conversionRate: number;
  avgAht: number;
  prevTotalCalls: number;
  prevContactRate: number;
  prevConversionRate: number;
  prevAvgAht: number;
}

type DateRangeType = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

export function useReportsData(dateRange: DateRangeType, campaignId: string = 'all') {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<CampaignReport[]>([]);
  const [agents, setAgents] = useState<AgentReport[]>([]);
  const [queues, setQueues] = useState<QueueReport[]>([]);
  const [hourlyStats, setHourlyStats] = useState<HourlyStat[]>([]);
  const [summary, setSummary] = useState<ReportsSummary>({
    totalCalls: 0,
    contactRate: 0,
    conversionRate: 0,
    avgAht: 0,
    prevTotalCalls: 0,
    prevContactRate: 0,
    prevConversionRate: 0,
    prevAvgAht: 0,
  });
  const [loading, setLoading] = useState(true);
  const [campaignsList, setCampaignsList] = useState<{ id: string; name: string }[]>([]);

  const { startDate, endDate, prevStartDate, prevEndDate } = useMemo(() => {
    const now = new Date();
    let start: Date;
    let end: Date;
    let prevStart: Date;
    let prevEnd: Date;

    switch (dateRange) {
      case 'today':
        start = startOfDay(now);
        end = endOfDay(now);
        prevStart = startOfDay(subDays(now, 1));
        prevEnd = endOfDay(subDays(now, 1));
        break;
      case 'yesterday':
        start = startOfDay(subDays(now, 1));
        end = endOfDay(subDays(now, 1));
        prevStart = startOfDay(subDays(now, 2));
        prevEnd = endOfDay(subDays(now, 2));
        break;
      case 'week':
        start = startOfWeek(now, { weekStartsOn: 1 });
        end = endOfDay(now);
        prevStart = startOfWeek(subDays(now, 7), { weekStartsOn: 1 });
        prevEnd = endOfDay(subDays(start, 1));
        break;
      case 'month':
        start = startOfMonth(now);
        end = endOfDay(now);
        prevStart = startOfMonth(subDays(start, 1));
        prevEnd = endOfDay(subDays(start, 1));
        break;
      default:
        start = startOfDay(now);
        end = endOfDay(now);
        prevStart = startOfDay(subDays(now, 1));
        prevEnd = endOfDay(subDays(now, 1));
    }

    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      prevStartDate: prevStart.toISOString(),
      prevEndDate: prevEnd.toISOString(),
    };
  }, [dateRange]);

  useEffect(() => {
    if (!user) return;
    
    const fetchCampaignsList = async () => {
      const { data } = await supabase
        .from('campaigns')
        .select('id, name')
        .order('name');
      
      if (data) {
        setCampaignsList(data);
      }
    };

    fetchCampaignsList();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const fetchReportsData = async () => {
      setLoading(true);

      try {
        // Fetch calls for current period
        let callsQuery = supabase
          .from('calls')
          .select('id, status, duration, campaign_id, agent_id, queue_id, connected_at, created_at')
          .gte('created_at', startDate)
          .lte('created_at', endDate);

        if (campaignId !== 'all') {
          callsQuery = callsQuery.eq('campaign_id', campaignId);
        }

        const { data: calls } = await callsQuery;

        // Fetch calls for previous period (for comparison)
        let prevCallsQuery = supabase
          .from('calls')
          .select('id, status, duration, connected_at')
          .gte('created_at', prevStartDate)
          .lte('created_at', prevEndDate);

        if (campaignId !== 'all') {
          prevCallsQuery = prevCallsQuery.eq('campaign_id', campaignId);
        }

        const { data: prevCalls } = await prevCallsQuery;

        // Fetch campaigns
        const { data: campaignsData } = await supabase
          .from('campaigns')
          .select('id, name, dial_mode');

        // Fetch agents with profiles
        const { data: agentsData } = await supabase
          .from('agents')
          .select('id, team_id, user_id');

        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, full_name');

        // Fetch agent stats
        const { data: agentStatsData } = await supabase
          .from('agent_stats')
          .select('*')
          .gte('date', startDate.split('T')[0])
          .lte('date', endDate.split('T')[0]);

        // Fetch queues
        const { data: queuesData } = await supabase
          .from('queues')
          .select('id, name, type, sla_target');

        // Fetch dispositions to identify conversions
        const { data: dispositionsData } = await supabase
          .from('dispositions')
          .select('id, category');

        const positiveDispositions = dispositionsData
          ?.filter(d => d.category === 'POSITIVE')
          .map(d => d.id) || [];

        // Calculate summary
        const currentCalls = calls || [];
        const previousCalls = prevCalls || [];
        
        const totalCalls = currentCalls.length;
        const answeredCalls = currentCalls.filter(c => c.connected_at).length;
        const contactRate = totalCalls > 0 ? (answeredCalls / totalCalls) * 100 : 0;
        
        // Get call dispositions for conversion calculation
        const { data: callDispositions } = await supabase
          .from('call_dispositions')
          .select('call_id, disposition_id')
          .in('call_id', currentCalls.map(c => c.id));

        const conversions = callDispositions?.filter(cd => 
          positiveDispositions.includes(cd.disposition_id)
        ).length || 0;
        const conversionRate = answeredCalls > 0 ? (conversions / answeredCalls) * 100 : 0;
        
        const totalDuration = currentCalls.reduce((sum, c) => sum + (c.duration || 0), 0);
        const avgAht = answeredCalls > 0 ? totalDuration / answeredCalls : 0;

        // Previous period calculations
        const prevTotalCalls = previousCalls.length;
        const prevAnsweredCalls = previousCalls.filter(c => c.connected_at).length;
        const prevContactRate = prevTotalCalls > 0 ? (prevAnsweredCalls / prevTotalCalls) * 100 : 0;
        const prevTotalDuration = previousCalls.reduce((sum, c) => sum + (c.duration || 0), 0);
        const prevAvgAht = prevAnsweredCalls > 0 ? prevTotalDuration / prevAnsweredCalls : 0;

        setSummary({
          totalCalls,
          contactRate,
          conversionRate,
          avgAht,
          prevTotalCalls,
          prevContactRate,
          prevConversionRate: 0, // Would need previous dispositions
          prevAvgAht,
        });

        // Build campaign reports
        const campaignReports: CampaignReport[] = (campaignsData || []).map(campaign => {
          const campaignCalls = currentCalls.filter(c => c.campaign_id === campaign.id);
          const campaignAnswered = campaignCalls.filter(c => c.connected_at).length;
          const campaignDispositions = callDispositions?.filter(cd => 
            campaignCalls.some(c => c.id === cd.call_id) && 
            positiveDispositions.includes(cd.disposition_id)
          ).length || 0;
          const campaignDuration = campaignCalls.reduce((sum, c) => sum + (c.duration || 0), 0);

          return {
            id: campaign.id,
            name: campaign.name,
            mode: campaign.dial_mode || 'POWER',
            totalCalls: campaignCalls.length,
            answered: campaignAnswered,
            contactRate: campaignCalls.length > 0 ? (campaignAnswered / campaignCalls.length) * 100 : 0,
            conversions: campaignDispositions,
            conversionRate: campaignAnswered > 0 ? (campaignDispositions / campaignAnswered) * 100 : 0,
            aht: campaignAnswered > 0 ? campaignDuration / campaignAnswered : 0,
            abandonRate: campaignCalls.length > 0 ? 
              ((campaignCalls.filter(c => c.status === 'ABANDONED').length / campaignCalls.length) * 100) : 0,
          };
        });

        setCampaigns(campaignReports);

        // Build agent reports
        const profilesMap = new Map(profilesData?.map(p => [p.user_id, p.full_name]) || []);
        const agentReports: AgentReport[] = (agentsData || []).map(agent => {
          const agentStats = agentStatsData?.filter(s => s.agent_id === agent.id) || [];
          const totalCallsHandled = agentStats.reduce((sum, s) => sum + (s.calls_handled || 0), 0);
          const totalConversions = agentStats.reduce((sum, s) => sum + (s.conversions || 0), 0);
          const totalTalkTime = agentStats.reduce((sum, s) => sum + (s.total_talk_time || 0), 0);
          const avgAdherence = agentStats.length > 0 
            ? agentStats.reduce((sum, s) => sum + Number(s.adherence || 0), 0) / agentStats.length 
            : 0;

          return {
            id: agent.id,
            name: profilesMap.get(agent.user_id) || 'Agente',
            teamId: agent.team_id,
            callsHandled: totalCallsHandled,
            aht: totalCallsHandled > 0 ? totalTalkTime / totalCallsHandled : 0,
            conversions: totalConversions,
            conversionRate: totalCallsHandled > 0 ? (totalConversions / totalCallsHandled) * 100 : 0,
            adherence: avgAdherence,
          };
        });

        setAgents(agentReports.sort((a, b) => b.conversions - a.conversions));

        // Build queue reports
        const queueReports: QueueReport[] = (queuesData || []).map(queue => {
          const queueCalls = currentCalls.filter(c => c.queue_id === queue.id);
          const queueAnswered = queueCalls.filter(c => c.connected_at).length;
          const queueAbandoned = queueCalls.filter(c => c.status === 'ABANDONED').length;

          return {
            id: queue.id,
            name: queue.name,
            type: queue.type || 'INBOUND',
            totalCalls: queueCalls.length,
            answered: queueAnswered,
            abandoned: queueAbandoned,
            avgWaitTime: 0, // Would need call events for accurate calculation
            slaTarget: queue.sla_target || 20,
            slaPercentage: queueCalls.length > 0 ? (queueAnswered / queueCalls.length) * 100 : 0,
          };
        });

        setQueues(queueReports);

        // Build hourly stats
        const hourlyMap = new Map<string, { calls: number; answered: number; abandoned: number; duration: number }>();
        
        for (let h = 8; h <= 20; h++) {
          const hourKey = `${h.toString().padStart(2, '0')}:00`;
          hourlyMap.set(hourKey, { calls: 0, answered: 0, abandoned: 0, duration: 0 });
        }

        currentCalls.forEach(call => {
          const callHour = new Date(call.created_at).getHours();
          const hourKey = `${callHour.toString().padStart(2, '0')}:00`;
          
          if (hourlyMap.has(hourKey)) {
            const stats = hourlyMap.get(hourKey)!;
            stats.calls++;
            if (call.connected_at) {
              stats.answered++;
              stats.duration += call.duration || 0;
            }
            if (call.status === 'ABANDONED') {
              stats.abandoned++;
            }
          }
        });

        const hourlyStatsArray: HourlyStat[] = Array.from(hourlyMap.entries()).map(([hour, stats]) => ({
          hour,
          calls: stats.calls,
          answered: stats.answered,
          abandoned: stats.abandoned,
          aht: stats.answered > 0 ? Math.round(stats.duration / stats.answered) : 0,
        }));

        setHourlyStats(hourlyStatsArray);

      } catch (error) {
        console.error('Error fetching reports data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReportsData();
  }, [user, startDate, endDate, prevStartDate, prevEndDate, campaignId]);

  return {
    campaigns,
    agents,
    queues,
    hourlyStats,
    summary,
    loading,
    campaignsList,
  };
}
