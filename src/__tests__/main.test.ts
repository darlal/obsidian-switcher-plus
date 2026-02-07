import { mock, MockProxy, mockReset } from 'jest-mock-extended';
import { App, Command, Plugin } from 'obsidian';
import SwitcherPlusPlugin from 'src/main';
import { SwitcherPlusSettings, SwitcherPlusSettingTab } from 'src/settings';
import { createSwitcherPlus, EmptyTabMonitor, MobileLauncher } from 'src/switcherPlus';
import { Mode, SwitcherPlus } from 'src/types';

jest.mock('src/switcherPlus', () => ({
  createSwitcherPlus: jest.fn(),
  EmptyTabMonitor: {
    installEmptyTabMonitor: jest.fn(),
    removeEmptyTabButtons: jest.fn(),
  },
  MobileLauncher: {
    installMobileLauncherOverride: jest.fn(),
    removeMobileLauncherOverride: jest.fn(),
  },
}));

jest.mock('src/settings', () => {
  const actualSettings = jest.requireActual<typeof import('src/settings')>(
    'src/settings',
  );

  class MockSwitcherPlusSettings extends actualSettings.SwitcherPlusSettings {
    async updateDataAndLoadSettings(): Promise<void> {
      // Mock implementation - do nothing
    }
  }

  return {
    ...actualSettings,
    SwitcherPlusSettings: MockSwitcherPlusSettings,
    SwitcherPlusSettingTab: jest.fn(),
  };
});

