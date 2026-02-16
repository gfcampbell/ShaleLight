import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '@/lib/auth';

describe('hashPassword', () => {
  it('returns a bcrypt hash string', async () => {
    const hash = await hashPassword('testpassword');
    expect(hash).toMatch(/^\$2[aby]\$/);
  });

  it('produces different hashes for the same password (salt)', async () => {
    const hash1 = await hashPassword('samepassword');
    const hash2 = await hashPassword('samepassword');
    expect(hash1).not.toBe(hash2);
  });
});

describe('verifyPassword', () => {
  it('returns true for correct password', async () => {
    const hash = await hashPassword('correct');
    expect(await verifyPassword('correct', hash)).toBe(true);
  });

  it('returns false for wrong password', async () => {
    const hash = await hashPassword('correct');
    expect(await verifyPassword('wrong', hash)).toBe(false);
  });
});
