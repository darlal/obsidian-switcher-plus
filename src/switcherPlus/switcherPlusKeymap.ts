import {
  AnySuggestion,
  Facet,
  FacetSettingsData,
  KeymapConfig,
  Mode,
  SwitcherPlus,
} from 'src/types';
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

export type CustomKeymapInfo = Omit<KeymapEventHandler, 'scope'> &
  Instruction & { isInstructionOnly?: boolean; modes?: Mode[] };

export class SwitcherPlusKeymap {
  readonly standardKeysInfo: KeymapInfo[] = [];
  readonly customKeysInfo: CustomKeymapInfo[] = [];
  private _isOpen: boolean;
  private readonly savedStandardKeysInfo: KeymapEventHandler[] = [];
  private standardInstructionsElSelector = '.prompt-instructions';
  private standardInstructionsElDataValue = 'standard';

  modKey: Modifier = 'Ctrl';
  modKeyText = 'ctrl';
  shiftKeyText = 'shift';
  readonly facetKeysInfo: Array<CustomKeymapInfo & { facet: Facet }> = [];

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
    if (Platform.isMacOS) {
      this.modKey = 'Meta';
      this.modKeyText = '⌘';
      this.shiftKeyText = '⇧';
    }

    this.initKeysInfo();
    this.registerNavigationBindings(scope);
    this.registerTabBindings(scope);
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

