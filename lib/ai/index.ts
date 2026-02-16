import { AIProvider } from '@/lib/ai/provider';
import { OllamaProvider } from '@/lib/ai/ollama';
import { OpenAIProvider } from '@/lib/ai/openai';
import { AnthropicProvider } from '@/lib/ai/anthropic';
import { dbQuery } from '@/lib/db';

let cachedProvider: AIProvider | null = null;
let cachedProviderName = '';

async function loadProviderName(): Promise<string> {
  try {
    const rows = await dbQuery<{ value: string }>(
      `SELECT value::text AS value FROM settings WHERE key = 'ai_provider' LIMIT 1`
    );
    return rows[0]?.value?.replace(/"/g, '') || process.env.AI_PROVIDER || 'ollama';
  } catch {
    return process.env.AI_PROVIDER || 'ollama';
  }
}

function buildProvider(name: string): AIProvider {
  if (name === 'openai') return new OpenAIProvider();
  if (name === 'anthropic') return new AnthropicProvider();
  return new OllamaProvider();
}

export async function getProvider(): Promise<AIProvider> {
  const providerName = await loadProviderName();
  if (!cachedProvider || providerName !== cachedProviderName) {
    cachedProvider = buildProvider(providerName);
    cachedProviderName = providerName;
  }
  return cachedProvider;
}

export async function getEmbeddingProvider(): Promise<AIProvider> {
  return getProvider();
}
