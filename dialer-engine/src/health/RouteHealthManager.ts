import { getSupabaseClient } from '../database/SupabaseClient';
import { RouteHealth, TrunkConfig } from '../types';
import { createChildLogger } from '../utils/Logger';

const logger = createChildLogger('RouteHealthManager');

interface RouteScore {
  carrierId: string;
  trunkId: string;
  healthScore: number;
  isDegraded: boolean;
  lastUpdated: Date;
}

export class RouteHealthManager {
  private scores: Map<string, RouteScore> = new Map();
  private syncInterval: NodeJS.Timeout | null = null;

  async initialize(): Promise<void> {
    await this.loadFromDatabase();
    
    // Sync every 10 seconds
    this.syncInterval = setInterval(() => this.syncToDatabase(), 10000);
    
    logger.info({ routeCount: this.scores.size }, 'RouteHealthManager initialized');
  }

  async loadFromDatabase(): Promise<void> {
    const client = getSupabaseClient();
    
    const { data, error } = await client
      .from('route_health')
      .select('*');

    if (error) {
      logger.error({ error }, 'Failed to load route health');
      return;
    }

    for (const row of data || []) {
      const key = row.trunk_id || row.carrier_id;
      this.scores.set(key, {
        carrierId: row.carrier_id,
        trunkId: row.trunk_id,
        healthScore: row.health_score,
        isDegraded: row.is_degraded,
        lastUpdated: new Date(row.updated_at),
      });
    }
  }

  async syncToDatabase(): Promise<void> {
    const client = getSupabaseClient();
    
    for (const [key, score] of this.scores) {
      await client
        .from('route_health')
        .upsert({
          carrier_id: score.carrierId,
          trunk_id: score.trunkId,
          health_score: score.healthScore,
          is_degraded: score.isDegraded,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'carrier_id' });
    }
  }

  getScore(trunkId: string): number {
    const score = this.scores.get(trunkId);
    return score?.healthScore ?? 100;
  }

  isDegraded(trunkId: string): boolean {
    const score = this.scores.get(trunkId);
    return score?.isDegraded ?? false;
  }

  penalize(trunkId: string, amount: number, reason: string): void {
    const score = this.scores.get(trunkId);
    if (!score) {
      logger.warn({ trunkId }, 'Cannot penalize unknown trunk');
      return;
    }

    const newScore = Math.max(0, score.healthScore - amount);
    score.healthScore = newScore;
    score.isDegraded = newScore < 50;
    score.lastUpdated = new Date();

    logger.info({ trunkId, penalty: amount, newScore, reason }, 'Route penalized');
  }

  recover(trunkId: string, amount: number = 0.5): void {
    const score = this.scores.get(trunkId);
    if (!score) return;

    const newScore = Math.min(100, score.healthScore + amount);
    score.healthScore = newScore;
    score.isDegraded = newScore < 60 ? score.isDegraded : false;
    score.lastUpdated = new Date();
  }

  async selectBestRoute(carrierId?: string): Promise<{ trunkId: string; healthScore: number } | null> {
    const client = getSupabaseClient();
    
    let query = client
      .from('trunk_config')
      .select('id, carrier_id, max_cps, max_channels')
      .eq('is_active', true)
      .order('priority', { ascending: false });

    if (carrierId) {
      query = query.eq('carrier_id', carrierId);
    }

    const { data: trunks, error } = await query;

    if (error || !trunks || trunks.length === 0) {
      return null;
    }

    // Sort by health score and return best
    const sortedTrunks = trunks
      .map(t => ({
        trunkId: t.id,
        healthScore: this.getScore(t.id),
        isDegraded: this.isDegraded(t.id),
      }))
      .filter(t => !t.isDegraded)
      .sort((a, b) => b.healthScore - a.healthScore);

    return sortedTrunks[0] || null;
  }

  getHealthReport(): Array<{ trunkId: string; healthScore: number; isDegraded: boolean }> {
    return Array.from(this.scores.values()).map(s => ({
      trunkId: s.trunkId || s.carrierId,
      healthScore: s.healthScore,
      isDegraded: s.isDegraded,
    }));
  }

  async shutdown(): Promise<void> {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    await this.syncToDatabase();
    logger.info('RouteHealthManager shutdown complete');
  }
}
