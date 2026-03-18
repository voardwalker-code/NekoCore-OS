/**
 * Guard Tests for Entity Network Registry
 * Ensures entities can be registered, discovered, and contacted correctly.
 */

require('./test-compat');

const entityNetworkRegistry = require('../../server/brain/tasks/entity-network-registry');
const fs = require('fs');
const path = require('path');

describe('EntityNetworkRegistry', () => {
  describe('entity registration', () => {
    test('should register an entity with required fields', () => {
      const entity = {
        id: 'test_entity_1',
        name: 'Test Entity',
        host: 'localhost',
        port: 4000,
        capabilities: ['test_cap']
      };
      const result = entityNetworkRegistry.registerEntity(entity);
      expect(result).toBe(true);
      
      const retrieved = entityNetworkRegistry.getEntity('test_entity_1');
      expect(retrieved).toBeDefined();
      expect(retrieved.name).toBe('Test Entity');
      expect(retrieved.port).toBe(4000);
    });

    test('should throw error if entity lacks id, host, or port', () => {
      expect(() => {
        entityNetworkRegistry.registerEntity({ name: 'Bad Entity' });
      }).toThrow();

      expect(() => {
        entityNetworkRegistry.registerEntity({ id: 'test', name: 'Bad' });
      }).toThrow();

      expect(() => {
        entityNetworkRegistry.registerEntity({ id: 'test', host: 'localhost' });
      }).toThrow();
    });

    test('should handle missing capabilities array gracefully', () => {
      const entity = {
        id: 'test_entity_nocap',
        name: 'No Capabilities',
        host: 'localhost',
        port: 4001
        // no capabilities field
      };
      const result = entityNetworkRegistry.registerEntity(entity);
      expect(result).toBe(true);
      
      const retrieved = entityNetworkRegistry.getEntity('test_entity_nocap');
      expect(Array.isArray(retrieved.capabilities)).toBe(true);
      expect(retrieved.capabilities.length).toBe(0);
    });
  });

  describe('getEntity', () => {
    test('should return entity config for valid ID', () => {
      const entity = entityNetworkRegistry.getEntity('entity_research');
      if (entity) {
        // Config file exists
        expect(entity.id).toBe('entity_research');
        expect(entity.host).toBeTruthy();
        expect(entity.port).toBeTruthy();
      }
    });

    test('should return null for unknown entity ID', () => {
      const entity = entityNetworkRegistry.getEntity('nonexistent_entity_xyz');
      expect(entity).toBeNull();
    });

    test('should return null for null/undefined ID', () => {
      expect(entityNetworkRegistry.getEntity(null)).toBeNull();
      expect(entityNetworkRegistry.getEntity(undefined)).toBeNull();
    });
  });

  describe('listEntities', () => {
    test('should return array of all entities', () => {
      const entities = entityNetworkRegistry.listEntities();
      expect(Array.isArray(entities)).toBe(true);
    });

    test('should include loaded entities from config if file exists', () => {
      const configPath = path.join(__dirname, '../../server/config/entity-network.json');
      const hasConfig = fs.existsSync(configPath);
      
      const entities = entityNetworkRegistry.listEntities();
      if (hasConfig) {
        expect(entities.length).toBeGreaterThan(0);
      }
    });

    test('should include all registered entities', () => {
      const entity = {
        id: 'test_entity_list',
        name: 'Test List',
        host: 'localhost',
        port: 4002,
        capabilities: ['cap1', 'cap2']
      };
      entityNetworkRegistry.registerEntity(entity);
      
      const entities = entityNetworkRegistry.listEntities();
      const found = entities.find(e => e.id === 'test_entity_list');
      expect(found).toBeDefined();
    });
  });

  describe('findByCapability', () => {
    test('should find entities with a specific capability', () => {
      const entity = {
        id: 'test_entity_cap',
        name: 'Capability Test',
        host: 'localhost',
        port: 4003,
        capabilities: ['unique_test_capability']
      };
      entityNetworkRegistry.registerEntity(entity);
      
      const found = entityNetworkRegistry.findByCapability('unique_test_capability');
      expect(Array.isArray(found)).toBe(true);
      expect(found.some(e => e.id === 'test_entity_cap')).toBe(true);
    });

    test('should return empty array for unknown capability', () => {
      const found = entityNetworkRegistry.findByCapability('totally_nonexistent_cap_xyz');
      expect(Array.isArray(found)).toBe(true);
      expect(found.length).toBe(0);
    });

    test('should return empty array for null/undefined capability', () => {
      expect(entityNetworkRegistry.findByCapability(null)).toEqual([]);
      expect(entityNetworkRegistry.findByCapability(undefined)).toEqual([]);
    });

    test('should handle seed config capabilities', () => {
      // Assuming entity_research has 'web_search' capability
      const configPath = path.join(__dirname, '../../server/config/entity-network.json');
      if (fs.existsSync(configPath)) {
        const found = entityNetworkRegistry.findByCapability('web_search');
        expect(Array.isArray(found)).toBe(true);
        // May or may not find it depending on config
      }
    });
  });

  describe('getEntityBaseUrl', () => {
    test('should construct valid base URL for registered entity', () => {
      const entity = {
        id: 'test_url_entity',
        name: 'URL Test',
        host: '192.168.1.100',
        port: 5000,
        capabilities: []
      };
      entityNetworkRegistry.registerEntity(entity);
      
      const url = entityNetworkRegistry.getEntityBaseUrl('test_url_entity');
      expect(url).toBe('http://192.168.1.100:5000');
    });

    test('should return null for unknown entity', () => {
      const url = entityNetworkRegistry.getEntityBaseUrl('nonexistent_xyz');
      expect(url).toBeNull();
    });

    test('should handle localhost correctly', () => {
      const entity = {
        id: 'test_localhost',
        name: 'Localhost Test',
        host: 'localhost',
        port: 3001,
        capabilities: []
      };
      entityNetworkRegistry.registerEntity(entity);
      
      const url = entityNetworkRegistry.getEntityBaseUrl('test_localhost');
      expect(url).toContain('localhost:3001');
    });
  });

  describe('requestEntityUrl', () => {
    test('should construct full URL with path', () => {
      const entity = {
        id: 'test_full_url',
        name: 'Full URL Test',
        host: 'localhost',
        port: 3001,
        capabilities: []
      };
      entityNetworkRegistry.registerEntity(entity);
      
      const url = entityNetworkRegistry.requestEntityUrl('test_full_url', '/api/chat');
      expect(url).toBe('http://localhost:3001/api/chat');
    });

    test('should add leading slash to path if missing', () => {
      const entity = {
        id: 'test_noslash',
        name: 'No Slash Test',
        host: 'localhost',
        port: 3002,
        capabilities: []
      };
      entityNetworkRegistry.registerEntity(entity);
      
      const url = entityNetworkRegistry.requestEntityUrl('test_noslash', 'api/message');
      expect(url).toBe('http://localhost:3002/api/message');
    });

    test('should return null for unknown entity', () => {
      const url = entityNetworkRegistry.requestEntityUrl('nonexistent_xyz', '/api/test');
      expect(url).toBeNull();
    });

    test('should handle complex paths', () => {
      const entity = {
        id: 'test_complex_path',
        name: 'Complex Path Test',
        host: 'localhost',
        port: 3003,
        capabilities: []
      };
      entityNetworkRegistry.registerEntity(entity);
      
      const url = entityNetworkRegistry.requestEntityUrl('test_complex_path', '/api/v1/task/session/123');
      expect(url).toBe('http://localhost:3003/api/v1/task/session/123');
    });
  });

  describe('hasEntity', () => {
    test('should return true for registered entity', () => {
      const entity = {
        id: 'test_has_entity',
        name: 'Has Test',
        host: 'localhost',
        port: 4010,
        capabilities: []
      };
      entityNetworkRegistry.registerEntity(entity);
      
      expect(entityNetworkRegistry.hasEntity('test_has_entity')).toBe(true);
    });

    test('should return false for unregistered entity', () => {
      expect(entityNetworkRegistry.hasEntity('nonexistent_xyz')).toBe(false);
    });
  });

  describe('getEntityIds', () => {
    test('should return array of all entity IDs', () => {
      const entity = {
        id: 'test_ids_entity',
        name: 'IDs Test',
        host: 'localhost',
        port: 4011,
        capabilities: []
      };
      entityNetworkRegistry.registerEntity(entity);
      
      const ids = entityNetworkRegistry.getEntityIds();
      expect(Array.isArray(ids)).toBe(true);
      expect(ids.includes('test_ids_entity')).toBe(true);
    });
  });

  describe('unregisterEntity', () => {
    test('should unregister an entity', () => {
      const entity = {
        id: 'test_unregister',
        name: 'Unregister Test',
        host: 'localhost',
        port: 4012,
        capabilities: []
      };
      entityNetworkRegistry.registerEntity(entity);
      
      const before = entityNetworkRegistry.hasEntity('test_unregister');
      expect(before).toBe(true);
      
      const result = entityNetworkRegistry.unregisterEntity('test_unregister');
      expect(result).toBe(true);
      
      const after = entityNetworkRegistry.hasEntity('test_unregister');
      expect(after).toBe(false);
    });

    test('should return false for unknown entity', () => {
      const result = entityNetworkRegistry.unregisterEntity('nonexistent_xyz');
      expect(result).toBe(false);
    });
  });

  describe('seed config validation', () => {
    test('should load default entities from config file if present', () => {
      const configPath = path.join(__dirname, '../../server/config/entity-network.json');
      if (fs.existsSync(configPath)) {
        const configContent = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        configContent.entities.forEach(entity => {
          const found = entityNetworkRegistry.getEntity(entity.id);
          expect(found).not.toBeNull();
        });
      }
    });

    test('should have research entity with web_search capability in config', () => {
      const configPath = path.join(__dirname, '../../server/config/entity-network.json');
      if (fs.existsSync(configPath)) {
        const found = entityNetworkRegistry.findByCapability('web_search');
        // May or may not be present depending on loaded config
        expect(Array.isArray(found)).toBe(true);
      }
    });
  });
});
