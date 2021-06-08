import { Keymap } from './keymap';
import { isSystemSuggestion } from 'src/utils';
import { ModeHandler } from './modeHandler';
import SwitcherPlusPlugin from 'src/main';
import type { App } from 'obsidian';
import { SystemSwitcher, SwitcherPlus, AnySuggestion, Mode } from 'src/types';

const QUICK_SWITCHER_ID = 'switcher';

interface SystemSwitcherConstructor extends SystemSwitcher {
  new (app: App): SystemSwitcher;
}

function getSystemSwitcher(app: App): SystemSwitcherConstructor {
  const switcher = (app as any).internalPlugins.getPluginById(QUICK_SWITCHER_ID);
  if (!switcher) {
    return null;
  }

  return switcher.instance.modal.constructor as SystemSwitcherConstructor;
}

export function createSwitcherPlus(app: App, plugin: SwitcherPlusPlugin): SwitcherPlus {
  const systemSwitcher = getSystemSwitcher(app);
  if (systemSwitcher === null) {
    return null;
  }

  const switcherPlusClass = class extends systemSwitcher implements SwitcherPlus {
    private exMode: ModeHandler;
    private exKeymap: Keymap;
    private openWithCommandStr: string = null;

    constructor(app: App, public plugin: SwitcherPlusPlugin) {
      super(app);

      this.exMode = new ModeHandler(app, plugin.options);
      this.exKeymap = new Keymap(this.scope, this.chooser, this.containerEl);
    }

    openInMode(mode: Mode): void {
      const { exMode } = this;

      exMode.reset();
      this.chooser.setSuggestions([]);

      if (mode !== Mode.Standard) {
        this.openWithCommandStr = exMode.getCommandStringForMode(mode);
      }

      this.open();
    }

    onOpen(): void {
      this.exKeymap.isOpen = true;
      super.onOpen();
    }

    onClose() {
      super.onClose();
      this.exKeymap.isOpen = false;
    }

    protected updateSuggestions(): void {
      const { exMode, exKeymap, chooser, openWithCommandStr } = this;

      if (openWithCommandStr !== null && openWithCommandStr !== '') {
        // update UI with current command string in the case were openInMode was called
        this.inputEl.value = openWithCommandStr;

        // reset to null so user input is not overridden the next time onInput is called
        this.openWithCommandStr = null;
      }

      const activeSugg = this.getActiveSuggestion();
      const input = this.inputEl.value;
      const mode = exMode.determineRunMode(input, activeSugg);
      exKeymap.updateKeymapForMode(mode);

      if (mode === Mode.Standard) {
        super.updateSuggestions();
      } else {
        chooser.setSuggestions([]);
        const suggestions = exMode.getSuggestions(input);
        chooser.setSuggestions(suggestions);
      }
    }

    onChooseSuggestion(item: AnySuggestion, evt: MouseEvent | KeyboardEvent) {
      const { exMode } = this;

      if (isSystemSuggestion(item) || exMode.mode === Mode.Standard) {
        super.onChooseSuggestion(item, evt);
      } else {
        exMode.onChooseSuggestion(item);
      }
    }

    renderSuggestion(value: AnySuggestion, parentEl: HTMLElement) {
      const { exMode } = this;

      if (isSystemSuggestion(value) || exMode.mode === Mode.Standard) {
        super.renderSuggestion(value, parentEl);
      } else {
        exMode.renderSuggestion(value, parentEl);
      }
    }

    private getActiveSuggestion(): AnySuggestion {
      const { chooser } = this;
      let activeSuggestion: AnySuggestion = null;

      if (chooser?.values) {
        activeSuggestion = chooser.values[chooser.selectedItem];
      }

      return activeSuggestion;
    }
  };

  return new switcherPlusClass(app, plugin);
}
