import { getSupabaseClient } from './SupabaseClient';
import { createChildLogger } from '../utils/Logger';

const logger = createChildLogger('LeadRepository');

export interface Lead {
  id: string;
  phone: string;
  name?: string;
  account_id: string;
}

export class LeadRepository {
  async reserveLeads(campaignId: string, accountId: string, limit: number): Promise<Lead[]> {
    const client = getSupabaseClient();
    
    try {
      // Use the database function for atomic reservation
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
