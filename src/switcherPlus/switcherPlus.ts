import { SwitcherPlusKeymap } from './switcherPlusKeymap';
import { getSystemSwitcherInstance } from 'src/utils';
import { ModeHandler } from './modeHandler';
import SwitcherPlusPlugin from 'src/main';
import { App, QuickSwitcherOptions } from 'obsidian';
import { SystemSwitcher, SwitcherPlus, AnySuggestion, Mode } from 'src/types';

interface SystemSwitcherConstructor extends SystemSwitcher {
  new (app: App, builtInOptions: QuickSwitcherOptions): SystemSwitcher;
}

export function createSwitcherPlus(app: App, plugin: SwitcherPlusPlugin): SwitcherPlus {
  const SystemSwitcherModal = getSystemSwitcherInstance(app)
    ?.QuickSwitcherModal as SystemSwitcherConstructor;

  if (!SystemSwitcherModal) {
    console.log(
      'Switcher++: unable to extend system switcher. Plugin UI will not be loaded. Use the builtin switcher instead.',
    );
    return null;
  }

  const SwitcherPlusModal = class extends SystemSwitcherModal implements SwitcherPlus {
    private exMode: ModeHandler;

    constructor(app: App, public plugin: SwitcherPlusPlugin) {
      super(app, plugin.options.builtInSystemOptions);

      plugin.options.shouldShowAlias = this.shouldShowAlias;
      const exKeymap = new SwitcherPlusKeymap(this.scope, this.chooser, this);
      this.exMode = new ModeHandler(app, plugin.options, exKeymap);
    }

    openInMode(mode: Mode): void {
      this.exMode.setSessionOpenMode(mode, this.chooser);
      super.open();
    }

    onOpen(): void {
      this.exMode.onOpen();
      super.onOpen();
    }

    onClose() {
      super.onClose();
      this.exMode.onClose();
    }

    protected updateSuggestions(): void {
      const { exMode, inputEl, chooser } = this;
      exMode.insertSessionOpenModeCommandString(inputEl);

      if (!exMode.updateSuggestions(inputEl.value, chooser)) {
        super.updateSuggestions();
      }
    }

    onChooseSuggestion(item: AnySuggestion, evt: MouseEvent | KeyboardEvent) {
      if (!this.exMode.onChooseSuggestion(item, evt)) {
        super.onChooseSuggestion(item, evt);
      }
    }

    renderSuggestion(value: AnySuggestion, parentEl: HTMLElement) {
      if (!this.exMode.renderSuggestion(value, parentEl)) {
        super.renderSuggestion(value, parentEl);
      }
    }
  };

  return new SwitcherPlusModal(app, plugin);
}
