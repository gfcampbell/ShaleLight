import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { validateEnv, _resetValidation } from '@/lib/env';

describe('validateEnv', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    _resetValidation();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('throws when DATABASE_URL is missing', () => {
    delete process.env.DATABASE_URL;
    process.env.JWT_SECRET = 'some-secret';
    expect(() => validateEnv()).toThrow('DATABASE_URL environment variable is required');
  });

  it('throws when JWT_SECRET is missing', () => {
    process.env.DATABASE_URL = 'postgresql://localhost/test';
    delete process.env.JWT_SECRET;
    expect(() => validateEnv()).toThrow('JWT_SECRET environment variable is required');
  });

  it('passes with valid env vars', () => {
    process.env.DATABASE_URL = 'postgresql://localhost/test';
    process.env.JWT_SECRET = 'a-real-secret-value';
    expect(() => validateEnv()).not.toThrow();
  });

  it('rejects default JWT_SECRET in production', () => {
    process.env.DATABASE_URL = 'postgresql://localhost/test';
    process.env.JWT_SECRET = 'dev-secret';
    (process.env as Record<string, string>).NODE_ENV = 'production';
    expect(() => validateEnv()).toThrow('JWT_SECRET must not use a default value in production');
  });

  it('allows default-like JWT_SECRET in development', () => {
    process.env.DATABASE_URL = 'postgresql://localhost/test';
    process.env.JWT_SECRET = 'dev-secret';
    (process.env as Record<string, string>).NODE_ENV = 'development';
    expect(() => validateEnv()).not.toThrow();
  });

  it('only validates once (cached)', () => {
    process.env.DATABASE_URL = 'postgresql://localhost/test';
    process.env.JWT_SECRET = 'a-real-secret';
    validateEnv();
    // Remove vars - should NOT throw because already validated
    delete process.env.DATABASE_URL;
    expect(() => validateEnv()).not.toThrow();
  });
});
