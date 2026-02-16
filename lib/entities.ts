import { dbQuery } from '@/lib/db';

export interface Entity {
  canonical: string;
  type: string;
  variants: string[];
  frequency: number;
}

let cachedEntities: Entity[] | null = null;
let lastFetch = 0;
const CACHE_TTL_MS = 60 * 60 * 1000;

export async function getAllEntities(): Promise<Entity[]> {
  if (cachedEntities && Date.now() - lastFetch < CACHE_TTL_MS) return cachedEntities;
  const rows = await dbQuery<{
    canonical: string;
    type: string;
    variants: string[] | null;
    frequency: number;
  }>(`SELECT canonical, type, variants, frequency FROM entities ORDER BY frequency DESC LIMIT 10000`);
  cachedEntities = rows.map((r) => ({
    canonical: r.canonical,
    type: r.type,
    variants: r.variants || [],
    frequency: r.frequency || 0,
  }));
  lastFetch = Date.now();
  return cachedEntities;
}

export async function detectEntityExpansions(query: string): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  const entities = await getAllEntities();
  const lower = query.toLowerCase();
  for (const entity of entities.slice(0, 3000)) {
    const key = entity.canonical.toLowerCase();
    if (lower.includes(key)) {
      map.set(key, [entity.canonical, ...entity.variants.slice(0, 3)]);
      if (map.size >= 3) break;
    }
  }
  return map;
}

export function applyEntityExpansions(query: string, entityMap: Map<string, string[]>): string {
  let output = query;
  for (const [key, variants] of entityMap.entries()) {
    const canonical = variants[0];
    output = output.replace(new RegExp(key, 'ig'), canonical);
  }
  return output;
}
