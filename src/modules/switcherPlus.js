import {
  QUICK_SWITCHER_ID,
  Mode,
} from './constants';
import ExModeHandler from './exModeHandler';
import { Config } from './settings';

function getQuickSwitcher(app) {
  const switcher = app.internalPlugins.getPluginById(QUICK_SWITCHER_ID);
  if (!switcher) { return null; }

  return switcher.instance.modal.constructor;
}

export default (app, settings) => {
  const QuickSwitcher = getQuickSwitcher(app);
  if (QuickSwitcher === null) { return null; }

  class SwitcherPlus extends QuickSwitcher {
    constructor(appObj, settingsObj) {
      super(appObj);

      this.settings = settingsObj;
      this.exMode = new ExModeHandler(appObj, settingsObj);

      this.scope.registerKey(['Ctrl'], 'n', this.nextItem.bind(this.chooser));
      this.scope.registerKey(['Ctrl'], 'p', this.previousItem.bind(this.chooser));
    }

    previousItem() {
      if (this.chooser.isOpen) {
        this.setSelectedItem(this.selectedItem - 1, true);
      }
    }

    nextItem() {
      if (this.chooser.isOpen) {
        this.setSelectedItem(this.selectedItem + 1, true);
      }
    }

    openInMode(mode) {
      this.exMode.sessionWithMode(mode);
      this.open();
    }

    onOpen() {
      let val = '';
      const { exMode: { mode } } = this;

      if (mode === Mode.EditorList) {
        val = Config.editorListCommand;
      } else if (mode === Mode.SymbolList) {
        val = Config.symbolListCommand;
      }

      if (mode !== Mode.Standard) { this.chooser.setSuggestions([]); }

      this.isOpen = true;
      this.inputEl.value = val;
      this.inputEl.focus();
      this.onInput();
    }

    onInput() {
      const {
        exMode,
        inputEl: { value },
        chooser,
      } = this;

      const currentSuggestion = chooser.values[chooser.selectedItem];
      const mode = exMode.parseInput(value, currentSuggestion);
      this.updateHelperTextForMode(mode);
      this.updateKeymapForMode(mode);
      this.updateSuggestions();
    }

    updateHelperTextForMode(mode) {
      const { containerEl } = this;
      const selector = '.prompt-instructions';

      const el = containerEl.querySelector(selector);
      if (el) { el.style.display = mode === Mode.Standard ? '' : 'none'; }
    }

    updateKeymapForMode(mode) {
      const { scope: { keys } } = this;
      let { backupKeys = [] } = this;

      if (mode === Mode.Standard) {
        if (backupKeys.length) { backupKeys.forEach((key) => keys.push(key)); }
        backupKeys = undefined;
      } else {
        // unregister unused hotkeys for custom modes
        for (let i = keys.length - 1; i >= 0; --i) {
          const key = keys[i];

          if (key.key === 'Enter'
            && (key.modifiers === 'Meta' || key.modifiers === 'Shift')) {
            keys.splice(i, 1);
            backupKeys.push(key);
          }
        }
      }

      this.backupKeys = backupKeys;
    }

    updateSuggestions() {
      const {
        exMode,
        exMode: { mode },
        inputEl: { value },
      } = this;

      if (mode === Mode.Standard) {
        super.updateSuggestions();
      } else {
        const suggestions = exMode.getSuggestions(value);
        this.chooser.setSuggestions(suggestions);
      }
    }

    onChooseSuggestion(suggestionItem, evt) {
      const { exMode, exMode: { mode } } = this;

      if (mode === Mode.Standard) {
        super.onChooseSuggestion(suggestionItem, evt);
      } else {
        exMode.onChooseSuggestion(suggestionItem, evt);
      }
    }

    renderSuggestion(sugg, parentEl) {
      const { exMode, exMode: { mode } } = this;

      if (mode === Mode.Standard) {
        super.renderSuggestion(sugg, parentEl);
      } else {
        exMode.renderSuggestion(sugg, parentEl);
      }
    }
  }

  return new SwitcherPlus(app, settings);
};
