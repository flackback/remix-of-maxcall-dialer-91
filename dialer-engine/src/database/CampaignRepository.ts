import { getSupabaseClient } from './SupabaseClient';
import { getApiClient } from './ApiClient';
import { Campaign } from '../types';
import { createChildLogger } from '../utils/Logger';
import { config } from '../config';

const logger = createChildLogger('CampaignRepository');

export class CampaignRepository {
  private useApi(): boolean {
    return !!(config.dialerApi.url && config.dialerApi.key);
  }

  async getActiveCampaigns(accountId?: string): Promise<Campaign[]> {
    if (this.useApi()) {
      return this.getActiveCampaignsViaApi(accountId);
    }
    return this.getActiveCampaignsViaSupabase(accountId);
  }

  private async getActiveCampaignsViaApi(accountId?: string): Promise<Campaign[]> {
    const api = getApiClient();
    const { data, error } = await api.getActiveCampaigns(accountId);

    if (error) {
      logger.error({ error }, 'Failed to fetch active campaigns via API');
      throw new Error(error);
    }

    return (data || []) as Campaign[];
  }

  private async getActiveCampaignsViaSupabase(accountId?: string): Promise<Campaign[]> {
    const client = getSupabaseClient();
    
    let query = client
      .from('campaigns')
      .select('*')
      .eq('status', 'ACTIVE')
      .order('priority', { ascending: false });

    if (accountId) {
      query = query.eq('account_id', accountId);
    }

    const { data, error } = await query;

    if (error) {
      logger.error({ error }, 'Failed to fetch active campaigns');
      throw error;
    }

    return data || [];
  }

  async getCampaignById(campaignId: string): Promise<Campaign | null> {
    const client = getSupabaseClient();
    
    const { data, error } = await client
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      logger.error({ error, campaignId }, 'Failed to fetch campaign');
      throw error;
    }

    return data;
  }

  async getAvailableAgentsCount(campaignId: string): Promise<number> {
    const client = getSupabaseClient();
    
    const { data: campaignAgents, error: campaignError } = await client
      .from('campaign_agents')
      .select('agent_id')
      .eq('campaign_id', campaignId);

    if (campaignError) {
      logger.error({ error: campaignError, campaignId }, 'Failed to fetch campaign agents');
      return 0;
    }

    if (!campaignAgents || campaignAgents.length === 0) {
      return 0;
    }

    const agentIds = campaignAgents.map(ca => ca.agent_id);

    const { count, error } = await client
      .from('agents')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'AVAILABLE')
      .in('id', agentIds);

    if (error) {
      logger.error({ error, campaignId }, 'Failed to count available agents');
      return 0;
    }

    return count || 0;
  }

  async getActiveCallsCount(campaignId: string): Promise<number> {
    if (this.useApi()) {
      const api = getApiClient();
      const { data, error } = await api.getActiveAttempts(campaignId);
      if (error) {
        logger.error({ error, campaignId }, 'Failed to count active calls via API');
        return 0;
      }
      return data?.length || 0;
    }

    const client = getSupabaseClient();
    
    const { count, error } = await client
      .from('call_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('campaign_id', campaignId)
      .in('state', ['ORIGINATING', 'RINGING', 'EARLY_MEDIA', 'ANSWERED', 'AMD_PROCESSING', 'BRIDGED']);

    if (error) {
      logger.error({ error, campaignId }, 'Failed to count active calls');
      return 0;
    }

    return count || 0;
  }

  async getCampaignMetrics(campaignId: string, windowMinutes: number = 15): Promise<{
    totalCalls: number;
    answeredCalls: number;
    abandonedCalls: number;
    asr: number;
    abandonRate: number;
  }> {
    const client = getSupabaseClient();
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();
    
    const { data, error } = await client
      .from('call_attempts')
      .select('state, sip_final_code')
      .eq('campaign_id', campaignId)
      .gte('created_at', windowStart);

    if (error) {
      logger.error({ error, campaignId }, 'Failed to fetch campaign metrics');
      return { totalCalls: 0, answeredCalls: 0, abandonedCalls: 0, asr: 0, abandonRate: 0 };
    }

    const attempts = data || [];
    const totalCalls = attempts.length;
    const answeredCalls = attempts.filter(a => ['BRIDGED', 'ENDED'].includes(a.state) && a.sip_final_code === 200).length;
    const abandonedCalls = attempts.filter(a => a.state === 'CANCELLED').length;

    return {
      totalCalls,
      answeredCalls,
      abandonedCalls,
      asr: totalCalls > 0 ? (answeredCalls / totalCalls) * 100 : 0,
      abandonRate: answeredCalls > 0 ? (abandonedCalls / answeredCalls) * 100 : 0,
    };
  }
}
