export interface ChunkRecord {
  chunk_index: number;
  content: string;
  chunk_type: 'prose' | 'table';
  metadata: Record<string, unknown>;
  start_char: number;
  end_char: number;
}

const CHARS_PER_TOKEN = 4;
const TARGET_TOKENS = 1000;
const OVERLAP_TOKENS = 200;

export function chunkText(text: string): ChunkRecord[] {
  const chunkChars = TARGET_TOKENS * CHARS_PER_TOKEN;
  const overlapChars = OVERLAP_TOKENS * CHARS_PER_TOKEN;
  const chunks: ChunkRecord[] = [];
  let i = 0;
  let idx = 0;
  while (i < text.length) {
    const end = Math.min(text.length, i + chunkChars);
    const content = text.slice(i, end).trim();
    if (content) {
      chunks.push({
        chunk_index: idx++,
        content,
        chunk_type: content.includes('|') && content.includes('\n') ? 'table' : 'prose',
        metadata: extractLightMetadata(content),
        start_char: i,
        end_char: end,
      });
    }
    if (end >= text.length) break;
    i = Math.max(end - overlapChars, i + 1);
  }
  return chunks;
}

function extractLightMetadata(content: string): Record<string, unknown> {
  const amounts = content.match(/\$[\d,.]+[KMBT]?/g) || [];
  const percentages = content.match(/[\d.]+%/g) || [];
  const dates = content.match(/\b(?:\d{4}-\d{2}-\d{2}|Q[1-4]\s+\d{4})\b/g) || [];
  return { amounts, percentages, dates };
}
