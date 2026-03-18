/**
 * Intent Classifier
 * Determines if input is a task request or conversational input.
 * Routes to appropriate task type if task.
 * Falls back to LLM assist when confidence is low.
 */

const {
  classifyIntentBasic,
  classifyTaskType,
  TASK_CLASSIFIER_RULES
} = require('./task-classifier-rules');

const taskModuleRegistry = require('./task-module-registry');

/**
 * Classify user message as task or conversation
 * Returns { intent, taskType, confidence, method }
 *
 * @param {string} userMessage - The user's input
 * @param {Object} options - Configuration options
 *   - confidenceThreshold: minimum confidence for rule-based classification (default: 0.7)
 *   - llmFallback: whether to use LLM for low-confidence cases (default: true)
 *   - llmClient: optional LLM client for fallback classification
 * @returns {Promise<Object>} Classification result
 */
async function classify(userMessage, options = {}) {
  const {
    confidenceThreshold = 0.7,
    llmFallback = true,
    llmClient = null
  } = options;

  // Validate input
  if (!userMessage || typeof userMessage !== 'string') {
    return {
      intent: 'conversation',
      taskType: null,
      confidence: 0,
      method: 'rule_base',
      error: 'Invalid input: message must be a non-empty string'
    };
  }

  // Run rule-based classification
  const basicResult = classifyIntentBasic(userMessage);

  // If confidence is high enough, return immediately
  if (basicResult.confidence >= confidenceThreshold) {
    return {
      intent: basicResult.intent,
      taskType: basicResult.taskType,
      confidence: basicResult.confidence,
      method: 'rule_base'
    };
  }

  // Confidence is low; try LLM fallback if enabled
  if (llmFallback && llmClient) {
    try {
      const llmResult = await classifyWithLLM(userMessage, llmClient);
      return {
        intent: llmResult.intent,
        taskType: llmResult.taskType,
        confidence: llmResult.confidence,
        method: 'llm_assist',
        llmReasoning: llmResult.reasoning
      };
    } catch (error) {
      // LLM fallback failed; return rule-based result with note
      return {
        intent: basicResult.intent,
        taskType: basicResult.taskType,
        confidence: basicResult.confidence,
        method: 'rule_base',
        fallbackNote: 'LLM assist failed, using rule-based result'
      };
    }
  }

  // No LLM fallback available; return rule-based result
  return {
    intent: basicResult.intent,
    taskType: basicResult.taskType,
    confidence: basicResult.confidence,
    method: 'rule_base'
  };
}

/**
 * Classify using LLM (fallback for low-confidence rule-based results)
 * @param {string} userMessage - The user message
 * @param {Object} llmClient - LLM client with a call method
 * @returns {Promise<Object>} { intent, taskType, confidence, reasoning }
 * @private
 */
async function classifyWithLLM(userMessage, llmClient) {
  const taskTypes = Object.keys(TASK_CLASSIFIER_RULES);
  const taskTypesList = taskTypes.join(', ');

  const prompt = `You are a message classifier. Classify the following user message as either a "task" request or "conversation".

If it's a task, identify which type from: ${taskTypesList}

User message: "${userMessage}"

Respond in JSON format:
{
  "intent": "task" or "conversation",
  "taskType": null or one of the task types above,
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}

Be conservative: if the message is ambiguous, classify as "conversation".`;

  try {
    const response = await llmClient.call({
      prompt: prompt,
      temperature: 0.3,
      maxTokens: 200
    });

    // Parse LLM response
    const responseText = response.text || response.content || response;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('LLM response not in JSON format');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate result
    if (!parsed.intent || (parsed.intent !== 'task' && parsed.intent !== 'conversation')) {
      throw new Error('Invalid intent from LLM');
    }

    // Validate taskType if intent is task
    if (parsed.intent === 'task' && parsed.taskType) {
      if (!taskModuleRegistry.hasModule(parsed.taskType)) {
        // Unknown task type; return as conversation with note
        return {
          intent: 'conversation',
          taskType: null,
          confidence: 0.5,
          reasoning: `Unknown task type "${parsed.taskType}" from LLM; treating as conversation`
        };
      }
    }

    return {
      intent: parsed.intent,
      taskType: parsed.taskType || null,
      confidence: Math.min(Math.max(parsed.confidence || 0.6, 0), 1),
      reasoning: parsed.reasoning || 'LLM classification'
    };
  } catch (error) {
    throw new Error(`LLM classification failed: ${error.message}`);
  }
}

/**
 * Quick synchronous classification without LLM fallback
 * Useful for fast routing decisions
 * @param {string} userMessage - The user's input
 * @returns {Object} Classification result
 */
function classifySync(userMessage) {
  if (!userMessage || typeof userMessage !== 'string') {
    return {
      intent: 'conversation',
      taskType: null,
      confidence: 0,
      method: 'rule_base',
      error: 'Invalid input: message must be a non-empty string'
    };
  }
  const basicResult = classifyIntentBasic(userMessage);
  return {
    intent: basicResult.intent,
    taskType: basicResult.taskType,
    confidence: basicResult.confidence,
    method: 'rule_base'
  };
}

/**
 * Validate that a taskType is recognized
 * @param {string} taskType - The task type to validate
 * @returns {boolean} True if valid
 */
function isValidTaskType(taskType) {
  if (!taskType) return false;
  return taskModuleRegistry.hasModule(taskType);
}

/**
 * Get all supported task types
 * @returns {string[]} List of task types
 */
function getSupportedTaskTypes() {
  return taskModuleRegistry.getTaskTypes();
}

module.exports = {
  classify,
  classifySync,
  classifyWithLLM,
  isValidTaskType,
  getSupportedTaskTypes
};
