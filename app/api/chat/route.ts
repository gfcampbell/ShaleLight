import { NextRequest, NextResponse } from 'next/server';
import { hybridSearch } from '@/lib/search';
import { buildSystemPrompt, buildUserMessage } from '@/lib/prompt';
import { checkRateLimit, getIP, RateLimitError } from '@/lib/rateLimit';
import { getCachedResponse, setCachedResponse } from '@/lib/cache';
import { dbQuery } from '@/lib/db';
import { getProvider } from '@/lib/ai';
import { getCurrentUser } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type StreamEvent =
  | { type: 'text'; content: string }
  | { type: 'citation'; citation: unknown }
  | { type: 'done' }
  | { type: 'error'; error: string; code: string };

interface ChatRequest {
  query: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

function encode(event: StreamEvent, encoder: TextEncoder): Uint8Array {
  return encoder.encode(`${JSON.stringify(event)}\n`);
}

const MAX_HISTORY = 10;

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const encoder = new TextEncoder();
  const body = (await request.json()) as ChatRequest;
  const query = (body.query || '').trim();
  const history = (body.history || []).slice(-MAX_HISTORY);

  if (!query) {
    return NextResponse.json({ error: 'Query is required', code: 'INVALID_REQUEST' }, { status: 400 });
  }
  if (query.length > 1000) {
    return NextResponse.json({ error: 'Query too long', code: 'QUERY_TOO_LONG' }, { status: 400 });
  }

  try {
    await checkRateLimit(getIP(request));
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { error: error.message, code: 'RATE_LIMIT_EXCEEDED', retryAfter: error.retryAfter },
        { status: 429 }
      );
    }
  }

  const isStandalone = history.length === 0;
  if (isStandalone) {
    const cached = await getCachedResponse(query);
    if (cached) {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encode({ type: 'text', content: cached.answer }, encoder));
          for (const citation of cached.citations) {
            controller.enqueue(encode({ type: 'citation', citation }, encoder));
          }
          controller.enqueue(encode({ type: 'done' }, encoder));
          controller.close();
        },
      });
      return new Response(stream, { headers: { 'Content-Type': 'application/x-ndjson' } });
    }
  }

  const searchResults = await hybridSearch(query, 30);
  if (searchResults.length === 0) {
    return NextResponse.json({
      answer: 'I could not find relevant information in indexed documents.',
      citations: [],
    });
  }

  const settingsRows = await dbQuery<{ value: string }>(
    `SELECT value::text AS value FROM settings WHERE key = 'system_prompt' LIMIT 1`
  ).catch(() => []);
  const systemPrompt = buildSystemPrompt(settingsRows[0]?.value?.replace(/^"|"$/g, ''));
  const userMessage = buildUserMessage(query, searchResults);
  const provider = await getProvider();

  const stream = new ReadableStream({
    async start(controller) {
      let fullText = '';
      try {
        for await (const token of provider.chatStream([
          { role: 'system', content: systemPrompt },
          ...history.map((m) => ({ role: m.role, content: m.content })),
          { role: 'user', content: userMessage },
        ])) {
          fullText += token;
          controller.enqueue(encode({ type: 'text', content: token }, encoder));
        }

        const citations: unknown[] = [];
        const matches = [...fullText.matchAll(/\[(\d+)\]/g)];
        const seen = new Set<number>();
        for (const match of matches) {
          const idx = Number(match[1]);
          if (Number.isNaN(idx) || seen.has(idx)) continue;
          seen.add(idx);
          const chunk = searchResults[idx - 1];
          if (!chunk) continue;
          const citation = {
            index: idx,
            document_id: chunk.document_id,
            file_name: chunk.file_name || chunk.document_id,
            snippet: chunk.content.slice(0, 300),
            metadata: chunk.metadata || {},
          };
          citations.push(citation);
          controller.enqueue(encode({ type: 'citation', citation }, encoder));
        }

        if (isStandalone && fullText.length > 100) {
          await setCachedResponse(query, fullText, citations);
        }

        // Query logging (fire-and-forget)
        getCurrentUser().then((user) => {
          if (user) {
            dbQuery(
              `INSERT INTO queries (user_id, query, response, response_time_ms) VALUES ($1, $2, $3, $4)`,
              [user.id, query, fullText.slice(0, 10000), Date.now() - startTime]
            ).catch(() => undefined);
          }
        }).catch(() => undefined);

        controller.enqueue(encode({ type: 'done' }, encoder));
        controller.close();
      } catch (error) {
        controller.enqueue(
          encode({ type: 'error', error: (error as Error).message || 'Stream failed', code: 'STREAM_ERROR' }, encoder)
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
