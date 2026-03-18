/**
 * Task Context Retrieval Strategies
 * Maps each task type to its source-of-truth retrieval strategy
 * and provides the strategy implementations.
 */

const fs = require('fs');
const path = require('path');

/**
 * Archive-based strategy: search entity memory and conversation archive
 * for relevant past context using BM25 keyword search
 * @param {string} taskType - The task type
 * @param {string} userMessage - The user's request
 * @param {Object} entity - The entity object with id
 * @param {Object} options - { archiveIndexClient?, maxSnippets = 5 }
 * @returns {Promise<Array>} Array of { text, source, relevance } snippets
 */
async function strategyArchive(taskType, userMessage, entity, options = {}) {
  const { archiveIndexClient, maxSnippets = 5 } = options;

  if (!archiveIndexClient || !archiveIndexClient.search) {
    // Fallback: return empty array if no archive client
    return [];
  }

  if (!entity || !entity.id) {
    return [];
  }

  try {
    // Build search terms from task type and user message
    const searchTerms = `${taskType} ${userMessage}`.split(/\s+/).slice(0, 10);

    // Query archive index with keywords
    const results = await archiveIndexClient.search({
      entityId: entity.id,
      keywords: searchTerms,
      limit: maxSnippets
    });

    if (!results || !Array.isArray(results)) {
      return [];
    }

    // Transform results to snippet format
    return results.map((result, idx) => ({
      text: result.text || result.snippet || '',
      source: `archive:${result.date || 'unknown'}`,
      relevance: Math.max(0, 1.0 - (idx * 0.15)),
      metadata: result.metadata || {}
    }));
  } catch (error) {
    // Gracefully handle archive errors
    return [];
  }
}

/**
 * Workspace files strategy: scan project workspace for files relevant to task type
 * e.g., for 'code' tasks, find .js, .ts, .py files; for 'writing' tasks, find .md files
 * @param {string} taskType - The task type
 * @param {string} userMessage - The user's request
 * @param {Object} entity - The entity object
 * @param {Object} options - { workspaceRoot?, maxFiles = 5 }
 * @returns {Promise<Array>} Array of { text, source, relevance } snippets
 */
async function strategyWorkspaceFiles(taskType, userMessage, entity, options = {}) {
  const { workspaceRoot = process.cwd(), maxFiles = 5 } = options;

  // Map task types to relevant file patterns
  const filePatterns = {
    code: ['.js', '.ts', '.py', '.jsx', '.tsx', '.json'],
    writing: ['.md', '.txt', '.mdx'],
    research: ['.md', '.txt', '.json', '.csv'],
    analysis: ['.json', '.csv', '.md'],
    planning: ['.md', '.json', 'PLAN*', 'ROADMAP*'],
    memory_query: ['.md', '.json', 'MEMORY*', 'RECALL*']
  };

  const patterns = filePatterns[taskType] || ['.md', '.txt', '.json'];
  const snippets = [];

  try {
    // Only scan src/, docs/, or project root for safety
    const scanPaths = [
      path.join(workspaceRoot, 'src'),
      path.join(workspaceRoot, 'docs'),
      path.join(workspaceRoot, 'Documents', 'current')
    ];

    for (const scanPath of scanPaths) {
      if (!fs.existsSync(scanPath)) continue;

      const files = fs.readdirSync(scanPath, { withFileTypes: true })
        .filter(dirent => {
          if (dirent.isDirectory()) return false;
          const ext = path.extname(dirent.name);
          return patterns.some(p => {
            if (p.startsWith('*')) return dirent.name.includes(p.slice(1));
            return ext === p || dirent.name.endsWith(p);
          });
        })
        .slice(0, maxFiles - snippets.length);

      for (const file of files) {
        try {
          const filePath = path.join(scanPath, file.name);
          const content = fs.readFileSync(filePath, 'utf8');
          // Take first 500 chars as context
          const text = content.slice(0, 500);
          snippets.push({
            text,
            source: `workspace:${file.name}`,
            relevance: 0.7,
            metadata: { filePath, sizeBytes: content.length }
          });

          if (snippets.length >= maxFiles) break;
        } catch (e) {
          // Skip unreadable files
          continue;
        }
      }

      if (snippets.length >= maxFiles) break;
    }
  } catch (error) {
    // Gracefully return what we have
  }

  return snippets;
}

