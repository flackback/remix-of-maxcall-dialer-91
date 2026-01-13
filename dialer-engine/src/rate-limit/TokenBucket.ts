import { createChildLogger } from '../utils/Logger';

const logger = createChildLogger('TokenBucket');

export interface TokenBucketConfig {
  maxTokens: number;
  refillRate: number; // tokens per second
}

export class TokenBucket {
  private tokens: number;
  private lastRefillAt: number;
  private maxTokens: number;
  private refillRate: number;
  private trunkId: string;

  constructor(trunkId: string, config: TokenBucketConfig) {
    this.trunkId = trunkId;
    this.maxTokens = config.maxTokens;
    this.refillRate = config.refillRate;
    this.tokens = config.maxTokens;
    this.lastRefillAt = Date.now();
  }

  consume(): boolean {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      logger.trace({ trunkId: this.trunkId, tokens: this.tokens }, 'Token consumed');
      return true;
    }

    logger.debug({ trunkId: this.trunkId, tokens: this.tokens }, 'Token bucket empty');
    return false;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefillAt) / 1000; // seconds
    const tokensToAdd = elapsed * this.refillRate;
    
    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefillAt = now;
  }

  getAvailableTokens(): number {
    this.refill();
    return Math.floor(this.tokens);
  }

  getState(): { tokens: number; maxTokens: number; refillRate: number } {
    return {
      tokens: this.getAvailableTokens(),
      maxTokens: this.maxTokens,
      refillRate: this.refillRate,
    };
  }
}
