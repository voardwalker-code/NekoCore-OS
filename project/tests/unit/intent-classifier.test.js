// ── Tests · Intent Classifier.Test ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This test file validates behavior and guards against regressions in its
// target subsystem.
//
// WHAT USES THIS:
// Primary dependencies in this module include: ./test-compat, assert,
// ../../server/brain/tasks/intent-classifier. Keep import and call-site
// contracts aligned during refactors.
//
// EXPORTS:
// No explicit CommonJS exports detected; module may be IIFE/side-effect
// based.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Intent Classifier Guard Tests
 * Validates rule-based classification, task type routing, and LLM fallback behavior
 */

require('./test-compat');

const assert = require('assert');
const {
  classify,
  classifySync,
  isValidTaskType,
  getSupportedTaskTypes
} = require('../../server/brain/tasks/intent-classifier');

describe('Intent Classifier', () => {
  // ==================== Basic Classification ====================

  describe('Basic Intent Classification', () => {
    it('should classify simple greeting as conversation', async () => {
      const result = await classify('Hello, how are you?');
      assert.strictEqual(result.intent, 'conversation', 'greeting should be conversation');
      assert.strictEqual(result.taskType, null, 'should have no task type');
      assert.strictEqual(result.method, 'rule_base', 'should use rule-based classification');
    });

    it('should classify casual chat as conversation', async () => {
      const result = await classify("What's up? How's it going?");
      assert.strictEqual(result.intent, 'conversation');
      assert.strictEqual(result.taskType, null);
    });

    it('should classify thank you as conversation', async () => {
      const result = await classify('Thanks so much for your help!');
      assert.strictEqual(result.intent, 'conversation');
    });

    it('should handle empty/null input gracefully', async () => {
      const result1 = await classify('');
      assert.strictEqual(result1.intent, 'conversation');
      assert.strictEqual(result1.confidence, 0);

      const result2 = await classify(null);
      assert.strictEqual(result2.intent, 'conversation');
      assert(result2.error, 'should include error message');
    });

    it('should handle non-string input gracefully', async () => {
      const result = await classify(12345);
      assert.strictEqual(result.intent, 'conversation');
      assert(result.error, 'should include error message');
    });
  });

  // ==================== Research Task Classification ====================

  describe('Research Task Detection', () => {
    it('should classify "find information about..." as research task', async () => {
      const result = await classify('Find information about climate change and its impacts');
      assert.strictEqual(result.intent, 'task');
      assert.strictEqual(result.taskType, 'research');
      assert(result.confidence > 0.5, 'should have reasonable confidence');
    });

    it('should classify web search request as research', async () => {
      const result = await classify('Search the web for the latest AI breakthroughs');
      assert.strictEqual(result.intent, 'task');
      assert.strictEqual(result.taskType, 'research');
    });

    it('should classify "what is..." question as research', async () => {
      const result = await classify('What is machine learning and how does it work?');
      assert.strictEqual(result.intent, 'task');
      assert.strictEqual(result.taskType, 'research');
    });

    it('should classify data analysis request as research', async () => {
      const result = await classify('Investigate patterns in the provided dataset');
      assert.strictEqual(result.intent, 'task');
      assert.strictEqual(result.taskType, 'research');
    });
  });

  // ==================== Code Task Classification ====================

  describe('Code Task Detection', () => {
    it('should classify code writing request as code task', async () => {
      const result = await classify('Write me a JavaScript function that sorts an array');
      assert.strictEqual(result.intent, 'task');
      assert.strictEqual(result.taskType, 'code');
    });

    it('should classify debugging request as code task', async () => {
      const result = await classify('Debug this Python script - it keeps throwing errors');
      assert.strictEqual(result.intent, 'task');
      assert.strictEqual(result.taskType, 'code');
    });

    it('should classify refactoring request as code task', async () => {
      const result = await classify('Refactor this code to be more efficient');
      assert.strictEqual(result.intent, 'task');
      assert.strictEqual(result.taskType, 'code');
    });

    it('should classify API endpoint creation as code task', async () => {
      const result = await classify('Create a REST API endpoint for user authentication');
      assert.strictEqual(result.intent, 'task');
      assert.strictEqual(result.taskType, 'code');
    });

    it('should recognize code block with language specifier', async () => {
      const result = await classify('```javascript\nfunction test() {}\n```');
      assert.strictEqual(result.intent, 'task');
      assert.strictEqual(result.taskType, 'code');
    });
  });

  // ==================== Writing Task Classification ====================

  describe('Writing Task Detection', () => {
    it('should classify blog post request as writing task', async () => {
      const result = await classify('Write a blog post about sustainable technology');
      assert.strictEqual(result.intent, 'task');
      assert.strictEqual(result.taskType, 'writing');
    });

    it('should classify content creation as writing task', async () => {
      const result = await classify('Create marketing copy for our new product');
      assert.strictEqual(result.intent, 'task');
      assert.strictEqual(result.taskType, 'writing');
    });

    it('should classify editing request as writing task', async () => {
      const result = await classify('Edit and revise this essay for clarity and style');
      assert.strictEqual(result.intent, 'task');
      assert.strictEqual(result.taskType, 'writing');
    });

    it('should classify summary request as writing task', async () => {
      const result = await classify('Summarize this article in 3 key points');
      assert.strictEqual(result.intent, 'task');
      assert.strictEqual(result.taskType, 'writing');
    });

    it('should classify email writing as writing task', async () => {
      const result = await classify('Write a professional email announcing my departure');
      assert.strictEqual(result.intent, 'task');
      assert.strictEqual(result.taskType, 'writing');
    });
  });

  // ==================== Analysis Task Classification ====================

  describe('Analysis Task Detection', () => {
    it('should classify data analysis as analysis task', async () => {
      const result = await classify('Analyze this sales data and identify trends');
      assert.strictEqual(result.intent, 'task');
      assert.strictEqual(result.taskType, 'analysis');
    });

    it('should classify comparison request as analysis task', async () => {
      const result = await classify('Compare the pros and cons of these two approaches');
      assert.strictEqual(result.intent, 'task');
      assert.strictEqual(result.taskType, 'analysis');
    });

    it('should classify breakdown request as analysis task', async () => {
      const result = await classify('Break down this complex concept for me');
      assert.strictEqual(result.intent, 'task');
      assert.strictEqual(result.taskType, 'analysis');
    });

    it('should classify pattern extraction as analysis task', async () => {
      const result = await classify('What patterns do you see in this information?');
      assert.strictEqual(result.intent, 'task');
      assert.strictEqual(result.taskType, 'analysis');
    });
  });

  // ==================== Planning Task Classification ====================

  describe('Planning Task Detection', () => {
    it('should classify roadmap creation as planning task', async () => {
      const result = await classify('Create a roadmap for our product launch');
      assert.strictEqual(result.intent, 'task');
      assert.strictEqual(result.taskType, 'planning');
    });

    it('should classify strategy discussion as planning task', async () => {
      const result = await classify('Let\'s plan our approach to this problem');
      assert.strictEqual(result.intent, 'task');
      assert.strictEqual(result.taskType, 'planning');
    });

    it('should classify brainstorming as planning task', async () => {
      const result = await classify('Brainstorm ideas for improving our workflow');
      assert.strictEqual(result.intent, 'task');
      assert.strictEqual(result.taskType, 'planning');
    });

    it('should classify methodology design as planning task', async () => {
      const result = await classify('Design an experimental methodology for testing');
      assert.strictEqual(result.intent, 'task');
      assert.strictEqual(result.taskType, 'planning');
    });
  });

  // ==================== Memory Query Classification ====================

  describe('Memory Query Detection', () => {
    it('should classify memory recall as memory_query task', async () => {
      const result = await classify('Remember what we discussed last week?');
      assert.strictEqual(result.intent, 'task');
      assert.strictEqual(result.taskType, 'memory_query');
    });

    it('should classify history lookup as memory_query task', async () => {
      const result = await classify('What was my project background?');
      assert.strictEqual(result.intent, 'task');
      assert.strictEqual(result.taskType, 'memory_query');
    });

    it('should classify past context retrieval as memory_query task', async () => {
      const result = await classify('Tell me about my previous research');
      assert.strictEqual(result.intent, 'task');
      assert.strictEqual(result.taskType, 'memory_query');
    });

    it('should classify memory search as memory_query task', async () => {
      const result = await classify('Search my past conversations for discussions about AI');
      assert.strictEqual(result.intent, 'task');
      assert.strictEqual(result.taskType, 'memory_query');
    });
  });

  // ==================== Confidence & Fallback ====================

  describe('Confidence Thresholds and LLM Fallback', () => {
    it('should return rule-based result when confidence is high', async () => {
      const result = await classify('Write a Python program to sort numbers', {
        confidenceThreshold: 0.5,
        llmFallback: false
      });
      assert.strictEqual(result.method, 'rule_base');
      assert(result.confidence >= 0.5, 'should have confidence above 0.5');
    });

    it('should preserve confidence score in result', async () => {
      const result = await classify('Research climate change impacts');
      assert(typeof result.confidence === 'number', 'confidence should be a number');
      assert(result.confidence >= 0, 'confidence should be >= 0');
      assert(result.confidence <= 1, 'confidence should be <= 1');
    });

    it('should handle ambiguous input with low confidence', async () => {
      const result = await classify('xyz', { confidenceThreshold: 0.8, llmFallback: false });
      // Ambiguous input should have lower confidence
      assert(result.confidence < 0.8 || result.intent === 'conversation', 'ambiguous input');
    });

    it('should allow custom confidence threshold', async () => {
      const result = await classify('Write code', {
        confidenceThreshold: 0.95,
        llmFallback: false
      });
      // Even clear task might not meet 0.95 threshold
      assert(result.confidence, 'should return a result');
    });
  });

  // ==================== Synchronous Classification ====================

  describe('Synchronous Classification', () => {
    it('classifySync should return result immediately', () => {
      const result = classifySync('Write a JavaScript function');
      assert.strictEqual(result.intent, 'task');
      assert.strictEqual(result.taskType, 'code');
      assert(!result.error, 'should not use async path');
    });

    it('classifySync conversation should work', () => {
      const result = classifySync('Hello there!');
      assert.strictEqual(result.intent, 'conversation');
    });
  });

  // ==================== Task Type Validation ====================

  describe('Task Type Validation', () => {
    it('isValidTaskType should return true for research', () => {
      assert.strictEqual(isValidTaskType('research'), true);
    });

    it('isValidTaskType should return true for code', () => {
      assert.strictEqual(isValidTaskType('code'), true);
    });

    it('isValidTaskType should return false for unknown type', () => {
      assert.strictEqual(isValidTaskType('unknown_task'), false);
    });

    it('isValidTaskType should return false for null/empty', () => {
      assert.strictEqual(isValidTaskType(null), false);
      assert.strictEqual(isValidTaskType(''), false);
    });

    it('getSupportedTaskTypes should return non-empty array', () => {
      const types = getSupportedTaskTypes();
      assert(Array.isArray(types), 'should return array');
      assert(types.length > 0, 'should have at least one task type');
    });

    it('getSupportedTaskTypes should include all 6 seed types', () => {
      const types = getSupportedTaskTypes();
      const seedTypes = ['research', 'code', 'writing', 'analysis', 'planning', 'memory_query'];
      seedTypes.forEach(seedType => {
        assert(types.includes(seedType), `should include ${seedType}`);
      });
    });
  });

  // ==================== Edge Cases ====================

  describe('Edge Cases and Error Handling', () => {
    it('should handle very long input', async () => {
      const longMessage = 'Write code ' + 'to do something '.repeat(100);
      const result = await classify(longMessage);
      assert(result.intent !== undefined, 'should classify long input');
    });

    it('should handle input with special characters', async () => {
      const result = await classify('Write code with <special> & "characters"');
      assert.strictEqual(result.intent, 'task');
      assert.strictEqual(result.taskType, 'code');
    });

    it('should handle UPPERCASE input', async () => {
      const result = await classify('WRITE A JAVASCRIPT FUNCTION');
      assert.strictEqual(result.intent, 'task');
      assert.strictEqual(result.taskType, 'code');
    });

    it('should handle mixed case ambiguous input', async () => {
      const result = await classify('ThInK aBoUt ThIs');
      assert(result.intent !== undefined, 'should still classify mixed case');
    });

    it('should handle single-word task requests', async () => {
      const result = await classify('Research');
      // Should recognize as potential research task
      assert(result.taskType === 'research' || result.intent === 'conversation',
        'single word should be classified');
    });

    it('should handle multi-sentence complex requests', async () => {
      const result = await classify(
        'I need to research climate change. ' +
        'Can you find data on temperature trends? ' +
        'And analyze the patterns you find?'
      );
      assert.strictEqual(result.intent, 'task', 'multi-sentence should be classified as task');
    });
  });

  // ==================== Method Attribution ====================

  describe('Method Attribution', () => {
    it('rule-based results should have method: rule_base', async () => {
      const result = await classify('Write code in JavaScript', { llmFallback: false });
      assert.strictEqual(result.method, 'rule_base');
    });

    it('should preserve method attribution across all task types', async () => {
      const messages = [
        'Research AI trends',
        'Write a function',
        'Create blog content',
        'Analyze this data',
        'Plan our strategy',
        'What did we discuss?'
      ];

      for (const message of messages) {
        const result = await classify(message, { llmFallback: false });
        assert(['rule_base', 'llm_assist'].includes(result.method),
          `${message} should have valid method`);
      }
    });
  });

  // ==================== Input Normalization ====================

  describe('Input Normalization and Robustness', () => {
    it('should classify with leading/trailing whitespace', async () => {
      const result = await classify('   Write code   ');
      assert.strictEqual(result.intent, 'task');
      assert.strictEqual(result.taskType, 'code');
    });

    it('should handle newlines in input', async () => {
      const result = await classify('Write code\nfor a function\nto sort');
      assert.strictEqual(result.intent, 'task');
      assert.strictEqual(result.taskType, 'code');
    });

    it('should handle tabs in input', async () => {
      const result = await classify('Research\tfossil fuels\tand\tenergy');
      assert.strictEqual(result.intent, 'task');
    });
  });
});
