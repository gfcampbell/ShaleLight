import { dbQuery } from '@/lib/db';

export default async function AdminDashboardPage() {
  const [docCount] = await dbQuery<{ count: string }>('SELECT COUNT(*)::text AS count FROM documents').catch(
    () => [{ count: '0' }]
  );
  const [chunkCount] = await dbQuery<{ count: string }>('SELECT COUNT(*)::text AS count FROM chunks').catch(
    () => [{ count: '0' }]
  );
  const [queryCount] = await dbQuery<{ count: string }>('SELECT COUNT(*)::text AS count FROM queries').catch(
    () => [{ count: '0' }]
  );

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="rounded border bg-white p-4">
        <div className="text-sm text-slate-500">Documents</div>
        <div className="text-2xl font-semibold">{docCount.count}</div>
      </div>
      <div className="rounded border bg-white p-4">
        <div className="text-sm text-slate-500">Chunks</div>
        <div className="text-2xl font-semibold">{chunkCount.count}</div>
      </div>
      <div className="rounded border bg-white p-4">
        <div className="text-sm text-slate-500">Queries</div>
        <div className="text-2xl font-semibold">{queryCount.count}</div>
      </div>
    </div>
  );
}
