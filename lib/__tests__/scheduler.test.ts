import { describe, it, expect } from 'vitest';
import { isJobCancelled, cancelJob } from '@/lib/jobs/scheduler';

describe('job cancellation', () => {
  it('isJobCancelled returns false for non-cancelled jobs', () => {
    expect(isJobCancelled('some-job-id')).toBe(false);
  });

  it('cancelJob marks a job as cancelled', () => {
    cancelJob('cancel-test-id');
    expect(isJobCancelled('cancel-test-id')).toBe(true);
  });

  it('cancellation does not affect other jobs', () => {
    cancelJob('job-a');
    expect(isJobCancelled('job-a')).toBe(true);
    expect(isJobCancelled('job-b')).toBe(false);
  });
});
