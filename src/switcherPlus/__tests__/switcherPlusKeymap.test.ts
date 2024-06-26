import { Chance } from 'chance';
import { SwitcherPlusSettings } from 'src/settings';
import { CustomKeymapInfo, SwitcherPlusKeymap } from 'src/switcherPlus';
import { generateMarkdownLink } from 'src/utils';
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
  Platform,
  Scope,
  View,
  Workspace,
  WorkspaceLeaf,
  TFile,
  Editor,
} from 'obsidian';
import {
  AnySuggestion,
  KeymapConfig,
  Mode,
  SwitcherPlus,
  Facet,
  FacetSettingsData,
  InsertLinkConfig,
} from 'src/types';

jest.mock('src/utils/utils');

const chance = new Chance();

describe('SwitcherPlusKeymap', () => {
  const selector = '.prompt-instructions';
  const mockScope = mock<Scope>({ keys: [] });
  const mockChooser = mock<Chooser<AnySuggestion>>();
  const mockConfig = mock<SwitcherPlusSettings>({ closeWhenEmptyKeys: [] });
  const mockWorkspace = mock<Workspace>();

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

  const mockModal = mock<SwitcherPlus>({ modalEl: mockModalEl });

  const mockApp = mock<App>({
    workspace: mockWorkspace,
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
      const modKey: Modifier = Platform.isMacOS ? 'Meta' : 'Ctrl';
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
      expect(result.modifiers).toBe(keymap.modifiers.join(','));
      expect(result.isInstructionOnly).toBeFalsy();
    });

    test('when the keymap already exists, it should update the keymap handler function', () => {
      customKeysInfo = [
        {
          isInstructionOnly: false,
          modes: [Mode.HeadingsList],
          func: null,
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

      expect(result.func).not.toBeNull();
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
      result.func(mock<KeyboardEvent>(), mock<KeymapContext>());

      expect(mockModal.close).toHaveBeenCalled();
      expect(insertSpy).toHaveBeenCalled();

      insertSpy.mockRestore();
    });

    test('the keymap handler should insert a link into the editor', () => {
      customKeysInfo = [];

      const linkText = chance.word();
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
      result.func(mock<KeyboardEvent>(), mock<KeymapContext>());

      expect(mockView.editor.replaceSelection).toHaveBeenCalledWith(linkText);
    });
  });

  describe('registerKeys', () => {
    beforeEach(() => {
      mockReset(mockScope);
    });

    it('should register each keymap', () => {
      const modifiers: Modifier[] = ['Alt', 'Mod'];
      const key = 'x';
      const func = () => false;

      const sut = new SwitcherPlusKeymap(
        mockApp,
        mockScope,
        mockChooser,
        mockModal,
        mockConfig,
      );

      sut.registerKeys(mockScope, [{ modifiers: modifiers.join(','), key, func }]);

      expect(mockScope.register).toHaveBeenCalledWith(
        expect.arrayContaining(modifiers),
        key,
        func,
      );
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
        const modifiers = v.modifiers.split(',') as Modifier[];

        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return [modifiers, v.key, expect.any(Function)];
      });

      expect(mockScope.register.mock.calls).toEqual(expected);
    });

    it('should register custom keymaps in custom modes', () => {
      const mode = Mode.BookmarksList;
      const customKeymaps = sut.customKeysInfo.filter(
        (v) => v.modes?.includes(mode) && !v.isInstructionOnly,
      );

      const unregisterKeysSpy = jest
        .spyOn(sut, 'unregisterKeys')
        .mockReturnValue([mock<KeymapEventHandler>()]);

      sut.updateKeymapForMode({ mode });

      // convert to [][] so each call can be checked separately
      const expected = customKeymaps.map((v) => {
        const modifiers = v.modifiers.split(',') as Modifier[];
        return [modifiers, v.key, v.func];
      });

      expect(mockScope.register.mock.calls).toEqual(expected);
      expect(unregisterKeysSpy).toHaveBeenCalled();

      unregisterKeysSpy.mockRestore();
    });

    it('should unregister keys that are found to be registered', () => {
      mockScope.keys = [mockShiftEnter];

      const removed = sut.unregisterKeys(mockScope, [mockShiftEnter]);

      expect(mockScope.unregister).toHaveBeenCalledWith(mockShiftEnter);
      expect(removed[0]).toEqual(mockShiftEnter);
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
      const modifiers = chance.pickset<Modifier>(['Alt', 'Ctrl'], 1);

      const facetSettings = mock<FacetSettingsData>({
        keyList: [key],
      });

      const facetKeyInfo = mock<CustomKeymapInfo & { facet: Facet }>({
        command: key,
        facet: mock<Facet>({
          modifiers,
          isActive: false,
        }),
      });

      sut.renderFacetInstructions(mockModal.modalEl, facetSettings, [facetKeyInfo]);

      const modifierStr = modifiers.toString().replace(',', ' ');
      expect(mockInstructionEl.createSpan).toHaveBeenCalledWith(
        expect.objectContaining({
          cls: ['prompt-instruction-command'],
          text: `(${modifierStr}) ${key}`,
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
      const modifiers = chance.pickset<Modifier>(['Alt', 'Ctrl'], 1);

      const facetSettings = mock<FacetSettingsData>({
        resetKey: key,
        resetModifiers: modifiers,
      });

      const facetKeyInfo = mock<CustomKeymapInfo & { facet: Facet }>({
        facet: null,
      });

      sut.renderFacetInstructions(mockModal.modalEl, facetSettings, [facetKeyInfo]);

      const modifierStr = modifiers.toString().replace(',', ' ');
      expect(mockInstructionEl.createSpan).toHaveBeenCalledWith(
        expect.objectContaining({
          cls: ['prompt-instruction-command'],
          text: `(${modifierStr}) ${key}`,
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
});
