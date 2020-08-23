import { Mode } from './modules/constants';
import createSwitcherPlusModal from './modules/switcherPlus';

class SwitcherPlusVolcanoPlugin {
  constructor() {
    this.id = 'switcher-plus';
    this.name = 'Quick Switcher++';
    this.description = 'Enhanced Quick Switcher, search open panels, and symbols.';
    this.defaultOn = false;

    this.app = null;
    this.instance = null;
    this.modal = null;
  }

  init(app, instance) {
    this.app = app;
    this.instance = instance;

    this.registerGlobalCommands(instance);
  }

  registerGlobalCommands(instance) {
    instance.registerGlobalCommand({
      id: 'switcher-plus:open',
      name: 'Open Quick Switcher++',
      hotkeys: [],
      callback: () => {
        if (this.modal) { this.modal.openInMode(Mode.Standard); }
      },
    });

    instance.registerGlobalCommand({
      id: 'switcher-plus:open-editors',
      name: 'Open Quick Switcher++ in Editor Mode',
      hotkeys: [],
      callback: () => {
        if (this.modal) { this.modal.openInMode(Mode.EditorList); }
      },
    });

    instance.registerGlobalCommand({
      id: 'switcher-plus:open-symbols',
      name: 'Open Quick Switcher++ in Symbol Mode',
      hotkeys: [],
      callback: () => {
        if (this.modal) { this.modal.openInMode(Mode.SymbolList); }
      },
    });
  }

  onEnable() {
    const modal = createSwitcherPlusModal(this.app);
    if (modal) { this.modal = modal; }
  }

  onDisable() {
    this.modal = null;
  }
}

export default () => new SwitcherPlusVolcanoPlugin();
