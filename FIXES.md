# ShaleLight - Fixes for Search Quality Issues

## Issues Identified

### 1. Citation Format Mismatch (CRITICAL)
**Problem:** Backend expects `[1]` `[2]` but LLM generates `[Citation: What Always Happens?, pp. 18-20]`

**Root Cause:** llama3:8b not following citation format instructions

**Fixes:**

#### Option A: Switch Model (RECOMMENDED)
```bash
# Better instruction-following models:
ollama pull llama3.1:8b    # Improved instruction following
ollama pull qwen2.5:7b      # Excellent format compliance
```
Update `.env.local`:
```
OLLAMA_LLM_MODEL=qwen2.5:7b
```

#### Option B: Strengthen Prompt
Edit `lib/prompt.ts` - add examples:
```typescript
export function buildSystemPrompt(systemPrompt?: string): string {
  return systemPrompt || `You are a document research assistant.

CITATION FORMAT (CRITICAL):
- Use ONLY numbered citations: [1], [2], [3]
- DO NOT use prose citations like [Citation: Source, p.X]
- Example: "The cost is externalized [1] and compounds at scale [2]."

Rules:
- Answer directly and concisely
- If asked to list, provide a structured list
- Use only information from search results
- If not in documents, say "No information found."`;
}
```

#### Option C: Add Fallback Citation Parser
Add to `app/api/chat/route.ts` after line 92:
```typescript
// Also parse prose citations as fallback
const proseCitations = [...fullText.matchAll(/\[Citation:[^\]]+\]/g)];
// Extract document references and map to search results
```

### 2. Query Understanding - List Detection
**Problem:** "List the 12 laws" triggers semantic search instead of structured extraction

**Root Cause:** No detection of list/enumeration requests

**Fix:** Add query classification
Create `lib/queryClassifier.ts`:
```typescript
export function classifyQuery(query: string): 'list' | 'definition' | 'comparison' | 'general' {
  const lower = query.toLowerCase();
  if (/(list|enumerate|what are the|show me the).*\d+/.test(lower)) return 'list';
  if (/what is|define|explain/.test(lower)) return 'definition';
  if (/compare|difference|versus/.test(lower)) return 'comparison';
  return 'general';
}

export function buildQueryPrompt(type: string): string {
  switch (type) {
    case 'list':
      return 'Provide a structured, numbered list. Be direct and complete.';
    case 'definition':
      return 'Provide a clear, concise definition.';
    default:
      return 'Answer concisely with factual information.';
  }
}
```

Use in `app/api/chat/route.ts`:
```typescript
import { classifyQuery, buildQueryPrompt } from '@/lib/queryClassifier';

const queryType = classifyQuery(query);
const typePrompt = buildQueryPrompt(queryType);
const systemPrompt = buildSystemPrompt(settingsRows[0]?.value) + '\n' + typePrompt;
```

### 3. Chunk Size vs. Structured Content
**Problem:** 256-token chunks split structured lists (like "12 laws")

**Root Cause:** Small chunks work for prose but break structure

**Fix:** Hybrid chunking strategy
Update `settings` table:
```sql
-- Keep small chunks for prose documents
UPDATE settings SET value = '256' WHERE key = 'chunk_target_tokens';

-- But add special handling for structured docs
INSERT INTO settings (key, value) VALUES 
  ('structured_doc_min_chunk_tokens', '512'),
  ('detect_structured_content', 'true');
```

Add to chunking logic (in ingest):
```typescript
// Detect if content has numbered lists, bullet points, or headings
function isStructured(text: string): boolean {
  const markers = /(\n\d+\.|^#|^\*|^-\s)/gm;
  const matches = text.match(markers);
  return matches && matches.length > 5; // Has multiple structured elements
}

// Use larger chunks for structured content
const targetTokens = isStructured(text) ? 512 : 256;
```

### 4. Answer Quality - Verbosity
**Problem:** LLM gives long explanations for simple requests

**Fix:** Update system prompt for conciseness
```typescript
export function buildSystemPrompt(systemPrompt?: string): string {
  return systemPrompt || `You are a precise document research assistant.

STYLE:
- Direct, factual answers
- No preambles ("Based on the search results...")
- If asked to list, provide ONLY the list
- One sentence answers for simple questions

CITATIONS:
- Use ONLY numbered format: [1], [2], [3]
- Every factual claim needs a citation

ACCURACY:
- Use ONLY information from search results
- If not found, reply: "No information available in indexed documents."`;
}
```

### 5. Search Relevance Tuning
**Current weights:** 70% vector, 30% lexical

**Problem:** May be over-weighting semantic similarity

**Fix:** Make weights configurable
```sql
INSERT INTO settings (key, value) VALUES 
  ('search_vector_weight', '0.6'),
  ('search_lexical_weight', '0.4');
```

Update `lib/search.ts`:
```typescript
const vectorWeight = Number(process.env.SEARCH_VECTOR_WEIGHT || 0.6);
const lexicalWeight = Number(process.env.SEARCH_LEXICAL_WEIGHT || 0.4);

map.set(item.id, {
  // ... 
  score: (item.vector_score / maxVector) * vectorWeight,
});
// ...
const score = (item.lexical_score / maxLex) * lexicalWeight;
```

## Priority Actions

1. **IMMEDIATE:** Switch to `qwen2.5:7b` or `llama3.1:8b` (fixes citations + quality)
2. **HIGH:** Update system prompt with explicit citation format and conciseness rules
3. **MEDIUM:** Add query classification for list detection
4. **LOW:** Implement hybrid chunking for structured content

## Testing Checklist

After fixes, test these queries:
- [ ] "List the 12 laws" → should return structured list with citations
- [ ] "What is externalized cost?" → should be 1-2 sentences with [1] citation
- [ ] "What does law 5 say?" → direct answer, not interpretation
- [ ] Check citation rail displays `[1]`, `[2]` markers correctly

## Model Comparison

| Model | Citation Format | Conciseness | Instruction Following |
|-------|----------------|-------------|---------------------|
| llama3:8b | ❌ Poor | ⚠️ Verbose | ⚠️ Sometimes |
| llama3.1:8b | ✅ Good | ✅ Good | ✅ Reliable |
| qwen2.5:7b | ✅ Excellent | ✅ Excellent | ✅ Excellent |
| qwen2.5-coder:7b | ✅ Excellent | ✅ Good | ✅ Excellent |
