import { isOfType } from 'src/utils';
import ModeHandler from './modeHandler';
import { Settings } from 'src/settings';
import type { App } from 'obsidian';
import {
  SystemSwitcher,
  SwitcherPlus,
  AnySuggestion,
  SystemSuggestion,
  Mode,
} from 'src/types';

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

export function createSwitcherPlus(app: App, settings: Settings): SwitcherPlus {
  const systemSwitcher = getSystemSwitcher(app);
  if (systemSwitcher === null) {
    return null;
  }

  const switcherPlusClass = class extends systemSwitcher implements SwitcherPlus {
    private exMode: ModeHandler;

    constructor(app: App, settings: Settings) {
      super(app);
      this.exMode = new ModeHandler(
        app,
        settings,
        this.scope,
        this.chooser,
        this.containerEl,
      );
    }

    isModalOpen(): boolean {
      return this.isOpen;
    }

    openInMode(mode: Mode): void {
      this.exMode.openInMode(mode);
      this.open();
    }

    onOpen(): void {
      this.isOpen = true;
      const value = this.exMode.onOpen();
      this.inputEl.value = value;
      this.inputEl.focus();
      this.onInput();
    }

    onClose() {
      super.onClose();
      this.exMode.onClose();
    }

    onInput(): void {
      const {
        exMode,
        inputEl: { value },
      } = this;

      exMode.onInput(value);
      super.onInput();
    }

    protected updateSuggestions(): void {
      const { exMode } = this;

      if (exMode.mode === Mode.Standard) {
        super.updateSuggestions();
      } else {
        exMode.updateSuggestions(this.inputEl.value);
      }
    }

    onChooseSuggestion(item: AnySuggestion, evt: MouseEvent | KeyboardEvent) {
      const { exMode } = this;

      if (isOfType<SystemSuggestion>(item, 'file') || exMode.mode === Mode.Standard) {
        super.onChooseSuggestion(item, evt);
      } else {
        this.exMode.onChooseSuggestion(item);
      }
    }

    renderSuggestion(value: AnySuggestion, parentEl: HTMLElement) {
      const { exMode } = this;

      if (isOfType<SystemSuggestion>(value, 'file') || exMode.mode === Mode.Standard) {
        super.renderSuggestion(value, parentEl);
      } else {
        this.exMode.renderSuggestion(value, parentEl);
      }
    }
  };

  return new switcherPlusClass(app, settings);
}
