import type SwitcherPlusPlugin from '../main';

interface Config {
  // types of open views to hide from the suggestion list
  excludeViewTypes: string[];
}

export const DefaultConfig: Config = {
  excludeViewTypes: ['empty'],
};

interface SettingsData {
  alwaysNewPaneForSymbols: boolean;
  symbolsInLineOrder: boolean;
  showExistingOnly: boolean;
  editorListCommand: string;
  symbolListCommand: string;
}

function getDefaultData(): SettingsData {
  return {
    alwaysNewPaneForSymbols: false,
    symbolsInLineOrder: true,
    showExistingOnly: false,
    editorListCommand: 'edt ',
    symbolListCommand: '@',
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

  get editorListPlaceholderText(): string {
    return getDefaultData().editorListCommand;
  }

  get symbolListPlaceholderText(): string {
    return getDefaultData().symbolListCommand;
  }

  get editorListCommand(): string {
    return this.data.editorListCommand;
  }

  set editorListCommand(value: string) {
    this.data.editorListCommand = value;
  }

  get symbolListCommand(): string {
    return this.data.symbolListCommand;
  }

  set symbolListCommand(value: string) {
    this.data.symbolListCommand = value;
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
