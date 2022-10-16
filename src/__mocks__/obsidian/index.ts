import { Chance } from 'chance';
import { mock, mockFn } from 'jest-mock-extended';
import {
  App,
  debounce,
  fuzzySearch,
  Platform,
  Plugin,
  PluginManifest,
  prepareQuery,
  renderResults,
  sortSearchResults,
  TFile,
  Keymap,
  Modal,
  normalizePath,
  setIcon,
} from 'obsidian';
import {
  MockSetting,
  MockTextComponent,
  MockToggleComponent,
  MockTextAreaComponent,
  MockDropdownComponent,
  MockPluginSettingTab,
  MockExtraButtonComponent,
  MockSliderComponent,
} from './mockSetting';
import { makeFuzzyMatch, makePreparedQuery } from '@fixtures';

const chance = new Chance();

const mockKeymap = mock<typeof Keymap>();

const mockPlatform = mock<typeof Platform>({
  isDesktop: true,
  isMobile: false,
});

const mockModal = jest.fn<Modal, [app: App]>((app) => {
  return mock<Modal>({
    app,
    titleEl: mock<HTMLElement>(),
    contentEl: mock<HTMLElement>(),
  });
});

const mockPlugin = jest.fn<Plugin, [app: App, manifest: PluginManifest]>(
  (app, _manifest) => {
    return mock<Plugin>({
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
const mockNormalizePath = mockFn<typeof normalizePath>().mockImplementation();
const mockSetIcon = mockFn<typeof setIcon>().mockImplementation();

export {
  mockPlatform as Platform,
  mockModal as Modal,
  mockPlugin as Plugin,
  MockPluginSettingTab as PluginSettingTab,
  mockTFile as TFile,
  mockPrepareQuery as prepareQuery,
  mockFuzzySearch as fuzzySearch,
  mockSortSearchResults as sortSearchResults,
  mockRenderResults as renderResults,
  mockDebounce as debounce,
  mockNormalizePath as normalizePath,
  mockSetIcon as setIcon,
  mockKeymap as Keymap,
  MockSetting as Setting,
  MockTextComponent as TextComponent,
  MockToggleComponent as ToggleComponent,
  MockTextAreaComponent as TextAreaComponent,
  MockDropdownComponent as DropdownComponent,
  MockExtraButtonComponent as ExtraButtonComponent,
  MockSliderComponent as SliderComponent,
};
