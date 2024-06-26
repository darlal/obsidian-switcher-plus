import { CanvasNodeData } from 'obsidian/canvas';

export * from 'obsidian';
export * from './canvas';

declare module 'obsidian' {
  export interface PluginInstance {
    id: string;
  }

  export interface BookmarksPluginItem {
    type: string;
    title?: string;
  }

  export interface BookmarksPluginFileItem extends BookmarksPluginItem {
    type: 'file';
    path: string;
    subpath: string;
  }

  export interface BookmarksPluginFolderItem extends BookmarksPluginItem {
    type: 'folder';
    path: string;
  }

  export interface BookmarksPluginSearchItem extends BookmarksPluginItem {
    type: 'search';
    query: string;
  }

  export interface BookmarksPluginGroupItem extends BookmarksPluginItem {
    type: 'group';
    items: Array<BookmarksPluginItem>;
  }

  export interface BookmarksPluginInstance extends PluginInstance {
    items: Array<BookmarksPluginItem>;
    getItemTitle(item: BookmarksPluginItem): string;
  }

  export interface CommandPalettePluginInstance extends PluginInstance {
    options: {
      pinned?: Array<string>;
    };
  }

  export interface WorkspacesPluginInstance extends PluginInstance {
    workspaces: Record<string, unknown>;
    loadWorkspace(id: string): void;
    saveWorkspace(id: string): void;
    setActiveWorkspace(id: string): void;
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
    getEnabledPluginById(id: string): PluginInstance;
  }

  export interface ViewRegistry {
    viewByType: Record<string, unknown>;
    typeByExtension: Record<string, string>;
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
      getHotkeys(id: string): Hotkey[];
      getDefaultHotkeys(id: string): Hotkey[];
      printHotkeyForCommand(id: string): string;
    };
    mobileNavbar: {
      containerEl: HTMLElement;
    };
    openVaultChooser(): void;
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
    getRecentFiles(options: {
      showMarkdown: boolean;
      showCanvas: boolean;
      showNonImageAttachments: boolean;
      showImages: boolean;
      maxCount: number;
    }): string[];
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
