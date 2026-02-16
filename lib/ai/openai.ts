import OpenAI from 'openai';
import { AIProvider, ChatMessage } from '@/lib/ai/provider';

export class OpenAIProvider implements AIProvider {
  private client: OpenAI;
  private llmModel: string;
  private embeddingModel: string;
  private dimensions: number;

  constructor() {
    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.llmModel = process.env.OPENAI_LLM_MODEL || 'gpt-4o-mini';
    this.embeddingModel = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
    this.dimensions = Number(process.env.EMBEDDING_DIMENSIONS || 1536);
  }

  getEmbeddingDimensions(): number {
    return this.dimensions;
  }

  async embedText(text: string): Promise<number[]> {
    const res = await this.client.embeddings.create({
      model: this.embeddingModel,
      input: text,
    });
    return res.data[0].embedding;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const res = await this.client.embeddings.create({
      model: this.embeddingModel,
      input: texts,
    });
    return res.data.map((r) => r.embedding);
  }

  async *generateStream(prompt: string, system?: string): AsyncGenerator<string> {
    const stream = await this.client.chat.completions.create({
      model: this.llmModel,
      stream: true,
      messages: [
        ...(system ? [{ role: 'system' as const, content: system }] : []),
        { role: 'user', content: prompt },
      ],
    });
    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content;
      if (token) yield token;
    }
  }

  async generateJSON(prompt: string, system?: string): Promise<object> {
    const response = await this.client.chat.completions.create({
      model: this.llmModel,
      response_format: { type: 'json_object' },
      messages: [
        ...(system ? [{ role: 'system' as const, content: system }] : []),
        { role: 'user', content: prompt },
      ],
    });
    const content = response.choices[0]?.message?.content || '{}';
    return JSON.parse(content);
  }

  async *chatStream(messages: ChatMessage[]): AsyncGenerator<string> {
    const stream = await this.client.chat.completions.create({
      model: this.llmModel,
      stream: true,
      messages,
    });
    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content;
      if (token) yield token;
    }
  }

  async checkHealth(): Promise<{ ok: boolean; details: string }> {
    try {
      await this.client.models.list();
      return { ok: true, details: 'ok' };
    } catch (error) {
      return { ok: false, details: (error as Error).message };
    }
  }

  async listModels(): Promise<string[]> {
    const models = await this.client.models.list();
    return models.data.map((m) => m.id);
  }
}
