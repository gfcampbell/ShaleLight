export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIProvider {
  embedText(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
  getEmbeddingDimensions(): number;
  generateStream(prompt: string, system?: string): AsyncGenerator<string>;
  generateJSON(prompt: string, system?: string): Promise<object>;
  chatStream(messages: ChatMessage[]): AsyncGenerator<string>;
  checkHealth(): Promise<{ ok: boolean; details: string }>;
  listModels(): Promise<string[]>;
}
