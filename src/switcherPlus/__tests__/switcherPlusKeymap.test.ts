import { Chance } from 'chance';
import { SwitcherPlusSettings } from 'src/settings';
import { CustomKeymapInfo, SwitcherPlusKeymap } from 'src/switcherPlus';
import { generateMarkdownLink, getSystemGlobalSearchInstance } from 'src/utils';
import { CommandHandler, Handler } from 'src/Handlers';
import {
  MockProxy,
  anyFunction,
  mock,
  mockClear,
  mockFn,
  mockReset,
} from 'jest-mock-extended';
import {
  App,
  Chooser,
  KeymapContext,
  KeymapEventHandler,
  KeymapEventListener,
  MarkdownView,
  Modifier,
  Scope,
  View,
  Workspace,
  WorkspaceLeaf,
  TFile,
  Editor,
  HotkeysSettingTab,
  CommandPalettePluginInstance,
  renderResults,
  Platform,
  InternalPlugins,
  GlobalSearchPluginInstance,
} from 'obsidian';
import {
  AnySuggestion,
  KeymapConfig,
  Mode,
  SwitcherPlus,
  Facet,
  FacetSettingsData,
  InsertLinkConfig,
  CommandSuggestion,
  SuggestionType,
  SymbolType,
  QuickOpenConfig,
  FileSuggestion,
  ModeDispatcher,
  HeadingSuggestion,
  OpenInBackgroundConfig,
} from 'src/types';
import {
  makeFileSuggestion,
  makeHeading,
  makeHeadingSuggestion,
  makeSymbolSuggestion,
} from '@fixtures';

jest.mock('src/utils', () => {
  return {
    __esModule: true,
    ...jest.requireActual<typeof import('src/utils')>('src/utils'),
    generateMarkdownLink: jest.fn(),
    getSystemGlobalSearchInstance: jest.fn(),
  };
});

const chance = new Chance();

