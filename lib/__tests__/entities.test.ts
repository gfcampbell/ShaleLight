import { describe, it, expect } from 'vitest';
import { applyEntityExpansions } from '@/lib/entities';

describe('entity detection and expansion', () => {
  describe('applyEntityExpansions', () => {
    it('replaces entity mentions with canonical form', () => {
      const entityMap = new Map([['google', ['Google', 'Alphabet', 'GOOG']]]);
      const result = applyEntityExpansions('tell me about google', entityMap);
      expect(result).toBe('tell me about Google');
    });

    it('handles case-insensitive replacement', () => {
      const entityMap = new Map([['openai', ['OpenAI', 'Open AI']]]);
      const result = applyEntityExpansions('what does OPENAI do?', entityMap);
      expect(result).toBe('what does OpenAI do?');
    });

    it('returns original query when no entities match', () => {
      const entityMap = new Map<string, string[]>();
      const result = applyEntityExpansions('hello world', entityMap);
      expect(result).toBe('hello world');
    });

    it('handles multiple entity replacements', () => {
      const entityMap = new Map([
        ['ms', ['Microsoft', 'MSFT']],
        ['ai', ['Artificial Intelligence']],
      ]);
      const result = applyEntityExpansions('ms and ai trends', entityMap);
      expect(result).toContain('Microsoft');
    });
  });
});
