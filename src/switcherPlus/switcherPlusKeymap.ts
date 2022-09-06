import { AnySuggestion, Mode, SwitcherPlus } from 'src/types';
import {
  Scope,
  KeymapContext,
  Chooser,
  Modifier,
  KeymapEventHandler,
  KeymapInfo,
  Instruction,
  Platform,
} from 'obsidian';

type CustomKeymapInfo = Omit<KeymapEventHandler, 'scope'> &
  Instruction & { isInstructionOnly?: boolean; modes?: Mode[] };

export class SwitcherPlusKeymap {
  readonly standardKeysInfo: KeymapInfo[] = [];
  readonly customKeysInfo: CustomKeymapInfo[] = [];
  private _isOpen: boolean;
  private readonly savedStandardKeysInfo: KeymapEventHandler[] = [];
  private standardInstructionsElSelector = '.prompt-instructions';
  private standardInstructionsElDataValue = 'standard';

  get isOpen(): boolean {
    return this._isOpen;
  }

  set isOpen(value: boolean) {
    this._isOpen = value;
  }

  constructor(
    public readonly scope: Scope,
    private chooser: Chooser<AnySuggestion>,
    private modal: SwitcherPlus,
  ) {
    this.initKeysInfo();
    this.registerNavigationBindings(scope);
    this.addDataAttrToInstructionsEl(
      modal.containerEl,
      this.standardInstructionsElSelector,
      this.standardInstructionsElDataValue,
    );
  }

  initKeysInfo(): void {
    const customFileBasedModes = [
      Mode.EditorList,
      Mode.HeadingsList,
      Mode.RelatedItemsList,
      Mode.StarredList,
      Mode.SymbolList,
    ];

    let modKey = 'Ctrl';
    let modKeyText = 'ctrl';
    let shiftText = 'shift';

    if (Platform.isMacOS) {
      modKey = 'Meta';
      modKeyText = '⌘';
      shiftText = '⇧';
    }

    // standard mode keys that are registered by default, and
    // should be unregistered in custom modes, then re-registered in standard mode
    const standardKeysInfo: KeymapInfo[] = [
      { modifiers: 'Shift', key: 'Enter' },
      { modifiers: `${modKey},Shift`, key: 'Enter' },
    ];

    // custom mode keys that should be registered, then unregistered in standard mode
    // Note: modifiers should be a comma separated string of Modifiers
    // without any padding space characters
    const customKeysInfo: CustomKeymapInfo[] = [
      {
        isInstructionOnly: true,
        modes: customFileBasedModes,
        modifiers: null,
        key: null,
        func: null,
        command: `${modKeyText} ↵`,
        purpose: 'open in new tab',
      },
      {
        modes: customFileBasedModes,
        modifiers: modKey,
        key: '\\',
        func: this.useSelectedItem.bind(this),
        command: `${modKeyText} \\`,
        purpose: 'open to the right',
      },
      {
        modes: customFileBasedModes,
        modifiers: `${modKey},Shift`,
        key: '\\',
        func: this.useSelectedItem.bind(this),
        command: `${modKeyText} ${shiftText} \\`,
        purpose: 'open below',
      },
      {
        modes: customFileBasedModes,
        modifiers: modKey,
        key: 'o',
        func: this.useSelectedItem.bind(this),
        command: `${modKeyText} o`,
        purpose: 'open in new window',
      },
      {
        isInstructionOnly: true,
        modes: [Mode.CommandList],
        modifiers: null,
        key: null,
        func: null,
        command: `↵`,
        purpose: 'execute command',
      },
      {
        isInstructionOnly: true,
        modes: [Mode.WorkspaceList],
        modifiers: null,
        key: null,
        func: null,
        command: `↵`,
        purpose: 'open workspace',
      },
    ];

    this.standardKeysInfo.push(...standardKeysInfo);
    this.customKeysInfo.push(...customKeysInfo);
  }

