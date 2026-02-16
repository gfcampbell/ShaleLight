import path from 'path';
import ExcelJS from 'exceljs';
import { ParseResult } from '@/lib/parsers/index';

export async function parseExcel(filePath: string, fileBuffer: Buffer): Promise<ParseResult> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(fileBuffer as unknown as ExcelJS.Buffer);

  const sections: string[] = [];
  const sheetNames: string[] = [];

  workbook.worksheets.forEach((sheet) => {
    sheetNames.push(sheet.name);
    const rows: string[] = [];
    sheet.eachRow((row) => {
      const values = Array.isArray(row.values) ? row.values.slice(1) : [];
      rows.push(values.map((v: unknown) => String(v ?? '')).join(' | '));
    });
    sections.push(`## ${sheet.name}\n${rows.join('\n')}`);
  });

  return {
    title: path.basename(filePath),
    rawText: sections.join('\n\n'),
    tables: [],
    metadata: { sheetNames },
  };
}
