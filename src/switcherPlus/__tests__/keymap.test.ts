import { mock, mockReset } from 'jest-mock-extended';
import { Chooser, Hotkey, KeymapContext, KeymapEventListener, Scope } from 'obsidian';
import { Keymap } from 'src/switcherPlus';
import { AnySuggestion, Mode } from 'src/types';

describe('keymap', () => {
  const mockScope = mock<Scope>();
  const mockChooser = mock<Chooser<AnySuggestion>>();
  const mockModalContainer = mock<HTMLElement>();

  describe('isOpen property', () => {
    let sut: Keymap;

    beforeAll(() => {
      sut = new Keymap(mockScope, mockChooser, mockModalContainer);
    });

    it('should save the value provided for isOpen', () => {
      sut.isOpen = true;
      const result = sut.isOpen;
      expect(result).toBe(true);
    });
  });

  describe('Next/Previous keyboard navigation', () => {
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
        new Keymap(mockScope, null, null);

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

        const sut = new Keymap(mockScope, mockChooser, null);
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

        const sut = new Keymap(mockScope, mockChooser, null);
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
    const selector = '.prompt-instructions';
    const mockInstructionsEl = mock<HTMLElement>();
    const mockMetaEnter = mock<Hotkey>({
      modifiers: ['Meta'],
      key: 'Enter',
    });
    const mockShiftEnter = mock<Hotkey>({
      modifiers: ['Shift'],
      key: 'Enter',
    });

    beforeEach(() => {
      mockReset(mockScope);
      mockReset(mockModalContainer);
    });

    it('should do nothing if the helper text (prompt instructions) element is not found', () => {
      const mockQuerySelector =
        mockModalContainer.querySelector.mockReturnValueOnce(null);

      const sut = new Keymap(mockScope, mockChooser, mockModalContainer);

      expect(() => sut.updateKeymapForMode(Mode.Standard)).not.toThrow();
      expect(mockQuerySelector).toHaveBeenCalledWith(selector);
    });

    it('should hide the helper text (prompt instructions) in non-standard modes', () => {
      const mockQuerySelector =
        mockModalContainer.querySelector.mockReturnValueOnce(mockInstructionsEl);

      const sut = new Keymap(mockScope, mockChooser, mockModalContainer);

      sut.updateKeymapForMode(Mode.EditorList);

      expect(mockQuerySelector).toHaveBeenCalledWith(selector);
      expect(mockInstructionsEl.style.display).toBe('none');
    });

    it('should show the helper text (prompt instructions) in standard modes', () => {
      const mockQuerySelector =
        mockModalContainer.querySelector.mockReturnValueOnce(mockInstructionsEl);

      const sut = new Keymap(mockScope, mockChooser, mockModalContainer);

      sut.updateKeymapForMode(Mode.Standard);

      expect(mockQuerySelector).toHaveBeenCalledWith(selector);
      expect(mockInstructionsEl.style.display).toBe('');
    });

    it('should not remove Enter hotkey without shift/meta modifier', () => {
      const mockEnter = mock<Hotkey>({
        modifiers: [],
        key: 'Enter',
      });

      mockScope.keys = [mockEnter];
      const sut = new Keymap(mockScope, null, mockModalContainer);

      sut.updateKeymapForMode(Mode.EditorList);

      expect(mockScope.keys).toContain(mockEnter);
    });

    it('should remove the shift-enter hotkey in non-standard modes', () => {
      mockScope.keys = [mockMetaEnter, mockShiftEnter];
      const sut = new Keymap(mockScope, null, mockModalContainer);

      sut.updateKeymapForMode(Mode.EditorList);

      expect(mockScope.keys).toHaveLength(1);
    });

    it('should keep the meta-enter hotkey registered in non-standard modes', () => {
      mockScope.keys = [mockMetaEnter, mockShiftEnter];
      const sut = new Keymap(mockScope, null, mockModalContainer);

      sut.updateKeymapForMode(Mode.StarredList);

      expect(mockScope.keys).toHaveLength(1);
      expect(mockScope.keys).toContain(mockMetaEnter);
    });

    it('should restore the shift/meta hotkey in standard mode', () => {
      mockScope.keys = [mockMetaEnter, mockShiftEnter];
      const sut = new Keymap(mockScope, null, mockModalContainer);

      // should first remove shift-enter in non-standard mode
      sut.updateKeymapForMode(Mode.EditorList);
      const extendedModeKeyCount = mockScope.keys.length;

      // should restore all hotkeys in standard mode
      sut.updateKeymapForMode(Mode.Standard);

      expect(extendedModeKeyCount).toBe(1);
      expect(mockScope.keys).toContain(mockMetaEnter);
      expect(mockScope.keys).toContain(mockShiftEnter);
    });
  });
});
