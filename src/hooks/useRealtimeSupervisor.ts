import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface AgentRealtime {
  id: string;
  user_id: string;
  status: string;
  extension?: string;
  current_call_id?: string;
  last_call_at?: string;
  logged_in_at?: string;
  pause_reason?: string;
  profile?: {
    full_name: string;
  };
}

interface CallRealtime {
  id: string;
  phone: string;
  direction: string;
  status: string;
  agent_id?: string;
  queue_id?: string;
  campaign_id?: string;
  started_at: string;
  connected_at?: string;
  duration?: number;
  is_ai_handled?: boolean;
}

interface QueueStats {
  id: string;
  name: string;
  waiting: number;
  active: number;
  agents_ready: number;
  sla: number;
}

interface SupervisorMetrics {
  totalAgents: number;
  agentsOnline: number;
  agentsReady: number;
  agentsBusy: number;
  agentsWrapup: number;
  agentsPause: number;
  activeCalls: number;
  waitingCalls: number;
  callsToday: number;
  abandonedToday: number;
  slaPercentage: number;
  avgWaitTime: number;
  avgTalkTime: number;
}

export function useRealtimeSupervisor() {
  const [agents, setAgents] = useState<AgentRealtime[]>([]);
  const [calls, setCalls] = useState<CallRealtime[]>([]);
  const [queues, setQueues] = useState<QueueStats[]>([]);
  const [metrics, setMetrics] = useState<SupervisorMetrics>({
    totalAgents: 0,
    agentsOnline: 0,
    agentsReady: 0,
    agentsBusy: 0,
    agentsWrapup: 0,
    agentsPause: 0,
    activeCalls: 0,
    waitingCalls: 0,
    callsToday: 0,
    abandonedToday: 0,
    slaPercentage: 0,
    avgWaitTime: 0,
    avgTalkTime: 0,
  });
  const [loading, setLoading] = useState(true);
  const [presenceState, setPresenceState] = useState<Record<string, any>>({});

  // Fetch initial data
  const fetchData = useCallback(async () => {
    try {
      // Fetch agents with profiles
      const { data: agentsData } = await supabase
        .from('agents')
        .select(`
          id, user_id, status, extension, current_call_id, 
          last_call_at, logged_in_at, pause_reason,
          profiles!agents_user_id_fkey(full_name)
        `)
        .neq('status', 'OFFLINE');

      if (agentsData) {
        const formattedAgents = agentsData.map((a: any) => ({
          ...a,
          profile: a.profiles
        }));
        setAgents(formattedAgents);
      }

      // Fetch active calls
      const { data: callsData } = await supabase
        .from('calls')
        .select('*')
        .in('status', ['QUEUED', 'RINGING', 'CONNECTED', 'ON_HOLD'])
        .order('started_at', { ascending: false });

      if (callsData) {
        setCalls(callsData);
      }

      // Fetch queues
      const { data: queuesData } = await supabase
        .from('queues')
        .select('id, name, sla_target')
        .eq('is_active', true);

      if (queuesData) {
        // Calculate stats for each queue
        const queueStats = await Promise.all(
          queuesData.map(async (q) => {
            const { count: waiting } = await supabase
              .from('calls')
              .select('*', { count: 'exact', head: true })
              .eq('queue_id', q.id)
              .eq('status', 'QUEUED');

            const { count: active } = await supabase
              .from('calls')
              .select('*', { count: 'exact', head: true })
              .eq('queue_id', q.id)
              .eq('status', 'CONNECTED');

            return {
              id: q.id,
              name: q.name,
              waiting: waiting || 0,
              active: active || 0,
              agents_ready: 0,
              sla: q.sla_target || 80,
            };
          })
        );
        setQueues(queueStats);
      }

      // Calculate metrics
      const today = new Date().toISOString().split('T')[0];
      const { count: callsToday } = await supabase
        .from('calls')
        .select('*', { count: 'exact', head: true })
        .gte('started_at', `${today}T00:00:00`);

      const { count: abandonedToday } = await supabase
        .from('calls')
        .select('*', { count: 'exact', head: true })
        .gte('started_at', `${today}T00:00:00`)
        .eq('status', 'ABANDONED');

      updateMetrics(agentsData || [], callsData || [], callsToday || 0, abandonedToday || 0);

    } catch (error) {
      console.error('Error fetching supervisor data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Update metrics from data
  const updateMetrics = (
    agentsData: any[],
    callsData: any[],
    callsToday: number,
    abandonedToday: number
  ) => {
    const agentsBusy = agentsData.filter((a) => a.status === 'BUSY').length;
    const agentsReady = agentsData.filter((a) => a.status === 'READY').length;
    const agentsWrapup = agentsData.filter((a) => a.status === 'WRAPUP').length;
    const agentsPause = agentsData.filter((a) => a.status === 'PAUSE').length;
    const agentsOnline = agentsData.filter((a) => a.status !== 'OFFLINE').length;

    const activeCalls = callsData.filter((c) => c.status === 'CONNECTED').length;
    const waitingCalls = callsData.filter((c) => c.status === 'QUEUED').length;

    const slaPercentage = callsToday > 0 
      ? Math.round(((callsToday - abandonedToday) / callsToday) * 100)
      : 100;

    setMetrics({
      totalAgents: agentsData.length,
      agentsOnline,
      agentsReady,
      agentsBusy,
      agentsWrapup,
      agentsPause,
      activeCalls,
      waitingCalls,
      callsToday,
      abandonedToday,
      slaPercentage,
      avgWaitTime: 0,
      avgTalkTime: 0,
    });
  };

  // Setup realtime subscriptions
  useEffect(() => {
    fetchData();

    // Subscribe to agent changes
    const agentsChannel = supabase
      .channel('supervisor-agents')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agents' },
        (payload) => {
          console.log('Agent change:', payload);
          if (payload.eventType === 'UPDATE') {
            setAgents((prev) =>
              prev.map((a) => (a.id === payload.new.id ? { ...a, ...payload.new } : a))
            );
          } else if (payload.eventType === 'INSERT') {
            setAgents((prev) => [...prev, payload.new as AgentRealtime]);
          }
          // Recalculate metrics
          fetchData();
        }
      )
      .subscribe();

    // Subscribe to call changes
    const callsChannel = supabase
      .channel('supervisor-calls')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'calls' },
        (payload) => {
          console.log('Call change:', payload);
          if (payload.eventType === 'INSERT') {
            const newCall = payload.new as CallRealtime;
            if (['QUEUED', 'RINGING', 'CONNECTED', 'ON_HOLD'].includes(newCall.status)) {
              setCalls((prev) => [newCall, ...prev]);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedCall = payload.new as CallRealtime;
            if (['COMPLETED', 'ABANDONED', 'FAILED'].includes(updatedCall.status)) {
              setCalls((prev) => prev.filter((c) => c.id !== updatedCall.id));
            } else {
              setCalls((prev) =>
                prev.map((c) => (c.id === updatedCall.id ? updatedCall : c))
              );
            }
          }
          fetchData();
        }
      )
      .subscribe();

    // Presence channel for live supervisor tracking
    const presenceChannel = supabase.channel('supervisor-presence');
    
    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        setPresenceState(state);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('Supervisor joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('Supervisor left:', key, leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            user: 'supervisor',
            online_at: new Date().toISOString(),
          });
        }
      });

    // Cleanup
    return () => {
      supabase.removeChannel(agentsChannel);
      supabase.removeChannel(callsChannel);
      supabase.removeChannel(presenceChannel);
    };
  }, [fetchData]);

  // Monitor a call (listen/whisper/barge)
  const monitorCall = async (callId: string, type: 'listen' | 'whisper' | 'barge') => {
    try {
      const { data, error } = await supabase.functions.invoke('conference-bridge', {
        body: {
          action: 'bridge',
          callId,
          bridgeType: type === 'listen' ? 'whisper' : type,
        },
      });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error monitoring call:', error);
      return { success: false, error };
    }
  };

  // Force logout an agent
  const forceLogoutAgent = async (agentId: string) => {
    try {
      const { error } = await supabase
        .from('agents')
        .update({ status: 'OFFLINE', logged_in_at: null })
        .eq('id', agentId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error forcing logout:', error);
      return { success: false, error };
    }
  };

  // Send message to agent (via presence)
  const sendMessageToAgent = async (agentId: string, message: string) => {
    // This would use a dedicated messages channel in production
    console.log('Sending message to agent:', agentId, message);
    return { success: true };
  };

  return {
    agents,
    calls,
    queues,
    metrics,
    loading,
    presenceState,
    refetch: fetchData,
    monitorCall,
    forceLogoutAgent,
    sendMessageToAgent,
  };
}
