import path from 'path';
import Papa from 'papaparse';
import { ParseResult } from '@/lib/parsers/index';

export async function parseCsv(filePath: string, fileBuffer: Buffer): Promise<ParseResult> {
  const text = fileBuffer.toString('utf8');
  const parsed = Papa.parse<string[]>(text, { skipEmptyLines: true });
  const rows = (parsed.data || []).map((row) => `| ${row.join(' | ')} |`);
  return {
    title: path.basename(filePath),
    rawText: rows.join('\n'),
    tables: [],
    metadata: { rowCount: rows.length, errors: parsed.errors.length },
  };
}
