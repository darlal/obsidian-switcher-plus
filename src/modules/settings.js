export const Config = {
  // command to enable filtering of open editors
  editorListCommand: 'edt ',
  // command to enable filtering of file symbols
  symbolListCommand: '@',
  // types of open views to hide from the suggestion list
  excludeViewTypes: ['empty'],
};

export class Settings {
  get alwaysNewPaneForSymbols() {
    const { data } = this;

    let val = null;
    if (data) { val = data.alwaysNewPaneForSymbols; }

    return val;
  }

  set alwaysNewPaneForSymbols(value) {
    let { data } = this;

    if (!data) {
      data = Settings.getDefaultData();
      this.data = data;
    }

    data.alwaysNewPaneForSymbols = value;
  }

  constructor(plugin) {
    this.plugin = plugin;
    this.data = null;
  }

  async loadSettings() {
    const { plugin } = this;
    let data = await plugin.loadData();

    if (!data) { data = Settings.getDefaultData(); }
    this.data = data;
  }

  static getDefaultData() {
    return {
      alwaysNewPaneForSymbols: false,
    };
  }

  saveSettings() {
    const { plugin, data } = this;
    if (plugin && data) { plugin.saveData(data); }
  }
}
