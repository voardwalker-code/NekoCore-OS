/**
 * Guard Tests for Task Module Registry
 * Ensures the registry can CRUD modules and resolve seed types correctly.
 */

require('./test-compat');

const taskModuleRegistry = require('../../server/brain/tasks/task-module-registry');
const { TASK_TYPES, DEFAULT_MODULE_CONFIGS } = require('../../server/brain/tasks/task-types');

describe('TaskModuleRegistry', () => {
  describe('defaults', () => {
    test('should load all default module configs on initialization', () => {
      const modules = taskModuleRegistry.listModules();
      expect(modules.length).toBe(Object.keys(TASK_TYPES).length);
    });

    test('should have a module for each TASK_TYPE enum value', () => {
      Object.values(TASK_TYPES).forEach(taskType => {
        const module = taskModuleRegistry.getModule(taskType);
        expect(module).not.toBeNull();
        expect(module.taskType).toBe(taskType);
      });
    });
  });

  describe('getModule', () => {
    test('should return module config for valid task type', () => {
      const module = taskModuleRegistry.getModule(TASK_TYPES.RESEARCH);
      expect(module).toBeDefined();
      expect(module.systemPromptKey).toBe('task_research');
      expect(module.tools).toContain('web_search');
    });

    test('should return null for unknown task type', () => {
      const module = taskModuleRegistry.getModule('unknown_task_type');
      expect(module).toBeNull();
    });

    test('should return null for null/undefined task type', () => {
      expect(taskModuleRegistry.getModule(null)).toBeNull();
      expect(taskModuleRegistry.getModule(undefined)).toBeNull();
    });
  });

  describe('listModules', () => {
    test('should return all registered modules', () => {
      const modules = taskModuleRegistry.listModules();
      expect(Array.isArray(modules)).toBe(true);
      expect(modules.length).toBeGreaterThan(0);
    });

    test('should return modules with required fields', () => {
      const modules = taskModuleRegistry.listModules();
      modules.forEach(module => {
        expect(module.id).toBeDefined();
        expect(module.taskType).toBeDefined();
        expect(module.name).toBeDefined();
        expect(module.systemPromptKey).toBeDefined();
        expect(Array.isArray(module.tools)).toBe(true);
        expect(module.sourceOfTruth).toBeDefined();
      });
    });
  });

  describe('registerModule', () => {
    test('should register a new module configuration', () => {
      const customModule = {
        id: 'custom-module',
        taskType: 'custom_task',
        name: 'Custom Task',
        systemPromptKey: 'task_custom',
        tools: ['custom_tool'],
        sourceOfTruth: 'custom_source'
      };
      const result = taskModuleRegistry.registerModule(customModule);
      expect(result).toBe(true);
      
      const retrieved = taskModuleRegistry.getModule('custom_task');
      expect(retrieved).toBeDefined();
      expect(retrieved.id).toBe('custom-module');
    });

    test('should throw error if config lacks id or taskType', () => {
      expect(() => {
        taskModuleRegistry.registerModule({ name: 'Bad Config' });
      }).toThrow();
    });

    test('should throw error if duplicate module ID with different task type', () => {
      const module1 = {
        id: 'dup-id',
        taskType: 'task_a',
        name: 'Task A'
      };
      const module2 = {
        id: 'dup-id',
        taskType: 'task_b',
        name: 'Task B'
      };
      taskModuleRegistry.registerModule(module1);
      expect(() => {
        taskModuleRegistry.registerModule(module2);
      }).toThrow();
    });
  });

  describe('unregisterModule', () => {
    test('should unregister a module by task type', () => {
      taskModuleRegistry.registerModule({
        id: 'unregister-test',
        taskType: 'unregister_task',
        name: 'Unregister Test'
      });
      const before = taskModuleRegistry.getModule('unregister_task');
      expect(before).not.toBeNull();

      const result = taskModuleRegistry.unregisterModule('unregister_task');
      expect(result).toBe(true);
      
      const after = taskModuleRegistry.getModule('unregister_task');
      expect(after).toBeNull();
    });

    test('should return false for unknown task type', () => {
      const result = taskModuleRegistry.unregisterModule('nonexistent_task');
      expect(result).toBe(false);
    });
  });

  describe('hasModule', () => {
    test('should return true for registered task type', () => {
      expect(taskModuleRegistry.hasModule(TASK_TYPES.PLANNING)).toBe(true);
    });

    test('should return false for unregistered task type', () => {
      expect(taskModuleRegistry.hasModule('nonexistent')).toBe(false);
    });
  });

  describe('getTaskTypes', () => {
    test('should return all registered task type strings', () => {
      const types = taskModuleRegistry.getTaskTypes();
      expect(Array.isArray(types)).toBe(true);
      expect(types).toContain(TASK_TYPES.RESEARCH);
      expect(types).toContain(TASK_TYPES.PLANNING);
    });
  });

  describe('seed config validation', () => {
    test('planning task type should be included', () => {
      const planning = taskModuleRegistry.getModule(TASK_TYPES.PLANNING);
      expect(planning).not.toBeNull();
      expect(planning.name).toContain('Planning');
      expect(planning.systemPromptKey).toBe('task_planning');
    });

    test('planning module should have entity_message and session_bridging tools', () => {
      const planning = taskModuleRegistry.getModule(TASK_TYPES.PLANNING);
      expect(planning.tools).toContain('entity_message');
      expect(planning.tools).toContain('session_bridging');
    });

    test('all modules should have valid sourceOfTruth', () => {
      const modules = taskModuleRegistry.listModules();
      modules.forEach(module => {
        expect(module.sourceOfTruth).toBeTruthy();
        expect(typeof module.sourceOfTruth).toBe('string');
      });
    });
  });
});
