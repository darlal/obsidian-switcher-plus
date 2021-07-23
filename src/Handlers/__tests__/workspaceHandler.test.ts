/* eslint-disable @typescript-eslint/no-explicit-any */
import { Mode } from 'src/types';
import { InputInfo } from 'src/switcherPlus';
import { WorkspaceHandler, WORKSPACE_PLUGIN_ID } from 'src/Handlers';
import { SwitcherPlusSettings } from 'src/settings/switcherPlusSettings';
import { workspaceTrigger } from 'src/__fixtures__/modeTrigger.fixture';
import { App } from 'obsidian';

describe('workspaceHandler', () => {
  describe('validateCommand', () => {
    let inputText: string;
    let startIndex: number;
    let settings: SwitcherPlusSettings;
    let sut: WorkspaceHandler;
    let getPluginByIdSpy: jest.SpyInstance;
    let workspaceCmdSpy: jest.SpyInstance;

    beforeAll(() => {
      const app = new App();
      inputText = `${workspaceTrigger}foo`;
      startIndex = workspaceTrigger.length;

      getPluginByIdSpy = jest.spyOn((app as any).internalPlugins, 'getPluginById');
      settings = new SwitcherPlusSettings(null);
      workspaceCmdSpy = jest
        .spyOn(settings, 'workspaceListCommand', 'get')
        .mockReturnValue(workspaceTrigger);

      sut = new WorkspaceHandler(app, settings);
    });

    it('should validate parsed input with workspace plugin enabled', () => {
      getPluginByIdSpy.mockReturnValueOnce({ enabled: true });
      const inputInfo = new InputInfo(inputText);

      sut.validateCommand(inputInfo, startIndex);
      expect(inputInfo.mode).toBe(Mode.WorkspaceList);

      const { workspaceCmd } = inputInfo;
      expect(workspaceCmd.parsedInput).toBe('foo');
      expect(workspaceCmd.isValidated).toBe(true);
      expect(workspaceCmdSpy).toHaveBeenCalled();
      expect(getPluginByIdSpy).toHaveBeenCalledWith(WORKSPACE_PLUGIN_ID);
    });

    it('should not validate parsed input with workspace plugin disabled', () => {
      getPluginByIdSpy.mockReturnValueOnce({ enabled: false });
      const inputInfo = new InputInfo(inputText);

      sut.validateCommand(inputInfo, startIndex);
      expect(inputInfo.mode).toBe(Mode.Standard);

      const { workspaceCmd } = inputInfo;
      expect(workspaceCmd.parsedInput).toBe(null);
      expect(workspaceCmd.isValidated).toBe(false);
      expect(workspaceCmdSpy).toHaveBeenCalled();
      expect(getPluginByIdSpy).toHaveBeenCalledWith(WORKSPACE_PLUGIN_ID);
    });
  });
});
