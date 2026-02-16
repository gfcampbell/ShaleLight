import { AIProvider, ChatMessage } from '@/lib/ai/provider';

interface OllamaGenerateResponse {
  response?: string;
  done: boolean;
}

export class OllamaProvider implements AIProvider {
  private baseUrl: string;
  private llmModel: string;
  private embeddingModel: string;
  private dimensions: number;

  constructor() {
    this.baseUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    this.llmModel = process.env.OLLAMA_LLM_MODEL || 'llama3:8b';
    this.embeddingModel = process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text';
    this.dimensions = Number(process.env.EMBEDDING_DIMENSIONS || 768);
  }

  getEmbeddingDimensions(): number {
    return this.dimensions;
  }

  async embedText(text: string): Promise<number[]> {
    const res = await fetch(`${this.baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.embeddingModel, prompt: text }),
    });
    if (!res.ok) throw new Error(`Ollama embeddings failed (${res.status})`);
    const json = (await res.json()) as { embedding: number[] };
    return json.embedding;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const out: number[][] = [];
    for (const text of texts) out.push(await this.embedText(text));
    return out;
  }

  async *generateStream(prompt: string, system?: string): AsyncGenerator<string> {
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.llmModel,
        prompt,
        system,
        stream: true,
      }),
    });
    if (!response.body) throw new Error('No response stream from Ollama');
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.trim()) continue;
        const chunk = JSON.parse(line) as OllamaGenerateResponse;
        if (chunk.response) yield chunk.response;
      }
    }
  }

  async generateJSON(prompt: string, system?: string): Promise<object> {
    let text = '';
    for await (const token of this.generateStream(prompt, system)) text += token;
    return JSON.parse(text);
  }

  async *chatStream(messages: ChatMessage[]): AsyncGenerator<string> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.llmModel,
        stream: true,
        messages,
      }),
    });
    if (!response.body) throw new Error('No response stream from Ollama');
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.trim()) continue;
        const parsed = JSON.parse(line) as { message?: { content?: string } };
        const token = parsed.message?.content;
        if (token) yield token;
      }
    }
  }

  async checkHealth(): Promise<{ ok: boolean; details: string }> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`);
      return { ok: res.ok, details: res.ok ? 'ok' : `status ${res.status}` };
    } catch (error) {
      return { ok: false, details: (error as Error).message };
    }
  }

  async listModels(): Promise<string[]> {
    const res = await fetch(`${this.baseUrl}/api/tags`);
    if (!res.ok) return [];
    const json = (await res.json()) as { models?: Array<{ name: string }> };
    return (json.models || []).map((m) => m.name);
  }
}
