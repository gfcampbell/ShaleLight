import { dbQuery } from '@/lib/db';

export async function auditLog(
  userId: string | null,
  action: string,
  resource: string | null,
  details: Record<string, unknown> = {},
  ip: string | null = null
): Promise<void> {
  await dbQuery(
    `INSERT INTO audit_log (user_id, action, resource, details, ip_address)
     VALUES ($1, $2, $3, $4::jsonb, $5)`,
    [userId, action, resource, JSON.stringify(details), ip]
  ).catch(() => undefined);
}
