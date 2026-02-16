const UNSAFE_JWT_DEFAULTS = new Set([
  'dev-secret',
  'change-this-to-a-random-string',
  'secret',
  'jwt-secret',
]);

let validated = false;

export function validateEnv(): void {
  if (validated) return;

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
  }

  if (
    process.env.NODE_ENV === 'production' &&
    UNSAFE_JWT_DEFAULTS.has(process.env.JWT_SECRET)
  ) {
    throw new Error('JWT_SECRET must not use a default value in production');
  }

  validated = true;
}

/** Reset for testing only */
export function _resetValidation(): void {
  validated = false;
}
