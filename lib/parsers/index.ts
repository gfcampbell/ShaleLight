import path from 'path';
import { parsePdf } from '@/lib/parsers/pdf';
import { parseExcel } from '@/lib/parsers/excel';
import { parseCsv } from '@/lib/parsers/csv';
import { parseDocx } from '@/lib/parsers/docx';

export interface ParseResult {
  title: string;
  rawText: string;
  tables: Array<{ headers: string[]; rows: string[][]; context: string; startChar: number; endChar: number }>;
  metadata: Record<string, unknown>;
}

export async function parseFile(filePath: string, fileBuffer: Buffer): Promise<ParseResult> {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.pdf') return parsePdf(filePath, fileBuffer);
  if (ext === '.xlsx' || ext === '.xls') return parseExcel(filePath, fileBuffer);
  if (ext === '.csv') return parseCsv(filePath, fileBuffer);
  if (ext === '.docx' || ext === '.doc') return parseDocx(filePath, fileBuffer);
  const rawText = fileBuffer.toString('utf8');
  return { title: path.basename(filePath), rawText, tables: [], metadata: {} };
}
