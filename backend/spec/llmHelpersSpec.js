const {
  DEFAULT_SINGLE_MODEL,
  THREE_LLM_MODELS,
  chooseBestResponse,
  buildConversationTurns,
  filterThreeLLMConversations,
  searchConversationsByKeyword
} = require('../llmHelpers');

describe('llmHelpers', () => {
  describe('DEFAULT_SINGLE_MODEL', () => {
    it('is qwen2.5:7b', () => {
      expect(DEFAULT_SINGLE_MODEL).toBe('qwen2.5:7b');
    });
  });

  describe('THREE_LLM_MODELS', () => {
    it('contains exactly three models', () => {
      expect(THREE_LLM_MODELS.length).toBe(3);
    });

    it('contains qwen2.5:7b', () => {
      expect(THREE_LLM_MODELS).toContain('qwen2.5:7b');
    });

    it('contains mistral:7b', () => {
      expect(THREE_LLM_MODELS).toContain('mistral:7b');
    });

    it('contains llama2:7b', () => {
      expect(THREE_LLM_MODELS).toContain('llama2:7b');
    });
  });

  describe('chooseBestResponse', () => {
    it('returns the model with the longest valid response', () => {
      const responses = [
        { model: 'qwen2.5:7b', reply: 'Short.' },
        { model: 'mistral:7b', reply: 'This is a much longer response.' },
        { model: 'llama2:7b', reply: 'Medium length.' }
      ];

      expect(chooseBestResponse(responses)).toBe('mistral:7b');
    });

    it('ignores responses that start with "Error:"', () => {
      const responses = [
        { model: 'qwen2.5:7b', reply: 'Error: fetch failed' },
        { model: 'mistral:7b', reply: 'This is valid.' },
        { model: 'llama2:7b', reply: 'Also valid.' }
      ];

      expect(chooseBestResponse(responses)).toBe('mistral:7b');
    });

    it('returns null if all responses are errors', () => {
      const responses = [
        { model: 'qwen2.5:7b', reply: 'Error: fetch failed' },
        { model: 'mistral:7b', reply: 'Error: timed out' },
        { model: 'llama2:7b', reply: 'Error: request failed' }
      ];

      expect(chooseBestResponse(responses)).toBeNull();
    });

    it('returns null if all replies are empty', () => {
      const responses = [
        { model: 'qwen2.5:7b', reply: '' },
        { model: 'mistral:7b', reply: '' },
        { model: 'llama2:7b', reply: '' }
      ];

      expect(chooseBestResponse(responses)).toBeNull();
    });

    it('handles a single valid response', () => {
      const responses = [
        { model: 'llama2:7b', reply: 'Hello!' }
      ];

      expect(chooseBestResponse(responses)).toBe('llama2:7b');
    });

    it('chooses the first valid response when two valid responses have the same length', () => {
      const responses = [
        { model: 'qwen2.5:7b', reply: 'Same length' },
        { model: 'mistral:7b', reply: 'Same length' }
      ];

      expect(chooseBestResponse(responses)).toBe('qwen2.5:7b');
    });
  });

  describe('buildConversationTurns', () => {
    it('groups model responses under the correct user message', () => {
      const messages = [
        { id: 1, sender: 'user', content: 'Hello', created_at: '2026-04-23 10:00:00' },
        { id: 2, sender: 'llm', content: 'combined response', created_at: '2026-04-23 10:00:01' },
        { id: 3, sender: 'user', content: 'What is AI?', created_at: '2026-04-23 10:01:00' }
      ];

      const modelResponses = [
        {
          id: 11,
          user_message_id: 1,
          model_name: 'qwen2.5:7b',
          response_text: 'Hi!',
          is_best: 0,
          created_at: '2026-04-23 10:00:01'
        },
        {
          id: 12,
          user_message_id: 1,
          model_name: 'mistral:7b',
          response_text: 'Hello there!',
          is_best: 1,
          created_at: '2026-04-23 10:00:01'
        },
        {
          id: 13,
          user_message_id: 3,
          model_name: 'llama2:7b',
          response_text: 'AI stands for artificial intelligence.',
          is_best: 1,
          created_at: '2026-04-23 10:01:01'
        }
      ];

      const turns = buildConversationTurns(messages, modelResponses);

      expect(turns.length).toBe(2);

      expect(turns[0].userMessage.id).toBe(1);
      expect(turns[0].modelResponses.length).toBe(2);
      expect(turns[0].modelResponses[0].model_name).toBe('qwen2.5:7b');
      expect(turns[0].modelResponses[1].model_name).toBe('mistral:7b');

      expect(turns[1].userMessage.id).toBe(3);
      expect(turns[1].modelResponses.length).toBe(1);
      expect(turns[1].modelResponses[0].model_name).toBe('llama2:7b');
    });

    it('ignores non-user messages when building turns', () => {
      const messages = [
        { id: 1, sender: 'llm', content: 'combined response' },
        { id: 2, sender: 'system', content: 'metadata' }
      ];

      const modelResponses = [
        {
          id: 11,
          user_message_id: 1,
          model_name: 'qwen2.5:7b',
          response_text: 'Hi!',
          is_best: 0
        }
      ];

      const turns = buildConversationTurns(messages, modelResponses);

      expect(turns).toEqual([]);
    });

    it('returns empty modelResponses when a user message has no matching model responses', () => {
      const messages = [
        { id: 1, sender: 'user', content: 'Hello' }
      ];

      const modelResponses = [];

      const turns = buildConversationTurns(messages, modelResponses);

      expect(turns.length).toBe(1);
      expect(turns[0].userMessage.id).toBe(1);
      expect(turns[0].modelResponses).toEqual([]);
    });

    it('keeps only responses matching the correct user_message_id', () => {
      const messages = [
        { id: 1, sender: 'user', content: 'First prompt' },
        { id: 2, sender: 'user', content: 'Second prompt' }
      ];

      const modelResponses = [
        {
          id: 11,
          user_message_id: 2,
          model_name: 'mistral:7b',
          response_text: 'Second answer',
          is_best: 1
        }
      ];

      const turns = buildConversationTurns(messages, modelResponses);

      expect(turns.length).toBe(2);
      expect(turns[0].modelResponses).toEqual([]);
      expect(turns[1].modelResponses.length).toBe(1);
      expect(turns[1].modelResponses[0].response_text).toBe('Second answer');
    });
  });

  describe('filterThreeLLMConversations', () => {
    it('returns only conversations marked as 3 LLM', () => {
      const conversations = [
        { id: 1, title: 'Hello [3 LLM]', used_three_llms: 1 },
        { id: 2, title: 'Single chat', used_three_llms: 0 },
        { id: 3, title: 'Another 3 LLM chat', used_three_llms: 1 }
      ];

      const result = filterThreeLLMConversations(conversations);

      expect(result.length).toBe(2);
      expect(result[0].id).toBe(1);
      expect(result[1].id).toBe(3);
    });

    it('returns an empty array when no conversations are 3 LLM', () => {
      const conversations = [
        { id: 1, title: 'Single chat', used_three_llms: 0 }
      ];

      const result = filterThreeLLMConversations(conversations);

      expect(result).toEqual([]);
    });

    it('returns an empty array when given an empty array', () => {
      expect(filterThreeLLMConversations([])).toEqual([]);
    });
  });

  describe('searchConversationsByKeyword', () => {
    it('returns conversations whose titles contain the keyword', () => {
      const conversations = [
        { id: 1, title: 'Hello [3 LLM]' },
        { id: 2, title: 'What is AI?' },
        { id: 3, title: 'Hello again' }
      ];

      const result = searchConversationsByKeyword(conversations, 'hello');

      expect(result.length).toBe(2);
      expect(result[0].id).toBe(1);
      expect(result[1].id).toBe(3);
    });

    it('matches titles case-insensitively', () => {
      const conversations = [
        { id: 1, title: 'Machine Learning' },
        { id: 2, title: 'hello world' }
      ];

      const result = searchConversationsByKeyword(conversations, 'HELLO');

      expect(result.length).toBe(1);
      expect(result[0].id).toBe(2);
    });

    it('returns all conversations when keyword is blank', () => {
      const conversations = [
        { id: 1, title: 'Hello' },
        { id: 2, title: 'AI chat' }
      ];

      const result = searchConversationsByKeyword(conversations, '');

      expect(result).toEqual(conversations);
    });

    it('returns an empty array when no titles match', () => {
      const conversations = [
        { id: 1, title: 'Hello' },
        { id: 2, title: 'AI chat' }
      ];

      const result = searchConversationsByKeyword(conversations, 'banana');

      expect(result).toEqual([]);
    });
  });
});