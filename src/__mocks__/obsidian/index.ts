/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Chance } from 'chance';
import { InstalledPlugin, WorkspacesPluginInstance } from 'obsidian';

const chance = new Chance();

export const Platform = {
  isDesktop: true,
  isMobile: false,
};

export const TFile = jest.fn().mockImplementation(() => {
  const basename = chance.word();
  const extension = 'md';
  const name = `${basename}.${extension}`;

  return {
    path: `path/to/${name}`,
    basename,
    extension,
    name,
  };
});

export const WorkspaceSplit = jest.fn().mockImplementation(() => {
  return {};
});

export const WorkspaceLeaf = jest.fn().mockImplementation(() => {
  const editor = {
    getCursor: jest.fn(),
  };

  const view = {
    editor,
    file: new TFile(),
    getViewType: () => 'markdown',
    getMode: jest.fn(),
    setEphemeralState: jest.fn(),
  };

  return {
    view,
    getRoot: jest.fn(),
    getDisplayText: jest.fn(),
    openFile: jest.fn(),
  };
});

export const MetadataCache = jest.fn().mockImplementation(() => {
  const unresolvedLinks = {};

  return {
    getFileCache: jest.fn(),
    unresolvedLinks,
  };
});

export const Workspace = jest.fn().mockImplementation(() => {
  return {
    rootSplit: new WorkspaceSplit(),
    leftSplit: new WorkspaceSplit(),
    rightSplit: new WorkspaceSplit(),
    iterateAllLeaves: jest.fn(),
    getLastOpenFiles: jest.fn(),
    getLeaf: jest.fn(),
    revealLeaf: jest.fn(),
    setActiveLeaf: jest.fn(),
    openLinkText: jest.fn(),
  };
});

export const Vault = jest.fn().mockImplementation(() => {
  return {
    getAbstractFileByPath: jest.fn(),
    getFiles: jest.fn(),
  };
});

export const ViewRegistry = jest.fn().mockImplementation(() => {
  return {
    isExtensionRegistered: jest.fn(),
  };
});

export const App = jest.fn().mockImplementation(() => {
  const workspacesPluginInstance: WorkspacesPluginInstance = {
    id: 'workspaces',
    workspaces: {
      'first workspace': {},
      'second workspace': {},
    },
    loadWorkspace: jest.fn(),
  };

  const pluginList: Record<string, InstalledPlugin> = {
    workspaces: {
      enabled: true,
      instance: workspacesPluginInstance,
    },
  };

  const internalPlugins = {
    plugins: pluginList,
    getPluginById: (id: string) => pluginList[id],
  };

  return {
    workspace: new Workspace(),
    metadataCache: new MetadataCache(),
    vault: new Vault(),
    viewRegistry: new ViewRegistry(),
    internalPlugins,
  };
});

export const PluginSettingTab = jest.fn().mockImplementation(() => {
  return {};
});

export const Plugin = jest.fn().mockImplementation((app, _) => {
  return {
    app,
    loadData: jest.fn(),
    saveData: jest.fn(),
  };
});

export const prepareQuery = jest.fn();
export const fuzzySearch = jest.fn();
export const sortSearchResults = jest.fn();
export const renderResults = jest.fn();
export const debounce = jest.fn();
