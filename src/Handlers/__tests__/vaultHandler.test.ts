import { IpcRenderer } from 'electron';
import { Mode, SuggestionType, MatchType, SearchQuery } from 'src/types';
import { InputInfo } from 'src/switcherPlus';
import { Handler, VaultHandler, VaultData } from 'src/Handlers';
import { SwitcherPlusSettings } from 'src/settings/switcherPlusSettings';
import { App, setIcon, renderResults, Platform } from 'obsidian';
import {
  makeFuzzyMatch,
  commandTrigger,
  vaultTrigger,
  makeVaultSuggestion,
} from '@fixtures';
import { mock, mockFn, MockProxy } from 'jest-mock-extended';
import { Searcher } from 'src/search';

describe('vaultHandler', () => {
  let settings: SwitcherPlusSettings;
  let mockApp: MockProxy<App>;
  let sut: VaultHandler;
  const mockIpcRenderer = mock<IpcRenderer>();
  const mockPlatform = jest.mocked<typeof Platform>(Platform);

  const vaultData: VaultData = {
    firstVaultId: { path: 'path/to/firstVault', ts: 1 },
    secondVaultId: { path: 'path/to/secondVault', ts: 2, open: true },
  };

  beforeAll(() => {
    settings = new SwitcherPlusSettings(null);
    jest.spyOn(settings, 'vaultListCommand', 'get').mockReturnValue(vaultTrigger);

    // Used when the electron module is dynamically loaded on desktop platforms
    window.require = mockFn<(typeof window)['require']>().mockReturnValue({
      ipcRenderer: mockIpcRenderer,
    });

    mockApp = mock<App>();

    sut = new VaultHandler(mockApp, settings);
  });

  afterAll(() => {
    delete window['require'];
  });

  describe('getCommandString', () => {
    it('should return vaultListCommand trigger', () => {
      expect(sut.getCommandString()).toBe(vaultTrigger);
    });
  });

  describe('validateCommand', () => {
    let inputText: string;
    let startIndex: number;
    const filterText = 'foo';

    beforeAll(() => {
      inputText = `${commandTrigger}${filterText}`;
      startIndex = commandTrigger.length;
    });

    it('should validate parsed input', () => {
      const inputInfo = new InputInfo(inputText);

      sut.validateCommand(inputInfo, startIndex, filterText, null, null);
      expect(inputInfo.mode).toBe(Mode.VaultList);

      const cmd = inputInfo.parsedCommand();
      expect(cmd.parsedInput).toBe(filterText);
      expect(cmd.isValidated).toBe(true);
    });
  });

  describe('getSuggestions', () => {
    beforeEach(() => {
      mockIpcRenderer.sendSync.mockClear();
    });

    test('with falsy input, it should return an empty array', () => {
      const results = sut.getSuggestions(null);

      expect(results).not.toBeNull();
      expect(results).toBeInstanceOf(Array);
      expect(results).toHaveLength(0);
    });

    test('.getVaultListDataOnDesktop() should log errors to the console', () => {
      mockPlatform.isDesktop = true;
      const consoleLogSpy = jest.spyOn(console, 'log').mockReturnValueOnce();

      const error = new Error('vaultHandler.getVaultListDataOnDesktop unit test error');
      mockIpcRenderer.sendSync.mockImplementationOnce(() => {
        throw error;
      });

      sut.getVaultListDataOnDesktop();

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.any(String), error);

      consoleLogSpy.mockRestore();
    });

    test('.getItems() should log errors to the console', () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockReturnValueOnce();

      const error = new Error('vaultHandler.getItems unit test error');
      const getVaultListDataSpy = jest
        .spyOn(sut, 'getVaultListDataOnDesktop')
        .mockImplementationOnce(() => {
          throw error;
        });

      sut.getItems();

      expect(getVaultListDataSpy).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.any(String), error);

      consoleLogSpy.mockRestore();
      getVaultListDataSpy.mockRestore();
    });

    test('on mobile platforms, it should return the open vault chooser marker', () => {
      mockPlatform.isDesktop = false;
      const inputInfo = new InputInfo(vaultTrigger);

      const results = sut.getSuggestions(inputInfo);

      expect(results[0]).toBe(sut.mobileVaultChooserMarker);

      mockPlatform.isDesktop = true;
    });

    test('with default settings, it should return suggestions for vault list mode', () => {
      mockPlatform.isDesktop = true;
      const inputInfo = new InputInfo(vaultTrigger);
      mockIpcRenderer.sendSync.mockReturnValueOnce(vaultData);

      const results = sut.getSuggestions(inputInfo);

      const resultVaultIds = new Set(results.map((sugg) => sugg.item));

      const areAllFound = Object.keys(vaultData).every((vaultId) =>
        resultVaultIds.has(vaultId),
      );

      expect(results).toHaveLength(2);
      expect(areAllFound).toBe(true);
      expect(results.every((sugg) => sugg.type === SuggestionType.VaultList)).toBe(true);
      expect(mockIpcRenderer.sendSync).toHaveBeenCalledWith('vault-list');
    });

    test('with filter search term, it should return only matching suggestions for vault list mode', () => {
      mockPlatform.isDesktop = true;
      const inputInfo = new InputInfo(null, Mode.VaultList);
      const parsedInputQuerySpy = jest
        .spyOn(inputInfo, 'parsedInputQuery', 'get')
        .mockReturnValue(mock<SearchQuery>({ hasSearchTerm: true, query: null }));

      const filterText = 'firstVault';
      const expectedItem = Object.values(vaultData).find((vault) =>
        vault.path.endsWith(filterText),
      );

      const searchSpy = jest
        .spyOn(Searcher.prototype, 'executeSearch')
        .mockImplementation((text) => {
          return text.endsWith(filterText) ? makeFuzzyMatch() : null;
        });

      mockIpcRenderer.sendSync.mockReturnValueOnce(vaultData);

      const results = sut.getSuggestions(inputInfo);
      expect(results).toHaveLength(1);
      expect(results[0].pathSegments.path).toBe(expectedItem.path);
      expect(mockIpcRenderer.sendSync).toHaveBeenCalledWith('vault-list');

      searchSpy.mockRestore();
      parsedInputQuerySpy.mockRestore();
    });
  });

  describe('renderSuggestion', () => {
    it('shouggld not throw an error with a null suggestion', () => {
      expect(() => sut.renderSuggestion(null, null)).not.toThrow();
    });

    it('should render a suggestion', () => {
      mockPlatform.isDesktop = true;

      const sugg = makeVaultSuggestion({
        item: 'firstVaultId',
        pathSegments: { path: 'path/to/firstVault', basename: 'firstVault' },
        matchType: MatchType.Basename,
      });

      const mockSetIcon = jest.mocked<typeof setIcon>(setIcon);
      const mockRenderResults = jest.mocked<typeof renderResults>(renderResults);
      const renderContentSpy = jest.spyOn(Handler.prototype, 'renderContent');

      const mockParentEl = mock<HTMLElement>();
      mockParentEl.createDiv.mockReturnValue(
        mock<HTMLDivElement>({ createDiv: () => mock<HTMLDivElement>() }),
      );

      sut.renderSuggestion(sugg, mockParentEl);

      expect(mockSetIcon).toHaveBeenCalled();
      expect(mockRenderResults).toHaveBeenCalled();

      expect(renderContentSpy).toHaveBeenCalledWith(
        mockParentEl,
        'firstVault',
        sugg.match,
      );

      expect(mockParentEl.addClasses).toHaveBeenCalledWith(
        expect.arrayContaining(['mod-complex', 'qsp-suggestion-vault']),
      );

      renderContentSpy.mockRestore();
      mockPlatform.isDesktop = false;
    });

    test('on mobile, it should render a button to launch the vault chooser', () => {
      mockPlatform.isDesktop = false;

      const mockParentEl = mock<HTMLElement>();
      mockParentEl.createDiv.mockReturnValue(mock<HTMLDivElement>());

      const renderContentSpy = jest.spyOn(Handler.prototype, 'renderContent');

      sut.renderSuggestion(sut.mobileVaultChooserMarker, mockParentEl);

      expect(renderContentSpy).toHaveBeenCalledWith(
        mockParentEl,
        'Show mobile vault chooser',
        null,
      );

      renderContentSpy.mockRestore();
      mockPlatform.isMobile = true;
    });
  });

  describe('onChooseSuggestion', () => {
    it('should not throw an error with a null suggestion', () => {
      expect(() => sut.onChooseSuggestion(null, null)).not.toThrow();
    });

    test('.openVaultOnDesktop() should do nothing on non-desktop platforms', () => {
      mockPlatform.isDesktop = false;
      mockIpcRenderer.sendSync.mockClear();

      sut.openVaultOnDesktop(null);

      expect(mockIpcRenderer.sendSync).not.toHaveBeenCalled();

      mockPlatform.isDesktop = true;
    });

    test('.openVaultOnDesktop() should log errors to the console', () => {
      mockPlatform.isDesktop = true;
      const consoleLogSpy = jest.spyOn(console, 'log').mockReturnValueOnce();

      const error = new Error('vaultHandler.openVaultOnDesktop unit test error');
      mockIpcRenderer.sendSync.mockImplementationOnce(() => {
        throw error;
      });

      sut.openVaultOnDesktop(null);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.any(String), error);

      consoleLogSpy.mockRestore();
    });

    it('should open the vault on desktop platforms', () => {
      mockPlatform.isDesktop = true;
      const sugg = makeVaultSuggestion();

      sut.onChooseSuggestion(sugg, null);

      expect(mockIpcRenderer.sendSync).toHaveBeenCalledWith(
        'vault-open',
        sugg.pathSegments.path,
        false,
      );

      mockPlatform.isDesktop = false;
      mockIpcRenderer.sendSync.mockClear();
    });

    it('should launch the vault chooser on mobile platforms', () => {
      mockPlatform.isDesktop = false;

      sut.onChooseSuggestion(sut.mobileVaultChooserMarker, null);

      expect(mockApp.openVaultChooser).toHaveBeenCalled();

      mockPlatform.isDesktop = true;
    });
  });
});
