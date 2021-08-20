import { Keymap } from './keymap';
import {
  isSystemSuggestion,
  getSystemSwitcherInstance,
  isSymbolSuggestion,
} from 'src/utils';
import { ModeHandler } from './modeHandler';
import SwitcherPlusPlugin from 'src/main';
import { App, debounce, Debouncer, QuickSwitcherOptions } from 'obsidian';
import {
  SystemSwitcher,
  SwitcherPlus,
  AnySuggestion,
  Mode,
  SymbolSuggestion,
} from 'src/types';
import { InputInfo } from './inputInfo';

interface SystemSwitcherConstructor extends SystemSwitcher {
  new (app: App, builtInOptions: QuickSwitcherOptions): SystemSwitcher;
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
    private debouncedUpdateSuggestionsEx: Debouncer<[InputInfo]>;

    constructor(app: App, public plugin: SwitcherPlusPlugin) {
      super(app, plugin.options.builtInSystemOptions);

      plugin.options.shouldShowAlias = this.shouldShowAlias;
      this.exMode = new ModeHandler(app, plugin.options);
      this.exKeymap = new Keymap(this.scope, this.chooser, this.containerEl);
      this.debouncedUpdateSuggestionsEx = debounce(
        this.updateSuggestionsEx.bind(this),
        400,
        true,
      );
    }

    openInMode(mode: Mode): void {
      const { exMode } = this;

      exMode.reset();
      this.chooser.setSuggestions([]);

      if (mode !== Mode.Standard) {
        this.openWithCommandStr = exMode.getCommandStringForMode(mode);
      }

      super.open();
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
      const { exMode, exKeymap, openWithCommandStr } = this;

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
        if (mode === Mode.HeadingsList && inputInfo.headingsCmd.parsedInput?.length) {
          this.debouncedUpdateSuggestionsEx(inputInfo);
        } else {
          this.updateSuggestionsEx(inputInfo);
        }
      }
    }

    private updateSuggestionsEx(inputInfo: InputInfo): void {
      const { exMode, chooser } = this;
      chooser.setSuggestions([]);

      const suggestions = exMode.getSuggestions(inputInfo);
      chooser.setSuggestions(suggestions);

      if (inputInfo.mode === Mode.SymbolList) {
        const index = suggestions
          .filter((v): v is SymbolSuggestion => isSymbolSuggestion(v))
          .findIndex((v) => v.item.isSelected === true);

        if (index !== -1) {
          chooser.setSelectedItem(index, true);
        }
      }
    }

    onChooseSuggestion(item: AnySuggestion, evt: MouseEvent | KeyboardEvent) {
      const { exMode } = this;
      const useDefault = exMode.mode === Mode.Standard || item === null;

      if (isSystemSuggestion(item) || useDefault) {
        super.onChooseSuggestion(item, evt);
      } else {
        exMode.onChooseSuggestion(item, evt);
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
