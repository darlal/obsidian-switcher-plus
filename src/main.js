/* eslint-disable import/no-unresolved */
import { Plugin } from 'obsidian';
import { Mode } from './modules/constants';
import createSwitcherPlusModal from './modules/switcherPlus';

export default class SwitcherPlusPlugin extends Plugin {
  onload() {
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
        const modal = this.getModal(this.app);
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

  getModal(app) {
    let { modal } = this;
    if (modal) { return modal; }

    modal = createSwitcherPlusModal(app);
    this.modal = modal;
    return modal;
  }
}
