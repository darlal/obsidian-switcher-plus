export * from 'obsidian';

declare module 'obsidian' {
  export interface PluginInstance {
    id: string;
  }

  export interface WorkspacesPluginInstance extends PluginInstance {
    workspaces: Record<string, unknown>;
    loadWorkspace(id: string): void;
  }

  export interface QuickSwitcherOptions {
    showAllFileTypes: boolean;
    showAttachments: boolean;
    showExistingOnly: boolean;
  }

  export interface QuickSwitcherPluginInstance extends PluginInstance {
    options: QuickSwitcherOptions;
    QuickSwitcherModal: unknown;
  }

  export interface InstalledPlugin {
    enabled: boolean;
    instance: PluginInstance;
  }

  export interface InternalPlugins {
    getPluginById(id: string): InstalledPlugin;
  }

  export interface App {
    internalPlugins: InternalPlugins;
  }
}
