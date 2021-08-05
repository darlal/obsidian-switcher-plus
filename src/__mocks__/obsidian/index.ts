/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Chance } from 'chance';
import { InstalledPlugin, WorkspacesPluginInstance } from 'obsidian';

const chance = new Chance();

export const TFile = jest.fn().mockImplementation(() => {
  const basename = chance.word();
  const extension = 'bar';
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
  const view = {
    file: new TFile(),
    getViewType: () => 'markdown',
  };

  return {
    view,
    getRoot: jest.fn(),
    getDisplayText: jest.fn(),
  };
});

export const MetadataCache = jest.fn().mockImplementation(() => {
  return {
    getFileCache: jest.fn(),
  };
});

export const Workspace = jest.fn().mockImplementation(() => {
  return {
    rootSplit: new WorkspaceSplit(),
    leftSplit: new WorkspaceSplit(),
    rightSplit: new WorkspaceSplit(),
    iterateAllLeaves: jest.fn(),
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
