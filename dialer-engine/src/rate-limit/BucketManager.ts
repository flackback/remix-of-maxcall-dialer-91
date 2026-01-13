import { TokenBucket, TokenBucketConfig } from './TokenBucket';
import { getSupabaseClient } from '../database/SupabaseClient';
import { getApiClient } from '../database/ApiClient';
import { createChildLogger } from '../utils/Logger';
import { config } from '../config';

const logger = createChildLogger('BucketManager');

export class BucketManager {
  private buckets: Map<string, TokenBucket> = new Map();
  private syncInterval: NodeJS.Timeout | null = null;

  private useApi(): boolean {
    return !!(config.dialerApi.url && config.dialerApi.key);
  }

  async initialize(): Promise<void> {
    await this.loadBucketsFromDatabase();
    
    // Sync with database every 5 seconds
    this.syncInterval = setInterval(() => this.syncToDatabase(), 5000);
    
    logger.info({ bucketCount: this.buckets.size, useApi: this.useApi() }, 'BucketManager initialized');
  }

  async loadBucketsFromDatabase(): Promise<void> {
    if (this.useApi()) {
      await this.loadBucketsViaApi();
    } else {
      await this.loadBucketsViaSupabase();
    }
  }

  private async loadBucketsViaApi(): Promise<void> {
    const api = getApiClient();

    // Load trunk configs
    const { data: trunks, error: trunksError } = await api.getTrunkConfigs();
    
    if (trunksError) {
      logger.error({ error: trunksError }, 'Failed to load trunk configs via API');
      return;
    }

    for (const trunk of trunks || []) {
      const trunkConfig: TokenBucketConfig = {
        maxTokens: trunk.cps_limit,
        refillRate: trunk.cps_limit,
      };
      this.buckets.set(trunk.id, new TokenBucket(trunk.id, trunkConfig));
    }

    // Load bucket states
    const { data: bucketStates } = await api.getBucketStates();

    for (const state of bucketStates || []) {
      if (!this.buckets.has(state.trunk_id)) {
        const bucketConfig: TokenBucketConfig = {
          maxTokens: state.max_tokens,
          refillRate: state.refill_rate,
        };
        this.buckets.set(state.trunk_id, new TokenBucket(state.trunk_id, bucketConfig));
      }
    }

    logger.info({ bucketCount: this.buckets.size }, 'Loaded buckets from API');
  }

  private async loadBucketsViaSupabase(): Promise<void> {
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
      const trunkConfig: TokenBucketConfig = {
        maxTokens: trunk.max_cps,
        refillRate: trunk.max_cps,
      };
      this.buckets.set(trunk.id, new TokenBucket(trunk.id, trunkConfig));
    }

    const { data: bucketStates } = await client
      .from('rate_limit_buckets')
      .select('trunk_id, tokens, max_tokens, refill_rate');

    for (const state of bucketStates || []) {
      if (!this.buckets.has(state.trunk_id)) {
        const bucketConfig: TokenBucketConfig = {
          maxTokens: state.max_tokens,
          refillRate: state.refill_rate,
        };
        this.buckets.set(state.trunk_id, new TokenBucket(state.trunk_id, bucketConfig));
      }
    }

    logger.info({ bucketCount: this.buckets.size }, 'Loaded buckets from database');
  }

  async syncToDatabase(): Promise<void> {
    if (this.useApi()) {
      await this.syncViaApi();
    } else {
      await this.syncViaSupabase();
    }
  }

  private async syncViaApi(): Promise<void> {
    const api = getApiClient();
    
    for (const [trunkId, bucket] of this.buckets) {
      const state = bucket.getState();
      
      await api.upsertBucketState({
        trunk_id: trunkId,
        tokens: state.tokens,
        max_tokens: state.maxTokens,
        refill_rate: state.refillRate,
        last_refill_at: new Date().toISOString(),
      });
    }
  }

  private async syncViaSupabase(): Promise<void> {
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
