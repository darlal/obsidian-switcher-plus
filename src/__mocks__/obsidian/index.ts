import { Chance } from 'chance';
import { mock, mockFn } from 'jest-mock-extended';
import {
  App,
  debounce,
  fuzzySearch,
  Platform,
  Plugin,
  PluginManifest,
  PluginSettingTab,
  Plugin_2,
  prepareQuery,
  renderResults,
  sortSearchResults,
  TFile,
} from 'obsidian';
import { makeFuzzyMatch, makePreparedQuery } from '@fixtures';
import { MockSetting, MockTextComponent } from './mockSetting';

const chance = new Chance();

const mockPlatform = mock<typeof Platform>({
  isDesktop: true,
  isMobile: false,
});

const mockPlugin = jest.fn<Plugin, [app: App, manifest: PluginManifest]>(
  (app, _manifest) => {
    return mock<Plugin>({
      app,
    });
  },
);

const mockPluginSettingTab = jest.fn<PluginSettingTab, [app: App, plugin: Plugin_2]>(
  (app, _plugin) => {
    return mock<PluginSettingTab>({
      app,
    });
  },
);

const mockTFile = jest.fn<TFile, [basename?: string, extension?: string]>(
  (basename = chance.word(), extension = 'md') => {
    const name = `${basename}.${extension}`;

    return mock<TFile>({
      path: `path/to/${name}`,
      basename,
      extension,
      name,
    });
  },
);

const mockFuzzySearch = mockFn<typeof fuzzySearch>().mockImplementation((_q, _t) =>
  makeFuzzyMatch(),
);

const mockPrepareQuery = mockFn<typeof prepareQuery>().mockImplementation((_query) =>
  makePreparedQuery(),
);

const mockSortSearchResults = mockFn<typeof sortSearchResults>().mockImplementation();
const mockRenderResults = mockFn<typeof renderResults>().mockImplementation();
const mockDebounce = mockFn<typeof debounce>().mockImplementation();

export {
  mockPlatform as Platform,
  mockPlugin as Plugin,
  mockPluginSettingTab as PluginSettingTab,
  mockTFile as TFile,
  mockPrepareQuery as prepareQuery,
  mockFuzzySearch as fuzzySearch,
  mockSortSearchResults as sortSearchResults,
  mockRenderResults as renderResults,
  mockDebounce as debounce,
  MockSetting as Setting,
  MockTextComponent as TextComponent,
};
