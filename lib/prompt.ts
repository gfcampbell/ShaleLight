export interface Chunk {
  id: string;
  document_id: string;
  content: string;
  metadata: Record<string, unknown>;
  file_name?: string;
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function buildSystemPrompt(systemPrompt?: string): string {
  return (
    systemPrompt ||
    `You are a document research assistant. Search the indexed documents and answer with citations.

Rules:
- Cite factual claims with [1], [2], [3]
- Use only information from search results
- If information is not in the documents, say so clearly
- Prefer concise, factual language`
  );
}

export function buildUserMessage(query: string, chunks: Chunk[]): string {
  const context = chunks
    .map(
      (chunk, idx) => `<result index="${idx + 1}">
<source>${escapeXml(chunk.file_name || chunk.document_id)}</source>
<content>${escapeXml(chunk.content)}</content>
</result>`
    )
    .join('\n');

  return `<search_query>${escapeXml(query)}</search_query>
<search_results>${context}</search_results>
Instructions:
- Answer using only the search results
- Use [n] citations matching result indices`;
}
