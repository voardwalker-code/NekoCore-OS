// ── Brain · Entity Network Registry ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This brain module implements cognitive/runtime behavior used by
// orchestration or memory systems.
//
// WHAT USES THIS:
// Primary dependencies in this module include: fs, path. Keep import and
// call-site contracts aligned during refactors.
//
// EXPORTS:
// No explicit CommonJS exports detected; module may be IIFE/side-effect
// based.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Entity Network Registry
 * Manages discovery and configuration of entities on the LAN.
 * Loads static configuration from server/config/entity-network.json
 * No dynamic broadcast; all entities are registered in config.
 */

const fs = require('fs');
const path = require('path');

class EntityNetworkRegistry {
  // constructor()
  // WHAT THIS DOES: constructor is a helper used by this module's main flow.
  // WHY IT EXISTS: it keeps repeated logic in one reusable place.
  // HOW TO USE IT: call constructor(...) where this helper behavior is needed.
  constructor() {
    this.entities = new Map();
    this.configPath = path.join(__dirname, '../../config/entity-network.json');
    this.load();
  }

  /**
   * Load entity configuration from JSON file
   * Creates default config if file doesn't exist
   */
  // load()
  // WHAT THIS DOES: load reads or finds data and gives it back.
  // WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
  // HOW TO USE IT: call load(...), then use the returned value in your next step.
  load() {
    try {
      if (fs.existsSync(this.configPath)) {
        const config = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
        if (config.entities && Array.isArray(config.entities)) {
          config.entities.forEach(entity => {
            this.registerEntity(entity);
          });
        }
      } else {
        // Initialize with default (NekoCore OS is the primary coordinator)
        // Other entities can be added via config
        console.log(`[EntityNetworkRegistry] Config file not found at ${this.configPath}`);
      }
    } catch (err) {
      console.error(`[EntityNetworkRegistry] Error loading config:`, err.message);
    }
  }

  /**
   * Register an entity in the network
   * @param {Object} entity - Entity configuration
   * @param {string} entity.id - Unique entity identifier
   * @param {string} entity.name - Human-readable name
   * @param {string} entity.host - Hostname or IP address
   * @param {number} entity.port - Port number
   * @param {Array<string>} entity.capabilities - List of capabilities (e.g., ['web_search', 'data_analysis'])
   * @returns {boolean} true if registered
   */
  // registerEntity()
  // WHAT THIS DOES: registerEntity is a helper used by this module's main flow.
  // WHY IT EXISTS: it keeps repeated logic in one reusable place.
  // HOW TO USE IT: call registerEntity(...) where this helper behavior is needed.
  registerEntity(entity) {
    if (!entity || !entity.id || !entity.host || !entity.port) {
      throw new Error('Entity must have id, host, and port');
    }

    this.entities.set(entity.id, {
      id: entity.id,
      name: entity.name || entity.id,
      host: entity.host,
      port: entity.port,
      capabilities: Array.isArray(entity.capabilities) ? entity.capabilities : [],
      registeredAt: new Date().toISOString()
    });

    return true;
  }

  /**
   * Get an entity by ID
   * @param {string} entityId - The entity ID
   * @returns {Object|null} The entity config, or null if not found
   */
  getEntity(entityId) {
    if (!entityId) return null;
    return this.entities.get(entityId) || null;
  }

  /**
   * List all registered entities
   * @returns {Array<Object>} Array of all entity configs
   */
  listEntities() {
    return Array.from(this.entities.values());
  }

  /**
   * Find entities by capability
   * @param {string} capability - The capability to search for
   * @returns {Array<Object>} Array of entities with that capability
   */
  findByCapability(capability) {
    if (!capability) return [];
    return Array.from(this.entities.values()).filter(entity =>
      entity.capabilities && entity.capabilities.includes(capability)
    );
  }

  /**
   * Get the base URL for an entity (for HTTP calls)
   * @param {string} entityId - The entity ID
   * @returns {string|null} The base URL (e.g., 'http://localhost:3001'), or null if entity not found
   */
  getEntityBaseUrl(entityId) {
    const entity = this.getEntity(entityId);
    if (!entity) return null;
    return `http://${entity.host}:${entity.port}`;
  }

  /**
   * Construct a full URL for an entity endpoint
   * @param {string} entityId - The entity ID
   * @param {string} path - The path (e.g., '/api/chat')
   * @returns {string|null} The full URL, or null if entity not found
   */
  requestEntityUrl(entityId, path) {
    const baseUrl = this.getEntityBaseUrl(entityId);
    if (!baseUrl) return null;
    // Ensure path starts with /
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${cleanPath}`;
  }

  /**
   * Check if an entity is registered
   * @param {string} entityId - The entity ID
   * @returns {boolean} true if registered
   */
  hasEntity(entityId) {
    return this.entities.has(entityId);
  }

  /**
   * Get all entity IDs
   * @returns {Array<string>} Array of registered entity IDs
   */
  getEntityIds() {
    return Array.from(this.entities.keys());
  }

  /**
   * Unregister an entity
   * @param {string} entityId - The entity ID
   * @returns {boolean} true if unregistered, false if not found
   */
  unregisterEntity(entityId) {
    if (!entityId) return false;
    return this.entities.delete(entityId);
  }
}

// Export as singleton
module.exports = new EntityNetworkRegistry();
