import { AnySuggestion, Mode } from 'src/types';
import { Scope, KeymapContext, Chooser, Hotkey, Modifier } from 'obsidian';

export class Keymap {
  private backupKeys: Hotkey[];
  private _isOpen: boolean;

  get isOpen(): boolean {
    return this._isOpen;
  }

  set isOpen(value: boolean) {
    this._isOpen = value;
  }

  constructor(
    private scope: Scope,
    private chooser: Chooser<AnySuggestion>,
    private modalContainerEl: HTMLElement,
  ) {
    this.registerBindings(scope);
  }

  private registerBindings(scope: Scope): void {
    const keys: [Modifier[], string][] = [
      [['Ctrl'], 'n'],
      [['Ctrl'], 'p'],
      [['Ctrl'], 'j'],
      [['Ctrl'], 'k'],
    ];

    keys.forEach((v) => {
      scope.register(v[0], v[1], this.navigateItems.bind(this));
    });
  }

  private navigateItems(_evt: KeyboardEvent, ctx: KeymapContext): boolean | void {
    const { isOpen, chooser } = this;

    if (isOpen) {
      const nextKeys = ['n', 'j'];

      let index = chooser.selectedItem;
      index = nextKeys.includes(ctx.key) ? ++index : --index;
      chooser.setSelectedItem(index, true);
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
    const keys = this.scope.keys;
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

        // modifiers are serialized to string at run time, if they exist
        const modifiers = key.modifiers?.toString();

        if (key.key === 'Enter' && modifiers === 'Shift') {
          keys.splice(i, 1);
          backupKeys.push(key);
        }
      }
    }

    this.backupKeys = backupKeys;
  }
}
