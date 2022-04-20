import { App, QuickSwitcherOptions } from 'obsidian';
import SwitcherPlusPlugin from 'src/main';
import { SystemSwitcher, SwitcherPlus, AnySuggestion, Mode } from 'src/types';
import { getSystemSwitcherInstance, isFileSuggestion } from 'src/utils';

import { EditorHandler } from '../Handlers/editorHandler';
import { Keymap } from './keymap';
import { ModeHandler } from './modeHandler';

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
    editorHandler: EditorHandler;

    constructor(app: App, public plugin: SwitcherPlusPlugin) {
      super(app, plugin.options.builtInSystemOptions);
      console.log('construct quickswitcher++');

      plugin.options.shouldShowAlias = this.shouldShowAlias;
      const exKeymap = new Keymap(this.scope, this.chooser, this.containerEl);
      this.exMode = new ModeHandler(app, plugin.options, exKeymap);
      this.editorHandler = new EditorHandler(app, plugin.options);
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
        // console.log('system switcher updateSuggestions');
        super.updateSuggestions();
      }
    }

    getSuggestions(query: string): AnySuggestion[] {
      // console.log('overwrite getSuggestions', query);
      const suggs: AnySuggestion[] = [];
      const editorFiles: Filepaths = {};

      // insert editor handler suggestions at the top
      EditorHandler.getOpenFileSuggestions(this.app, query).forEach(sugg => {
        editorFiles[sugg.item.view.file?.path] = true
        suggs.push(sugg)
      })

      // system switcher suggestions
      super.getSuggestions(query).forEach(sugg => {
        if (isFileSuggestion(sugg)) {
          // ignore file suggestion whose path is already in the editor suggestions
          if (editorFiles[sugg.file.path]) return
        }
        suggs.push(sugg)
      })
      // console.log('getSuggestions', suggs)
      return suggs
    }

    onChooseSuggestion(item: AnySuggestion, evt: MouseEvent | KeyboardEvent) {
      if (!this.exMode.onChooseSuggestion(item, evt)) {
        // console.log('system switcher onChooseSuggestion', item);
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


interface Filepaths {
  [key: string]: boolean
}
