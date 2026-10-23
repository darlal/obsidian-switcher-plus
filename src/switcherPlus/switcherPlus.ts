import { SwitcherPlusKeymap } from './switcherPlusKeymap';
import { getSystemSwitcherInstance, logError } from 'src/utils';
import { ModeHandler } from './modeHandler';
import SwitcherPlusPlugin from 'src/main';
import { App, QuickSwitcherOptions } from 'obsidian';
import {
  SystemSwitcher,
  SwitcherPlus,
  AnySuggestion,
  SessionOpts,
  ModeDispatcher,
  Mode,
} from 'src/types';

interface SystemSwitcherConstructor extends SystemSwitcher {
  new (app: App, builtInOptions: QuickSwitcherOptions): SystemSwitcher;
}

export class SwitcherPlusModal {
  static create(app: App, plugin: SwitcherPlusPlugin): SwitcherPlus {
    const SystemSwitcherModal = getSystemSwitcherInstance(app)
      ?.QuickSwitcherModal as SystemSwitcherConstructor;

    if (!SystemSwitcherModal) {
      logError(
        'Unable to extend system switcher. Plugin UI will not be loaded. Use the builtin switcher instead.',
      );
      return null;
    }

    const CustomModal = class extends SystemSwitcherModal implements SwitcherPlus {
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
        const { exMode, chooser, inputEl } = this;

        if (!this.isOpen) {
          exMode.setSessionOpenMode(chooser, sessionOpts);
          super.open();
          return;
        }

        if (exMode.isShowingMode(sessionOpts)) {
          return;
        }

        // Switch the mode in place, the input is cleared because
        // setInitialInputForSession assumes empty input, which the direct open path
        // guarantees through SuggestModal.onOpen.
        inputEl.value = '';
        exMode.setSessionOpenMode(chooser, sessionOpts);
        this.updateSuggestions();
      }

      onOpen(): void {
        this.exMode.onOpen();

        // This call hard codes this.inputEl to an empty string, and calls updateSuggestions()
        void super.onOpen();
      }

      onClose() {
        super.onClose();
        this.exMode.onClose();

        // On phones onClose runs after the close animation, by which time a newer modal
        // might already be the active one.
        if (this.plugin.activeModal === this) {
          this.plugin.activeModal = null;
        }
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

    return new CustomModal(app, plugin);
  }

  /**
   * Open the modal in the requested mode. If a modal is already open, it is
   * reset and reused, otherwise a new modal is created.
   * @returns true if a modal was opened or reused, false if system switcher unavailable.
   */
  static createAndOpen(
    app: App,
    plugin: SwitcherPlusPlugin,
    mode: Mode,
    sessionOpts?: Pick<SessionOpts, 'useActiveEditorAsSource'>,
  ): boolean {
    const openModal = plugin.activeModal;

    // Reuse the open modal so a second trigger switches it instead of stacking (#262).
    // isOpen is checked rather than just presence because on phones the reference is
    // released after the close animation, but isOpen goes false as soon as close() runs.
    const modal = openModal?.isOpen ? openModal : SwitcherPlusModal.create(app, plugin);
    if (!modal) {
      return false;
    }

    plugin.activeModal = modal;
    modal.openInMode(Object.assign({ mode }, sessionOpts));

    return true;
  }
}
