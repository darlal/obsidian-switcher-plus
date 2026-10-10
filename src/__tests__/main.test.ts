import { mock, MockProxy, mockReset } from 'jest-mock-extended';
import { App, Notice } from 'obsidian';
import SwitcherPlusPlugin from 'src/main';
import { SwitcherPlusSettings } from 'src/settings';
import {
  EmptyTabMonitor,
  MobileLauncher,
  CommandRegistrar,
  RibbonIconManager,
  getCommandDefinitions,
} from 'src/switcherPlus';
import { Mode } from 'src/types';
import * as Utils from 'src/utils/utils';

describe('SwitcherPlusPlugin', () => {
  let mockApp: MockProxy<App>;
  let sut: SwitcherPlusPlugin;
  let settings: SwitcherPlusSettings;
  let updateDataAndLoadSettingsSpy: jest.SpyInstance;
  let registerCommandsSpy: jest.SpyInstance;
  let registerRibbonIconsSpy: jest.SpyInstance;
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

    registerCommandsSpy = jest
      .spyOn(CommandRegistrar, 'registerCommands')
      .mockImplementation();

    registerRibbonIconsSpy = jest
      .spyOn(RibbonIconManager, 'registerRibbonIcons')
      .mockImplementation();

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
    sut.addSettingTab = jest.fn();
  });

  afterEach(() => {
    updateDataAndLoadSettingsSpy.mockRestore();
    registerCommandsSpy.mockRestore();
    registerRibbonIconsSpy.mockRestore();
    installMobileLauncherSpy.mockRestore();
    removeMobileLauncherSpy.mockRestore();
    installEmptyTabMonitorSpy.mockRestore();
    removeEmptyTabButtonsSpy.mockRestore();
  });

  describe('onload', () => {
    describe('saved trigger conflicts', () => {
      let logWarnSpy: jest.SpyInstance;

      beforeEach(() => {
        (Notice as jest.Mock).mockClear();
        logWarnSpy = jest.spyOn(Utils, 'logWarn').mockImplementation();
      });

      afterEach(() => {
        logWarnSpy.mockRestore();
      });

      it('warns for an existing loaded config once per conflict per session', async () => {
        updateDataAndLoadSettingsSpy.mockImplementation(function (
          this: SwitcherPlusSettings,
        ) {
          this.symbolListCommand = '>';
          return Promise.resolve();
        });
        await sut.onload();
        sut.checkTriggerConflicts();
        sut.checkTriggerConflicts();
        expect(Notice).toHaveBeenCalledTimes(1);
        expect(Notice).toHaveBeenCalledWith(
          expect.stringContaining('Symbol mode ">" and Command mode ">"'),
          10000,
        );
        expect(logWarnSpy).toHaveBeenCalledTimes(1);
        expect(logWarnSpy).toHaveBeenCalledWith(expect.stringContaining('same trigger'));
      });

      it('does not warn about distinguishable exact and canonical triggers', async () => {
        updateDataAndLoadSettingsSpy.mockImplementation(function (
          this: SwitcherPlusSettings,
        ) {
          this.symbolListCommand = '》';
          return Promise.resolve();
        });
        await sut.onload();
        expect(Notice).not.toHaveBeenCalled();
        expect(logWarnSpy).not.toHaveBeenCalled();
      });

      it('warns about each escape conflict and resets deduplication on a new load', async () => {
        updateDataAndLoadSettingsSpy.mockImplementation(function (
          this: SwitcherPlusSettings,
        ) {
          this.escapeCmdChar = '＞';
          this.symbolListCommand = '>';
          return Promise.resolve();
        });
        await sut.onload();
        sut.checkTriggerConflicts();
        expect(Notice).toHaveBeenCalledTimes(2);
        await sut.onload();
        expect(Notice).toHaveBeenCalledTimes(4);
        expect(logWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('escape character'),
        );
      });

      it('notifies again in an independent plugin instance', async () => {
        updateDataAndLoadSettingsSpy.mockImplementation(function (
          this: SwitcherPlusSettings,
        ) {
          this.symbolListCommand = '>';
          return Promise.resolve();
        });
        await sut.onload();
        const second = Object.create(SwitcherPlusPlugin.prototype) as SwitcherPlusPlugin;
        second.app = mockApp;
        second.manifest = {} as SwitcherPlusPlugin['manifest'];
        second.addCommand = jest.fn();
        second.addSettingTab = jest.fn();
        await second.onload();
        expect(Notice).toHaveBeenCalledTimes(2);
      });
    });

    it('should call addSettingTab', async () => {
      await sut.onload();

      expect(sut.addSettingTab).toHaveBeenCalledTimes(1);
    });

    it('should delegate command registration to CommandRegistrar', async () => {
      await sut.onload();

      expect(registerCommandsSpy).toHaveBeenCalledWith(sut, sut.commandDefinitions);
    });

    it('should delegate ribbon icon registration to RibbonIconManager', async () => {
      await sut.onload();

      expect(registerRibbonIconsSpy).toHaveBeenCalledWith(sut, sut.commandDefinitions);
    });

    it('should call updateLauncherButtonOverrides with true', async () => {
      const spy = jest.spyOn(sut, 'updateLauncherButtonOverrides');

      await sut.onload();

      expect(spy).toHaveBeenCalledWith(true);

      spy.mockRestore();
    });
  });

  describe('registerRibbonCommandIcons', () => {
    it('should delegate to RibbonIconManager.registerRibbonIcons', () => {
      sut.options = settings;
      jest
        .spyOn(sut, 'commandDefinitions', 'get')
        .mockReturnValue(getCommandDefinitions(settings));

      sut.registerRibbonCommandIcons();

      expect(registerRibbonIconsSpy).toHaveBeenCalledWith(sut, sut.commandDefinitions);
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
        sut,
        settings.mobileLauncher,
        Mode.HeadingsList,
      );
    });

    it('should call EmptyTabMonitor.installEmptyTabMonitor when isInstall is true', () => {
      sut.updateLauncherButtonOverrides(true);

      expect(installEmptyTabMonitorSpy).toHaveBeenCalledWith(sut, {
        isEnabled: true,
        buttonLabel: 'Switcher++: Open in Headings Mode',
        mode: Mode.HeadingsList,
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
      settings.mobileLauncher.modeString = 'InvalidMode';

      sut.updateLauncherButtonOverrides(true);

      expect(installEmptyTabMonitorSpy).toHaveBeenCalledWith(
        sut,
        expect.objectContaining({
          buttonLabel: 'Switcher++: ',
        }),
      );
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
