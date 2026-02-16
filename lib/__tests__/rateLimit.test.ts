import { describe, it, expect } from 'vitest';
import { checkRateLimit, getIP, RateLimitError } from '@/lib/rateLimit';
import { NextRequest } from 'next/server';

describe('checkRateLimit', () => {
  it('allows requests under the limit', async () => {
    // Use a unique IP per test to avoid shared state
    await expect(checkRateLimit('test-under-limit-1')).resolves.toBeUndefined();
  });

  it('allows many requests before hitting the 5-min limit (1000)', async () => {
    // Just verify a few calls don't throw — we can't realistically call 1000 times
    const ip = 'test-under-limit-batch';
    for (let i = 0; i < 10; i++) {
      await expect(checkRateLimit(ip)).resolves.toBeUndefined();
    }
  });
});

describe('RateLimitError', () => {
  it('has correct name and retryAfter property', () => {
    const err = new RateLimitError('Too many requests', 300);
    expect(err.name).toBe('RateLimitError');
    expect(err.message).toBe('Too many requests');
    expect(err.retryAfter).toBe(300);
  });

  it('is an instance of Error', () => {
    const err = new RateLimitError('test', 60);
    expect(err).toBeInstanceOf(Error);
  });
});

describe('getIP', () => {
  it('extracts first IP from x-forwarded-for header', () => {
    const req = new NextRequest('http://localhost', {
      headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
    });
    expect(getIP(req)).toBe('1.2.3.4');
  });

  it('extracts IP from x-real-ip header', () => {
    const req = new NextRequest('http://localhost', {
      headers: { 'x-real-ip': '10.0.0.1' },
    });
    expect(getIP(req)).toBe('10.0.0.1');
  });

  it('returns unknown when no IP headers present', () => {
    const req = new NextRequest('http://localhost');
    expect(getIP(req)).toBe('unknown');
  });
});
