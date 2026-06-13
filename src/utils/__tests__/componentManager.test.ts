import { ComponentManager } from 'src/utils/componentManager';

describe('ComponentManager', () => {
  beforeEach(() => {
    // Discard any root component left over from a previous test so each test
    // starts from the "no component exists" state.
    ComponentManager.unload();
  });

  describe('getRootComponent', () => {
    it('should load the component when it is first created', () => {
      // Act
      const component = ComponentManager.getRootComponent();

      // Assert
      expect(component.load).toHaveBeenCalled();
    });

    it('should return the same instance on subsequent calls', () => {
      // Arrange
      const first = ComponentManager.getRootComponent();

      // Act
      const second = ComponentManager.getRootComponent();

      // Assert
      expect(second).toBe(first);
      expect(first.load).toHaveBeenCalledTimes(1);
    });
  });

  describe('unload', () => {
    it('should unload the root component', () => {
      // Arrange
      const component = ComponentManager.getRootComponent();

      // Act
      ComponentManager.unload();

      // Assert
      expect(component.unload).toHaveBeenCalled();
    });

    it('should discard the unloaded component so the next session gets a fresh loaded instance', () => {
      // Arrange
      const first = ComponentManager.getRootComponent();

      // Act
      ComponentManager.unload();
      const second = ComponentManager.getRootComponent();

      // Assert
      expect(second).not.toBe(first);
      expect(second.load).toHaveBeenCalled();
    });

    it('should not throw when no root component exists', () => {
      // Act & Assert
      expect(() => ComponentManager.unload()).not.toThrow();
    });
  });
});
