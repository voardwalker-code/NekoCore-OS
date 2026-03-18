/**
 * Task Module Registry
 * Manages task type definitions and their associated module configurations.
 * Supports dynamic registration of new task types without code changes.
 */

const { DEFAULT_MODULE_CONFIGS, TASK_TYPES } = require('./task-types');

class TaskModuleRegistry {
  constructor() {
    this.registry = new Map();
    // Load all default modules
    this.loadDefaults();
  }

  /**
   * Load default module configurations into the registry
   */
  loadDefaults() {
    Object.values(DEFAULT_MODULE_CONFIGS).forEach(config => {
      this.registerModule(config);
    });
  }

  /**
   * Get a module configuration by task type
   * @param {string} taskType - The task type (e.g., 'research', 'code', 'planning')
   * @returns {Object|null} The module config, or null if not found
   */
  getModule(taskType) {
    if (!taskType) return null;
    const module = this.registry.get(taskType);
    return module || null;
  }

  /**
   * List all registered modules
   * @returns {Array<Object>} Array of all module configs
   */
  listModules() {
    return Array.from(this.registry.values());
  }

  /**
   * Register a new module or update an existing one
   * @param {Object} config - Module configuration object
   * @param {string} config.id - Unique module ID
   * @param {string} config.taskType - Task type identifier
   * @param {string} config.name - Human-readable name
   * @param {string} config.systemPromptKey - Key for system prompt lookup
   * @param {Array<string>} config.tools - List of allowed tools
   * @param {string} config.sourceOfTruth - Source of truth strategy
   * @throws {Error} if module ID already exists (unless updating)
   * @returns {boolean} true if registered
   */
  registerModule(config) {
    if (!config || !config.id || !config.taskType) {
      throw new Error('Module config must have id and taskType');
    }

    // Check if already registered with same ID
    const existing = Array.from(this.registry.values()).find(m => m.id === config.id);
    if (existing && existing.taskType !== config.taskType) {
      throw new Error(`Module ID "${config.id}" already registered for task type "${existing.taskType}"`);
    }

    const normalized = {
      ...config,
      name: config.name || config.taskType,
      systemPromptKey: config.systemPromptKey || `task_${config.taskType}`,
      tools: Array.isArray(config.tools) ? [...config.tools] : [],
      sourceOfTruth: (typeof config.sourceOfTruth === 'string' && config.sourceOfTruth.trim())
        ? config.sourceOfTruth.trim()
        : 'runtime_registry'
    };

    this.registry.set(config.taskType, normalized);
    return true;
  }

  /**
   * Unregister a module by task type
   * @param {string} taskType - The task type to unregister
   * @returns {boolean} true if unregistered, false if not found
   */
  unregisterModule(taskType) {
    if (!taskType) return false;
    return this.registry.delete(taskType);
  }

  /**
   * Check if a task type is registered
   * @param {string} taskType - The task type
   * @returns {boolean} true if registered
   */
  hasModule(taskType) {
    return this.registry.has(taskType);
  }

  /**
   * Get all task types
   * @returns {Array<string>} Array of registered task type strings
   */
  getTaskTypes() {
    return Array.from(this.registry.keys());
  }
}

// Export as singleton
module.exports = new TaskModuleRegistry();
