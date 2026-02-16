import { getCurrentUser, Role } from '@/lib/auth';

const roleRank: Record<Role, number> = {
  viewer: 1,
  analyst: 2,
  admin: 3,
};

export async function requireRole(minRole: Role): Promise<{
  ok: boolean;
  status: number;
  userRole?: Role;
  userId?: string;
}> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, status: 401 };
  if (roleRank[user.role] < roleRank[minRole]) return { ok: false, status: 403, userRole: user.role };
  return { ok: true, status: 200, userRole: user.role, userId: user.id };
}
