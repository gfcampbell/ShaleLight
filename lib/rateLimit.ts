import { NextRequest } from 'next/server';

const RATE_LIMIT_5MIN = 1000;
const RATE_LIMIT_DAY = 10000;
const memoryStore = new Map<string, { count: number; expires: number }>();

export class RateLimitError extends Error {
  constructor(message: string, public retryAfter: number) {
    super(message);
    this.name = 'RateLimitError';
  }
}

function touch(key: string, ttlMs: number): number {
  const now = Date.now();
  const existing = memoryStore.get(key);
  if (!existing || existing.expires < now) {
    memoryStore.set(key, { count: 1, expires: now + ttlMs });
    return 1;
  }
  existing.count += 1;
  memoryStore.set(key, existing);
  return existing.count;
}

function cleanExpired(): void {
  const now = Date.now();
  for (const [key, entry] of memoryStore) {
    if (entry.expires < now) {
      memoryStore.delete(key);
    }
  }
}

// Clean up expired entries every 60 seconds
const cleanupInterval = setInterval(cleanExpired, 60_000);
cleanupInterval.unref();

export async function checkRateLimit(ip: string): Promise<void> {
  const c5 = touch(`rl:5:${ip}`, 5 * 60 * 1000);
  const cDay = touch(`rl:d:${ip}`, 24 * 60 * 60 * 1000);
  if (c5 > RATE_LIMIT_5MIN) throw new RateLimitError('Rate limit exceeded', 300);
  if (cDay > RATE_LIMIT_DAY) throw new RateLimitError('Daily rate limit exceeded', 86400);
}

export function getIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}
