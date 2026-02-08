import { mock, MockProxy } from 'jest-mock-extended';
import { App } from 'obsidian';
import SwitcherPlusPlugin from 'src/main';
import { SwitcherPlusSettings } from 'src/settings';
import { SwitcherPlusModal } from 'src/switcherPlus/switcherPlus';
import { RibbonIconManager } from 'src/switcherPlus/ribbonIconManager';
import { getCommandDefinitions } from 'src/switcherPlus/commandDefinitions';
import { Mode } from 'src/types';

describe('RibbonIconManager', () => {
  let mockApp: MockProxy<App>;
  let mockPlugin: MockProxy<SwitcherPlusPlugin>;
  let settings: SwitcherPlusSettings;
  let createAndOpenSpy: jest.SpyInstance;

  beforeAll(() => {
    mockApp = mock<App>();
    settings = new SwitcherPlusSettings(null);
  });

  beforeEach(() => {
    mockPlugin = mock<SwitcherPlusPlugin>({ app: mockApp });
    mockPlugin.options = settings;
    mockPlugin.addRibbonIcon.mockReturnValue(mock<HTMLElement>());

    createAndOpenSpy = jest
      .spyOn(SwitcherPlusModal, 'createAndOpen')
      .mockReturnValue(true);
  });

  afterEach(() => {
    createAndOpenSpy.mockRestore();

    // Clean up static state between tests so previous icons are removed
    settings.enabledRibbonCommands = [];
    RibbonIconManager.registerRibbonIcons(mockPlugin, []);
  });

  describe('registerRibbonIcons', () => {
    it('should call addRibbonIcon for each enabled command in enabledRibbonCommands setting', () => {
      const definitions = getCommandDefinitions(settings);
      settings.enabledRibbonCommands = ['HeadingsList', 'SymbolList'];

      RibbonIconManager.registerRibbonIcons(mockPlugin, definitions);

      expect(mockPlugin.addRibbonIcon).toHaveBeenCalledTimes(2);
    });

    it('should register each ribbon icon with correct iconId and commandName from the matching definition', () => {
      const definitions = getCommandDefinitions(settings);
      settings.enabledRibbonCommands = ['HeadingsList', 'SymbolList'];

      RibbonIconManager.registerRibbonIcons(mockPlugin, definitions);

      expect(mockPlugin.addRibbonIcon).toHaveBeenCalledWith(
        'lucide-file-search',
        'Open in Headings Mode',
        expect.any(Function),
      );
      expect(mockPlugin.addRibbonIcon).toHaveBeenCalledWith(
        'lucide-dollar-sign',
        'Open Symbols for the active editor',
        expect.any(Function),
      );
    });

    it('should configure ribbon icon callback to call SwitcherPlusModal.createAndOpen with correct mode', () => {
      const definitions = getCommandDefinitions(settings);
      settings.enabledRibbonCommands = ['HeadingsList'];

      RibbonIconManager.registerRibbonIcons(mockPlugin, definitions);

      const ribbonCallForHeadings = mockPlugin.addRibbonIcon.mock.calls.find(
        (call) => call[1] === 'Open in Headings Mode',
      );
      const callback = ribbonCallForHeadings?.[2] as (() => void) | undefined;

      callback?.();

      expect(createAndOpenSpy).toHaveBeenCalledWith(
        mockApp,
        mockPlugin,
        Mode.HeadingsList,
      );
    });

    it('should remove previously registered icons when registerRibbonIcons is called again', () => {
      const definitions = getCommandDefinitions(settings);
      settings.enabledRibbonCommands = ['HeadingsList', 'SymbolList'];

      const mockRibbonEl1 = mock<HTMLElement>();
      const mockRibbonEl2 = mock<HTMLElement>();

      mockPlugin.addRibbonIcon
        .mockReturnValueOnce(mockRibbonEl1)
        .mockReturnValueOnce(mockRibbonEl2);

      RibbonIconManager.registerRibbonIcons(mockPlugin, definitions);

      expect(mockRibbonEl1.remove).not.toHaveBeenCalled();
      expect(mockRibbonEl2.remove).not.toHaveBeenCalled();

      const mockRibbonEl3 = mock<HTMLElement>();
      const mockRibbonEl4 = mock<HTMLElement>();

      mockPlugin.addRibbonIcon
        .mockReturnValueOnce(mockRibbonEl3)
        .mockReturnValueOnce(mockRibbonEl4);

      RibbonIconManager.registerRibbonIcons(mockPlugin, definitions);

      expect(mockRibbonEl1.remove).toHaveBeenCalledTimes(1);
      expect(mockRibbonEl2.remove).toHaveBeenCalledTimes(1);
    });

    it('should not call addRibbonIcon when enabledRibbonCommands is empty', () => {
      const definitions = getCommandDefinitions(settings);
      settings.enabledRibbonCommands = [];

      RibbonIconManager.registerRibbonIcons(mockPlugin, definitions);

      expect(mockPlugin.addRibbonIcon).not.toHaveBeenCalled();
    });
  });
});