  registerNavigationBindings(scope: Scope): void {
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

  updateKeymapForMode(mode: Mode): void {
    const isStandardMode = mode === Mode.Standard;
    const { modal, scope, savedStandardKeysInfo, standardKeysInfo, customKeysInfo } =
      this;

    const customKeymaps = customKeysInfo.filter((v) => !v.isInstructionOnly);
    this.unregisterKeys(scope, customKeymaps);

    if (isStandardMode) {
      this.registerKeys(scope, savedStandardKeysInfo);
      savedStandardKeysInfo.length = 0;

      this.toggleStandardInstructions(modal.containerEl, true);
    } else {
      const standardKeysRemoved = this.unregisterKeys(scope, standardKeysInfo);
      if (standardKeysRemoved.length) {
        savedStandardKeysInfo.push(...standardKeysRemoved);
      }

      const customKeysToAdd = customKeymaps.filter((v) => v.modes?.includes(mode));
      this.registerKeys(scope, customKeysToAdd);

      this.showCustomInstructions(modal, customKeysInfo, mode);
    }
  }

  registerKeys(scope: Scope, keymaps: Omit<KeymapEventHandler, 'scope'>[]): void {
    keymaps.forEach((keymap) => {
      const modifiers = keymap.modifiers.split(',') as Modifier[];
      scope.register(modifiers, keymap.key, keymap.func);
    });
  }

  unregisterKeys(scope: Scope, keyInfo: KeymapInfo[]): KeymapEventHandler[] {
    const keysToRemove = [...keyInfo];
    const removed: KeymapEventHandler[] = [];

    let i = scope.keys.length;
    while (i--) {
      const keymap = scope.keys[i];
      const foundIndex = keysToRemove.findIndex(
        (kInfo) => kInfo.modifiers === keymap.modifiers && kInfo.key === keymap.key,
      );

      if (foundIndex >= 0) {
        scope.unregister(keymap);
        removed.push(keymap);
        keysToRemove.splice(foundIndex, 1);
      }
    }

    return removed;
  }

  addDataAttrToInstructionsEl(
    containerEl: HTMLElement,
    selector: string,
    value: string,
  ): HTMLElement {
    const el = containerEl.querySelector<HTMLElement>(selector);
    el?.setAttribute('data-mode', value);

    return el;
  }

  clearCustomInstructions(containerEl: HTMLElement): void {
    const { standardInstructionsElSelector, standardInstructionsElDataValue } = this;
    const selector = `${standardInstructionsElSelector}:not([data-mode="${standardInstructionsElDataValue}"])`;
    const elements = containerEl.querySelectorAll<HTMLElement>(selector);

    elements.forEach((el) => el.remove());
  }

  toggleStandardInstructions(containerEl: HTMLElement, shouldShow: boolean): void {
    const { standardInstructionsElSelector } = this;
    let displayValue = 'none';

    if (shouldShow) {
      displayValue = '';
      this.clearCustomInstructions(containerEl);
    }

    const el = containerEl.querySelector<HTMLElement>(standardInstructionsElSelector);
    if (el) {
      el.style.display = displayValue;
    }
  }

  showCustomInstructions(
    modal: SwitcherPlus,
    keymapInfo: CustomKeymapInfo[],
    mode: Mode,
  ): void {
    const { containerEl } = modal;
    const keymaps = keymapInfo.filter((keymap) => keymap.modes?.includes(mode));

    this.toggleStandardInstructions(containerEl, false);
    this.clearCustomInstructions(containerEl);
    modal.setInstructions(keymaps);
  }

  useSelectedItem(evt: KeyboardEvent, _ctx: KeymapContext): boolean | void {
    this.chooser.useSelectedItem(evt);
  }

  private navigateItems(evt: KeyboardEvent, ctx: KeymapContext): boolean | void {
    const { isOpen, chooser } = this;

    if (isOpen) {
      const nextKeys = ['n', 'j'];

      let index = chooser.selectedItem;
      index = nextKeys.includes(ctx.key) ? ++index : --index;
      chooser.setSelectedItem(index, evt);
    }

    return false;
  }
}
