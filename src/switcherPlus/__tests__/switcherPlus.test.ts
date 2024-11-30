import SwitcherPlusPlugin from 'src/main';
import { createSwitcherPlus, ModeHandler } from 'src/switcherPlus';
import { getSystemSwitcherInstance } from 'src/utils';
import { mock, mockClear, MockProxy } from 'jest-mock-extended';
import { App, Chooser, QuickSwitcherPluginInstance, Scope } from 'obsidian';
import { Chance } from 'chance';
import { SwitcherPlusSettings } from 'src/settings';
import {
  AnySuggestion,
  Mode,
  SwitcherPlus,
  EditorSuggestion,
  SessionOpts,
} from 'src/types';

jest.mock('src/switcherPlus/switcherPlusKeymap');
jest.mock('src/utils', () => {
  return {
    __esModule: true,
    ...jest.requireActual<typeof import('src/utils')>('src/utils'),

    // This needs to be mocked since at test time access to the actual Obsidian builtin
    // system switcher is not available.
    getSystemSwitcherInstance: jest.fn(),
  };
});

const chance = new Chance();
const mockChooser = mock<Chooser<AnySuggestion>>();
const mockScope = mock<Scope>({ keys: [] });
const mockModalEl = mock<HTMLElement>({
  createDiv: jest.fn(),
});

class MockSystemSwitcherModal {
  protected chooser: Chooser<AnySuggestion>;
  scope: Scope;
  modalEl: HTMLElement;
  inputEl: HTMLInputElement;

  constructor() {
    this.chooser = mockChooser;
    this.scope = mockScope;
    this.modalEl = mockModalEl;
  }
  updateSuggestions(): void {
    /* noop */
  }
  renderSuggestion(_value: AnySuggestion, _el: HTMLElement): void {
    /* noop */
  }
  getSuggestions(_input: string): AnySuggestion[] {
    throw new Error('Not implemented');
  }
  onChooseSuggestion(_item: AnySuggestion, _evt: MouseEvent | KeyboardEvent): void {
    /* noop */
  }
  open(): void {
    this.updateSuggestions();
  }
  onOpen(): void {
    /* noop */
  }
  onClose(): void {
    /* noop */
  }
}

