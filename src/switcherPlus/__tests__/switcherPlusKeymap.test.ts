import { mock, mockClear, mockReset } from 'jest-mock-extended';
import {
  Chooser,
  KeymapContext,
  KeymapEventHandler,
  KeymapEventListener,
  Modifier,
  Scope,
} from 'obsidian';
import { SwitcherPlusKeymap } from 'src/switcherPlus';
import { AnySuggestion, Mode, SwitcherPlus } from 'src/types';

describe('SwitcherPlusKeymap', () => {
  const selector = '.prompt-instructions';
  const selectorCustomInstructions = `${selector}:not([data-mode="standard"])`;
  const mockScope = mock<Scope>({ keys: [] });
  const mockChooser = mock<Chooser<AnySuggestion>>();
  const mockModalContainer = mock<HTMLElement>();
  const mockModal = mock<SwitcherPlus>({ containerEl: mockModalContainer });

  it('should add a data-mode attribute to the standard instructions element', () => {
    const mockEl = mock<HTMLElement>();
    mockModalContainer.querySelector.mockReturnValueOnce(mockEl);
    new SwitcherPlusKeymap(mockScope, mockChooser, mockModal);

    expect(mockEl.setAttribute).toHaveBeenCalledWith('data-mode', 'standard');
  });

  describe('isOpen property', () => {
    let sut: SwitcherPlusKeymap;

    beforeAll(() => {
      sut = new SwitcherPlusKeymap(mockScope, mockChooser, mockModal);
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
        new SwitcherPlusKeymap(mockScope, mockChooser, mockModal);

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

        const sut = new SwitcherPlusKeymap(mockScope, mockChooser, mockModal);
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

        const sut = new SwitcherPlusKeymap(mockScope, mockChooser, mockModal);
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
      sut = new SwitcherPlusKeymap(mockScope, mockChooser, mockModal);

      mockReset(mockInstructionsEl);
      mockReset(mockScope);
      mockScope.keys = [];

      mockClear(mockModalContainer);
      mockClear(mockModal);
    });

    it('should hide the default prompt instructions in custom modes', () => {
      sut.updateKeymapForMode(Mode.EditorList);

      expect(mockInstructionsEl.style.display).toBe('none');
    });

    it('should show the default prompt instructions in standard modes', () => {
      sut.updateKeymapForMode(Mode.Standard);

      expect(mockInstructionsEl.style.display).toBe('');
    });

    it('should show custom prompt instructions in custom modes', () => {
      const mode = Mode.EditorList;
      const keymaps = sut.customKeysInfo.filter((keymap) => keymap.modes?.includes(mode));

      sut.updateKeymapForMode(mode);

      expect(mockModal.setInstructions).toHaveBeenCalledWith(keymaps);
    });

    it('should not remove Enter hotkey without shift/meta modifier', () => {
      const mockEnter = mock<KeymapEventHandler>({
        key: 'Enter',
      });

      mockScope.keys = [mockEnter];

      sut.updateKeymapForMode(Mode.EditorList);

      expect(mockScope.unregister).not.toHaveBeenCalled();
    });

    it('should restore standard keymaps in standard mode', () => {
      mockScope.keys = [mockMetaShiftEnter, mockShiftEnter];

      // should first update for a custom mode
      sut.updateKeymapForMode(Mode.HeadingsList);
      mockScope.register.mockReset();

      // should restore all standard hotkeys
      sut.updateKeymapForMode(Mode.Standard);

      // convert to [][] so each call can be checked separately
      const expected = sut.standardKeysInfo.map((v) => {
        const modifiers = v.modifiers.split(',') as Modifier[];

        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return [modifiers, v.key, expect.any(Function)];
      });

      expect(mockScope.register.mock.calls).toEqual(expected);
    });

    it('should register custom keymaps in custom modes', () => {
      const mode = Mode.StarredList;
      const customKeymaps = sut.customKeysInfo.filter(
        (v) => v.modes?.includes(mode) && !v.isInstructionOnly,
      );

      const unregisterKeysSpy = jest
        .spyOn(sut, 'unregisterKeys')
        .mockReturnValue([mock<KeymapEventHandler>()]);

      sut.updateKeymapForMode(mode);

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
      sut = new SwitcherPlusKeymap(mockScope, mockChooser, mockModal);
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
      const sut = new SwitcherPlusKeymap(mockScope, mockChooser, mockModal);

      sut.useSelectedItem(mockEvt, null);

      expect(mockChooser.useSelectedItem).toHaveBeenCalledWith(mockEvt);
    });
  });
});
