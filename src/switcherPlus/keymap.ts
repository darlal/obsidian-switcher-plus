import { Mode } from 'src/types';
import { Scope, KeymapContext } from 'obsidian';

export class Keymap {
  private backupKeys: any[];
  private _isOpen: boolean;

  get isOpen(): boolean {
    return this._isOpen;
  }

  set isOpen(value: boolean) {
    this._isOpen = value;
  }

  constructor(
    private scope: Scope,
    private chooser: any,
    private modalContainerEl: HTMLElement,
  ) {
    this.registerBindings(scope);
  }

  private registerBindings(scope: Scope): void {
    scope.register(['Ctrl'], 'n', this.navigateItems.bind(this));
    scope.register(['Ctrl'], 'p', this.navigateItems.bind(this));
  }

  private navigateItems(_evt: KeyboardEvent, ctx: KeymapContext): boolean | void {
    const { isOpen, chooser } = this;

    if (isOpen) {
      const isNext = ctx.key === 'n';
      const index: number = chooser.selectedItem as number;
      chooser.setSelectedItem(isNext ? index + 1 : index - 1);
    }

    return false;
  }

  private static updateHelperTextForMode(mode: Mode, containerEl: HTMLElement): void {
    const selector = '.prompt-instructions';

    const el = containerEl.querySelector<HTMLElement>(selector);
    if (el) {
      el.style.display = mode === Mode.Standard ? '' : 'none';
    }
  }

  updateKeymapForMode(mode: Mode): void {
    const keys = (this.scope as any).keys;
    let { backupKeys = [] } = this;

    Keymap.updateHelperTextForMode(mode, this.modalContainerEl);

    if (mode === Mode.Standard) {
      if (backupKeys.length) {
        backupKeys.forEach((key) => keys.push(key));
      }
      backupKeys = undefined;
    } else {
      // unregister unused hotkeys for custom modes
      for (let i = keys.length - 1; i >= 0; --i) {
        const key = keys[i];

        if (
          key.key === 'Enter' &&
          (key.modifiers === 'Meta' || key.modifiers === 'Shift')
        ) {
          keys.splice(i, 1);
          backupKeys.push(key);
        }
      }
    }

    this.backupKeys = backupKeys;
  }
}
