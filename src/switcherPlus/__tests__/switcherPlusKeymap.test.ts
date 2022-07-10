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

        mockScope.register.mockImplementation((_m, key, func) => {
          evtHandlers[key] = func;
          return null;
        });

        mockChooser.selectedItem = selectedIndex;

        const sut = new SwitcherPlusKeymap(mockScope, mockChooser, mockModal);
        sut.isOpen = true; // here

        evtHandlers[nextKey](
          mock<KeyboardEvent>(),
          mock<KeymapContext>({ key: nextKey }),
        );
        evtHandlers[previousKey](
          mock<KeyboardEvent>(),
          mock<KeymapContext>({ key: previousKey }),
        );

        expect(mockChooser.setSelectedItem).toHaveBeenCalledWith(selectedIndex + 1, true);
        expect(mockChooser.setSelectedItem).toHaveBeenCalledWith(selectedIndex - 1, true);
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
    const mockMetaEnter = mock<KeymapEventHandler>({
      modifiers: 'Meta',
      key: 'Enter',
    });
    const mockShiftEnter = mock<KeymapEventHandler>({
      modifiers: 'Shift',
      key: 'Enter',
    });

    beforeAll(() => {
      sut = new SwitcherPlusKeymap(mockScope, mockChooser, mockModal);
      mockModalContainer.querySelectorAll
        .calledWith(selectorCustomInstructions)
        .mockReturnValue(mock<NodeListOf<Element>>());
      mockModalContainer.querySelector
        .calledWith(selector)
        .mockReturnValue(mockInstructionsEl);
    });

    beforeEach(() => {
      mockClear(mockScope);
      mockClear(mockInstructionsEl);
      mockClear(mockModalContainer);
      mockClear(mockModal);
    });

    it('should hide the default helper text (prompt instructions) in non-standard modes', () => {
      sut.updateKeymapForMode(Mode.EditorList);

      expect(mockInstructionsEl.style.display).toBe('none');
    });

    it('should show the helper text (prompt instructions) in standard modes', () => {
      sut.updateKeymapForMode(Mode.Standard);

      expect(mockInstructionsEl.style.display).toBe('');
    });

    it('should show the helper text (prompt instructions) in custom modes', () => {
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

      expect(mockScope.keys).toContain(mockEnter);
    });

    it('should remove the shift-enter hotkey in non-standard modes', () => {
      mockScope.keys = [mockMetaEnter, mockShiftEnter];

      sut.updateKeymapForMode(Mode.EditorList);

      expect(mockScope.unregister).toHaveBeenCalledWith(mockShiftEnter);
    });

    it('should keep the meta-enter hotkey registered in non-standard modes', () => {
      mockScope.keys = [mockMetaEnter, mockShiftEnter];

      sut.updateKeymapForMode(Mode.StarredList);

      expect(mockScope.keys).toHaveLength(2);
      expect(mockScope.keys).toContain(mockMetaEnter);
    });

    it('should restore the shift/meta hotkey in standard mode', () => {
      mockScope.keys = [mockMetaEnter, mockShiftEnter];

      // should first remove shift-enter in non-standard mode
      sut.updateKeymapForMode(Mode.EditorList);

      // should restore all hotkeys in standard mode
      sut.updateKeymapForMode(Mode.Standard);

      expect(mockScope.keys).toContain(mockMetaEnter);
      expect(mockScope.keys).toContain(mockShiftEnter);
    });

    it('should registeer custom keymaps for non-standard modes', () => {
      const mode = Mode.StarredList;
      const customKeymaps = sut.customKeysInfo.filter(
        (v) => v.modes?.includes(mode) && !v.isInstructionOnly,
      );

      sut.updateKeymapForMode(mode);

      // convert to [][] so each call can be checked separately
      const expected = customKeymaps.map((v) => {
        const modifiers = v.modifiers.split(',') as Modifier[];
        return [modifiers, v.key, v.func];
      });
      expect(mockScope.register.mock.calls).toEqual(expected);
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
