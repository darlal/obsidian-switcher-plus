import { BuiltInSystemOptions } from 'src/types';
import { Keymap } from './keymap';
import { isSystemSuggestion, getSystemSwitcherInstance } from 'src/utils';
import { ModeHandler } from './modeHandler';
import SwitcherPlusPlugin from 'src/main';
import type { App } from 'obsidian';
import { SystemSwitcher, SwitcherPlus, AnySuggestion, Mode } from 'src/types';

interface SystemSwitcherConstructor extends SystemSwitcher {
  new (app: App, builtInOptions: BuiltInSystemOptions): SystemSwitcher;
}

export function createSwitcherPlus(app: App, plugin: SwitcherPlusPlugin): SwitcherPlus {
  const systemSwitcher = getSystemSwitcherInstance(app)
    ?.QuickSwitcherModal as SystemSwitcherConstructor;

  if (!systemSwitcher) {
    console.log(
      'Switcher++: unable to extend system switcher. Plugin UI will not be loaded. Use the builtin switcher instead.',
    );
    return null;
  }

  const switcherPlusClass = class extends systemSwitcher implements SwitcherPlus {
    private exMode: ModeHandler;
    private exKeymap: Keymap;
    private openWithCommandStr: string = null;

    constructor(app: App, public plugin: SwitcherPlusPlugin) {
      super(app, plugin.options.builtInSystemOptions);

      this.exMode = new ModeHandler(app.workspace, app.metadataCache, plugin.options);
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
      const inputInfo = exMode.determineRunMode(
        this.inputEl.value,
        activeSugg,
        this.app.workspace.activeLeaf,
      );
      const { mode } = inputInfo;
      exKeymap.updateKeymapForMode(mode);

      if (mode === Mode.Standard) {
        super.updateSuggestions();
      } else {
        chooser.setSuggestions([]);

        const suggestions = exMode.getSuggestions(inputInfo);
        chooser.setSuggestions(suggestions);
      }
    }

    onChooseSuggestion(item: AnySuggestion, evt: MouseEvent | KeyboardEvent) {
      const { exMode } = this;
      const useDefault = exMode.mode === Mode.Standard || item === null;

      if (isSystemSuggestion(item) || useDefault) {
        super.onChooseSuggestion(item, evt);
      } else {
        exMode.onChooseSuggestion(item);
      }
    }

    renderSuggestion(value: AnySuggestion, parentEl: HTMLElement) {
      const { exMode } = this;
      const useDefault = exMode.mode === Mode.Standard || value === null;

      if (isSystemSuggestion(value) || useDefault) {
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
