import { SwitcherPlusKeymap } from './switcherPlusKeymap';
import { getSystemSwitcherInstance } from 'src/utils';
import { ModeHandler } from './modeHandler';
import SwitcherPlusPlugin from 'src/main';
import { App, QuickSwitcherOptions } from 'obsidian';
import {
  SystemSwitcher,
  SwitcherPlus,
  AnySuggestion,
  SessionOpts,
  ModeDispatcher,
} from 'src/types';

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
    private _exMode: ModeDispatcher;
    get exMode(): ModeDispatcher {
      return this._exMode;
    }

    constructor(
      app: App,
      public plugin: SwitcherPlusPlugin,
    ) {
      super(app, plugin.options.builtInSystemOptions);

      const { options } = plugin;
      options.shouldShowAlias = this.shouldShowAlias;
      const exKeymap = new SwitcherPlusKeymap(
        app,
        this.scope,
        this.chooser,
        this,
        options,
      );
      this._exMode = new ModeHandler(app, options, exKeymap);
    }

    openInMode(sessionOpts: SessionOpts): void {
      this.exMode.setSessionOpenMode(this.chooser, sessionOpts);
      super.open();
    }

    onOpen(): void {
      this.exMode.onOpen();

      // This call hard codes this.inputEl to an empty string, and calls updateSuggestions()
      super.onOpen();
    }

    onClose() {
      super.onClose();
      this.exMode.onClose();
    }

    protected updateSuggestions(): void {
      const { exMode, inputEl, chooser } = this;
      exMode.setInitialInputForSession(inputEl);

      if (!exMode.updateSuggestions(inputEl.value, chooser, this)) {
        super.updateSuggestions();
      }
    }

    getSuggestions(input: string): AnySuggestion[] {
      const { exMode, plugin } = this;
      const query = exMode.inputTextForStandardMode(input);
      const results = super.getSuggestions(query);
      exMode.addPropertiesToStandardSuggestions(results, plugin.options);
      return results;
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
