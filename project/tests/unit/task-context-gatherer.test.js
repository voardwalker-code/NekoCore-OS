/**
 * Task Context Gatherer Guard Tests
 * Validates context retrieval strategies and per-task-type source-of-truth lookups
 */

require('./test-compat');

const assert = require('assert');
const {
  gatherContext,
  gatherContextBatch,
  getStrategyName,
  getAvailableStrategies
} = require('../../server/brain/tasks/task-context-gatherer');

describe('Task Context Gatherer', () => {
  // ==================== Basic Retrieval ====================

  describe('Basic Context Gathering', () => {
    it('should return a context object with required fields', async () => {
      const result = await gatherContext('research', 'Find information about AI', {
        id: 'test-entity'
      });

      assert(result, 'should return a result');
      assert(Array.isArray(result.snippets), 'snippets should be an array');
      assert(result.strategy, 'should have a strategy');
      assert(result.taskType === 'research', 'taskType should match input');
      assert(typeof result.retrievedAt === 'number', 'retrievedAt should be a timestamp');
    });

    it('should handle null/undefined entity gracefully', async () => {
      const result1 = await gatherContext('research', 'Find about AI', null);
      assert.strictEqual(result1.snippets.length, 0, 'should return empty snippets for null entity');

      const result2 = await gatherContext('code', 'Write a function', undefined);
      assert.strictEqual(result2.snippets.length, 0, 'should return empty snippets for undefined entity');
    });

    it('should handle empty user message', async () => {
      const result = await gatherContext('research', '', { id: 'test' });
      assert(result.snippets !== undefined, 'should still return result');
      assert(Array.isArray(result.snippets), 'snippets should be an array');
    });

    it('should handle missing user message', async () => {
      const result = await gatherContext('code', null, { id: 'test' });
      assert(result.snippets !== undefined, 'should handle null message');
    });
  });

  // ==================== Invalid Input Handling ====================

  describe('Input Validation', () => {
    it('should reject invalid taskType', async () => {
      const result = await gatherContext(null, 'test message', { id: 'test' });
      assert(result.error, 'should include error for null taskType');
      assert.strictEqual(result.snippets.length, 0, 'should return empty snippets');
    });

    it('should reject non-string taskType', async () => {
      const result = await gatherContext(123, 'test', { id: 'test' });
      assert(result.error, 'should include error for non-string taskType');
    });

    it('should reject non-string user message', async () => {
      const result = await gatherContext('research', 12345, { id: 'test' });
      // Should coerce to string or handle gracefully
      assert(result.snippets !== undefined, 'should still return context');
    });
  });

  // ==================== Strategy Dispatch ====================

  describe('Strategy Selection and Dispatch', () => {
    it('should return a valid strategy name', async () => {
      const result = await gatherContext('research', 'test', { id: 'test' });
      const validStrategies = getAvailableStrategies();
      assert(validStrategies.includes(result.strategy), `strategy should be one of ${validStrategies}`);
    });

    it('should use archive strategy for research by default', async () => {
      const result = await gatherContext('research', 'find about climate', { id: 'test' });
      // Default strategy for research is archive
      assert(result.strategy === 'archive' || result.strategy === 'web_seed', 'research should use archive or web_seed');
    });

    it('should dispatch to specified strategy override', async () => {
      const result = await gatherContext('research', 'test', { id: 'test' }, {
        strategy: 'web_seed'
      });
      assert.strictEqual(result.strategy, 'web_seed', 'should use overridden strategy');
      assert(result.snippets.length > 0, 'web_seed should return snippets');
    });

    it('should fallback to archive for unknown strategy', async () => {
      const result = await gatherContext('research', 'test', { id: 'test' }, {
        strategy: 'unknown_strategy'
      });
      assert.strictEqual(result.strategy, 'archive', 'should fallback to archive for unknown strategy');
    });

    it('should fallback to archive for unknown taskType', async () => {
      const result = await gatherContext('unknown_task_type', 'test', { id: 'test' });
      assert.strictEqual(result.strategy, 'archive', 'should fallback to archive for unknown task type');
    });
  });

  // ==================== Strategy: Archive ====================

  describe('Archive Strategy', () => {
    it('should return empty snippets when no archive client provided', async () => {
      const result = await gatherContext('research', 'test', { id: 'test-entity' }, {
        strategy: 'archive'
        // No archiveIndexClient provided
      });
      assert.strictEqual(result.snippets.length, 0, 'should return empty snippets without archive client');
    });

    it('should handle archive client errors gracefully', async () => {
      const badClient = {
        search: async () => {
          throw new Error('Archive search failed');
        }
      };

      const result = await gatherContext('research', 'test', { id: 'test' }, {
        strategy: 'archive',
        archiveIndexClient: badClient
      });
      assert.strictEqual(result.snippets.length, 0, 'should return empty snippets on archive error');
    });

    it('should handle archive client returning non-array', async () => {
      const badClient = {
        search: async () => null
      };

      const result = await gatherContext('research', 'test', { id: 'test' }, {
        strategy: 'archive',
        archiveIndexClient: badClient
      });
      assert.strictEqual(result.snippets.length, 0, 'should return empty snippets for non-array result');
    });

    it('should respect maxSnippets option', async () => {
      const mockClient = {
        search: async () => {
          return [
            { text: 'snippet1', snippet: 'snippet1', date: '2026-03-18', metadata: {} },
            { text: 'snippet2', snippet: 'snippet2', date: '2026-03-17', metadata: {} },
            { text: 'snippet3', snippet: 'snippet3', date: '2026-03-16', metadata: {} }
          ];
        }
      };

      const result = await gatherContext('research', 'test', { id: 'test' }, {
        strategy: 'archive',
        archiveIndexClient: mockClient,
        maxSnippets: 2
      });
      assert(result.snippets.length <= 2, 'should respect maxSnippets limit');
    });
  });

  // ==================== Strategy: Web Seed ====================

  describe('Web Seed Strategy', () => {
    it('should return seed URLs for research', async () => {
      const result = await gatherContext('research', 'test', { id: 'test' }, {
        strategy: 'web_seed'
      });
      assert(result.snippets.length > 0, 'should return seed snippets for research');
      assert(result.snippets.some(s => s.source === 'web_seed'), 'should be marked as web_seed source');
    });

    it('should return seed URLs for code', async () => {
      const result = await gatherContext('code', 'test', { id: 'test' }, {
        strategy: 'web_seed'
      });
      assert(result.snippets.length > 0, 'should return seed snippets for code');
      assert(result.snippets.some(s => s.text.includes('github')), 'should include GitHub link for code');
    });

    it('should return seed URLs for writing', async () => {
      const result = await gatherContext('writing', 'test', { id: 'test' }, {
        strategy: 'web_seed'
      });
      assert(result.snippets.length > 0, 'should return seed snippets for writing');
    });

    it('web_seed snippets should have proper format', async () => {
      const result = await gatherContext('research', 'test', { id: 'test' }, {
        strategy: 'web_seed'
      });

      result.snippets.forEach(snippet => {
        assert(snippet.text, 'snippet should have text');
        assert(snippet.source === 'web_seed', 'snippet should have web_seed source');
        assert(typeof snippet.relevance === 'number', 'snippet should have numeric relevance');
        assert(snippet.relevance >= 0 && snippet.relevance <= 1, 'relevance should be 0-1');
        assert(snippet.metadata, 'snippet should have metadata');
      });
    });
  });

  // ==================== Strategy: Workspace Files ====================

  describe('Workspace Files Strategy', () => {
    it('should not crash when workspace does not exist', async () => {
      const result = await gatherContext('code', 'test', { id: 'test' }, {
        strategy: 'workspace_files',
        workspaceRoot: '/nonexistent/path'
      });
      assert(result.snippets !== undefined, 'should return result even if workspace missing');
      assert(Array.isArray(result.snippets), 'should return array of snippets');
    });

    it('should return workspace snippets when workspace exists', async () => {
      const result = await gatherContext('code', 'test', { id: 'test' }, {
        strategy: 'workspace_files',
        workspaceRoot: process.cwd()
      });
      // May return empty if no files match, but should not error
      assert(Array.isArray(result.snippets), 'should return array of snippets');
    });

    it('should filter files by task type', async () => {
      const result = await gatherContext('code', 'javascript', { id: 'test' }, {
        strategy: 'workspace_files',
        workspaceRoot: process.cwd(),
        maxFiles: 10
      });
      // Code task should look for .js, .ts, .py files
      // Archive workspace may have some of these
      assert(Array.isArray(result.snippets), 'should return array for code task');
    });

    it('should respect maxFiles option', async () => {
      const result = await gatherContext('writing', 'test', { id: 'test' }, {
        strategy: 'workspace_files',
        workspaceRoot: process.cwd(),
        maxFiles: 2
      });
      assert(result.snippets.length <= 2, 'should respect maxFiles limit');
    });
  });

  // ==================== Strategy: Custom ====================

  describe('Custom Strategy', () => {
    it('should return empty array for custom strategy (placeholder)', async () => {
      const result = await gatherContext('research', 'test', { id: 'test' }, {
        strategy: 'custom'
      });
      assert.strictEqual(result.snippets.length, 0, 'custom strategy is a placeholder');
    });
  });

  // ==================== Snippet Format Validation ====================

  describe('Snippet Format Validation', () => {
    it('snippets should have required fields', async () => {
      const result = await gatherContext('research', 'test', { id: 'test' }, {
        strategy: 'web_seed'
      });

      result.snippets.forEach(snippet => {
        assert(snippet.text !== undefined, 'snippet should have text');
        assert(snippet.source !== undefined, 'snippet should have source');
        assert(typeof snippet.relevance === 'number', 'snippet should have numeric relevance');
        assert(snippet.relevance >= 0 && snippet.relevance <= 1, 'relevance should be 0-1');
      });
    });

    it('should filter out invalid snippets', async () => {
      // Create a mock archive client that returns mixed valid/invalid results
      const mixedClient = {
        search: async () => {
          return [
            { text: 'valid', snippet: 'valid', date: '2026-03-18', metadata: {} },
            null,
            undefined,
            'string_not_object',
            { text: 'valid2', snippet: 'valid2', date: '2026-03-17', metadata: {} }
          ];
        }
      };

      const result = await gatherContext('research', 'test', { id: 'test' }, {
        strategy: 'archive',
        archiveIndexClient: mixedClient
      });

      // Should filter out non-objects
      result.snippets.forEach(snippet => {
        assert(snippet && typeof snippet === 'object', 'snippets should be objects');
      });
    });
  });

  // ==================== Task Type Coverage ====================

  describe('All Task Types Supported', () => {
    const taskTypes = ['research', 'code', 'writing', 'analysis', 'planning', 'memory_query'];

    taskTypes.forEach(taskType => {
      it(`should handle ${taskType} task type`, async () => {
        const result = await gatherContext(taskType, 'test message', { id: 'test' });
        assert(result.taskType === taskType, 'taskType should match input');
        assert(result.strategy, 'should have a strategy');
        assert(Array.isArray(result.snippets), 'should have snippets array');
      });
    });
  });

  // ==================== Batch Gathering ====================

  describe('Batch Context Gathering', () => {
    it('should gather context for multiple task types', async () => {
      const taskTypes = ['research', 'code', 'writing'];
      const result = await gatherContextBatch(taskTypes, 'test', { id: 'test' });

      assert(result.results, 'should have results object');
      taskTypes.forEach(taskType => {
        assert(result.results[taskType], `should have result for ${taskType}`);
        assert(result.results[taskType].taskType === taskType, `taskType should match for ${taskType}`);
      });
    });

    it('should handle empty task type array', async () => {
      const result = await gatherContextBatch([], 'test', { id: 'test' });
      assert(result.results !== undefined, 'should return results object');
      assert(Object.keys(result.results).length === 0, 'results should be empty');
    });

    it('batch results should include all context fields', async () => {
      const result = await gatherContextBatch(['research'], 'test', { id: 'test' });
      const contextResult = result.results.research;

      assert(contextResult.snippets !== undefined, 'should have snippets');
      assert(contextResult.strategy, 'should have strategy');
      assert(contextResult.taskType === 'research', 'should have taskType');
      assert(typeof contextResult.retrievedAt === 'number', 'should have retrievedAt');
    });
  });

  // ==================== Strategy Helper Functions ====================

  describe('Strategy Helper Functions', () => {
    it('getStrategyName should return string', () => {
      const name = getStrategyName('research');
      assert(typeof name === 'string', 'should return string');
      assert(name.length > 0, 'should return non-empty string');
    });

    it('getAvailableStrategies should return array', () => {
      const strategies = getAvailableStrategies();
      assert(Array.isArray(strategies), 'should return array');
      assert(strategies.length > 0, 'should have at least one strategy');
    });

    it('available strategies should include expected strategies', () => {
      const strategies = getAvailableStrategies();
      const expectedStrategies = ['archive', 'workspace_files', 'web_seed', 'custom'];
      expectedStrategies.forEach(expected => {
        assert(strategies.includes(expected), `should include ${expected} strategy`);
      });
    });
  });

  // ==================== Performance & Timing ====================

  describe('Performance and Timing', () => {
    it('should include elapsed time in result', async () => {
      const result = await gatherContext('research', 'test', { id: 'test' });
      assert(typeof result.elapsedMs === 'number', 'should include elapsedMs');
      assert(result.elapsedMs >= 0, 'elapsedMs should be non-negative');
    });

    it('fast strategy should complete quickly', async () => {
      const result = await gatherContext('research', 'test', { id: 'test' }, {
        strategy: 'web_seed'
      });
      assert(result.elapsedMs < 100, 'web_seed should be very fast');
    });
  });

  // ==================== Edge Cases ====================

  describe('Edge Cases', () => {
    it('should handle very long user message', async () => {
      const longMessage = 'test '.repeat(1000);
      const result = await gatherContext('research', longMessage, { id: 'test' });
      assert(result.snippets !== undefined, 'should handle long message');
    });

    it('should handle special characters in user message', async () => {
      const specialMessage = 'test @#$%^&*()_+-=[]{}|;:,.<>?';
      const result = await gatherContext('research', specialMessage, { id: 'test' });
      assert(result.snippets !== undefined, 'should handle special characters');
    });

    it('should handle unicode characters', async () => {
      const unicodeMessage = 'test with émojis 🚀 and ñ characters';
      const result = await gatherContext('research', unicodeMessage, { id: 'test' });
      assert(result.snippets !== undefined, 'should handle unicode');
    });

    it('entity with extra properties should work', async () => {
      const entity = {
        id: 'test',
        name: 'TestEntity',
        mood: 'curious',
        persona: 'helpful'
      };
      const result = await gatherContext('research', 'test', entity);
      assert(result.snippets !== undefined, 'should work with extended entity');
    });
  });
});