describe('switcherPlus', () => {
  let mockApp: MockProxy<App>;
  let mockPlugin: MockProxy<SwitcherPlusPlugin>;

  // mock version of the built in system Switcher plugin instance
  // QuickSwitcherModal is the Class that SwitcherPlus inherits from, so set
  // that to the mock class from above
  const mockSystemSwitcherPluginInstance = mock<QuickSwitcherPluginInstance>({
    QuickSwitcherModal: MockSystemSwitcherModal,
  });

  // mock of utils function that retrieves the builtin switcher plugin instance
  // defaults to returning the mocked version of the plugin instance
  const mockGetSystemSwitcherInstance = jest
    .mocked(getSystemSwitcherInstance)
    .mockReturnValue(mockSystemSwitcherPluginInstance);

  beforeAll(() => {
    mockApp = mock<App>();
    mockPlugin = mock<SwitcherPlusPlugin>({ app: mockApp });

    const config = new SwitcherPlusSettings(mockPlugin);
    mockPlugin.options = config;

    // Disable these two setting so that state isn't store between tests
    config.preserveCommandPaletteLastInput = false;
    config.preserveQuickSwitcherLastInput = false;
  });

  describe('createSwitcherPlus', () => {
    it('should log error to the console if the builtin QuickSwitcherModal is not accessible', () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockReturnValueOnce();

      mockGetSystemSwitcherInstance.mockReturnValueOnce(null);

      const result = createSwitcherPlus(mockApp, mockPlugin);

      expect(result).toBeNull();
      expect(mockGetSystemSwitcherInstance).toHaveBeenCalledWith(mockApp);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Switcher++: unable to extend system switcher. Plugin UI will not be loaded.',
        ),
      );

      consoleLogSpy.mockRestore();
    });

    it('should return an instance of a class that implements SwitcherPlus', () => {
      const result = createSwitcherPlus(mockApp, mockPlugin);

      // todo: more thorough checking needed here
      expect(result).not.toBeFalsy();
      expect(mockGetSystemSwitcherInstance).toHaveBeenLastCalledWith(mockApp);
    });
  });

  describe('SwitcherPlusModal', () => {
    let sut: SwitcherPlus;

    beforeAll(() => {
      sut = createSwitcherPlus(mockApp, mockPlugin);
    });

    test('openInMode() should forward to ModeHandler and  call super.Open()', () => {
      const opts = mock<SessionOpts>();
      const mode = Mode.EditorList;
      const setSessionOpenModeSpy = jest.spyOn(
        ModeHandler.prototype,
        'setSessionOpenMode',
      );

      const superOpenSpy = jest
        .spyOn(MockSystemSwitcherModal.prototype, 'open')
        .mockReturnValueOnce();

      sut.openInMode(mode, opts);

      expect(setSessionOpenModeSpy).toHaveBeenCalledWith(mode, mockChooser, opts);
      expect(superOpenSpy).toHaveBeenCalled();

      setSessionOpenModeSpy.mockReset();
      superOpenSpy.mockRestore();
    });

    test('onOpen() should forward to ModeHandler and call super.onOpen()', () => {
      const mhOnOpenSpy = jest.spyOn(ModeHandler.prototype, 'onOpen');

      const superOnOpenSpy = jest.spyOn(MockSystemSwitcherModal.prototype, 'onOpen');

      sut.onOpen();

      expect(mhOnOpenSpy).toHaveBeenCalled();
      expect(superOnOpenSpy).toHaveBeenCalled();

      mhOnOpenSpy.mockReset();
      superOnOpenSpy.mockRestore();
    });

    test('onClose() should forward to ModeHandler and call super.onClose()', () => {
      const mhOnCloseSpy = jest.spyOn(ModeHandler.prototype, 'onClose');

      const superOnCloseSpy = jest.spyOn(MockSystemSwitcherModal.prototype, 'onClose');

      sut.onClose();

      expect(mhOnCloseSpy).toHaveBeenCalled();
      expect(superOnCloseSpy).toHaveBeenCalled();

      mhOnCloseSpy.mockReset();
      superOnCloseSpy.mockRestore();
    });

    it('should forward to ModeHandler to get suggestions', () => {
      const insertCmdStringSpy = jest
        .spyOn(ModeHandler.prototype, 'insertSessionOpenModeOrLastInputString')
        .mockReturnValueOnce();

      const mhUpdateSuggestionsSpy = jest
        .spyOn(ModeHandler.prototype, 'updateSuggestions')
        .mockReturnValue(true); // true to signify that ModeHandler handled it

      const superUpdateSuggestionsSpy = jest.spyOn(
        MockSystemSwitcherModal.prototype,
        'updateSuggestions',
      );

      const inputText = 'foo';
      const mockInputEl = mock<HTMLInputElement>({ value: inputText });
      sut.inputEl = mockInputEl;

      // internally calls updateSuggestions()
      sut.open();

      expect(insertCmdStringSpy).toHaveBeenCalledWith(mockInputEl);
      expect(mhUpdateSuggestionsSpy).toHaveBeenCalledWith(inputText, mockChooser, sut);

      // expect to not get called because ModeHandler should have handled it
      expect(superUpdateSuggestionsSpy).not.toHaveBeenCalled();

      insertCmdStringSpy.mockReset();
      mhUpdateSuggestionsSpy.mockReset();
      superUpdateSuggestionsSpy.mockRestore();
      mockClear(sut.inputEl);
    });

    it('should forward to builtin system switcher if not handled by Modehandler', () => {
      const insertCmdStringSpy = jest.spyOn(
        ModeHandler.prototype,
        'insertSessionOpenModeOrLastInputString',
      );

      const mhUpdateSuggestionsSpy = jest
        .spyOn(ModeHandler.prototype, 'updateSuggestions')
        .mockReturnValue(false); // false to signify that ModeHandler did not handled it

      const superUpdateSuggestionsSpy = jest.spyOn(
        MockSystemSwitcherModal.prototype,
        'updateSuggestions',
      );

      const inputText = 'foo';
      const mockInputEl = mock<HTMLInputElement>({ value: inputText });
      sut.inputEl = mockInputEl;

      // internally calls updateSuggestions()
      sut.open();

      expect(insertCmdStringSpy).toHaveBeenCalledWith(mockInputEl);
      expect(mhUpdateSuggestionsSpy).toHaveBeenCalledWith(inputText, mockChooser, sut);

      // expect to get called because ModeHandler did not handle it
      expect(superUpdateSuggestionsSpy).toHaveBeenCalled();

      insertCmdStringSpy.mockReset();
      mhUpdateSuggestionsSpy.mockReset();
      superUpdateSuggestionsSpy.mockRestore();
      mockClear(sut.inputEl);
    });

    test('onChooseSuggestion() should forward to ModeHandler', () => {
      const mhOnChooseSuggestionSpy = jest
        .spyOn(ModeHandler.prototype, 'onChooseSuggestion')
        .mockReturnValue(true); // true to signify that ModeHandler handled it

      const superOnChooseSuggestionSpy = jest.spyOn(
        MockSystemSwitcherModal.prototype,
        'onChooseSuggestion',
      );

      const mockSugg = mock<EditorSuggestion>();
      const mockEvt = mock<MouseEvent>();

      sut.onChooseSuggestion(mockSugg, mockEvt);

      expect(mhOnChooseSuggestionSpy).toHaveBeenCalledWith(mockSugg, mockEvt);

      // expect to not get called because ModeHandler should have handled it
      expect(superOnChooseSuggestionSpy).not.toHaveBeenCalled();

      mhOnChooseSuggestionSpy.mockReset();
      superOnChooseSuggestionSpy.mockRestore();
    });

    test('onChooseSuggestion() should forward to builtin system switcher if not handled by ModeHandler', () => {
      const mhOnChooseSuggestionSpy = jest
        .spyOn(ModeHandler.prototype, 'onChooseSuggestion')
        .mockReturnValue(false); // false to signify that ModeHandler did not handled it

      const superOnChooseSuggestionSpy = jest.spyOn(
        MockSystemSwitcherModal.prototype,
        'onChooseSuggestion',
      );

      const mockSugg = mock<EditorSuggestion>();
      const mockEvt = mock<MouseEvent>();

      sut.onChooseSuggestion(mockSugg, mockEvt);

      expect(mhOnChooseSuggestionSpy).toHaveBeenCalledWith(mockSugg, mockEvt);

      // expect to get called because ModeHandler did not handle it
      expect(superOnChooseSuggestionSpy).toHaveBeenCalledWith(mockSugg, mockEvt);

      mhOnChooseSuggestionSpy.mockReset();
      superOnChooseSuggestionSpy.mockRestore();
    });

    test('renderSuggestion() should forward to ModeHandler', () => {
      const mhRenderSuggestionSpy = jest
        .spyOn(ModeHandler.prototype, 'renderSuggestion')
        .mockReturnValue(true); // true to signify that ModeHandler handled it

      const superRenderSuggestionSpy = jest.spyOn(
        MockSystemSwitcherModal.prototype,
        'renderSuggestion',
      );

      const mockSugg = mock<EditorSuggestion>();
      const mockEl = mock<HTMLElement>();

      sut.renderSuggestion(mockSugg, mockEl);

      expect(mhRenderSuggestionSpy).toHaveBeenCalledWith(mockSugg, mockEl);

      // expect to not get called because ModeHandler should have handled it
      expect(superRenderSuggestionSpy).not.toHaveBeenCalled();

      mhRenderSuggestionSpy.mockReset();
      superRenderSuggestionSpy.mockRestore();
    });

    test('renderSuggestion() should forward to builtin system switcher if not handled by ModeHandler', () => {
      const mhRenderSuggestionSpy = jest
        .spyOn(ModeHandler.prototype, 'renderSuggestion')
        .mockReturnValue(false); // false to signify that ModeHandler did not handled it

      const superRenderSuggestionSpy = jest.spyOn(
        MockSystemSwitcherModal.prototype,
        'renderSuggestion',
      );

      const mockSugg = mock<EditorSuggestion>();
      const mockEl = mock<HTMLElement>();

      sut.renderSuggestion(mockSugg, mockEl);

      expect(mhRenderSuggestionSpy).toHaveBeenCalledWith(mockSugg, mockEl);

      // expect to get called because ModeHandler did not handle it
      expect(superRenderSuggestionSpy).toHaveBeenCalledWith(mockSugg, mockEl);

      mhRenderSuggestionSpy.mockReset();
      superRenderSuggestionSpy.mockRestore();
    });

    test('getSuggestions() should retrieve parsed input from ModeHandler in standard mode', () => {
      const expectedInput = chance.word();
      const superGetSuggestionSpy = jest
        .spyOn(MockSystemSwitcherModal.prototype, 'getSuggestions')
        .mockReturnValueOnce(null);

      sut.getSuggestions(expectedInput);

      expect(superGetSuggestionSpy).toHaveBeenCalledWith(expectedInput);

      superGetSuggestionSpy.mockRestore();
    });
  });
});