/**
 * Web seed strategy: return curated seed URLs or web research starting points
 * from a static seed document
 * @param {string} taskType - The task type
 * @param {string} userMessage - The user's request
 * @param {Object} entity - The entity object
 * @param {Object} options - { seedDocPath?, maxSnippets = 5 }
 * @returns {Promise<Array>} Array of { text, source, relevance } snippets
 */
async function strategyWebSeed(taskType, userMessage, entity, options = {}) {
  // Web seed data — curated URLs and descriptions for common research topics
  const seedData = {
    research: [
      {
        url: 'https://scholar.google.com',
        description: 'Google Scholar — peer-reviewed research papers',
        relevance: 0.9
      },
      {
        url: 'https://arxiv.org',
        description: 'arXiv — preprint repository for scientific papers',
        relevance: 0.85
      },
      {
        url: 'https://en.wikipedia.org',
        description: 'Wikipedia — general knowledge and references',
        relevance: 0.7
      }
    ],
    code: [
      {
        url: 'https://github.com',
        description: 'GitHub — source code repositories and examples',
        relevance: 0.95
      },
      {
        url: 'https://stackoverflow.com',
        description: 'Stack Overflow — programming Q&A and solutions',
        relevance: 0.9
      },
      {
        url: 'https://mdn.org/docs',
        description: 'MDN Web Docs — JavaScript and web technology reference',
        relevance: 0.85
      }
    ],
    writing: [
      {
        url: 'https://www.grammarly.com',
        description: 'Grammarly — writing and grammar reference',
        relevance: 0.8
      },
      {
        url: 'https://www.thesaurus.com',
        description: 'Thesaurus — synonyms and word alternatives',
        relevance: 0.75
      }
    ]
  };

  const seeds = seedData[taskType] || seedData.research;

  return seeds.map(seed => ({
    text: `[${seed.url}] ${seed.description}`,
    source: 'web_seed',
    relevance: seed.relevance,
    metadata: { url: seed.url }
  }));
}

/**
 * Custom strategy: delegate to task-type-specific retrieval logic
 * Extensible hook for future per-type context retrieval
 * @param {string} taskType - The task type
 * @param {string} userMessage - The user's request
 * @param {Object} entity - The entity object
 * @param {Object} options - Custom options per strategy
 * @returns {Promise<Array>} Array of snippets
 */
async function strategyCustom(taskType, userMessage, entity, options = {}) {
  // Placeholder for per-type custom logic
  // Could dispatch to task-type-specific handlers in the future
  return [];
}

/**
 * Strategy dispatch table
 */
const STRATEGIES = {
  archive: strategyArchive,
  workspace_files: strategyWorkspaceFiles,
  web_seed: strategyWebSeed,
  custom: strategyCustom
};

/**
 * Get the retrieval strategy name for a task type
 * Looks up the module config to determine source-of-truth strategy
 * @param {string} taskType - The task type
 * @param {Object} moduleRegistry - Task module registry
 * @returns {string} Strategy name (archive, workspace_files, web_seed, or custom)
 */
function getStrategyForTaskType(taskType, moduleRegistry) {
  if (!moduleRegistry || !moduleRegistry.getModule) {
    return 'archive'; // Fallback default
  }

  const module = moduleRegistry.getModule(taskType);
  if (!module) {
    return 'archive';
  }

  // Check module config for sourceOfTruth strategy
  const strategy = module.sourceOfTruth || 'archive';
  return STRATEGIES[strategy] ? strategy : 'archive';
}

module.exports = {
  strategyArchive,
  strategyWorkspaceFiles,
  strategyWebSeed,
  strategyCustom,
  STRATEGIES,
  getStrategyForTaskType
};
