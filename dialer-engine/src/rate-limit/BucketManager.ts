import { TokenBucket, TokenBucketConfig } from './TokenBucket';
import { getSupabaseClient } from '../database/SupabaseClient';
import { createChildLogger } from '../utils/Logger';

const logger = createChildLogger('BucketManager');

export class BucketManager {
  private buckets: Map<string, TokenBucket> = new Map();
  private syncInterval: NodeJS.Timeout | null = null;

  async initialize(): Promise<void> {
    await this.loadBucketsFromDatabase();
    
    // Sync with database every 5 seconds
    this.syncInterval = setInterval(() => this.syncToDatabase(), 5000);
    
    logger.info({ bucketCount: this.buckets.size }, 'BucketManager initialized');
  }

  async loadBucketsFromDatabase(): Promise<void> {
    const client = getSupabaseClient();
    
    const { data: trunks, error } = await client
      .from('trunk_config')
      .select('id, max_cps')
      .eq('is_active', true);

    if (error) {
      logger.error({ error }, 'Failed to load trunk configs');
      return;
    }

    for (const trunk of trunks || []) {
      const config: TokenBucketConfig = {
        maxTokens: trunk.max_cps,
        refillRate: trunk.max_cps,
      };
      this.buckets.set(trunk.id, new TokenBucket(trunk.id, config));
    }

    // Also load persisted bucket state
    const { data: bucketStates } = await client
      .from('rate_limit_buckets')
      .select('trunk_id, tokens, max_tokens, refill_rate');

    for (const state of bucketStates || []) {
      if (this.buckets.has(state.trunk_id)) {
        // Bucket already exists with fresh config
      } else {
        const config: TokenBucketConfig = {
          maxTokens: state.max_tokens,
          refillRate: state.refill_rate,
        };
        this.buckets.set(state.trunk_id, new TokenBucket(state.trunk_id, config));
      }
    }

    logger.info({ bucketCount: this.buckets.size }, 'Loaded buckets from database');
  }

  async syncToDatabase(): Promise<void> {
    const client = getSupabaseClient();
    
    for (const [trunkId, bucket] of this.buckets) {
      const state = bucket.getState();
      
      await client
        .from('rate_limit_buckets')
        .upsert({
          trunk_id: trunkId,
          tokens: state.tokens,
          max_tokens: state.maxTokens,
          refill_rate: state.refillRate,
          last_refill_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'trunk_id' });
    }
  }

  consume(trunkId: string): boolean {
    const bucket = this.buckets.get(trunkId);
    
    if (!bucket) {
      logger.warn({ trunkId }, 'No bucket found for trunk, allowing (fail-open)');
      return true;
    }

    return bucket.consume();
  }

  getBucketState(trunkId: string): { tokens: number; maxTokens: number } | null {
    const bucket = this.buckets.get(trunkId);
    if (!bucket) return null;
    
    const state = bucket.getState();
    return { tokens: state.tokens, maxTokens: state.maxTokens };
  }

  getAllBucketStates(): Map<string, { tokens: number; maxTokens: number }> {
    const states = new Map();
    for (const [trunkId, bucket] of this.buckets) {
      const state = bucket.getState();
      states.set(trunkId, { tokens: state.tokens, maxTokens: state.maxTokens });
    }
    return states;
  }

  async shutdown(): Promise<void> {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    await this.syncToDatabase();
    logger.info('BucketManager shutdown complete');
  }
}
