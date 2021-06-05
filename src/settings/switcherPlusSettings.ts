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
  symbolsInLineOrder: boolean;
  showExistingOnly: boolean;
}

function getDefaultData(): SettingsData {
  return {
    alwaysNewPaneForSymbols: false,
    symbolsInLineOrder: true,
    showExistingOnly: false,
  };
}

export class SwitcherPlusSettings {
  private data: SettingsData;

  get alwaysNewPaneForSymbols(): boolean {
    return this.data.alwaysNewPaneForSymbols;
  }

  set alwaysNewPaneForSymbols(value: boolean) {
    this.data.alwaysNewPaneForSymbols = value;
  }

  get symbolsInlineOrder(): boolean {
    return this.data.symbolsInLineOrder;
  }

  set symbolsInlineOrder(value: boolean) {
    this.data.symbolsInLineOrder = value;
  }

  get showExistingOnly(): boolean {
    return this.data.showExistingOnly;
  }

  set showExistingOnly(value: boolean) {
    this.data.showExistingOnly = value;
  }

  constructor(private plugin: SwitcherPlusPlugin) {
    this.data = getDefaultData();
  }

  async loadSettings(): Promise<void> {
    const { plugin } = this;
    const savedData = (await plugin.loadData()) as SettingsData;
    this.data = { ...getDefaultData(), ...savedData };
  }

  saveSettings(): void {
    const { plugin, data } = this;
    if (plugin && data) {
      plugin.saveData(data).catch(() => {
        console.log('Switcher++: Error saving settings data');
      });
    }
  }
}
