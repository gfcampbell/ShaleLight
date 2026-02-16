import path from 'path';
import pdf from 'pdf-parse';
import { ParseResult } from '@/lib/parsers/index';

export async function parsePdf(filePath: string, fileBuffer: Buffer): Promise<ParseResult> {
  const parsed = await pdf(fileBuffer);
  return {
    title: path.basename(filePath),
    rawText: parsed.text || '',
    tables: [],
    metadata: { pageCount: parsed.numpages },
  };
}
