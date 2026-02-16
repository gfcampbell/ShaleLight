import path from 'path';
import mammoth from 'mammoth';
import { ParseResult } from '@/lib/parsers/index';

export async function parseDocx(filePath: string, fileBuffer: Buffer): Promise<ParseResult> {
  const result = await mammoth.extractRawText({ buffer: fileBuffer });
  return {
    title: path.basename(filePath),
    rawText: result.value || '',
    tables: [],
    metadata: { warnings: result.messages.length },
  };
}
