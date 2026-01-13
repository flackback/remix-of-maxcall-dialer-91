import { getSupabaseClient } from './SupabaseClient';
import { getApiClient } from './ApiClient';
import { createChildLogger } from '../utils/Logger';
import { config } from '../config';

const logger = createChildLogger('LeadRepository');

export interface Lead {
  id: string;
  phone: string;
  name?: string;
  account_id: string;
}

export class LeadRepository {
  private useApi(): boolean {
    return !!(config.dialerApi.url && config.dialerApi.key);
  }

  async reserveLeads(campaignId: string, accountId: string, limit: number): Promise<Lead[]> {
    if (this.useApi()) {
      return this.reserveLeadsViaApi(campaignId, accountId, limit);
    }
    return this.reserveLeadsViaSupabase(campaignId, accountId, limit);
  }

  private async reserveLeadsViaApi(campaignId: string, accountId: string, limit: number): Promise<Lead[]> {
    const api = getApiClient();
    const { data, error } = await api.reserveLeads(campaignId, accountId, limit);

    if (error || !data) {
      logger.error({ error, campaignId, limit }, 'Failed to reserve leads via API');
      return [];
    }

    const leads = data.map(row => ({
      id: row.lead_id,
      phone: row.phone,
      account_id: accountId,
    }));

    logger.debug({ campaignId, count: leads.length }, 'Reserved leads via API');
    return leads;
  }

  private async reserveLeadsViaSupabase(campaignId: string, accountId: string, limit: number): Promise<Lead[]> {
    const client = getSupabaseClient();
    
    try {
      const { data, error } = await client.rpc('reserve_leads_for_campaign', {
        p_campaign_id: campaignId,
        p_account_id: accountId,
        p_limit: limit,
      });

      if (error) {
        logger.error({ error, campaignId, limit }, 'Failed to reserve leads');
        return [];
      }

      const leads = (data || []).map((row: { lead_id: string; phone: string }) => ({
        id: row.lead_id,
        phone: row.phone,
        account_id: accountId,
      }));

      logger.debug({ campaignId, count: leads.length }, 'Reserved leads');
      return leads;
    } catch (error) {
      logger.error({ error, campaignId }, 'Error reserving leads');
      return [];
    }
  }

  async releaseLeads(leadIds: string[]): Promise<void> {
    if (leadIds.length === 0) return;
    
    // For now, only Supabase direct - API doesn't have this endpoint
    const client = getSupabaseClient();
    
    const { error } = await client
      .from('leads')
      .update({ status: 'NEW', updated_at: new Date().toISOString() })
      .in('id', leadIds);

    if (error) {
      logger.error({ error, leadIds }, 'Failed to release leads');
    }
  }

  async markLeadDialed(leadId: string): Promise<void> {
    // For now, only Supabase direct - API doesn't have this endpoint
    const client = getSupabaseClient();
    
    const { error } = await client
      .from('leads')
      .update({ 
        status: 'DIALED',
        last_attempt_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', leadId);

    if (error) {
      logger.error({ error, leadId }, 'Failed to mark lead dialed');
    }
  }
}