describe('SwitcherPlusPlugin', () => {
  let mockApp: MockProxy<App>;
  let sut: SwitcherPlusPlugin;
  let settings: SwitcherPlusSettings;

  beforeAll(() => {
    mockApp = mock<App>();
    settings = new SwitcherPlusSettings(null);
  });

  beforeEach(() => {
    mockReset(mockApp);
    jest.clearAllMocks();

    sut = Object.create(SwitcherPlusPlugin.prototype);
    sut.app = mockApp;
    sut.manifest = {} as any;
    sut.addCommand = jest.fn();
    sut.addRibbonIcon = jest.fn();
    sut.addSettingTab = jest.fn();
  });

  describe('onload', () => {
    it('should register setting tab', async () => {
      await sut.onload();

      expect(sut.addSettingTab).toHaveBeenCalledTimes(1);
      expect(SwitcherPlusSettingTab).toHaveBeenCalledWith(mockApp, sut, sut.options);
    });

    it('should register all 11 commands with correct id, name, and icon', async () => {
      await sut.onload();

      expect(sut.addCommand).toHaveBeenCalledTimes(11);

      const commandCalls = (sut.addCommand as jest.Mock).mock.calls;

      expect(commandCalls[0][0]).toMatchObject({
        id: 'switcher-plus:open',
        name: 'Open in Standard Mode',
        icon: 'lucide-file-search',
        checkCallback: expect.any(Function),
      });

      expect(commandCalls[1][0]).toMatchObject({
        id: 'switcher-plus:open-editors',
        name: 'Open in Editor Mode',
        icon: 'lucide-file-edit',
        checkCallback: expect.any(Function),
      });

      expect(commandCalls[2][0]).toMatchObject({
        id: 'switcher-plus:open-symbols',
        name: 'Open Symbols for selected suggestion or editor',
        icon: 'lucide-dollar-sign',
        checkCallback: expect.any(Function),
      });

      expect(commandCalls[3][0]).toMatchObject({
        id: 'switcher-plus:open-symbols-active',
        name: 'Open Symbols for the active editor',
        icon: 'lucide-dollar-sign',
        checkCallback: expect.any(Function),
      });

      expect(commandCalls[4][0]).toMatchObject({
        id: 'switcher-plus:open-workspaces',
        name: 'Open in Workspaces Mode',
        icon: 'lucide-album',
        checkCallback: expect.any(Function),
      });

      expect(commandCalls[5][0]).toMatchObject({
        id: 'switcher-plus:open-headings',
        name: 'Open in Headings Mode',
        icon: 'lucide-file-search',
        checkCallback: expect.any(Function),
      });

      expect(commandCalls[6][0]).toMatchObject({
        id: 'switcher-plus:open-starred',
        name: 'Open in Bookmarks Mode',
        icon: 'lucide-bookmark',
        checkCallback: expect.any(Function),
      });

      expect(commandCalls[7][0]).toMatchObject({
        id: 'switcher-plus:open-commands',
        name: 'Open in Commands Mode',
        icon: 'run-command',
        checkCallback: expect.any(Function),
      });

      expect(commandCalls[8][0]).toMatchObject({
        id: 'switcher-plus:open-related-items',
        name: 'Open Related Items for selected suggestion or editor',
        icon: 'lucide-file-plus-2',
        checkCallback: expect.any(Function),
      });

      expect(commandCalls[9][0]).toMatchObject({
        id: 'switcher-plus:open-related-items-active',
        name: 'Open Related Items for the active editor',
        icon: 'lucide-file-plus-2',
        checkCallback: expect.any(Function),
      });

      expect(commandCalls[10][0]).toMatchObject({
        id: 'switcher-plus:open-vaults',
        name: 'Open in Vaults Mode',
        icon: 'vault',
        checkCallback: expect.any(Function),
      });
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
        checkCallback: expect.any(Function),
      });
    });

    it('should pass undefined icon when iconId is not provided', () => {
      sut.registerCommand('test-id', 'Test Name', Mode.Standard);

      expect(sut.addCommand).toHaveBeenCalledWith({
        id: 'test-id',
        name: 'Test Name',
        icon: undefined,
        checkCallback: expect.any(Function),
      });
    });

    it('should create checkCallback that calls createModalAndOpen with correct mode', () => {
      const spy = jest.spyOn(sut, 'createModalAndOpen').mockReturnValue(true);

      sut.registerCommand('test-id', 'Test Name', Mode.EditorList, 'test-icon');

      const commandCall = (sut.addCommand as jest.Mock).mock.calls[0][0] as Command;
      const checkCallback = commandCall.checkCallback as (checking: boolean) => boolean;

      const result = checkCallback(false);

      expect(spy).toHaveBeenCalledWith(Mode.EditorList, false, undefined);
      expect(result).toBe(true);

      spy.mockRestore();
    });

    it('should pass sessionOpts to createModalAndOpen when provided', () => {
      const spy = jest.spyOn(sut, 'createModalAndOpen').mockReturnValue(true);
      const sessionOpts = { useActiveEditorAsSource: true };

      sut.registerCommand(
        'test-id',
        'Test Name',
        Mode.SymbolList,
        'test-icon',
        sessionOpts,
      );

      const commandCall = (sut.addCommand as jest.Mock).mock.calls[0][0] as Command;
      const checkCallback = commandCall.checkCallback as (checking: boolean) => boolean;

      checkCallback(false);

      expect(spy).toHaveBeenCalledWith(Mode.SymbolList, false, sessionOpts);

      spy.mockRestore();
    });

    it('should pass isChecking parameter through to createModalAndOpen', () => {
      const spy = jest.spyOn(sut, 'createModalAndOpen').mockReturnValue(true);

      sut.registerCommand('test-id', 'Test Name', Mode.Standard, 'test-icon');

      const commandCall = (sut.addCommand as jest.Mock).mock.calls[0][0] as Command;
      const checkCallback = commandCall.checkCallback as (checking: boolean) => boolean;

      checkCallback(true);

      expect(spy).toHaveBeenCalledWith(Mode.Standard, true, undefined);

      spy.mockRestore();
    });
  });

  describe('registerRibbonCommandIcons', () => {
    beforeEach(() => {
      sut.options = settings;
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

    it('should configure ribbon icon callback to call createModalAndOpen with correct mode', () => {
      const spy = jest.spyOn(sut, 'createModalAndOpen');

      sut.registerRibbonCommandIcons();

      const ribbonCallForHeadings = (sut.addRibbonIcon as jest.Mock).mock.calls.find(
        (call) => call[1] === 'Open in Headings Mode',
      );
      const callback = ribbonCallForHeadings[2] as () => void;

      callback();

      expect(spy).toHaveBeenCalledWith(Mode.HeadingsList, false);

      spy.mockRestore();
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

  describe('createModalAndOpen', () => {
    beforeEach(() => {
      sut.options = settings;
    });

    it('should return true without creating modal when isChecking is true', () => {
      const result = sut.createModalAndOpen(Mode.Standard, true);

      expect(result).toBe(true);
      expect(createSwitcherPlus).not.toHaveBeenCalled();
    });

    it('should call createSwitcherPlus and openInMode when isChecking is false', () => {
      const mockModal = mock<SwitcherPlus>();
      (createSwitcherPlus as jest.Mock).mockReturnValue(mockModal);

      const result = sut.createModalAndOpen(Mode.EditorList, false);

      expect(createSwitcherPlus).toHaveBeenCalledWith(mockApp, sut);
      expect(mockModal.openInMode).toHaveBeenCalledWith({ mode: Mode.EditorList });
      expect(result).toBe(true);
    });

    it('should pass sessionOpts to openInMode when provided', () => {
      const mockModal = mock<SwitcherPlus>();
      (createSwitcherPlus as jest.Mock).mockReturnValue(mockModal);
      const sessionOpts = { useActiveEditorAsSource: true };

      sut.createModalAndOpen(Mode.SymbolList, false, sessionOpts);

      expect(mockModal.openInMode).toHaveBeenCalledWith({
        mode: Mode.SymbolList,
        useActiveEditorAsSource: true,
      });
    });

    it('should return false when createSwitcherPlus returns null', () => {
      (createSwitcherPlus as jest.Mock).mockReturnValue(null);

      const result = sut.createModalAndOpen(Mode.Standard, false);

      expect(result).toBe(false);
      expect(createSwitcherPlus).toHaveBeenCalledWith(mockApp, sut);
    });
  });

  describe('updateLauncherButtonOverrides', () => {
    beforeEach(() => {
      sut.options = settings;
      settings.mobileLauncher.modeString = 'HeadingsList';
      settings.mobileLauncher.isEnabled = true;
      settings.mobileLauncher.isEmptyTabButtonEnabled = true;
    });

    it('should call MobileLauncher.removeMobileLauncherOverride when called', () => {
      sut.updateLauncherButtonOverrides(true);

      expect(MobileLauncher.removeMobileLauncherOverride).toHaveBeenCalledTimes(1);
    });

    it('should call EmptyTabMonitor.removeEmptyTabButtons when called', () => {
      sut.updateLauncherButtonOverrides(true);

      expect(EmptyTabMonitor.removeEmptyTabButtons).toHaveBeenCalledWith(
        mockApp.workspace,
      );
    });

    it('should call MobileLauncher.installMobileLauncherOverride when isInstall is true', () => {
      sut.updateLauncherButtonOverrides(true);

      expect(MobileLauncher.installMobileLauncherOverride).toHaveBeenCalledWith(
        mockApp,
        settings.mobileLauncher,
        expect.any(Function),
      );
    });

    it('should call EmptyTabMonitor.installEmptyTabMonitor when isInstall is true', () => {
      sut.updateLauncherButtonOverrides(true);

      expect(EmptyTabMonitor.installEmptyTabMonitor).toHaveBeenCalledWith(sut, {
        isEnabled: true,
        buttonLabel: 'Switcher++: Open in Headings Mode',
        onclickListener: expect.any(Function),
      });
    });

    it('should use first matching command name for button label', () => {
      settings.mobileLauncher.modeString = 'SymbolList';

      sut.updateLauncherButtonOverrides(true);

      expect(EmptyTabMonitor.installEmptyTabMonitor).toHaveBeenCalledWith(
        sut,
        expect.objectContaining({
          buttonLabel: 'Switcher++: Open Symbols for selected suggestion or editor',
        }),
      );
    });

    it('should use empty string for button label when no command matches mode', () => {
      settings.mobileLauncher.modeString = 'InvalidMode' as any;

      sut.updateLauncherButtonOverrides(true);

      expect(EmptyTabMonitor.installEmptyTabMonitor).toHaveBeenCalledWith(
        sut,
        expect.objectContaining({
          buttonLabel: 'Switcher++: ',
        }),
      );
    });

    it('should pass onclick listener that calls createModalAndOpen with correct mode', () => {
      const spy = jest.spyOn(sut, 'createModalAndOpen');
      settings.mobileLauncher.modeString = 'EditorList';

      sut.updateLauncherButtonOverrides(true);

      const installCall = (MobileLauncher.installMobileLauncherOverride as jest.Mock)
        .mock.calls[0];
      const onclickListener = installCall[2] as () => void;

      onclickListener();

      expect(spy).toHaveBeenCalledWith(Mode.EditorList, false);

      spy.mockRestore();
    });

    it('should pass isEnabled false to EmptyTabMonitor when mobileLauncher.isEnabled is false', () => {
      settings.mobileLauncher.isEnabled = false;

      sut.updateLauncherButtonOverrides(true);

      expect(EmptyTabMonitor.installEmptyTabMonitor).toHaveBeenCalledWith(
        sut,
        expect.objectContaining({
          isEnabled: false,
        }),
      );
    });

    it('should pass isEnabled false to EmptyTabMonitor when isEmptyTabButtonEnabled is false', () => {
      settings.mobileLauncher.isEmptyTabButtonEnabled = false;

      sut.updateLauncherButtonOverrides(true);

      expect(EmptyTabMonitor.installEmptyTabMonitor).toHaveBeenCalledWith(
        sut,
        expect.objectContaining({
          isEnabled: false,
        }),
      );
    });

    it('should not call install methods when isInstall is false', () => {
      sut.updateLauncherButtonOverrides(false);

      expect(MobileLauncher.installMobileLauncherOverride).not.toHaveBeenCalled();
      expect(EmptyTabMonitor.installEmptyTabMonitor).not.toHaveBeenCalled();
    });

    it('should still call remove methods when isInstall is false', () => {
      sut.updateLauncherButtonOverrides(false);

      expect(MobileLauncher.removeMobileLauncherOverride).toHaveBeenCalledTimes(1);
      expect(EmptyTabMonitor.removeEmptyTabButtons).toHaveBeenCalledWith(
        mockApp.workspace,
      );
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
