import { Component } from 'obsidian';

/**
 * Provides access to a shared Component in static contexts to ensure that all child
 * Components are properly unloaded. Note: this class is not intended to be subclassed,
 * the static methods should be used directly.
 *
 */
export abstract class ComponentManager {
  private static rootComponent: Component;

  /**
   * Returns a Component that can be used to manage the lifecycle of other Components.
   * This container component will be automatically unloaded when the modal is closed to free any
   * associated resources. This is useful for cases like MarkdownRenderer.render()
   *
   * @static
   * @returns {Component}
   */
  static getRootComponent(): Component {
    if (!this.rootComponent) {
      this.rootComponent = new Component();
    }

    return this.rootComponent;
  }

  /**
   * Unload the tracking component and its children.
   *
   * @static
   */
  static unload(): void {
    this.rootComponent?.unload();
  }
}
