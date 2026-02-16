import Anthropic from '@anthropic-ai/sdk';
import { AIProvider, ChatMessage } from '@/lib/ai/provider';
import { OllamaProvider } from '@/lib/ai/ollama';

export class AnthropicProvider implements AIProvider {
  private client: Anthropic;
  private llmModel: string;
  private embeddingFallback: OllamaProvider;

  constructor() {
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    this.llmModel = process.env.ANTHROPIC_LLM_MODEL || 'claude-sonnet-4-5-20250929';
    this.embeddingFallback = new OllamaProvider();
  }

  getEmbeddingDimensions(): number {
    return this.embeddingFallback.getEmbeddingDimensions();
  }

  async embedText(text: string): Promise<number[]> {
    return this.embeddingFallback.embedText(text);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return this.embeddingFallback.embedBatch(texts);
  }

  async *generateStream(prompt: string, system?: string): AsyncGenerator<string> {
    const stream = await this.client.messages.stream({
      model: this.llmModel,
      max_tokens: 1200,
      system,
      messages: [{ role: 'user', content: prompt }],
    });
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield event.delta.text;
      }
    }
  }

  async generateJSON(prompt: string, system?: string): Promise<object> {
    let content = '';
    for await (const token of this.generateStream(prompt, system)) content += token;
    return JSON.parse(content);
  }

  async *chatStream(messages: ChatMessage[]): AsyncGenerator<string> {
    const anthropicMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
    const system = messages.find((m) => m.role === 'system')?.content;
    const stream = await this.client.messages.stream({
      model: this.llmModel,
      max_tokens: 1200,
      system,
      messages: anthropicMessages,
    });
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield event.delta.text;
      }
    }
  }

  async checkHealth(): Promise<{ ok: boolean; details: string }> {
    try {
      await this.client.messages.create({
        model: this.llmModel,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'ping' }],
      });
      return { ok: true, details: 'ok' };
    } catch (error) {
      return { ok: false, details: (error as Error).message };
    }
  }

  async listModels(): Promise<string[]> {
    return ['claude-sonnet-4-5-20250929', 'claude-3-5-haiku-latest'];
  }
}
