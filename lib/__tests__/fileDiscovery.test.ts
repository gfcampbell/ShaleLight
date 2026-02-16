import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isPathAllowed } from '@/lib/fileDiscovery';

describe('isPathAllowed', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('allows paths under /Volumes by default', () => {
    delete process.env.ALLOWED_FILE_ROOTS;
    expect(isPathAllowed('/Volumes/data/files')).toBe(true);
  });

  it('blocks /etc by default', () => {
    delete process.env.ALLOWED_FILE_ROOTS;
    expect(isPathAllowed('/etc/passwd')).toBe(false);
  });

  it('blocks ../ traversal attempts', () => {
    delete process.env.ALLOWED_FILE_ROOTS;
    expect(isPathAllowed('/Volumes/../etc/passwd')).toBe(false);
  });

  it('respects ALLOWED_FILE_ROOTS env var', () => {
    process.env.ALLOWED_FILE_ROOTS = '/data,/mnt';
    expect(isPathAllowed('/data/files')).toBe(true);
    expect(isPathAllowed('/mnt/share')).toBe(true);
    expect(isPathAllowed('/Volumes/data')).toBe(false);
  });

  it('blocks root path itself when not in allowed list', () => {
    delete process.env.ALLOWED_FILE_ROOTS;
    expect(isPathAllowed('/')).toBe(false);
  });

  it('allows the exact root path', () => {
    delete process.env.ALLOWED_FILE_ROOTS;
    expect(isPathAllowed('/Volumes')).toBe(true);
  });
});
