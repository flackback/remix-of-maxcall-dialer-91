import { JobQueue } from '../database/JobQueue';
import { AttemptRepository } from '../database/AttemptRepository';
import { BucketManager } from '../rate-limit/BucketManager';
import { RouteHealthManager } from '../health/RouteHealthManager';
import { StateMachine } from './StateMachine';
import { VoiceAdapter } from '../voice-adapters/VoiceAdapter';
import { getSupabaseClient } from '../database/SupabaseClient';
import { createChildLogger } from '../utils/Logger';

const logger = createChildLogger('Executor');

interface ExecutorConfig {
  intervalMs: number;
  batchSize: number;
}

export class Executor {
  private config: ExecutorConfig;
  private jobQueue: JobQueue;
  private attemptRepo: AttemptRepository;
  private bucketManager: BucketManager;
  private healthManager: RouteHealthManager;
  private stateMachine: StateMachine;
  private voiceAdapter: VoiceAdapter;
  private interval: NodeJS.Timeout | null = null;
  private running: boolean = false;

  constructor(
    config: ExecutorConfig,
    jobQueue: JobQueue,
    attemptRepo: AttemptRepository,
    bucketManager: BucketManager,
    healthManager: RouteHealthManager,
    stateMachine: StateMachine,
    voiceAdapter: VoiceAdapter
  ) {
    this.config = config;
    this.jobQueue = jobQueue;
    this.attemptRepo = attemptRepo;
    this.bucketManager = bucketManager;
    this.healthManager = healthManager;
    this.stateMachine = stateMachine;
    this.voiceAdapter = voiceAdapter;
  }

  start(): void {
    if (this.running) return;
    
    this.running = true;
    this.interval = setInterval(() => this.tick(), this.config.intervalMs);
    logger.info({ intervalMs: this.config.intervalMs, batchSize: this.config.batchSize }, 'Executor started');
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.running = false;
    logger.info('Executor stopped');
  }

  private async tick(): Promise<void> {
    try {
      // Dequeue batch of jobs
      const jobs = await this.jobQueue.dequeue(this.config.batchSize);
      
      if (jobs.length === 0) return;

      // Process each job
      for (const job of jobs) {
        await this.processJob(job);
      }
    } catch (error) {
      logger.error({ error }, 'Executor tick error');
    }
  }

  private async processJob(job: { id: string; attempt_id: string; campaign_id: string }): Promise<void> {
    try {
      // Get the attempt
      const attempt = await this.attemptRepo.findById(job.attempt_id);
      if (!attempt) {
        await this.jobQueue.fail(job.id, 'Attempt not found');
        return;
      }

      // Select best route
      const route = await this.selectRoute(attempt.account_id);
      if (!route) {
        await this.jobQueue.requeue(job.id, 'No route available');
        return;
      }

      // Check rate limit
      const canOriginate = this.bucketManager.consume(route.trunkId);
      if (!canOriginate) {
        await this.jobQueue.requeue(job.id, 'Rate limited');
        return;
      }

      // Get caller ID
      const callerId = await this.selectCallerId(route.carrierId, attempt.phone_e164);

      // Update attempt with route info
      await this.attemptRepo.updateState(attempt.id, 'RESERVED', {
        trunk_id: route.trunkId,
        carrier_id: route.carrierId,
        caller_id_used: callerId,
      });

      // Transition to ORIGINATING
      await this.stateMachine.transition(job.attempt_id, 'ORIGINATE');

      // Send originate to voice layer
      const result = await this.voiceAdapter.originate({
        correlationId: attempt.correlation_id || attempt.id,
        destination: attempt.phone_e164,
        callerId: callerId,
        trunk: route.trunkName,
        variables: {
          CAMPAIGN_ID: job.campaign_id,
          ATTEMPT_ID: job.attempt_id,
        },
      });

      if (result.success) {
        await this.jobQueue.complete(job.id);
        logger.info({ 
          jobId: job.id, 
          attemptId: job.attempt_id, 
          destination: attempt.phone_e164 
        }, 'Originate sent');
      } else {
        await this.stateMachine.transition(job.attempt_id, 'ERROR', { error: result.error });
        await this.jobQueue.fail(job.id, result.error || 'Originate failed');
        this.healthManager.penalize(route.trunkId, 5, 'Originate failed');
      }
    } catch (error) {
      logger.error({ error, jobId: job.id }, 'Job processing error');
      await this.jobQueue.fail(job.id, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async selectRoute(accountId: string): Promise<{
    trunkId: string;
    trunkName: string;
    carrierId: string;
  } | null> {
    const client = getSupabaseClient();

    // Get best healthy route
    const bestRoute = await this.healthManager.selectBestRoute();
    if (!bestRoute) {
      // Fallback to any active trunk
      const { data: trunk } = await client
        .from('trunk_config')
        .select('id, name, carrier_id')
        .eq('is_active', true)
        .limit(1)
        .single();

      if (trunk) {
        return {
          trunkId: trunk.id,
          trunkName: trunk.name,
          carrierId: trunk.carrier_id,
        };
      }
      return null;
    }

    // Get trunk details
    const { data: trunk } = await client
      .from('trunk_config')
      .select('id, name, carrier_id')
      .eq('id', bestRoute.trunkId)
      .single();

    if (!trunk) return null;

    return {
      trunkId: trunk.id,
      trunkName: trunk.name,
      carrierId: trunk.carrier_id,
    };
  }

  private async selectCallerId(carrierId: string, destinationPhone: string): Promise<string> {
    const client = getSupabaseClient();

    // Get available caller ID for carrier
    const { data: callerId } = await client
      .from('caller_id_numbers')
      .select('phone_number')
      .eq('carrier_id', carrierId)
      .eq('is_active', true)
      .order('uses_today', { ascending: true })
      .limit(1)
      .single();

    if (callerId) {
      // Update usage counter
      await client
        .from('caller_id_numbers')
        .update({ 
          uses_today: client.rpc('increment_uses_today'),
          last_used_at: new Date().toISOString(),
        })
        .eq('phone_number', callerId.phone_number);

      return callerId.phone_number;
    }

    // Fallback to default
    return '+5511999999999';
  }
}
