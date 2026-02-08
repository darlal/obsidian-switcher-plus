import { mock, MockProxy, mockReset } from 'jest-mock-extended';
import { App, Command } from 'obsidian';
import SwitcherPlusPlugin from 'src/main';
import { SwitcherPlusSettings } from 'src/settings';
import {
  SwitcherPlusModal,
  EmptyTabMonitor,
  MobileLauncher,
  getCommandDefinitions,
} from 'src/switcherPlus';
import { Mode } from 'src/types';

describe('SwitcherPlusPlugin', () => {
  let mockApp: MockProxy<App>;
  let sut: SwitcherPlusPlugin;
  let settings: SwitcherPlusSettings;
  let updateDataAndLoadSettingsSpy: jest.SpyInstance;
  let createAndOpenSpy: jest.SpyInstance;
  let installMobileLauncherSpy: jest.SpyInstance;
  let removeMobileLauncherSpy: jest.SpyInstance;
  let installEmptyTabMonitorSpy: jest.SpyInstance;
  let removeEmptyTabButtonsSpy: jest.SpyInstance;

  beforeAll(() => {
    mockApp = mock<App>();
    settings = new SwitcherPlusSettings(null);
  });

  beforeEach(() => {
    mockReset(mockApp);

    updateDataAndLoadSettingsSpy = jest
      .spyOn(SwitcherPlusSettings.prototype, 'updateDataAndLoadSettings')
      .mockResolvedValue();

    createAndOpenSpy = jest
      .spyOn(SwitcherPlusModal, 'createAndOpen')
      .mockReturnValue(true);

    installMobileLauncherSpy = jest
      .spyOn(MobileLauncher, 'installMobileLauncherOverride')
      .mockReturnValue(null);

    removeMobileLauncherSpy = jest
      .spyOn(MobileLauncher, 'removeMobileLauncherOverride')
      .mockReturnValue(false);

    installEmptyTabMonitorSpy = jest
      .spyOn(EmptyTabMonitor, 'installEmptyTabMonitor')
      .mockImplementation();

    removeEmptyTabButtonsSpy = jest
      .spyOn(EmptyTabMonitor, 'removeEmptyTabButtons')
      .mockImplementation();

    sut = Object.create(SwitcherPlusPlugin.prototype) as SwitcherPlusPlugin;
    sut.app = mockApp;
    sut.manifest = {} as SwitcherPlusPlugin['manifest'];
    sut.addCommand = jest.fn();
    sut.addRibbonIcon = jest.fn();
    sut.addSettingTab = jest.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    (sut as any).ribbonIconEls = new Map();
  });

  afterEach(() => {
    updateDataAndLoadSettingsSpy.mockRestore();
    createAndOpenSpy.mockRestore();
    installMobileLauncherSpy.mockRestore();
    removeMobileLauncherSpy.mockRestore();
    installEmptyTabMonitorSpy.mockRestore();
    removeEmptyTabButtonsSpy.mockRestore();
  });

  describe('onload', () => {
    it('should call addSettingTab', async () => {
      await sut.onload();

      expect(sut.addSettingTab).toHaveBeenCalledTimes(1);
    });

    it('should register all 11 commands with correct id, name, and icon', async () => {
      await sut.onload();

      expect(sut.addCommand).toHaveBeenCalledTimes(11);

      const commandCalls = (sut.addCommand as jest.Mock<Command>).mock.calls as Array<
        [Command]
      >;

      const call0 = commandCalls[0];
      const call1 = commandCalls[1];
      const call2 = commandCalls[2];
      const call3 = commandCalls[3];
      const call4 = commandCalls[4];
      const call5 = commandCalls[5];
      const call6 = commandCalls[6];
      const call7 = commandCalls[7];
      const call8 = commandCalls[8];
      const call9 = commandCalls[9];
      const call10 = commandCalls[10];

      /* eslint-disable @typescript-eslint/no-unsafe-assignment */
      expect(call0?.[0]).toMatchObject({
        id: 'switcher-plus:open',
        name: 'Open in Standard Mode',
        icon: 'lucide-file-search',
        checkCallback: expect.any(Function),
      });

      expect(call1?.[0]).toMatchObject({
        id: 'switcher-plus:open-editors',
        name: 'Open in Editor Mode',
        icon: 'lucide-file-edit',
        checkCallback: expect.any(Function),
      });

      expect(call2?.[0]).toMatchObject({
        id: 'switcher-plus:open-symbols',
        name: 'Open Symbols for selected suggestion or editor',
        icon: 'lucide-dollar-sign',
        checkCallback: expect.any(Function),
      });

      expect(call3?.[0]).toMatchObject({
        id: 'switcher-plus:open-symbols-active',
        name: 'Open Symbols for the active editor',
        icon: 'lucide-dollar-sign',
        checkCallback: expect.any(Function),
      });

      expect(call4?.[0]).toMatchObject({
        id: 'switcher-plus:open-workspaces',
        name: 'Open in Workspaces Mode',
        icon: 'lucide-album',
        checkCallback: expect.any(Function),
      });

      expect(call5?.[0]).toMatchObject({
        id: 'switcher-plus:open-headings',
        name: 'Open in Headings Mode',
        icon: 'lucide-file-search',
        checkCallback: expect.any(Function),
      });

      expect(call6?.[0]).toMatchObject({
        id: 'switcher-plus:open-starred',
        name: 'Open in Bookmarks Mode',
        icon: 'lucide-bookmark',
        checkCallback: expect.any(Function),
      });

      expect(call7?.[0]).toMatchObject({
        id: 'switcher-plus:open-commands',
        name: 'Open in Commands Mode',
        icon: 'run-command',
        checkCallback: expect.any(Function),
      });

      expect(call8?.[0]).toMatchObject({
        id: 'switcher-plus:open-related-items',
        name: 'Open Related Items for selected suggestion or editor',
        icon: 'lucide-file-plus-2',
        checkCallback: expect.any(Function),
      });

      expect(call9?.[0]).toMatchObject({
        id: 'switcher-plus:open-related-items-active',
        name: 'Open Related Items for the active editor',
        icon: 'lucide-file-plus-2',
        checkCallback: expect.any(Function),
      });

      expect(call10?.[0]).toMatchObject({
        id: 'switcher-plus:open-vaults',
        name: 'Open in Vaults Mode',
        icon: 'vault',
        checkCallback: expect.any(Function),
      });
      /* eslint-enable @typescript-eslint/no-unsafe-assignment */
    });

    it('should call registerRibbonCommandIcons', async () => {
      const spy = jest.spyOn(sut, 'registerRibbonCommandIcons');

      await sut.onload();

      expect(spy).toHaveBeenCalledTimes(1);

      spy.mockRestore();
    });

    it('should call updateLauncherButtonOverrides with true', async () => {
      const spy = jest.spyOn(sut, 'updateLauncherButtonOverrides');

      await sut.onload();

      expect(spy).toHaveBeenCalledWith(true);

      spy.mockRestore();
    });
  });

  describe('registerCommand', () => {
    beforeEach(() => {
      sut.options = settings;
    });

    it('should call addCommand with correct id, name, and icon', () => {
      sut.registerCommand('test-id', 'Test Name', Mode.Standard, 'test-icon');

      expect(sut.addCommand).toHaveBeenCalledWith({
        id: 'test-id',
        name: 'Test Name',
        icon: 'test-icon',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        checkCallback: expect.any(Function),
      });
    });

    it('should pass undefined icon when iconId is not provided', () => {
      sut.registerCommand('test-id', 'Test Name', Mode.Standard);

      expect(sut.addCommand).toHaveBeenCalledWith({
        id: 'test-id',
        name: 'Test Name',
        icon: undefined,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        checkCallback: expect.any(Function),
      });
    });

    it('should return true without calling createAndOpen when isChecking is true', () => {
      sut.registerCommand('test-id', 'Test Name', Mode.Standard, 'test-icon');

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const commandCall = (sut.addCommand as jest.Mock<Command>).mock.calls[0]?.[0];
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const checkCallback = commandCall?.checkCallback as
        | ((checking: boolean) => boolean)
        | undefined;

      const result = checkCallback?.(true);

      expect(result).toBe(true);
      expect(createAndOpenSpy).not.toHaveBeenCalled();
    });

    it('should call SwitcherPlusModal.createAndOpen with correct mode when not checking', () => {
      sut.registerCommand('test-id', 'Test Name', Mode.EditorList, 'test-icon');

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const commandCall = (sut.addCommand as jest.Mock<Command>).mock.calls[0]?.[0];
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const checkCallback = commandCall?.checkCallback as
        | ((checking: boolean) => boolean)
        | undefined;

      const result = checkCallback?.(false);

      expect(createAndOpenSpy).toHaveBeenCalledWith(
        mockApp,
        sut,
        Mode.EditorList,
        undefined,
      );
      expect(result).toBe(true);
    });

    it('should pass sessionOpts to SwitcherPlusModal.createAndOpen when provided', () => {
      const sessionOpts = { useActiveEditorAsSource: true };

      sut.registerCommand(
        'test-id',
        'Test Name',
        Mode.SymbolList,
        'test-icon',
        sessionOpts,
      );

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const commandCall = (sut.addCommand as jest.Mock<Command>).mock.calls[0]?.[0];
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const checkCallback = commandCall?.checkCallback as
        | ((checking: boolean) => boolean)
        | undefined;

      checkCallback?.(false);

      expect(createAndOpenSpy).toHaveBeenCalledWith(
        mockApp,
        sut,
        Mode.SymbolList,
        sessionOpts,
      );
    });
  });

  describe('registerRibbonCommandIcons', () => {
    beforeEach(() => {
      sut.options = settings;
      jest
        .spyOn(sut, 'commandDefinitions', 'get')
        .mockReturnValue(getCommandDefinitions(settings));
      settings.enabledRibbonCommands = ['HeadingsList', 'SymbolList'];
    });

    it('should call addRibbonIcon for each mode in enabledRibbonCommands setting', () => {
      sut.registerRibbonCommandIcons();

      expect(sut.addRibbonIcon).toHaveBeenCalledTimes(2);
      expect(sut.addRibbonIcon).toHaveBeenCalledWith(
        'lucide-file-search',
        'Open in Headings Mode',
        expect.any(Function),
      );
      expect(sut.addRibbonIcon).toHaveBeenCalledWith(
        'lucide-dollar-sign',
        'Open Symbols for the active editor',
        expect.any(Function),
      );
    });

    it('should configure ribbon icon callback to call SwitcherPlusModal.createAndOpen with correct mode', () => {
      sut.registerRibbonCommandIcons();

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const ribbonCallForHeadings = (
        sut.addRibbonIcon as jest.Mock<HTMLElement>
      ).mock.calls.find(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        (call) => call[1] === 'Open in Headings Mode',
      );
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const callback = ribbonCallForHeadings?.[2] as (() => void) | undefined;

      callback?.();

      expect(createAndOpenSpy).toHaveBeenCalledWith(mockApp, sut, Mode.HeadingsList);
    });

    it('should remove previously registered ribbon icons when called again', () => {
      const mockRibbonEl1 = mock<HTMLElement>();
      const mockRibbonEl2 = mock<HTMLElement>();

      (sut.addRibbonIcon as jest.Mock)
        .mockReturnValueOnce(mockRibbonEl1)
        .mockReturnValueOnce(mockRibbonEl2);

      sut.registerRibbonCommandIcons();

      expect(mockRibbonEl1.remove).not.toHaveBeenCalled();
      expect(mockRibbonEl2.remove).not.toHaveBeenCalled();

      const mockRibbonEl3 = mock<HTMLElement>();
      const mockRibbonEl4 = mock<HTMLElement>();

      (sut.addRibbonIcon as jest.Mock)
        .mockReturnValueOnce(mockRibbonEl3)
        .mockReturnValueOnce(mockRibbonEl4);

      sut.registerRibbonCommandIcons();

      expect(mockRibbonEl1.remove).toHaveBeenCalledTimes(1);
      expect(mockRibbonEl2.remove).toHaveBeenCalledTimes(1);
    });

    it('should handle empty enabledRibbonCommands setting', () => {
      settings.enabledRibbonCommands = [];

      sut.registerRibbonCommandIcons();

      expect(sut.addRibbonIcon).not.toHaveBeenCalled();
    });
  });

  describe('updateLauncherButtonOverrides', () => {
    beforeEach(() => {
      sut.options = settings;
      jest
        .spyOn(sut, 'commandDefinitions', 'get')
        .mockReturnValue(getCommandDefinitions(settings));
      settings.mobileLauncher.modeString = 'HeadingsList';
      settings.mobileLauncher.isEnabled = true;
      settings.mobileLauncher.isEmptyTabButtonEnabled = true;
    });

    it('should call MobileLauncher.removeMobileLauncherOverride when called', () => {
      sut.updateLauncherButtonOverrides(true);

      expect(removeMobileLauncherSpy).toHaveBeenCalledTimes(1);
    });

    it('should call EmptyTabMonitor.removeEmptyTabButtons when called', () => {
      sut.updateLauncherButtonOverrides(true);

      expect(removeEmptyTabButtonsSpy).toHaveBeenCalledWith(mockApp.workspace);
    });

    it('should call MobileLauncher.installMobileLauncherOverride when isInstall is true', () => {
      sut.updateLauncherButtonOverrides(true);

      expect(installMobileLauncherSpy).toHaveBeenCalledWith(
        mockApp,
        settings.mobileLauncher,
        expect.any(Function),
      );
    });

    it('should call EmptyTabMonitor.installEmptyTabMonitor when isInstall is true', () => {
      sut.updateLauncherButtonOverrides(true);

      expect(installEmptyTabMonitorSpy).toHaveBeenCalledWith(sut, {
        isEnabled: true,
        buttonLabel: 'Switcher++: Open in Headings Mode',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        onclickListener: expect.any(Function),
      });
    });

    it('should use first matching command name for button label', () => {
      settings.mobileLauncher.modeString = 'SymbolList';

      sut.updateLauncherButtonOverrides(true);

      expect(installEmptyTabMonitorSpy).toHaveBeenCalledWith(
        sut,
        expect.objectContaining({
          buttonLabel: 'Switcher++: Open Symbols for selected suggestion or editor',
        }),
      );
    });

    it('should use empty string for button label when no command matches mode', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
      settings.mobileLauncher.modeString = 'InvalidMode' as any;

      sut.updateLauncherButtonOverrides(true);

      expect(installEmptyTabMonitorSpy).toHaveBeenCalledWith(
        sut,
        expect.objectContaining({
          buttonLabel: 'Switcher++: ',
        }),
      );
    });

    it('should pass onclick listener that calls SwitcherPlusModal.createAndOpen with correct mode', () => {
      settings.mobileLauncher.modeString = 'EditorList';

      sut.updateLauncherButtonOverrides(true);

      const installCall = installMobileLauncherSpy.mock.calls[0] as unknown[];
      const onclickListener = installCall?.[2] as (() => void) | undefined;

      onclickListener?.();

      expect(createAndOpenSpy).toHaveBeenCalledWith(mockApp, sut, Mode.EditorList);
    });

    it('should pass isEnabled false to EmptyTabMonitor when mobileLauncher.isEnabled is false', () => {
      settings.mobileLauncher.isEnabled = false;

      sut.updateLauncherButtonOverrides(true);

      expect(installEmptyTabMonitorSpy).toHaveBeenCalledWith(
        sut,
        expect.objectContaining({
          isEnabled: false,
        }),
      );
    });

    it('should pass isEnabled false to EmptyTabMonitor when isEmptyTabButtonEnabled is false', () => {
      settings.mobileLauncher.isEmptyTabButtonEnabled = false;

      sut.updateLauncherButtonOverrides(true);

      expect(installEmptyTabMonitorSpy).toHaveBeenCalledWith(
        sut,
        expect.objectContaining({
          isEnabled: false,
        }),
      );
    });

    it('should not call install methods when isInstall is false', () => {
      sut.updateLauncherButtonOverrides(false);

      expect(installMobileLauncherSpy).not.toHaveBeenCalled();
      expect(installEmptyTabMonitorSpy).not.toHaveBeenCalled();
    });

    it('should still call remove methods when isInstall is false', () => {
      sut.updateLauncherButtonOverrides(false);

      expect(removeMobileLauncherSpy).toHaveBeenCalledTimes(1);
      expect(removeEmptyTabButtonsSpy).toHaveBeenCalledWith(mockApp.workspace);
    });
  });

  describe('onunload', () => {
    beforeEach(() => {
      sut.options = settings;
    });

    it('should call updateLauncherButtonOverrides with false', () => {
      const spy = jest.spyOn(sut, 'updateLauncherButtonOverrides');

      sut.onunload();

      expect(spy).toHaveBeenCalledWith(false);

      spy.mockRestore();
    });
  });
});
