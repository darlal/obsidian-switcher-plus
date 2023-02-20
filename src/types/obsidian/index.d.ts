import { CanvasNodeData } from 'obsidian/canvas';

export * from 'obsidian';
export * from './canvas';

declare module 'obsidian' {
  export interface PluginInstance {
    id: string;
  }

  export interface StarredPluginItem {
    type: 'file' | 'search';
    title: string;
  }

  export interface SearchStarredItem extends StarredPluginItem {
    type: 'search';
    query: string;
  }

  export interface FileStarredItem extends StarredPluginItem {
    type: 'file';
    path: string;
  }

  export interface StarredPluginInstance extends PluginInstance {
    items: Array<StarredPluginItem>;
  }

  export interface CommandPalettePluginInstance extends PluginInstance {
    options: {
      pinned?: Array<string>;
    };
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
    plugins: Record<string, InstalledPlugin>;
    getPluginById(id: string): InstalledPlugin;
  }

  export interface ViewRegistry {
    viewByType: Record<string, unknown>;
    isExtensionRegistered(extension: string): boolean;
  }

  export interface MetadataCache {
    isUserIgnored(path: string): boolean;
  }

  export interface App {
    internalPlugins: InternalPlugins;
    viewRegistry: ViewRegistry;
    commands: {
      listCommands(): Command[];
      executeCommandById(id: string): boolean;
      findCommand(id: string): Command;
    };
    hotkeyManager: {
      printHotkeyForCommand(id: string): string;
    };
  }

  export interface Chooser<T> {
    selectedItem: number;
    suggestions: HTMLDivElement[];
    values: T[];
    setSelectedItem(index: number, evt: MouseEvent | KeyboardEvent): void;
    setSuggestions(suggestions: T[]): void;
    useSelectedItem(evt: KeyboardEvent): void;
  }

  export interface View {
    file?: TFile;
  }

  export interface KeymapEventHandler {
    func: KeymapEventListener;
  }

  export interface Scope {
    keys: KeymapEventHandler[];
  }

  export interface WorkspaceLeaf {
    activeTime: number;
  }

  export interface Workspace {
    floatingSplit: WorkspaceRoot;
  }

  export interface CanvasNodeElement extends CanvasNodeData {
    containerEl: string;
  }

  export interface CanvasFileView extends FileView {
    canvas: {
      nodes: Map<string, CanvasNodeElement>;
      selectOnly(node: CanvasNodeElement): void;
      zoomToSelection(): void;
    };
  }
}
