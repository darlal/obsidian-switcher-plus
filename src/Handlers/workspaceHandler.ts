import { getInternalPluginById } from 'src/utils';
import { Mode } from 'src/types';
import { SwitcherPlusSettings } from 'src/settings';
import { InputInfo } from 'src/switcherPlus/inputInfo';
import { App } from 'obsidian';

export const WORKSPACE_PLUGIN_ID = 'workspace';

export class WorkspaceHandler {
  constructor(private app: App, private settings: SwitcherPlusSettings) {}

  validateCommand(inputInfo: InputInfo, index: number): void {
    const { workspaceListCommand } = this.settings;
    const { workspaceCmd, inputText } = inputInfo;

    if (this.isWorkspacePluginEnabled()) {
      inputInfo.mode = Mode.WorkspaceList;
      workspaceCmd.index = index;
      workspaceCmd.parsedInput = inputText.slice(workspaceListCommand.length);
      workspaceCmd.isValidated = true;
    }
  }

  private isWorkspacePluginEnabled(): boolean {
    const plugin = getInternalPluginById(this.app, WORKSPACE_PLUGIN_ID);
    return plugin?.enabled as boolean;
  }
}
