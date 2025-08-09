export interface RateLimitConfig {
  windowMs: number;
  max: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

export type UserIdentifier = {
  type: 'ip' | 'email' | 'userId';
  value: string;
};