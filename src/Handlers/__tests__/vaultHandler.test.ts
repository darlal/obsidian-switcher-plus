jest.mock('electron', () => {
  return {
    ipcRenderer: {
      sendSync: jest.fn(),
    },
  };
});

import { ipcRenderer } from 'electron';
import { Mode, SuggestionType, MatchType } from 'src/types';
import { InputInfo } from 'src/switcherPlus';
import { Handler, VaultHandler, VaultData } from 'src/Handlers';
import { SwitcherPlusSettings } from 'src/settings/switcherPlusSettings';
import {
  App,
  fuzzySearch,
  prepareQuery,
  setIcon,
  renderResults,
  Platform,
} from 'obsidian';
import {
  makePreparedQuery,
  makeFuzzyMatch,
  commandTrigger,
  vaultTrigger,
  makeVaultSuggestion,
} from '@fixtures';
import { mock, MockProxy } from 'jest-mock-extended';

describe('vaultHandler', () => {
  let settings: SwitcherPlusSettings;
  let mockApp: MockProxy<App>;
  let sut: VaultHandler;
  const mockedIpcRenderer = jest.mocked<typeof ipcRenderer>(ipcRenderer);
  const mockPlatform = jest.mocked<typeof Platform>(Platform);

  const vaultData: VaultData = {
    firstVaultId: { path: 'path/to/firstVault', ts: 1 },
    secondVaultId: { path: 'path/to/secondVault', ts: 2, open: true },
  };

  beforeAll(() => {
    settings = new SwitcherPlusSettings(null);
    jest.spyOn(settings, 'vaultListCommand', 'get').mockReturnValue(vaultTrigger);

    mockApp = mock<App>();

    sut = new VaultHandler(mockApp, settings);
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
    afterEach(() => {
      mockedIpcRenderer.sendSync.mockClear();
    });

    test('with falsy input, it should return an empty array', () => {
      const results = sut.getSuggestions(null);

      expect(results).not.toBeNull();
      expect(results).toBeInstanceOf(Array);
      expect(results).toHaveLength(0);
    });

    test('.getItems() should log errors to the console', () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockReturnValueOnce();

      const error = new Error('getItems unit test error');
      mockedIpcRenderer.sendSync.mockImplementationOnce(() => {
        throw error;
      });

      sut.getItems();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Switcher++: error retrieving list of available vaults. ',
        error,
      );

      consoleLogSpy.mockRestore();
    });

    test('on mobile platforms, it should return the open vault chooser marker', () => {
      mockPlatform.isDesktop = false;
      const inputInfo = new InputInfo(vaultTrigger);

      const results = sut.getSuggestions(inputInfo);

      expect(results[0]).toBe(sut.mobileVaultChooserMarker);

      mockPlatform.isDesktop = true;
    });

    test('with default settings, it should return suggestions for vault list mode', () => {
      const inputInfo = new InputInfo(vaultTrigger);
      mockedIpcRenderer.sendSync.mockReturnValueOnce(vaultData);

      const results = sut.getSuggestions(inputInfo);

      const resultVaultIds = new Set(results.map((sugg) => sugg.item));

      const areAllFound = Object.keys(vaultData).every((vaultId) =>
        resultVaultIds.has(vaultId),
      );

      expect(results).toHaveLength(2);
      expect(areAllFound).toBe(true);
      expect(results.every((sugg) => sugg.type === SuggestionType.VaultList)).toBe(true);
      expect(mockedIpcRenderer.sendSync).toHaveBeenCalledWith('vault-list');
    });

    test('with filter search term, it should return only matching suggestions for vault list mode', () => {
      const filterText = 'firstVault';
      const expectedItem = Object.values(vaultData).find((vault) =>
        vault.path.endsWith(filterText),
      );

      const mockPrepareQuery = jest.mocked<typeof prepareQuery>(prepareQuery);
      mockPrepareQuery.mockReturnValueOnce(makePreparedQuery(filterText));

      const mockFuzzySearch = jest.mocked<typeof fuzzySearch>(fuzzySearch);

      mockFuzzySearch.mockImplementation((_q, text: string) => {
        const match = makeFuzzyMatch();
        return text.endsWith(filterText) ? match : null;
      });

      const inputInfo = new InputInfo(`${vaultTrigger}${filterText}`);
      mockedIpcRenderer.sendSync.mockReturnValueOnce(vaultData);

      const results = sut.getSuggestions(inputInfo);

      const onlyResult = results[0];
      expect(results).toHaveLength(1);
      expect(onlyResult.pathSegments.path).toBe(expectedItem.path);
      expect(mockedIpcRenderer.sendSync).toHaveBeenCalledWith('vault-list');
      expect(mockFuzzySearch).toHaveBeenCalled();
      expect(mockPrepareQuery).toHaveBeenCalled();

      mockFuzzySearch.mockReset();
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

    it('should open the vault on desktop platforms', () => {
      mockPlatform.isDesktop = true;
      const sugg = makeVaultSuggestion();

      sut.onChooseSuggestion(sugg, null);

      expect(mockedIpcRenderer.sendSync).toHaveBeenCalledWith(
        'vault-open',
        sugg.pathSegments.path,
        false,
      );

      mockPlatform.isDesktop = false;
      mockedIpcRenderer.sendSync.mockClear();
    });

    it('should launch the vault chooser on mobile platforms', () => {
      mockPlatform.isDesktop = false;

      sut.onChooseSuggestion(sut.mobileVaultChooserMarker, null);

      expect(mockApp.openVaultChooser).toHaveBeenCalled();

      mockPlatform.isDesktop = true;
    });
  });
});
