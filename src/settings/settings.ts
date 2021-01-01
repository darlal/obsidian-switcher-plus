import type SwitcherPlusPlugin from '../main';

interface Config {
  // command to enable filtering of open editors
  editorListCommand: string;
  // command to enable filtering of file symbols
  symbolListCommand: string;
  // types of open views to hide from the suggestion list
  excludeViewTypes: string[];
}

export const DefaultConfig: Config = {
  editorListCommand: 'edt ',
  symbolListCommand: '@',
  excludeViewTypes: ['empty'],
};

interface SettingsData {
  alwaysNewPaneForSymbols: boolean;
}

function getDefaultData(): SettingsData {
  return {
    alwaysNewPaneForSymbols: false,
  };
}

export class Settings {
  private data: SettingsData;

  get alwaysNewPaneForSymbols(): boolean {
    const { data } = this;
    return data.alwaysNewPaneForSymbols;
  }

  set alwaysNewPaneForSymbols(value: boolean) {
    const { data } = this;
    data.alwaysNewPaneForSymbols = value;
  }

  constructor(private plugin: SwitcherPlusPlugin) {
    this.data = getDefaultData();
  }

  async loadSettings(): Promise<void> {
    const { plugin } = this;
    this.data = Object.assign(getDefaultData(), await plugin.loadData());
  }

  async saveSettings(): Promise<void> {
    const { plugin, data } = this;
    if (plugin && data) {
      await plugin.saveData(data);
    }
  }
}