    // standard mode keys that are registered by default, and
    // should be unregistered in custom modes, then re-registered in standard mode
    // example: { modifiers: 'Shift', key: 'Enter' }
    const standardKeysInfo: KeymapInfo[] = [];

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
        command: `${this.modKeyText} ↵`,
        purpose: 'open in new tab',
      },
      {
        isInstructionOnly: true,
        modes: customFileBasedModes,
        modifiers: this.modKey,
        key: '\\',
        func: null,
        command: `${this.modKeyText} \\`,
        purpose: 'open to the right',
      },
      {
        isInstructionOnly: true,
        modes: customFileBasedModes,
        modifiers: `${this.modKey},Shift`,
        key: '\\',
        func: null,
        command: `${this.modKeyText} ${this.shiftKeyText} \\`,
        purpose: 'open below',
      },
      {
        isInstructionOnly: true,
        modes: customFileBasedModes,
        modifiers: this.modKey,
        key: 'o',
        func: null,
        command: `${this.modKeyText} o`,
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

  registerFacetBinding(scope: Scope, keymapConfig: KeymapConfig): void {
    const { mode, facets } = keymapConfig;

    if (facets?.facetList?.length) {
      const { facetList, facetSettings, onToggleFacet } = facets;
      const { keyList, modifiers, resetKey, resetModifiers } = facetSettings;
      let currKeyListIndex = 0;
      let keyHandler: KeymapEventHandler;

      const registerFn = (
        modKeys: Modifier[],
        key: string,
        facetListLocal: Facet[],
        isReset: boolean,
      ) => {
        return scope.register(modKeys, key, () => onToggleFacet(facetListLocal, isReset));
      };

      // register each of the facets to a corresponding key
      for (let i = 0; i < facetList.length; i++) {
        const facet = facetList[i];
        const facetModifiers = facet.modifiers ?? modifiers;
        let key: string;

        if (facet.key?.length) {
          // has override key defined so use it instead of the default
          key = facet.key;
        } else if (currKeyListIndex < keyList.length) {
          // use up one of the default keys
          key = keyList[currKeyListIndex];
          ++currKeyListIndex;
        } else {
          // override key is not defined and no default keys left
          console.log(
            `Switcher++: unable to register hotkey for facet: ${facet.label} in mode: ${Mode[mode]} because a trigger key is not specified`,
          );
          continue;
        }

        keyHandler = registerFn(facetModifiers, key, [facet], false);
        this.facetKeysInfo.push({
          facet,
          command: key,
          purpose: facet.label,
          ...keyHandler,
        });
      }

      // register the toggle key
      keyHandler = registerFn(resetModifiers ?? modifiers, resetKey, facetList, true);
      this.facetKeysInfo.push({
        facet: null,
        command: resetKey,
        purpose: 'toggle all',
        ...keyHandler,
      });
    }
  }

  registerTabBindings(scope: Scope): void {
    const keys: [Modifier[], string][] = [
      [[this.modKey], '\\'],
      [[this.modKey, 'Shift'], '\\'],
      [[this.modKey], 'o'],
    ];

    keys.forEach((v) => {
      scope.register(v[0], v[1], this.useSelectedItem.bind(this));
    });
  }

  updateKeymapForMode(keymapConfig: KeymapConfig): void {
    const { mode } = keymapConfig;
    const {
      modal,
      scope,
      savedStandardKeysInfo,
      standardKeysInfo,
      customKeysInfo,
      facetKeysInfo,
    } = this;

    const customKeymaps = customKeysInfo.filter((v) => !v.isInstructionOnly);
    this.unregisterKeys(scope, customKeymaps);

    // remove facet keys and reset storage array
    this.unregisterKeys(scope, facetKeysInfo);
    facetKeysInfo.length = 0;

    if (mode === Mode.Standard) {
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
      this.registerFacetBinding(scope, keymapConfig);

      this.showCustomInstructions(modal, keymapConfig, customKeysInfo, facetKeysInfo);
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
    keymapConfig: KeymapConfig,
    keymapInfo: CustomKeymapInfo[],
    facetKeysInfo: Array<CustomKeymapInfo & { facet: Facet }>,
  ): void {
    const { mode, facets } = keymapConfig;
    const { containerEl } = modal;
    const keymaps = keymapInfo.filter((keymap) => keymap.modes?.includes(mode));

    this.toggleStandardInstructions(containerEl, false);
    this.clearCustomInstructions(containerEl);

    this.renderFacetInstructions(modal, facets?.facetSettings, facetKeysInfo);
    modal.setInstructions(keymaps);
  }

  renderFacetInstructions(
    modal: SwitcherPlus,
    facetSettings: FacetSettingsData,
    facetKeysInfo: Array<CustomKeymapInfo & { facet: Facet }>,
  ): void {
    if (facetKeysInfo?.length && facetSettings.shouldShowFacetInstructions) {
      const modifiersToString = (modifiers: Modifier[]) => {
        return modifiers?.toString().replace(',', ' ');
      };

      const containerEl = modal.modalEl.createDiv('prompt-instructions');

      // render the preamble
      let instructionEl = containerEl.createDiv();
      instructionEl.createSpan({
        cls: 'prompt-instruction-command',
        text: `filters | ${modifiersToString(facetSettings.modifiers)}`,
      });

      // render each key instruction
      facetKeysInfo.forEach((facetKeyInfo) => {
        const { facet, command, purpose } = facetKeyInfo;
        let modifiers: Modifier[];
        let key: string;
        let activeCls: string[] = null;

        if (facet) {
          // Note: the command only contain the key, the modifiers has to be derived
          key = command;
          modifiers = facet.modifiers;

          if (facet.isActive) {
            activeCls = ['qsp-filter-active'];
          }
        } else {
          // Note: only the reset key is expected to not have an associated facet
          key = facetSettings.resetKey;
          modifiers = facetSettings.resetModifiers;
        }

        // if a modifier is specified for this specific facet, it overrides the
        // default modifier so display that too. Otherwise, just show the key alone
        const commandDisplayText = modifiers
          ? `(${modifiersToString(modifiers)}) ${key}`
          : `${key}`;

        instructionEl = containerEl.createDiv();
        instructionEl.createSpan({
          cls: 'prompt-instruction-command',
          text: commandDisplayText,
        });

        instructionEl.createSpan({
          cls: activeCls,
          text: purpose,
        });
      });
    }
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
