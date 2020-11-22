/* eslint-disable import/no-unresolved */
import { Plugin } from 'obsidian';
import { Mode } from './modules/constants';
import { Settings } from './modules/settings';
import SettingTab from './modules/settingTab';
import createSwitcherPlusModal from './modules/switcherPlus';

export default class SwitcherPlusPlugin extends Plugin {
  async onload() {
    const settings = new Settings(this);
    await settings.loadSettings();
    this.settings = settings;
    this.addSettingTab(new SettingTab(this.app, this));

    this.registerCommand('switcher-plus:open',
      'Open', Mode.Standard);
    this.registerCommand('switcher-plus:open-editors',
      'Open in Editor Mode', Mode.EditorList);
    this.registerCommand('switcher-plus:open-symbols',
      'Open in Symbol Mode', Mode.SymbolList);
  }

  onunload() {
    this.modal = null;
  }

  registerCommand(id, name, mode) {
    this.addCommand({
      id,
      name,
      hotkeys: [],
      checkCallback: (checking) => {
        const modal = this.getModal();
        if (modal) {
          if (!checking) {
            modal.openInMode(mode);
          }

          return true;
        }

        return false;
      },
    });
  }

  getModal() {
    let { modal } = this;
    const { app, settings } = this;
    if (modal) { return modal; }

    modal = createSwitcherPlusModal(app, settings);
    this.modal = modal;
    return modal;
  }
}
