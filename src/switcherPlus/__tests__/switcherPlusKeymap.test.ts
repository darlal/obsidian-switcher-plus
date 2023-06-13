import { Chance } from 'chance';
import { anyFunction, mock, mockClear, mockFn, mockReset } from 'jest-mock-extended';
import { SwitcherPlusSettings } from 'src/settings';
import {
  App,
  Chooser,
  KeymapContext,
  KeymapEventHandler,
  KeymapEventListener,
  Modifier,
  Platform,
  Scope,
} from 'obsidian';
import { CustomKeymapInfo, SwitcherPlusKeymap } from 'src/switcherPlus';
import {
  AnySuggestion,
  KeymapConfig,
  Mode,
  SwitcherPlus,
  Facet,
  FacetSettingsData,
} from 'src/types';

const chance = new Chance();

describe('SwitcherPlusKeymap', () => {
  const selector = '.prompt-instructions';
  const selectorCustomInstructions = `${selector}:not([data-mode="standard"])`;
  const mockScope = mock<Scope>({ keys: [] });
  const mockChooser = mock<Chooser<AnySuggestion>>();
  const mockModalContainer = mock<HTMLElement>();
  const mockModal = mock<SwitcherPlus>({ containerEl: mockModalContainer });
  const mockConfig = mock<SwitcherPlusSettings>();
  const mockApp = mock<App>({});

  it('should add a data-mode attribute to the standard instructions element', () => {
    const mockEl = mock<HTMLElement>();
    mockModalContainer.querySelector.mockReturnValueOnce(mockEl);
    new SwitcherPlusKeymap(mockApp, mockScope, mockChooser, mockModal, mockConfig);

    expect(mockEl.setAttribute).toHaveBeenCalledWith('data-mode', 'standard');
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
        new SwitcherPlusKeymap(mockApp, mockScope, mockChooser, mockModal, mockConfig);

        expect(mockScope.register).toHaveBeenCalledWith(
          expect.arrayContaining(['Ctrl']),
          nextKey,
          expect.anything(),
        );

        expect(mockScope.register).toHaveBeenCalledWith(
          expect.arrayContaining(['Ctrl']),
          previousKey,
          expect.anything(),
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
          mockConfig,
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
          mockConfig,
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

  describe('registerTabBindings', () => {
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

  describe('registerBackspaceClose', () => {
    beforeEach(() => {
      mockReset(mockScope);
    });

    it('should register backspace key to close the modal', () => {
      new SwitcherPlusKeymap(mockApp, mockScope, mockChooser, mockModal, mockConfig);

      expect(mockScope.register).toHaveBeenCalledWith(
        [],
        'Backspace',
        expect.any(Function),
      );
    });

    test('with shouldCloseModalOnBackspace enabled it should close the modal when the search box is empty', () => {
      mockConfig.shouldCloseModalOnBackspace = true;
      const emptyModal = mock<SwitcherPlus>({
        containerEl: mockModalContainer,
        inputEl: mock<HTMLInputElement>({ value: '' }),
      });

      const sut = new SwitcherPlusKeymap(
        mockApp,
        mockScope,
        mockChooser,
        emptyModal,
        mockConfig,
      );

      sut.closeModal(mock<KeyboardEvent>(), null);

      expect(emptyModal.close).toHaveBeenCalled();

      mockConfig.shouldCloseModalOnBackspace = false;
    });

    test('with shouldCloseModalOnBackspace enabled it should not close the modal when the search box has text', () => {
      mockConfig.shouldCloseModalOnBackspace = true;
      const emptyModal = mock<SwitcherPlus>({
        containerEl: mockModalContainer,
        inputEl: mock<HTMLInputElement>({ value: chance.word() }),
      });

      const sut = new SwitcherPlusKeymap(
        mockApp,
        mockScope,
        mockChooser,
        emptyModal,
        mockConfig,
      );

      sut.closeModal(mock<KeyboardEvent>(), null);

      expect(emptyModal.close).not.toHaveBeenCalled();

      mockConfig.shouldCloseModalOnBackspace = false;
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
      mockModalContainer.querySelectorAll
        .calledWith(selectorCustomInstructions)
        .mockReturnValue(mock<NodeListOf<Element>>());

      mockModalContainer.querySelector
        .calledWith(selector)
        .mockReturnValue(mockInstructionsEl);
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

      mockClear(mockModalContainer);
      mockClear(mockModal);
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
      const keymaps = sut.customKeysInfo.filter((keymap) => keymap.modes?.includes(mode));

      sut.updateKeymapForMode({ mode });

      expect(mockModal.setInstructions).toHaveBeenCalledWith(keymaps);
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

  describe('clearCustomInstructions', () => {
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
      mockClear(mockModalContainer);
      mockClear(mockModal);
    });

    it('should remove found elements from their parents', () => {
      const mockEl = mock<HTMLElement>();
      const mockElements = [mockEl];
      const mockContainer = mock<HTMLElement>();
      mockContainer.querySelectorAll.mockReturnValueOnce(mockElements as never);

      sut.clearCustomInstructions(mockContainer);

      expect(mockEl.remove).toHaveBeenCalled();
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
    let mockInstructionEl: HTMLSpanElement;

    beforeAll(() => {
      sut = new SwitcherPlusKeymap(
        mockApp,
        mockScope,
        mockChooser,
        mockModal,
        mockConfig,
      );

      mockInstructionEl = mock<HTMLDivElement>();
      mockModal.modalEl = mock<HTMLElement>({
        // return the filters container element
        createDiv: mockFn().mockReturnValue({
          // return the instructions wrapper element
          createDiv: mockFn().mockReturnValue(mockInstructionEl),
        }),
      });
    });

    beforeEach(() => {
      mockClear(mockModal);
      mockClear(mockInstructionEl);
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

      sut.renderFacetInstructions(mockModal, facetSettings, [facetKeyInfo]);

      expect(mockInstructionEl.createSpan).toHaveBeenCalledWith(
        expect.objectContaining({
          cls: 'prompt-instruction-command',
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

      sut.renderFacetInstructions(mockModal, facetSettings, [facetKeyInfo]);

      const modifierStr = modifiers.toString().replace(',', ' ');
      expect(mockInstructionEl.createSpan).toHaveBeenCalledWith(
        expect.objectContaining({
          cls: 'prompt-instruction-command',
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

      sut.renderFacetInstructions(mockModal, facetSettings, [facetKeyInfo]);

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

      sut.renderFacetInstructions(mockModal, facetSettings, [facetKeyInfo]);

      const modifierStr = modifiers.toString().replace(',', ' ');
      expect(mockInstructionEl.createSpan).toHaveBeenCalledWith(
        expect.objectContaining({
          cls: 'prompt-instruction-command',
          text: `(${modifierStr}) ${key}`,
        }),
      );
    });
  });
});
