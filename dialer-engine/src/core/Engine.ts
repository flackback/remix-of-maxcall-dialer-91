import { config } from '../config';
import { createChildLogger } from '../utils/Logger';
import { testConnection } from '../database/SupabaseClient';
import { CampaignRepository } from '../database/CampaignRepository';
import { AttemptRepository } from '../database/AttemptRepository';
import { LeadRepository } from '../database/LeadRepository';
import { JobQueue } from '../database/JobQueue';
import { BucketManager } from '../rate-limit/BucketManager';
import { RouteHealthManager } from '../health/RouteHealthManager';
import { StateMachine } from './StateMachine';
import { Scheduler } from './Scheduler';
import { Executor } from './Executor';
import { Reconciler } from './Reconciler';
import { TimerProcessor } from './TimerProcessor';
import { VoiceAdapter } from '../voice-adapters/VoiceAdapter';
import { AMIAdapter } from '../voice-adapters/AMIAdapter';
import { ESLAdapter } from '../voice-adapters/ESLAdapter';
import { MockAdapter } from '../voice-adapters/MockAdapter';

const logger = createChildLogger('Engine');

export class DialerEngine {
  private scheduler: Scheduler | null = null;
  private executor: Executor | null = null;
  private reconciler: Reconciler | null = null;
  private timerProcessor: TimerProcessor | null = null;
  private bucketManager: BucketManager | null = null;
  private healthManager: RouteHealthManager | null = null;
  private voiceAdapter: VoiceAdapter | null = null;
  private running: boolean = false;

  async start(): Promise<void> {
    logger.info('Starting Dialer Engine...');

    // Test database connection (only required when not using the Dialer API)
    const hasApi = !!(config.dialerApi.url && config.dialerApi.key);
    const connected = await testConnection();

    if (!connected) {
      if (!hasApi) {
        throw new Error('Failed to connect to Supabase');
      }
      logger.warn('Direct Supabase connection failed - proceeding with Dialer API only');
    }

    // Initialize managers
    this.bucketManager = new BucketManager();
    await this.bucketManager.initialize();

    this.healthManager = new RouteHealthManager();
    await this.healthManager.initialize();

    // Initialize voice adapter
    this.voiceAdapter = this.createVoiceAdapter();
    await this.voiceAdapter.connect();

    // Initialize repositories
    const campaignRepo = new CampaignRepository();
    const attemptRepo = new AttemptRepository();
    const leadRepo = new LeadRepository();
    const jobQueue = new JobQueue();

    // Initialize state machine
    const stateMachine = new StateMachine(attemptRepo);

    // Initialize core components
    this.scheduler = new Scheduler(
      { intervalMs: config.engine.schedulerIntervalMs },
      campaignRepo,
      leadRepo,
      attemptRepo,
      jobQueue,
      stateMachine
    );

    this.executor = new Executor(
      { intervalMs: config.engine.executorIntervalMs, batchSize: 10 },
      jobQueue,
      attemptRepo,
      this.bucketManager,
      this.healthManager,
      stateMachine,
      this.voiceAdapter
    );

    this.reconciler = new Reconciler(
      attemptRepo,
      stateMachine,
      this.healthManager,
      this.voiceAdapter
    );

    this.timerProcessor = new TimerProcessor(
      { intervalMs: config.engine.timerProcessorIntervalMs },
      stateMachine
    );

    // Start all components
    this.scheduler.start();
    this.executor.start();
    this.reconciler.start();
    this.timerProcessor.start();

    this.running = true;
    logger.info('Dialer Engine started successfully');
  }

  async stop(): Promise<void> {
    logger.info('Stopping Dialer Engine...');

    // Stop components in reverse order
    this.timerProcessor?.stop();
    this.reconciler?.stop();
    this.executor?.stop();
    this.scheduler?.stop();

    // Disconnect voice adapter
    await this.voiceAdapter?.disconnect();

    // Shutdown managers
    await this.bucketManager?.shutdown();
    await this.healthManager?.shutdown();

    this.running = false;
    logger.info('Dialer Engine stopped');
  }

  isRunning(): boolean {
    return this.running;
  }

  getStatus(): Record<string, unknown> {
    return {
      running: this.running,
      voiceAdapter: {
        type: config.voiceAdapter,
        connected: this.voiceAdapter?.isConnected() || false,
      },
      buckets: this.bucketManager?.getAllBucketStates() || {},
      health: this.healthManager?.getHealthReport() || [],
    };
  }

  private createVoiceAdapter(): VoiceAdapter {
    switch (config.voiceAdapter) {
      case 'asterisk_ami':
        return new AMIAdapter({
          host: config.asterisk.host,
          port: config.asterisk.port,
          username: config.asterisk.username,
          secret: config.asterisk.secret,
          context: config.asterisk.context,
        });

      case 'freeswitch_esl':
        return new ESLAdapter({
          host: config.freeswitch.host,
          port: config.freeswitch.port,
          password: config.freeswitch.password,
          context: config.freeswitch.context,
        });

      case 'mock':
      default:
        return new MockAdapter({
          host: 'localhost',
          port: 0,
        });
    }
  }
}
