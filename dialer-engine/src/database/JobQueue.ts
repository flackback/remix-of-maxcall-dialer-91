import { getSupabaseClient } from './SupabaseClient';
import { OriginateJob } from '../types';
import { createChildLogger } from '../utils/Logger';
import { v4 as uuidv4 } from 'uuid';

const logger = createChildLogger('JobQueue');

export interface JobPayload {
  campaign_id: string;
  attempt_id: string;
  lead_id: string;
  phone: string;
  priority: number;
}

export class JobQueue {
  private lockerId: string;

  constructor() {
    this.lockerId = `worker-${process.pid}-${uuidv4().slice(0, 8)}`;
  }

  async enqueue(payload: JobPayload): Promise<string> {
    const client = getSupabaseClient();
    
    const job = {
      id: uuidv4(),
      attempt_id: payload.attempt_id,
      campaign_id: payload.campaign_id,
      priority: payload.priority,
      status: 'PENDING',
      created_at: new Date().toISOString(),
    };

    const { error } = await client
      .from('originate_jobs')
      .insert(job);

    if (error) {
      logger.error({ error, payload }, 'Failed to enqueue job');
      throw error;
    }

    logger.debug({ jobId: job.id }, 'Enqueued originate job');
    return job.id;
  }

  async dequeue(limit: number = 1): Promise<OriginateJob[]> {
    const client = getSupabaseClient();
    
    // Fetch pending jobs
    const { data: pendingJobs, error: fetchError } = await client
      .from('originate_jobs')
      .select('*')
      .eq('status', 'PENDING')
      .is('locked_by', null)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(limit);

    if (fetchError || !pendingJobs || pendingJobs.length === 0) {
      return [];
    }

    const jobIds = pendingJobs.map(j => j.id);
    
    // Lock the jobs
    const { data: lockedJobs, error: lockError } = await client
      .from('originate_jobs')
      .update({ 
        locked_by: this.lockerId, 
        locked_at: new Date().toISOString(),
        status: 'PROCESSING',
      })
      .in('id', jobIds)
      .is('locked_by', null)
      .select();

    if (lockError) {
      logger.error({ lockError }, 'Failed to lock jobs');
      return [];
    }

    return lockedJobs || [];
  }

  async complete(jobId: string): Promise<void> {
    const client = getSupabaseClient();
    
    const { error } = await client
      .from('originate_jobs')
      .update({ 
        status: 'COMPLETED',
        processed_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    if (error) {
      logger.error({ error, jobId }, 'Failed to complete job');
    }
  }

  async fail(jobId: string, errorMessage: string): Promise<void> {
    const client = getSupabaseClient();
    
    const { error } = await client
      .from('originate_jobs')
      .update({ 
        status: 'FAILED',
        error_message: errorMessage,
        processed_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    if (error) {
      logger.error({ error, jobId }, 'Failed to mark job as failed');
    }
  }

  async requeue(jobId: string, reason: string): Promise<void> {
    const client = getSupabaseClient();
    
    const { error } = await client
      .from('originate_jobs')
      .update({ 
        status: 'PENDING',
        locked_by: null,
        locked_at: null,
        error_message: reason,
      })
      .eq('id', jobId);

    if (error) {
      logger.error({ error, jobId }, 'Failed to requeue job');
    }
  }

  async getPendingCount(): Promise<number> {
    const client = getSupabaseClient();
    
    const { count, error } = await client
      .from('originate_jobs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'PENDING');

    if (error) {
      return 0;
    }

    return count || 0;
  }
}
