import { CampaignRepository } from '../database/CampaignRepository';
import { LeadRepository } from '../database/LeadRepository';
import { AttemptRepository } from '../database/AttemptRepository';
import { JobQueue } from '../database/JobQueue';
import { StateMachine } from './StateMachine';
import { Campaign } from '../types';
import { createChildLogger } from '../utils/Logger';

const logger = createChildLogger('Scheduler');

interface SchedulerConfig {
  intervalMs: number;
}

export class Scheduler {
  private config: SchedulerConfig;
  private campaignRepo: CampaignRepository;
  private leadRepo: LeadRepository;
  private attemptRepo: AttemptRepository;
  private jobQueue: JobQueue;
  private stateMachine: StateMachine;
  private interval: NodeJS.Timeout | null = null;
  private running: boolean = false;

  constructor(
    config: SchedulerConfig,
    campaignRepo: CampaignRepository,
    leadRepo: LeadRepository,
    attemptRepo: AttemptRepository,
    jobQueue: JobQueue,
    stateMachine: StateMachine
  ) {
    this.config = config;
    this.campaignRepo = campaignRepo;
    this.leadRepo = leadRepo;
    this.attemptRepo = attemptRepo;
    this.jobQueue = jobQueue;
    this.stateMachine = stateMachine;
  }

  start(): void {
    if (this.running) return;
    
    this.running = true;
    this.interval = setInterval(() => this.tick(), this.config.intervalMs);
    logger.info({ intervalMs: this.config.intervalMs }, 'Scheduler started');
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.running = false;
    logger.info('Scheduler stopped');
  }

  private async tick(): Promise<void> {
    try {
      const campaigns = await this.campaignRepo.getActiveCampaigns();
      
      for (const campaign of campaigns) {
        await this.processCampaign(campaign);
      }
    } catch (error) {
      logger.error({ error }, 'Scheduler tick error');
    }
  }

  private async processCampaign(campaign: Campaign): Promise<void> {
    // Check work hours
    if (!this.isWithinWorkHours(campaign)) {
      return;
    }

    // Check work days
    if (!this.isWorkDay(campaign)) {
      return;
    }

    // Calculate how many calls to place
    const budget = await this.calculateBudget(campaign);
    
    if (budget.callsToPlace <= 0) {
      return;
    }

    // Reserve leads atomically
    const leads = await this.leadRepo.reserveLeads(
      campaign.id,
      campaign.account_id,
      budget.callsToPlace
    );

    if (leads.length === 0) {
      logger.debug({ campaignId: campaign.id }, 'No leads available');
      return;
    }

    // Create attempts and jobs
    for (const lead of leads) {
      try {
        // Create call attempt
        const attempt = await this.attemptRepo.create({
          account_id: campaign.account_id,
          campaign_id: campaign.id,
          lead_id: lead.id,
          phone_e164: lead.phone,
          state: 'QUEUED',
        });

        // Transition to RESERVED
        await this.stateMachine.transition(attempt.id, 'RESERVE');

        // Enqueue originate job
        await this.jobQueue.enqueue({
          campaign_id: campaign.id,
          attempt_id: attempt.id,
          lead_id: lead.id,
          phone: lead.phone,
          priority: campaign.priority,
        });

        logger.debug({ attemptId: attempt.id, leadId: lead.id }, 'Created attempt and job');
      } catch (error) {
        logger.error({ error, leadId: lead.id }, 'Failed to create attempt');
        // Release the lead
        await this.leadRepo.releaseLeads([lead.id]);
      }
    }

    logger.info({ 
      campaignId: campaign.id, 
      leadsReserved: leads.length,
      budget: budget.callsToPlace,
    }, 'Scheduler processed campaign');
  }

  private async calculateBudget(campaign: Campaign): Promise<{ callsToPlace: number; reason: string }> {
    // Get available agents
    const availableAgents = await this.campaignRepo.getAvailableAgentsCount(campaign.id);
    
    if (availableAgents === 0) {
      return { callsToPlace: 0, reason: 'No available agents' };
    }

    // Get current active calls
    const activeCalls = await this.campaignRepo.getActiveCallsCount(campaign.id);
    const remainingCapacity = campaign.max_concurrent - activeCalls;

    if (remainingCapacity <= 0) {
      return { callsToPlace: 0, reason: 'At max concurrent' };
    }

    // Calculate calls based on dialer mode
    let callsToPlace: number;

    switch (campaign.dialer_mode) {
      case 'PREVIEW':
        // 1:1 ratio - one call per available agent
        callsToPlace = Math.min(availableAgents, remainingCapacity);
        break;

      case 'PROGRESSIVE':
        // Slightly more than 1:1
        callsToPlace = Math.min(
          Math.ceil(availableAgents * 1.2),
          remainingCapacity
        );
        break;

      case 'POWER':
        // Fixed dial ratio
        callsToPlace = Math.min(
          Math.floor(availableAgents * campaign.dial_ratio),
          remainingCapacity
        );
        break;

      case 'PREDICTIVE':
        // Adaptive based on metrics
        const metrics = await this.campaignRepo.getCampaignMetrics(campaign.id);
        let adaptiveRatio = campaign.dial_ratio;

        // Adjust ratio based on abandon rate
        if (metrics.abandonRate > 3) {
          adaptiveRatio *= 0.8; // Reduce if too many abandons
        } else if (metrics.abandonRate < 1 && metrics.asr > 30) {
          adaptiveRatio *= 1.1; // Increase if performing well
        }

        callsToPlace = Math.min(
          Math.floor(availableAgents * adaptiveRatio),
          remainingCapacity
        );
        break;

      default:
        callsToPlace = 0;
    }

    // Ensure at least 1 call if we have capacity and agents
    if (callsToPlace === 0 && availableAgents > 0 && remainingCapacity > 0) {
      callsToPlace = 1;
    }

    return { 
      callsToPlace, 
      reason: `Mode: ${campaign.dialer_mode}, Agents: ${availableAgents}, Active: ${activeCalls}` 
    };
  }

  private isWithinWorkHours(campaign: Campaign): boolean {
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
    
    return currentTime >= campaign.work_start && currentTime <= campaign.work_end;
  }

  private isWorkDay(campaign: Campaign): boolean {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday
    
    return campaign.work_days.includes(dayOfWeek);
  }
}
