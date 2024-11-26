import { Chance } from 'chance';
import { mock, mockFn } from 'jest-mock-extended';
import {
  App,
  debounce,
  Platform,
  Plugin,
  PluginManifest,
  renderResults,
  sortSearchResults,
  TFile,
  Keymap,
  Modal,
  normalizePath,
  setIcon,
  parseLinktext,
  Component,
  MarkdownRenderer,
  prepareFuzzySearch,
  prepareSimpleSearch,
  stripHeadingForLink,
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

const chance = new Chance();

const mockKeymap = mock<typeof Keymap>();

const mockPlatform = mock<typeof Platform>({
  isDesktop: true,
  isMobile: false,
});

const mockMarkdownRenderer = mock<MarkdownRenderer>();

const mockComponent = jest.fn<Component, []>(() => {
  return mock<Component>();
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

const mockPrepareFuzzySearch = mockFn<typeof prepareFuzzySearch>();
const mockPrepareSimpleSearch = mockFn<typeof prepareSimpleSearch>();

const mockNormalizePath = mockFn<typeof normalizePath>().mockImplementation(
  (path) => path,
);

const mockSortSearchResults = mockFn<typeof sortSearchResults>().mockImplementation();
const mockRenderResults = mockFn<typeof renderResults>().mockImplementation();
const mockDebounce = mockFn<typeof debounce>().mockImplementation();
const mockSetIcon = mockFn<typeof setIcon>().mockImplementation();
const mockParseLinktext = mockFn<typeof parseLinktext>().mockImplementation();
const mockStripHeadingForLink = mockFn<typeof stripHeadingForLink>().mockImplementation(
  (heading) => heading,
);

export {
  mockPlatform as Platform,
  mockModal as Modal,
  mockPlugin as Plugin,
  MockPluginSettingTab as PluginSettingTab,
  mockTFile as TFile,
  mockPrepareFuzzySearch as prepareFuzzySearch,
  mockPrepareSimpleSearch as prepareSimpleSearch,
  mockSortSearchResults as sortSearchResults,
  mockRenderResults as renderResults,
  mockDebounce as debounce,
  mockNormalizePath as normalizePath,
  mockSetIcon as setIcon,
  mockParseLinktext as parseLinktext,
  mockStripHeadingForLink as stripHeadingForLink,
  mockKeymap as Keymap,
  mockMarkdownRenderer as MarkdownRenderer,
  mockComponent as Component,
  MockSetting as Setting,
  MockTextComponent as TextComponent,
  MockToggleComponent as ToggleComponent,
  MockTextAreaComponent as TextAreaComponent,
  MockDropdownComponent as DropdownComponent,
  MockExtraButtonComponent as ExtraButtonComponent,
  MockSliderComponent as SliderComponent,
};