describe('SwitcherPlusKeymap', () => {
  const selector = '.prompt-instructions';
  const mockScope = mock<Scope>({ keys: [] });
  const mockChooser = mock<Chooser<AnySuggestion>>();
  const mockWorkspace = mock<Workspace>();
  const config = new SwitcherPlusSettings(null);
  const mockConfig = mock<SwitcherPlusSettings>({ closeWhenEmptyKeys: [] });

  // The .prompt-instruction wrapper element
  const mockInstructionEl = mock<HTMLDivElement>();
  const createInstructionElFn =
    mockFn<typeof createDiv>().mockReturnValue(mockInstructionEl);

  // The .prompt-instructions container element
  const mockInstructionsContainerEl = mock<HTMLDivElement>({
    createDiv: () => createInstructionElFn(),
  });

  const createInstructionsContainerElFn = mockFn<typeof createDiv>().mockImplementation(
    () => mockInstructionsContainerEl,
  );

  const mockModalEl = mock<HTMLElement>({
    createDiv: () => createInstructionsContainerElFn(),
  });

  const mockExMode = mock<ModeDispatcher>();
  const mockModal = mock<SwitcherPlus>({ modalEl: mockModalEl, exMode: mockExMode });

  const mockApp = mock<App>({
    workspace: mockWorkspace,
    internalPlugins: mock<InternalPlugins>(),
  });

  describe('Platform specific properties', () => {
    let mockPlatform: MockProxy<typeof Platform>;

    beforeAll(() => {
      mockPlatform = jest.mocked<typeof Platform>(Platform);
    });

    afterAll(() => {
      mockReset(mockPlatform);
    });

    test('.modKey property should return "Meta" for MacOS Platform', () => {
      mockPlatform.isMacOS = true;
      expect(SwitcherPlusKeymap.modKey).toBe('Meta');
    });

    test('.modKey property should return "Ctrl" for non-MacOS Platform', () => {
      mockPlatform.isMacOS = false;
      expect(SwitcherPlusKeymap.modKey).toBe('Ctrl');
    });

    test('.keyDisplayStr property should return MacOS specific modifier display strings', () => {
      mockPlatform.isMacOS = true;
      expect(SwitcherPlusKeymap.keyDisplayStr['Mod']).toBe('⌘');
    });

    test('keyDisplayStr property should return non-MacOs modifier display strings on other platforms', () => {
      mockPlatform.isMacOS = false;
      expect(SwitcherPlusKeymap.keyDisplayStr['Mod']).toBe('Ctrl');
    });
  });

  it('should remove the builtin Tab hotkey binding', () => {
    mockConfig.removeDefaultTabBinding = true;

    const mockKeymap = mock<KeymapEventHandler>({ modifiers: null, key: 'Tab' });
    mockScope.keys.push(mockKeymap);

    new SwitcherPlusKeymap(mockApp, mockScope, mockChooser, mockModal, mockConfig);

    expect(mockScope.unregister).toHaveBeenCalledWith(mockKeymap);
  });

  describe('isOpen property', () => {
    let sut: SwitcherPlusKeymap;

    beforeAll(() => {
      sut = new SwitcherPlusKeymap(
        mockApp,
        mockScope,
        mockChooser,
        mockModal,
        mockConfig,
      );
    });

    it('should save the value provided for isOpen', () => {
      sut.isOpen = true;
      const result = sut.isOpen;
      expect(result).toBe(true);
    });
  });

  describe('registerNavigationBindings', () => {
    const config = new SwitcherPlusSettings(null);
    const navKeys = [
      ['n', 'p'],
      ['j', 'k'],
    ];

    beforeEach(() => {
      mockReset(mockScope);
      mockReset(mockChooser);
    });

    it.each(navKeys)(
      'should register Next/Previous navigation keys: ctrl-%s/%s',
      (nextKey, previousKey) => {
        new SwitcherPlusKeymap(mockApp, mockScope, mockChooser, mockModal, config);

        expect(mockScope.register).toHaveBeenCalledWith(
          expect.arrayContaining(['Ctrl']),
          nextKey,
          expect.any(Function),
        );

        expect(mockScope.register).toHaveBeenCalledWith(
          expect.arrayContaining(['Ctrl']),
          previousKey,
          expect.any(Function),
        );
      },
    );

    it.each(navKeys)(
      'when Open, it should change the selected item with Next/Previous navigation keys: ctrl-%s/%s',
      (nextKey, previousKey) => {
        const selectedIndex = 1;
        const evtHandlers: Record<string, KeymapEventListener> = {};
        const mockKeyboardEvent = mock<KeyboardEvent>();

        mockScope.register.mockImplementation((_m, key, func) => {
          evtHandlers[key] = func;
          return null;
        });

        mockChooser.selectedItem = selectedIndex;

        const sut = new SwitcherPlusKeymap(
          mockApp,
          mockScope,
          mockChooser,
          mockModal,
          config,
        );
        sut.isOpen = true; // here

        evtHandlers[nextKey](mockKeyboardEvent, mock<KeymapContext>({ key: nextKey }));

        evtHandlers[previousKey](
          mockKeyboardEvent,
          mock<KeymapContext>({ key: previousKey }),
        );

        expect(mockChooser.setSelectedItem).toHaveBeenCalledWith(
          selectedIndex + 1,
          mockKeyboardEvent,
        );
        expect(mockChooser.setSelectedItem).toHaveBeenCalledWith(
          selectedIndex - 1,
          mockKeyboardEvent,
        );
      },
    );

    it.each(navKeys)(
      'when Closed, it should not change the selected item with Next/Previous navigation keys: ctrl-%s/%s',
      (nextKey, previousKey) => {
        const selectedIndex = 1;
        const evtHandlers: Record<string, KeymapEventListener> = {};

        mockScope.register.mockImplementation((_m, key, func) => {
          evtHandlers[key] = func;
          return null;
        });

        mockChooser.selectedItem = selectedIndex;

        const sut = new SwitcherPlusKeymap(
          mockApp,
          mockScope,
          mockChooser,
          mockModal,
          config,
        );
        sut.isOpen = false; // here

        evtHandlers[nextKey](
          mock<KeyboardEvent>(),
          mock<KeymapContext>({ key: nextKey }),
        );
        evtHandlers[previousKey](
          mock<KeyboardEvent>(),
          mock<KeymapContext>({ key: previousKey }),
        );

        expect(mockChooser.setSelectedItem).not.toHaveBeenCalled();
      },
    );
  });

  describe('registerEditorTabBindings', () => {
    beforeEach(() => {
      mockReset(mockScope);
    });

    it('should register Tab creation keys', () => {
      const { modKey } = SwitcherPlusKeymap;
      const keys: [Modifier[], string][] = [
        [[modKey], '\\'],
        [[modKey, 'Shift'], '\\'],
        [[modKey], 'o'],
      ];

      new SwitcherPlusKeymap(mockApp, mockScope, mockChooser, mockModal, mockConfig);

      // convert to [][] so each call can be checked separately
      const expected = keys.map(([modifiers, key]) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return [modifiers, key, expect.any(Function)];
      });

      expect(mockScope.register.mock.calls).toEqual(expect.arrayContaining(expected));
    });
  });

  describe('Launching fulltext search', () => {
    let sut: SwitcherPlusKeymap;
    let mockGlobalSearchPluginInstance: MockProxy<GlobalSearchPluginInstance>;

    const mockGetGlobalSearchPlugin = jest.mocked<typeof getSystemGlobalSearchInstance>(
      getSystemGlobalSearchInstance,
    );

    beforeAll(() => {
      sut = new SwitcherPlusKeymap(mockApp, mockScope, mockChooser, mockModal, config);

      mockGlobalSearchPluginInstance = mock<GlobalSearchPluginInstance>();
      mockGetGlobalSearchPlugin.mockReturnValue(mockGlobalSearchPluginInstance);
    });

    it('should register the hotkey to trigger fulltext search', () => {
      mockReset(mockScope);

      sut.registerFulltextSearchBindings(mockScope, config);

      const { searchKeys } = config.fulltextSearch;
      expect(mockScope.register).toHaveBeenCalledWith(
        expect.arrayContaining(searchKeys.modifiers),
        searchKeys.key,
        expect.any(Function),
      );
    });

    it('should trigger the system global search with the input text', () => {
      const parsedInput = chance.word();
      mockExMode.inputTextForFulltextSearch.mockReturnValueOnce({
        mode: Mode.Standard,
        parsedInput,
      });

      sut.LaunchSystemGlobalSearch(null, null);

      expect(mockGlobalSearchPluginInstance.openGlobalSearch).toHaveBeenCalledWith(
        parsedInput,
      );
    });

    it('should trigger the system global search with input text and a file path operator when an associated sourced mode file is available', () => {
      const file = new TFile();
      const parsedInput = chance.word();
      mockExMode.inputTextForFulltextSearch.mockReturnValueOnce({
        mode: Mode.SymbolList,
        parsedInput,
        file,
      });

      sut.LaunchSystemGlobalSearch(null, null);

      const expectedText = `path:"${file.path}" ${parsedInput}`;
      expect(mockGlobalSearchPluginInstance.openGlobalSearch).toHaveBeenCalledWith(
        expectedText,
      );
    });
  });

  describe('registerCloseWhenEmptyBindings', () => {
    const config = new SwitcherPlusSettings(null);

    beforeEach(() => {
      mockReset(mockScope);
    });

    it('should register backspace key to close the modal', () => {
      new SwitcherPlusKeymap(mockApp, mockScope, mockChooser, mockModal, config);

      expect(mockScope.register).toHaveBeenCalledWith(
        null,
        'Backspace',
        expect.any(Function),
      );
    });

    test('with shouldCloseModalOnBackspace enabled it should close the modal when the search box is empty', () => {
      config.shouldCloseModalOnBackspace = true;
      const emptyModal = mock<SwitcherPlus>({
        modalEl: mockModalEl,
        inputEl: mock<HTMLInputElement>({ value: '' }),
      });

      const sut = new SwitcherPlusKeymap(
        mockApp,
        mockScope,
        mockChooser,
        emptyModal,
        config,
      );

      sut.closeModalIfEmpty(mock<KeyboardEvent>(), null);

      expect(emptyModal.close).toHaveBeenCalled();

      mockConfig.shouldCloseModalOnBackspace = false;
    });

    test('with shouldCloseModalOnBackspace enabled it should not close the modal when the search box has text', () => {
      config.shouldCloseModalOnBackspace = true;
      const emptyModal = mock<SwitcherPlus>({
        modalEl: mockModalEl,
        inputEl: mock<HTMLInputElement>({ value: chance.word() }),
      });

      const sut = new SwitcherPlusKeymap(
        mockApp,
        mockScope,
        mockChooser,
        emptyModal,
        config,
      );

      sut.closeModalIfEmpty(mock<KeyboardEvent>(), null);

      expect(emptyModal.close).not.toHaveBeenCalled();

      mockConfig.shouldCloseModalOnBackspace = false;
    });
  });

  describe('updateInsertIntoEditorCommand', () => {
    let sut: SwitcherPlusKeymap;
    let customKeysInfo: CustomKeymapInfo[];
    const mode = Mode.Standard;
    const insertableViewType = 'supportedViewType';
    const mockInsertConfig = mock<InsertLinkConfig>();
    const mockEditor = mock<WorkspaceLeaf>({
      view: mock<View>(),
    });

    beforeAll(() => {
      sut = new SwitcherPlusKeymap(
        mockApp,
        mockScope,
        mockChooser,
        mockModal,
        mockConfig,
      );
    });

    afterEach(() => {
      mockReset(mockEditor);
      mockReset(mockInsertConfig);
      mockReset(mockModal);

      mockInsertConfig.isEnabled = true;
      mockInsertConfig.insertableEditorTypes = [insertableViewType];

      (mockEditor.view as MockProxy<View>).getViewType.mockReturnValue(
        insertableViewType,
      );
    });

    test('with isEnabled set to false, it should return null', () => {
      customKeysInfo = [];
      mockInsertConfig.isEnabled = false;

      const result = sut.updateInsertIntoEditorCommand(
        mode,
        mockEditor,
        customKeysInfo,
        mockInsertConfig,
      );

      expect(customKeysInfo).toHaveLength(0);
      expect(result).toBeNull();
    });

    test('when the active editor type is excluded, it should return null', () => {
      // exclude supportedViewType from the allowed view types
      mockInsertConfig.insertableEditorTypes = [];
      customKeysInfo = [];

      const result = sut.updateInsertIntoEditorCommand(
        mode,
        mockEditor,
        customKeysInfo,
        mockInsertConfig,
      );

      expect(customKeysInfo).toHaveLength(0);
      expect(result).toBeNull();
    });

    it("should create a keymap if it doesn't exist", () => {
      customKeysInfo = [];
      const { keymap } = mockInsertConfig;
      keymap.key = 'x';
      keymap.modifiers = ['Alt', 'Ctrl'];
      keymap.purpose = chance.word();

      const result = sut.updateInsertIntoEditorCommand(
        mode,
        mockEditor,
        customKeysInfo,
        mockInsertConfig,
      );

      expect(customKeysInfo).toHaveLength(1);
      expect(customKeysInfo[0]).toBe(result);
      expect(result.key).toBe(keymap.key);
      expect(result.purpose).toBe(keymap.purpose);
      expect(result.isInstructionOnly).toBeFalsy();
      expect(result.modifiers).toBe(keymap.modifiers);
    });

    test('when the keymap already exists, it should update the keymap handler function', () => {
      customKeysInfo = [
        {
          isInstructionOnly: false,
          modes: [Mode.HeadingsList],
          eventListener: null,
          command: null,
          modifiers: null,
          key: null,
          purpose: null,
        },
      ];

      const result = sut.updateInsertIntoEditorCommand(
        mode,
        mockEditor,
        customKeysInfo,
        mockInsertConfig,
      );

      expect(result.eventListener).not.toBeNull();
      expect(result.modes[0]).toBe(Mode.Standard);
    });

    test('the keymap handler should close the modal when executed', () => {
      customKeysInfo = [];

      const insertSpy = jest.spyOn(sut, 'insertIntoEditorAsLink').mockReturnValueOnce();

      const result = sut.updateInsertIntoEditorCommand(
        mode,
        mockEditor,
        customKeysInfo,
        mockInsertConfig,
      );

      // simulate the keymap being triggered
      result.eventListener(mock<KeyboardEvent>(), mock<KeymapContext>());

      expect(mockModal.close).toHaveBeenCalled();
      expect(insertSpy).toHaveBeenCalled();

      insertSpy.mockRestore();
    });

    test('the keymap handler should insert a link into the editor', () => {
      const linkText = chance.word();
      customKeysInfo = [];

      const mockView = mock<MarkdownView>({ editor: mock<Editor>() });
      mockView.leaf = mockEditor;
      mockView.file = new TFile();

      mockWorkspace.getActiveViewOfType.mockReturnValueOnce(mockView);
      jest.mocked(generateMarkdownLink).mockReturnValueOnce(linkText);

      const result = sut.updateInsertIntoEditorCommand(
        mode,
        mockEditor,
        customKeysInfo,
        mockInsertConfig,
      );

      // simulate the keymap being triggered
      result.eventListener(mock<KeyboardEvent>(), mock<KeymapContext>());

      expect(mockView.editor.replaceSelection).toHaveBeenCalledWith(linkText);
    });
  });

  describe('registerKeys', () => {
    beforeEach(() => {
      mockReset(mockScope);
    });

    it('should register each keymap', () => {
      const key = 'x';
      const eventListener = () => false;
      const command = chance.word();
      const purpose = chance.word();

      const sut = new SwitcherPlusKeymap(
        mockApp,
        mockScope,
        mockChooser,
        mockModal,
        mockConfig,
      );

      const modifiers: Modifier[] = ['Alt', 'Mod'];
      const keymaps = [{ modifiers, key, eventListener, command, purpose }];

      sut.registerKeys(mockScope, keymaps);

      expect(mockScope.register).toHaveBeenCalledWith(modifiers, key, eventListener);
    });
  });

  describe('updateKeymapForMode', () => {
    let sut: SwitcherPlusKeymap;
    const mockInstructionsEl = mock<HTMLElement>();

    const mockShiftEnter = mock<KeymapEventHandler>({
      modifiers: 'Shift',
      key: 'Enter',
    });

    const mockMetaShiftEnter = mock<KeymapEventHandler>({
      modifiers: 'Meta,Shift',
      key: 'Enter',
    });

    beforeAll(() => {
      mockModalEl.querySelector.calledWith(selector).mockReturnValue(mockInstructionsEl);
    });

    beforeEach(() => {
      // use a new one for each test since it's stateful
      // Note: the new instance should be created before clearing the other objects
      // because it's constructor makes calls to scope.register()
      sut = new SwitcherPlusKeymap(
        mockApp,
        mockScope,
        mockChooser,
        mockModal,
        mockConfig,
      );

      mockReset(mockInstructionsEl);
      mockReset(mockScope);
      mockScope.keys = [];

      mockClear(mockModalEl);
      mockClear(mockModal);
      mockClear(mockInstructionsContainerEl);
      mockClear(mockInstructionEl);
      mockClear(createInstructionElFn);
      mockClear(createInstructionsContainerElFn);
    });

    it('should hide the default prompt instructions in custom modes', () => {
      sut.updateKeymapForMode({ mode: Mode.EditorList });

      expect(mockInstructionsEl.style.display).toBe('none');
    });

    it('should show the default prompt instructions in standard modes', () => {
      sut.updateKeymapForMode({ mode: Mode.Standard });

      expect(mockInstructionsEl.style.display).toBe('');
    });

    it('should show custom prompt instructions in custom modes', () => {
      const mode = Mode.EditorList;

      sut.updateKeymapForMode({ mode });

      expect(mockModalEl.appendChild).toHaveBeenCalledWith(mockInstructionsContainerEl);
    });

    it('should not remove Enter hotkey without shift/meta modifier', () => {
      const mockEnter = mock<KeymapEventHandler>({
        key: 'Enter',
      });

      mockScope.keys = [mockEnter];

      sut.updateKeymapForMode({ mode: Mode.EditorList });

      expect(mockScope.unregister).not.toHaveBeenCalled();
    });

    it('should restore standard keymaps in standard mode', () => {
      mockScope.keys = [mockMetaShiftEnter, mockShiftEnter];

      // should first update for a custom mode
      sut.updateKeymapForMode({ mode: Mode.HeadingsList });
      mockScope.register.mockReset();

      // should restore all standard hotkeys
      sut.updateKeymapForMode({ mode: Mode.Standard });

      // convert to [][] so each call can be checked separately
      const expected = sut.standardKeysInfo.map((v) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return [v.modifiers, v.key, expect.any(Function)];
      });

      expect(mockScope.register.mock.calls).toEqual(expected);
    });

    it('should register custom keymaps in custom modes', () => {
      const mode = Mode.BookmarksList;
      const customKeymaps = sut.customKeysInfo.filter(
        (v) => v.modes?.includes(mode) && !v.isInstructionOnly,
      );

      const unregisterKeysSpy = jest.spyOn(sut, 'unregisterKeys').mockReturnValue([]);

      sut.updateKeymapForMode({ mode });

      // convert to [][] so each call can be checked separately
      const expected = customKeymaps.map((v) => {
        return [v.modifiers, v.key, v.eventListener];
      });

      expect(mockScope.register.mock.calls).toEqual(expected);
      expect(unregisterKeysSpy).toHaveBeenCalled();

      unregisterKeysSpy.mockRestore();
    });

    it('should unregister keys that are found to be registered', () => {
      mockScope.keys = [mockShiftEnter];

      const keymap: CustomKeymapInfo = {
        modifiers: ['Shift'],
        key: 'Enter',
        command: null,
        purpose: null,
      };

      const removed = sut.unregisterKeys(mockScope, [keymap]);

      expect(mockScope.unregister).toHaveBeenCalledWith(mockShiftEnter);
      expect(removed[0][1]).toEqual(mockShiftEnter);
    });

    test('.updateKeymapForStandardMode() should register standard keys that were unregistered', () => {
      const mockKeymap = mock<CustomKeymapInfo>({
        modifiers: ['Alt'],
        key: chance.letter(),
      });

      const mockEvenHandler = mock<KeymapEventHandler>({
        func: () => null,
      });

      mockScope.register.mockReset();
      sut.updateKeymapForStandardMode(mockScope, [], [[mockKeymap, mockEvenHandler]]);

      expect(mockScope.register).toHaveBeenCalledWith(
        mockKeymap.modifiers,
        mockKeymap.key,
        mockEvenHandler.func,
      );
    });

    test('updateKeymapForCustomModes() should unregister standard keys', () => {
      const mockModEnter = mock<KeymapEventHandler>({
        modifiers: SwitcherPlusKeymap.modKey,
        key: 'Enter',
      });

      mockScope.keys = [mockModEnter];
      const mockKeymap = mock<CustomKeymapInfo>({
        modifiers: ['Mod'],
        key: 'Enter',
      });

      sut.updateKeymapForCustomModes(
        mockScope,
        [],
        [mockKeymap],
        mock<KeymapConfig>(),
        mockModal,
      );

      expect(mockScope.unregister).toHaveBeenCalledWith(mockModEnter);
      expect(sut.savedStandardKeysInfo[0][0]).toBe(mockKeymap);
      expect(sut.savedStandardKeysInfo[0][1]).toBe(mockModEnter);
    });
  });

  describe('useSelectedItem', () => {
    it('should forward the keyboard event to the modal chooser', () => {
      const mockEvt = mock<KeyboardEvent>();
      const sut = new SwitcherPlusKeymap(
        mockApp,
        mockScope,
        mockChooser,
        mockModal,
        mockConfig,
      );

      sut.useSelectedItem(mockEvt, null);

      expect(mockChooser.useSelectedItem).toHaveBeenCalledWith(mockEvt);
    });
  });

  describe('registerFacetBinding', () => {
    let sut: SwitcherPlusKeymap;

    beforeAll(() => {
      sut = new SwitcherPlusKeymap(
        mockApp,
        mockScope,
        mockChooser,
        mockModal,
        mockConfig,
      );
    });

    beforeEach(() => {
      mockClear(mockScope);
    });

    test('should register a facet binding using default shortcut keys', () => {
      const key = chance.letter();
      const modifiers = chance.pickset<Modifier>(['Alt', 'Ctrl', 'Shift', 'Meta'], 3);
      const facet = mock<Facet>({
        modifiers: undefined,
        key: null,
      });
      const mockKeymapConfig = mock<KeymapConfig>({
        facets: {
          facetList: [facet],
          facetSettings: {
            modifiers,
            keyList: [key],
          },
        },
      });

      sut.registerFacetBinding(mockScope, mockKeymapConfig);

      expect(mockScope.register).toHaveBeenCalledWith(
        modifiers,
        key,
        expect.any(Function),
      );
    });

    test('should register a facet binding using custom shortcut keys', () => {
      const facet = mock<Facet>({
        modifiers: [chance.pickone<Modifier>(['Alt', 'Ctrl', 'Shift'])],
        key: chance.letter(),
      });
      const mockKeymapConfig = mock<KeymapConfig>({
        facets: {
          facetList: [facet],
        },
      });

      sut.registerFacetBinding(mockScope, mockKeymapConfig);

      expect(mockScope.register).toHaveBeenCalledWith(
        facet.modifiers,
        facet.key,
        expect.any(Function),
      );
    });

    test('should log error to the console when the list of default shortcut keys is used up', () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockReturnValueOnce();
      const facet = mock<Facet>({
        modifiers: null,
        key: null,
      });
      const mockKeymapConfig = mock<KeymapConfig>({
        facets: {
          facetList: [facet],
          facetSettings: {
            keyList: [],
          },
        },
      });

      sut.registerFacetBinding(mockScope, mockKeymapConfig);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Switcher++: unable to register hotkey for facet:'),
      );

      consoleLogSpy.mockRestore();
    });

    test('should toggle all facets using resetModifiers shortcut key', () => {
      const resetKey = chance.letter();
      const mockKeymapConfig = mock<KeymapConfig>({
        facets: {
          facetList: [mock<Facet>()],
          facetSettings: {
            resetKey,
            keyList: [chance.letter()],
            resetModifiers: chance.pickset<Modifier>(['Alt', 'Ctrl', 'Shift'], 2),
          },
          onToggleFacet: mockFn(),
        },
      });
      const { resetModifiers } = mockKeymapConfig.facets.facetSettings;

      let keymapFn: KeymapEventListener;
      mockScope.register
        .calledWith(resetModifiers, resetKey, anyFunction())
        .mockImplementationOnce((_m, _k, evtListener) => {
          keymapFn = evtListener;
          return null;
        });

      // perform registration
      sut.registerFacetBinding(mockScope, mockKeymapConfig);

      //execute callback
      keymapFn(null, null);

      expect(mockScope.register).toHaveBeenCalledWith(
        resetModifiers,
        resetKey,
        expect.any(Function),
      );

      expect(mockKeymapConfig.facets.onToggleFacet).toHaveBeenCalledWith(
        mockKeymapConfig.facets.facetList,
        true,
      );
    });

    test('should register the toggle all shortcut key using modifiers if resetModifiers is falsy', () => {
      const resetKey = chance.letter();
      const modifiers = chance.pickset<Modifier>(['Alt', 'Ctrl', 'Shift'], 2);
      const mockKeymapConfig = mock<KeymapConfig>({
        facets: {
          facetList: [mock<Facet>()],
          facetSettings: {
            resetKey,
            modifiers,
            resetModifiers: null,
            keyList: [chance.letter()],
          },
        },
      });

      sut.registerFacetBinding(mockScope, mockKeymapConfig);

      expect(mockScope.register).toHaveBeenCalledWith(
        modifiers,
        resetKey,
        expect.any(Function),
      );
    });
  });

  describe('renderFacetInstructions', () => {
    let sut: SwitcherPlusKeymap;
    let mockPlatform: MockProxy<typeof Platform>;

    beforeAll(() => {
      sut = new SwitcherPlusKeymap(
        mockApp,
        mockScope,
        mockChooser,
        mockModal,
        mockConfig,
      );

      mockPlatform = jest.mocked<typeof Platform>(Platform);
      mockPlatform.isMacOS = true;
    });

    beforeEach(() => {
      mockClear(mockModalEl);
      mockClear(mockModal);
      mockClear(mockInstructionsContainerEl);
      mockClear(mockInstructionEl);
      mockClear(createInstructionElFn);
      mockClear(createInstructionsContainerElFn);
    });

    afterAll(() => {
      mockReset(mockModal);
      mockReset(mockPlatform);
    });

    it('should render a facet indicator using default modifiers', () => {
      const key = chance.letter();
      const modifiers = chance.pickset<Modifier>(['Alt', 'Ctrl', 'Shift', 'Meta'], 3);

      const facetSettings = mock<FacetSettingsData>({
        modifiers,
        keyList: [key],
      });

      const facetKeyInfo = mock<CustomKeymapInfo & { facet: Facet }>({
        command: key,
        facet: mock<Facet>({
          modifiers: undefined,
          isActive: false,
        }),
      });

      sut.renderFacetInstructions(mockModal.modalEl, facetSettings, [facetKeyInfo]);

      expect(mockInstructionEl.createSpan).toHaveBeenCalledWith(
        expect.objectContaining({
          cls: ['prompt-instruction-command'],
          text: key,
        }),
      );
    });

    it('should render a facet indicator using custom modifiers', () => {
      const key = chance.letter();
      const modifiers: Modifier[] = ['Ctrl'];

      const facetSettings = mock<FacetSettingsData>({
        keyList: [key],
        modifiers: [],
      });

      const facetKeyInfo = mock<CustomKeymapInfo & { facet: Facet }>({
        command: key,
        facet: mock<Facet>({
          modifiers,
          isActive: false,
        }),
      });

      sut.renderFacetInstructions(mockModal.modalEl, facetSettings, [facetKeyInfo]);

      expect(mockInstructionEl.createSpan).toHaveBeenCalledWith(
        expect.objectContaining({
          cls: ['prompt-instruction-command'],
          text: `(⌃) ${key}`,
        }),
      );
    });

    it('should add an additional css class to indicate a facet is active', () => {
      const key = chance.letter();
      const modifiers = chance.pickset<Modifier>(['Alt', 'Ctrl'], 1);

      const facetSettings = mock<FacetSettingsData>({
        modifiers,
        keyList: [key],
      });

      const facetKeyInfo = mock<CustomKeymapInfo & { facet: Facet }>({
        command: key,
        purpose: chance.sentence(),
        facet: mock<Facet>({
          modifiers: undefined,
          isActive: true,
        }),
      });

      sut.renderFacetInstructions(mockModal.modalEl, facetSettings, [facetKeyInfo]);

      expect(mockInstructionEl.createSpan).toHaveBeenCalledWith(
        expect.objectContaining({
          cls: ['qsp-filter-active'],
          text: facetKeyInfo.purpose,
        }),
      );
    });

    it('should render the reset toggle indicator', () => {
      const key = chance.letter();
      const resetModifiers: Modifier[] = ['Ctrl'];

      const facetSettings = mock<FacetSettingsData>({
        resetKey: key,
        resetModifiers,
        modifiers: [],
      });

      const facetKeyInfo = mock<CustomKeymapInfo & { facet: Facet }>({
        facet: null,
      });

      sut.renderFacetInstructions(mockModal.modalEl, facetSettings, [facetKeyInfo]);

      expect(mockInstructionEl.createSpan).toHaveBeenCalledWith(
        expect.objectContaining({
          cls: ['prompt-instruction-command'],
          text: `(⌃) ${key}`,
        }),
      );
    });
  });

  describe('renderCustomInstructions', () => {
    let sut: SwitcherPlusKeymap;

    beforeAll(() => {
      sut = new SwitcherPlusKeymap(
        mockApp,
        mockScope,
        mockChooser,
        mockModal,
        mockConfig,
      );
    });

    beforeEach(() => {
      mockClear(mockModalEl);
      mockClear(mockModal);
      mockClear(mockInstructionsContainerEl);
      mockClear(mockInstructionEl);
      mockClear(createInstructionElFn);
      mockClear(createInstructionsContainerElFn);
    });

    afterAll(() => {
      mockReset(mockModal);
    });

    it('should render custom instructions element', () => {
      const mockInstructionEl = mock<HTMLDivElement>();
      const mockInstructionContainerEl = mock<HTMLDivElement>({
        createDiv: () => mockInstructionEl,
      });

      const mockParentEl = mock<HTMLDivElement>({
        createDiv: () => mockInstructionContainerEl,
      });

      const mockKeymap = mock<CustomKeymapInfo>({
        command: chance.word(),
        purpose: chance.word(),
      });

      sut.renderCustomInstructions(mockParentEl, [mockKeymap]);

      expect(mockParentEl.appendChild).toHaveBeenCalledWith(mockInstructionContainerEl);
      expect(mockInstructionEl.createSpan).toHaveBeenCalledWith(
        expect.objectContaining({
          cls: ['prompt-instruction-command'],
          text: mockKeymap.command,
        }),
      );

      expect(mockInstructionEl.createSpan).toHaveBeenCalledWith(
        expect.objectContaining({
          text: mockKeymap.purpose,
        }),
      );
    });
  });

  describe('Rendering mode trigger prompt instructions', () => {
    let sut: SwitcherPlusKeymap;

    beforeAll(() => {
      sut = new SwitcherPlusKeymap(
        mockApp,
        mockScope,
        mockChooser,
        mockModal,
        mockConfig,
      );
    });

    test('.showModeTriggerInstructions() should attach instruction element to DOM', () => {
      const isEnabled = true;
      const mockParentEl = mock<HTMLElement>();

      sut.showModeTriggerInstructions(mockParentEl, isEnabled);

      expect(mockParentEl.appendChild).toHaveBeenCalled();
    });
  });

  describe('createPromptInstructionCommandEl', () => {
    let sut: SwitcherPlusKeymap;
    let mockParentEl: MockProxy<HTMLElement>;
    let mockInstructionsEl: MockProxy<HTMLDivElement>;

    beforeAll(() => {
      sut = new SwitcherPlusKeymap(
        mockApp,
        mockScope,
        mockChooser,
        mockModal,
        mockConfig,
      );

      mockInstructionsEl = mock<HTMLDivElement>();
      mockParentEl = mock<HTMLElement>({
        createDiv: () => mockInstructionsEl,
      });
    });

    beforeEach(() => {
      mockClear(mockParentEl);
      mockClear(mockInstructionsEl);
    });

    it('should create command element with custom css class', () => {
      const command = chance.word();
      const cls = chance.word();

      const result = sut.createPromptInstructionCommandEl(mockParentEl, command, null, [
        cls,
      ]);

      expect(result).toBe(mockInstructionsEl);
      expect(mockInstructionsEl.createSpan).toHaveBeenCalledWith(
        expect.objectContaining({
          cls: ['prompt-instruction-command', cls],
          text: command,
        }),
      );
    });

    it('should create command element with purpose hint text and custom css class', () => {
      const command = chance.word();
      const purpose = chance.word();
      const cls = chance.word();

      const result = sut.createPromptInstructionCommandEl(
        mockParentEl,
        command,
        purpose,
        null,
        [cls],
      );

      expect(result).toBe(mockInstructionsEl);
      expect(mockInstructionsEl.createSpan).toHaveBeenCalledWith(
        expect.objectContaining({
          cls: [cls],
          text: purpose,
        }),
      );
    });
  });

  describe('Launching the hotkey selection dialog for Commands', () => {
    const commandId = 'testCommandId';
    let sut: SwitcherPlusKeymap;
    let mockCommandSugg: MockProxy<CommandSuggestion>;
    let mockSetting: MockProxy<App['setting']>;
    let mockHotkeySettingTab: MockProxy<HotkeysSettingTab>;

    beforeAll(() => {
      mockHotkeySettingTab = mock<HotkeysSettingTab>();

      mockCommandSugg = mock<CommandSuggestion>({
        type: SuggestionType.CommandList,
        item: { id: commandId },
      });

      mockSetting = mock<App['setting']>();
      mockApp.setting = mockSetting;

      const mockChooserLocal = mock<Chooser<CommandSuggestion>>({
        values: [mockCommandSugg],
        selectedItem: 0,
      });

      sut = new SwitcherPlusKeymap(
        mockApp,
        mockScope,
        mockChooserLocal,
        mockModal,
        mockConfig,
      );
    });

    afterEach(() => {
      mockClear(mockSetting);
      mockClear(mockHotkeySettingTab);
    });

    afterAll(() => {
      mockApp.setting = null;
    });

    it('should return false to prevent default', () => {
      const result = sut.navigateToCommandHotkeySelector(null, null);

      expect(result).toBe(false);
    });

    test('When there is an active selected command, it should open the builtin hotkey settings tab for assigning a hotkey', () => {
      mockSetting.openTabById.mockReturnValueOnce(mockHotkeySettingTab);

      sut.navigateToCommandHotkeySelector(null, null);

      expect(mockSetting.open).toHaveBeenCalled();
      expect(mockSetting.openTabById).toHaveBeenCalledWith('hotkeys');
    });

    it('should trigger a query using the Id of the selected command', () => {
      mockSetting.openTabById.mockReturnValueOnce(mockHotkeySettingTab);

      sut.navigateToCommandHotkeySelector(null, null);

      expect(mockHotkeySettingTab.setQuery).toHaveBeenCalledWith(commandId);
    });
  });

  describe('QuickOpen Hotkeys', () => {
    let sut: SwitcherPlusKeymap;
    let mockChooserLocal: MockProxy<Chooser<CommandSuggestion>>;
    let mockQuickOpenConfig: QuickOpenConfig;

    beforeAll(() => {
      mockChooserLocal = mock<Chooser<CommandSuggestion>>();
      mockQuickOpenConfig = mock<QuickOpenConfig>({
        isEnabled: true,
        modifiers: ['Alt'],
        keyList: ['1'],
      });

      sut = new SwitcherPlusKeymap(
        mockApp,
        mockScope,
        mockChooserLocal,
        mockModal,
        mockConfig,
      );

      mockConfig.quickOpen = mockQuickOpenConfig;
      mockReset(mockScope);
    });

    afterAll(() => {
      mockReset(mockConfig.quickOpen);
    });

    afterEach(() => {
      mockReset(mockScope);
    });

    it('should register the Quick Open hotkeys', () => {
      sut.registerQuickOpenBindings(mockScope, mockConfig);

      expect(mockScope.register).toHaveBeenCalledWith(
        mockQuickOpenConfig.modifiers,
        mockQuickOpenConfig.keyList[0],
        expect.any(Function),
      );
    });

    test('.quickOpenByIndex() should return false to prevent default', () => {
      const result = sut.quickOpenByIndex(null, mock<KeymapContext>());
      expect(result).toBe(false);
    });

    test('.quickOpenByIndex() should open the item at the index number associated with the key pressed', () => {
      const mockEvt = mock<KeyboardEvent>();
      mockChooserLocal.values = [mock<CommandSuggestion>()];

      // Use the same key from the config keyList
      const vkey = mockQuickOpenConfig.keyList[0];
      const mockCtx = mock<KeymapContext>({ vkey });

      sut.quickOpenByIndex(mockEvt, mockCtx);

      expect(mockChooserLocal.setSelectedItem).toHaveBeenCalledWith(0, mockEvt);
      expect(mockChooserLocal.useSelectedItem).toHaveBeenCalledWith(mockEvt);
    });

    test('.renderQuickOpenFlairIcons() should add flair icons to existing suggestion div elements', () => {
      const mockFlairContainer = mock<HTMLDivElement>();

      const mockSuggEl = mock<HTMLDivElement>();
      mockSuggEl.createDiv.mockReturnValueOnce(mockFlairContainer);

      sut.renderQuickOpenFlairIcons([mockSuggEl], mockConfig);

      expect(mockFlairContainer.createEl).toHaveBeenCalledWith(
        'kbd',
        expect.objectContaining({
          cls: ['suggestion-hotkey', 'qsp-quick-open-hotkey'],
        }),
      );
    });
  });

  describe('Open in background Hotkey handling', () => {
    let sut: SwitcherPlusKeymap;
    let mockChooserLocal: MockProxy<Chooser<HeadingSuggestion>>;
    let mockOpenInBackConfig: OpenInBackgroundConfig;

    beforeAll(() => {
      mockChooserLocal = mock<Chooser<HeadingSuggestion>>();
      mockOpenInBackConfig = mock<OpenInBackgroundConfig>({
        isEnabled: true,
        openKeys: [
          {
            hotkey: { modifiers: ['Alt'], key: 't' },
          },
        ],
      });

      sut = new SwitcherPlusKeymap(
        mockApp,
        mockScope,
        mockChooserLocal,
        mockModal,
        mockConfig,
      );

      mockConfig.openInBackground = mockOpenInBackConfig;
      mockReset(mockScope);
    });

    afterAll(() => {
      mockReset(mockConfig.openInBackground);
    });

    afterEach(() => {
      mockReset(mockScope);
    });

    it('should register the configured hotkeys', () => {
      sut.registerOpenInBackgroundBindings(mockScope, mockConfig);

      const hotkey = mockOpenInBackConfig.openKeys[0].hotkey;
      expect(mockScope.register).toHaveBeenCalledWith(
        hotkey.modifiers,
        hotkey.key,
        expect.any(Function),
      );
    });

    test('.openInBackground() should open a suggestion in a new tab', () => {
      mockChooserLocal.values = [mock<HeadingSuggestion>()];
      mockChooserLocal.selectedItem = 0;

      sut.openInBackground(mockChooserLocal, 'tab');

      expect(mockExMode.openSuggestionInBackground).toHaveBeenCalledWith(
        mockChooserLocal.values[0],
        'tab',
        'vertical',
      );
    });

    test('.openInBackground() should open a suggestion in a new split pane', () => {
      mockChooserLocal.values = [mock<HeadingSuggestion>()];
      mockChooserLocal.selectedItem = 0;

      sut.openInBackground(mockChooserLocal, 'vertical');

      expect(mockExMode.openSuggestionInBackground).toHaveBeenCalledWith(
        mockChooserLocal.values[0],
        'split',
        'vertical',
      );
    });
  });

  describe('Toggle pinned state for Commands', () => {
    const commandId = 'testCommandId';
    let sut: SwitcherPlusKeymap;
    let mockCommandSugg: MockProxy<CommandSuggestion>;
    let getPluginInstanceSpy: jest.SpyInstance;
    let renderSuggestionSpy: jest.SpyInstance;
    let mockPluginInstance: MockProxy<CommandPalettePluginInstance>;
    let mockSuggParentEl: MockProxy<HTMLElement>;

    beforeAll(() => {
      mockSuggParentEl = mock<HTMLElement>();
      mockPluginInstance = mock<CommandPalettePluginInstance>({
        options: { pinned: null },
      });

      getPluginInstanceSpy = jest
        .spyOn(CommandHandler, 'getEnabledCommandPalettePluginInstance')
        .mockReturnValue(mockPluginInstance);

      renderSuggestionSpy = jest
        .spyOn(CommandHandler.prototype, 'renderSuggestion')
        .mockReturnValue(true);

      mockCommandSugg = mock<CommandSuggestion>({
        type: SuggestionType.CommandList,
        item: { id: commandId },
      });

      const mockChooserLocal = mock<Chooser<CommandSuggestion>>({
        values: [mockCommandSugg],
        suggestions: [mockSuggParentEl],
        selectedItem: 0,
      });

      sut = new SwitcherPlusKeymap(
        mockApp,
        mockScope,
        mockChooserLocal,
        mockModal,
        config,
      );
    });

    afterEach(() => {
      mockClear(mockPluginInstance);
      mockClear(mockSuggParentEl);
      getPluginInstanceSpy.mockClear();
    });

    afterAll(() => {
      getPluginInstanceSpy.mockRestore();
      renderSuggestionSpy.mockRestore();
    });

    it('should return false to prevent default', () => {
      const result = sut.togglePinnedCommand(null, null);

      expect(result).toBe(false);
    });

    test('when the pinned command list is undefined it should create a new list containing the command', () => {
      mockPluginInstance.options.pinned = undefined;

      sut.togglePinnedCommand(null, null);

      expect(mockPluginInstance.options.pinned).toHaveLength(1);
      expect(mockPluginInstance.options.pinned[0]).toBe(commandId);
      expect(mockPluginInstance.saveSettings).toHaveBeenCalled();
    });

    test('when the pinned command list already contains the command, it should remove (toggle) the command from the list', () => {
      mockPluginInstance.options.pinned = [commandId];

      sut.togglePinnedCommand(null, null);

      expect(mockPluginInstance.options.pinned).toHaveLength(0);
      expect(mockPluginInstance.saveSettings).toHaveBeenCalled();
    });

    test('when the pinned command list does not contain the command, it should add the command to the list', () => {
      mockPluginInstance.options.pinned = [];

      sut.togglePinnedCommand(null, null);

      expect(mockPluginInstance.options.pinned).toHaveLength(1);
      expect(mockPluginInstance.options.pinned[0]).toBe(commandId);
      expect(mockPluginInstance.saveSettings).toHaveBeenCalled();
    });

    test('after modifying the pinned command list, it should re-render the suggestion', () => {
      mockPluginInstance.options.pinned = [];

      sut.togglePinnedCommand(null, null);

      expect(mockPluginInstance.options.pinned).toHaveLength(1);
      expect(mockPluginInstance.options.pinned[0]).toBe(commandId);

      // Expect it to first clear all the child elements
      expect(mockSuggParentEl.empty).toHaveBeenCalled();
      expect(renderSuggestionSpy).toHaveBeenCalledWith(mockCommandSugg, mockSuggParentEl);
    });
  });

  describe('Rendering Markdown content', () => {
    const mockRenderResults = jest.mocked<typeof renderResults>(renderResults);
    let sut: SwitcherPlusKeymap;
    let mockSuggParentEl: MockProxy<HTMLDivElement>;
    let mockTitleEl: MockProxy<HTMLElement>;
    let file: TFile;
    let renderContentAsyncSpy: jest.SpyInstance;

    beforeAll(() => {
      file = new TFile();
      sut = new SwitcherPlusKeymap(mockApp, mockScope, mockChooser, mockModal, config);

      mockTitleEl = mock<HTMLElement>();
      mockSuggParentEl = mock<HTMLDivElement>({
        querySelector: mockFn().calledWith('.qsp-title').mockReturnValue(mockTitleEl),
      });

      mockConfig.renderMarkdownContentInSuggestions = {
        isEnabled: true,
        renderHeadings: false,
        toggleContentRenderingKeys: null,
      };

      renderContentAsyncSpy = jest
        .spyOn(Handler, 'renderMarkdownContentAsync')
        .mockReturnValue();
    });

    afterEach(() => {
      mockChooser.values = null;
      mockChooser.suggestions = null;
      renderContentAsyncSpy.mockClear();
      mockRenderResults.mockClear();

      mockClear(mockChooser);
      mockClear(mockSuggParentEl);
      mockClear(mockTitleEl);
    });

    afterAll(() => {
      mockConfig.renderMarkdownContentInSuggestions = null;
      renderContentAsyncSpy.mockRestore();
    });

    it('should render a HeadingSuggestion as HTML', () => {
      const heading = makeHeading(chance.word(), 1);
      const sugg = makeHeadingSuggestion(heading, file, null);
      mockChooser.values = [sugg];
      mockChooser.suggestions = [mockSuggParentEl];
      mockChooser.selectedItem = 0;

      sut.toggleMarkdownContentRendering(null, null);

      expect(renderContentAsyncSpy).toHaveBeenCalledWith(
        mockApp,
        mockTitleEl,
        heading.heading,
        file.path,
      );
    });

    it('should render a SymbolSuggestion with a Heading payload as HTML', () => {
      const heading = makeHeading(chance.word(), 1);
      const sugg = makeSymbolSuggestion(heading, SymbolType.Heading, file);
      mockChooser.values = [sugg];
      mockChooser.suggestions = [mockSuggParentEl];
      mockChooser.selectedItem = 0;

      sut.toggleMarkdownContentRendering(null, null);

      expect(renderContentAsyncSpy).toHaveBeenCalledWith(
        mockApp,
        mockTitleEl,
        heading.heading,
        file.path,
      );
    });

    it('should toggle the rendering from HTML to raw text', () => {
      const heading = makeHeading(chance.word(), 1);
      const sugg = makeHeadingSuggestion(heading, file, null);
      mockChooser.values = [sugg];
      mockChooser.suggestions = [mockSuggParentEl];
      mockChooser.selectedItem = 0;

      // Return a value here to indicate that the suggestion is currently being displayed
      // as HTML and therefore shoudl be toggled to raw text
      mockTitleEl.querySelector
        .calledWith('.qsp-rendered-container')
        .mockReturnValueOnce(mock<Element>());

      sut.toggleMarkdownContentRendering(null, null);

      expect(mockRenderResults).toHaveBeenCalledWith(
        mockTitleEl,
        heading.heading,
        sugg.match,
      );
    });

    it('should toggle the rendering from raw text to HTML', () => {
      const heading = makeHeading(chance.word(), 1);
      const sugg = makeHeadingSuggestion(heading, file, null);
      mockChooser.values = [sugg];
      mockChooser.suggestions = [mockSuggParentEl];
      mockChooser.selectedItem = 0;

      // Return null here to indicate that the suggestion is currently being displayed
      // as raw text and should be toggled to HTML
      mockTitleEl.querySelector
        .calledWith('.qsp-rendered-container')
        .mockReturnValueOnce(null);

      sut.toggleMarkdownContentRendering(null, null);

      expect(renderContentAsyncSpy).toHaveBeenCalledWith(
        mockApp,
        mockTitleEl,
        heading.heading,
        file.path,
      );
    });
  });

  describe('Open file in default app', () => {
    let sut: SwitcherPlusKeymap;
    const mockFile = new TFile();
    let mockFileSugg: MockProxy<FileSuggestion>;

    beforeAll(() => {
      mockFileSugg = makeFileSuggestion(mockFile);

      const mockChooserLocal = mock<Chooser<FileSuggestion>>({
        values: [mockFileSugg],
        selectedItem: 0,
      });

      sut = new SwitcherPlusKeymap(
        mockApp,
        mockScope,
        mockChooserLocal,
        mockModal,
        config,
      );
    });

    afterEach(() => {
      mockApp.openWithDefaultApp.mockClear();
    });

    it('should open a file in the default system registered app', () => {
      mockApp.openWithDefaultApp.mockResolvedValueOnce(null);

      sut.openDefaultApp(null, null);

      expect(mockApp.openWithDefaultApp).toHaveBeenCalledWith(mockFile.path);
    });

    test('file extensions that have been excluded should not be opened in the default app', () => {
      config.openDefaultApp.excludeFileExtensions.push(mockFile.extension);

      sut.openDefaultApp(null, null);

      expect(mockApp.openWithDefaultApp).not.toHaveBeenCalled();

      config.openDefaultApp.excludeFileExtensions.pop();
    });

    it('should log errors to the console when the default app cannot be opened', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockReturnValueOnce();

      const errorMsg = 'openDefaultApp unit test error';
      const rejectedPromise = Promise.reject(errorMsg);
      mockApp.openWithDefaultApp.mockReturnValueOnce(rejectedPromise);

      sut.openDefaultApp(null, null);

      await expect(rejectedPromise).rejects.toBeTruthy();
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.any(String), errorMsg);

      consoleLogSpy.mockRestore();
    });
  });
});
