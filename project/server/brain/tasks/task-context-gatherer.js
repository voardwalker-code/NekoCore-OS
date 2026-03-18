/**
 * Task Context Gatherer
 * Retrieves relevant context snippets for a task based on its type.
 * Uses the module registry to determine which retrieval strategy to apply.
 */

const {
  STRATEGIES,
  getStrategyForTaskType
} = require('./task-context-strategies');

const taskModuleRegistry = require('./task-module-registry');

/**
 * Gather context for a task request
 * Queries the source-of-truth (archive, workspace files, web seed, or custom)
 * and returns structured snippets
 *
 * @param {string} taskType - The task type (e.g., 'research', 'code', 'writing')
 * @param {string} userMessage - The user's request
 * @param {Object} entity - The entity making the request { id, name, ... }
 * @param {Object} options - Configuration
 *   - strategy: override the default strategy lookup
 *   - maxSnippets: max number of snippets to return (default: 5)
 *   - archiveIndexClient: BM25 archive index client for archive strategy
 *   - workspaceRoot: path to workspace root for file-scanning strategy
 * @returns {Promise<Object>} {
 *     snippets: [{ text, source, relevance, metadata }],
 *     strategy: string,
 *     taskType: string,
 *     retrievedAt: number (ms since epoch)
 *   }
 */
async function gatherContext(taskType, userMessage, entity, options = {}) {
  const startTime = Date.now();

  // Validate inputs
  if (!taskType || typeof taskType !== 'string') {
    return {
      snippets: [],
      strategy: 'none',
      taskType: null,
      retrievedAt: Date.now(),
      error: 'Invalid taskType'
    };
  }

  if (!userMessage || typeof userMessage !== 'string') {
    userMessage = '';
  }

  // Determine which strategy to use
  let strategyName = options.strategy || getStrategyForTaskType(taskType, taskModuleRegistry);

  // Validate that strategy exists
  if (!STRATEGIES[strategyName]) {
    strategyName = 'archive'; // Fallback to archive
  }

  const strategy = STRATEGIES[strategyName];

  // Execute the strategy
  let snippets = [];
  try {
    snippets = await strategy(taskType, userMessage, entity, options);
  } catch (error) {
    // Graceful error handling - return empty snippets
    snippets = [];
  }

  // Ensure snippets is an array
  if (!Array.isArray(snippets)) {
    snippets = [];
  }

  // Validate snippet format and cap at maxSnippets
  const maxSnippets = options.maxSnippets || 5;
  const validSnippets = snippets
    .filter(s => s && typeof s === 'object')
    .slice(0, maxSnippets);

  return {
    snippets: validSnippets,
    strategy: strategyName,
    taskType,
    retrievedAt: Date.now(),
    elapsedMs: Date.now() - startTime
  };
}

/**
 * Batch gather context for multiple task types
 * Useful for exploring multiple possible task interpretations
 * @param {string[]} taskTypes - Array of task types to query
 * @param {string} userMessage - The user's request
 * @param {Object} entity - The entity object
 * @param {Object} options - Gatherer options
 * @returns {Promise<Object>} { results: { [taskType]: contextResult } }
 */
async function gatherContextBatch(taskTypes, userMessage, entity, options = {}) {
  const results = {};

  // Gather context in parallel for all task types
  const promises = taskTypes.map(async taskType => {
    const context = await gatherContext(taskType, userMessage, entity, options);
    results[taskType] = context;
  });

  await Promise.all(promises);

  return { results };
}

/**
 * Get context strategy for a specific task type
 * Returns the name of the strategy that would be used
 * @param {string} taskType - The task type
 * @returns {string} Strategy name
 */
function getStrategyName(taskType) {
  return getStrategyForTaskType(taskType, taskModuleRegistry);
}

/**
 * Get all available strategies
 * @returns {string[]} Array of strategy names
 */
function getAvailableStrategies() {
  return Object.keys(STRATEGIES);
}

module.exports = {
  gatherContext,
  gatherContextBatch,
  getStrategyName,
  getAvailableStrategies
};
