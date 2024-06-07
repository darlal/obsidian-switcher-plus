import { SwitcherPlusSettings } from 'src/settings';
import { generateMarkdownLink } from 'src/utils';
import {
  AnySuggestion,
  Facet,
  FacetSettingsData,
  InsertLinkConfig,
  KeymapConfig,
  Mode,
  NavigationKeysConfig,
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
  App,
  WorkspaceLeaf,
  MarkdownView,
  Hotkey,
} from 'obsidian';

export type CustomKeymapInfo = Omit<KeymapEventHandler, 'scope'> &
  Instruction & { isInstructionOnly?: boolean; modes?: Mode[] };

export class SwitcherPlusKeymap {
  readonly standardKeysInfo: KeymapInfo[] = [];
  readonly customKeysInfo: CustomKeymapInfo[] = [];
  private _isOpen: boolean;
  private readonly savedStandardKeysInfo: KeymapEventHandler[] = [];

  readonly customInstructionEls = new Map<'custom' | 'facets', HTMLDivElement>();
  readonly standardInstructionsEl: HTMLElement;
  readonly facetKeysInfo: Array<CustomKeymapInfo & { facet: Facet }> = [];
  readonly insertIntoEditorKeysInfo: CustomKeymapInfo[] = [];
  modKey: Modifier = 'Ctrl';
  modifierToPlatformStrMap: Record<Modifier, string> = {
    Mod: 'Ctrl',
    Ctrl: 'Ctrl',
    Meta: 'Win',
    Alt: 'Alt',
    Shift: 'Shift',
  };

  get isOpen(): boolean {
    return this._isOpen;
  }

  set isOpen(value: boolean) {
    this._isOpen = value;
  }

  constructor(
    public app: App,
    public readonly scope: Scope,
    private chooser: Chooser<AnySuggestion>,
    private modal: SwitcherPlus,
    private config: SwitcherPlusSettings,
  ) {
    if (Platform.isMacOS) {
      this.modKey = 'Meta';
      this.modifierToPlatformStrMap = {
        Mod: '⌘',
        Ctrl: '⌃',
        Meta: '⌘',
        Alt: '⌥',
        Shift: '⇧',
      };
    }

    this.initKeysInfo();
    this.removeDefaultTabKeyBinding(scope, config);
    this.registerNavigationBindings(scope, config.navigationKeys);
    this.registerEditorTabBindings(scope);
    this.registerCloseWhenEmptyBindings(scope, config);

    this.standardInstructionsEl =
      modal.modalEl.querySelector<HTMLElement>('.prompt-instructions');
  }

  initKeysInfo(): void {
    const customFileBasedModes = [
      Mode.EditorList,
      Mode.HeadingsList,
      Mode.RelatedItemsList,
      Mode.BookmarksList,
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
        command: this.commandDisplayStr(['Mod'], '↵'),
        purpose: 'open in new tab',
      },
      {
        isInstructionOnly: true,
        modes: customFileBasedModes,
        modifiers: this.modKey,
        key: '\\',
        func: null,
        command: this.commandDisplayStr(['Mod'], '\\'),
        purpose: 'open to the right',
      },
      {
        isInstructionOnly: true,
        modes: customFileBasedModes,
        modifiers: `${this.modKey},Shift`,
        key: '\\',
        func: null,
        command: this.commandDisplayStr(['Mod', 'Shift'], '\\'),
        purpose: 'open below',
      },
      {
        isInstructionOnly: true,
        modes: customFileBasedModes,
        modifiers: this.modKey,
        key: 'o',
        func: null,
        command: this.commandDisplayStr(['Mod'], 'o'),
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

  removeDefaultTabKeyBinding(scope: Scope, config: SwitcherPlusSettings): void {
    if (config?.removeDefaultTabBinding) {
      // 07/04/2023: Obsidian registers a binding for Tab key that only returns false
      // remove this binding so Tab can be remapped
      const keymap = scope.keys.find(
        ({ modifiers, key }) => modifiers === null && key === 'Tab',
      );

      scope.unregister(keymap);
    }
  }

  registerNavigationBindings(scope: Scope, navConfig: NavigationKeysConfig): void {
    const regKeys = (keys: Hotkey[], isNext: boolean) => {
      keys.forEach(({ modifiers, key }) => {
        scope.register(modifiers, key, (evt, _ctx) => {
          this.navigateItems(evt, isNext);
          return false;
        });
      });
    };

    regKeys(navConfig?.nextKeys ?? [], true);
    regKeys(navConfig?.prevKeys ?? [], false);
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

  registerEditorTabBindings(scope: Scope): void {
    const keys: [Modifier[], string][] = [
      [[this.modKey], '\\'],
      [[this.modKey, 'Shift'], '\\'],
      [[this.modKey], 'o'],
    ];

    keys.forEach((v) => {
      scope.register(v[0], v[1], this.useSelectedItem.bind(this));
    });
  }

  registerCloseWhenEmptyBindings(scope: Scope, config: SwitcherPlusSettings): void {
    const keymaps = config.closeWhenEmptyKeys;

    keymaps?.forEach(({ modifiers, key }) => {
      scope.register(modifiers, key, this.closeModalIfEmpty.bind(this));
    });
  }

  updateInsertIntoEditorCommand(
    mode: Mode,
    activeEditor: WorkspaceLeaf,
    customKeysInfo: CustomKeymapInfo[],
    insertConfig: InsertLinkConfig,
  ): CustomKeymapInfo {
    const { isEnabled, keymap, insertableEditorTypes } = insertConfig;
    let keyInfo: CustomKeymapInfo = null;

    if (isEnabled) {
      const excludedModes = [Mode.CommandList, Mode.WorkspaceList, Mode.VaultList];
      const activeViewType = activeEditor?.view?.getViewType();

      const isExcluded =
        (activeViewType && !insertableEditorTypes.includes(activeViewType)) ||
        excludedModes.includes(mode);

      if (!isExcluded) {
        keyInfo = customKeysInfo.find((v) => v.purpose === keymap.purpose);

        if (!keyInfo) {
          const { modifiers, key, purpose } = keymap;
          keyInfo = {
            isInstructionOnly: false,
            modes: [],
            func: null,
            command: this.commandDisplayStr(modifiers, key),
            modifiers: modifiers.join(','),
            key,
            purpose,
          };

          customKeysInfo.push(keyInfo);
        }

        // update the handler to capture the active editor
        keyInfo.func = () => {
          const { modal, chooser } = this;
          modal.close();
          const item = chooser.values?.[chooser.selectedItem];
          this.insertIntoEditorAsLink(item, activeEditor, insertConfig);
          return false;
        };

        keyInfo.modes = [mode];
      }
    }

    return keyInfo;
  }

  updateKeymapForMode(keymapConfig: KeymapConfig): void {
    const { mode, activeLeaf } = keymapConfig;
    const {
      modal,
      scope,
      savedStandardKeysInfo,
      standardKeysInfo,
      customKeysInfo,
      facetKeysInfo,
      config: { insertLinkInEditor },
    } = this;

    this.updateInsertIntoEditorCommand(
      mode,
      activeLeaf,
      customKeysInfo,
      insertLinkInEditor,
    );

    const customKeymaps = customKeysInfo.filter((v) => !v.isInstructionOnly);
    this.unregisterKeys(scope, customKeymaps);

    // remove facet keys and reset storage array
    this.unregisterKeys(scope, facetKeysInfo);
    facetKeysInfo.length = 0;

    const customKeysToAdd = customKeymaps.filter((v) => v.modes?.includes(mode));

    if (mode === Mode.Standard) {
      this.registerKeys(scope, savedStandardKeysInfo);
      savedStandardKeysInfo.length = 0;

      // after (re)registering the standard keys, register any custom keys that
      // should also work in standard mode
      this.registerKeys(scope, customKeysToAdd);

      this.toggleStandardInstructions(true);
    } else {
      const standardKeysRemoved = this.unregisterKeys(scope, standardKeysInfo);
      if (standardKeysRemoved.length) {
        savedStandardKeysInfo.push(...standardKeysRemoved);
      }

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
      const foundIndex = keysToRemove.findIndex((kRemove) => {
        // when the 'Mod' modifier is registered, it gets translated to the platform
        // specific version 'Meta' on MacOS or Ctrl on others, so when unregistering
        // account for this conversion
        const kRemoveModifiers = kRemove.modifiers
          .split(',')
          .map((modifier) => (modifier === 'Mod' ? this.modKey : modifier))
          .join(',');

        return kRemoveModifiers === keymap.modifiers && kRemove.key === keymap.key;
      });

      if (foundIndex >= 0) {
        scope.unregister(keymap);
        removed.push(keymap);
        keysToRemove.splice(foundIndex, 1);
      }
    }

    return removed;
  }

  detachCustomInstructionEls(): void {
    this.customInstructionEls.forEach((el) => {
      el.detach();
    });
  }

  toggleStandardInstructions(shouldShow: boolean): void {
    const { standardInstructionsEl } = this;
    let displayValue = 'none';

    if (shouldShow) {
      displayValue = '';
      this.detachCustomInstructionEls();
    }

    if (standardInstructionsEl) {
      standardInstructionsEl.style.display = displayValue;
    }
  }

  showCustomInstructions(
    modal: SwitcherPlus,
    keymapConfig: KeymapConfig,
    keymapInfo: CustomKeymapInfo[],
    facetKeysInfo: Array<CustomKeymapInfo & { facet: Facet }>,
  ): void {
    const { mode, facets } = keymapConfig;
    const { modalEl } = modal;
    const keymaps = keymapInfo.filter((keymap) => keymap.modes?.includes(mode));

    this.toggleStandardInstructions(false);
    this.renderFacetInstructions(modalEl, facets?.facetSettings, facetKeysInfo);
    this.renderCustomInstructions(modalEl, keymaps);
  }

  renderFacetInstructions(
    parentEl: HTMLElement,
    facetSettings: FacetSettingsData,
    facetKeysInfo: Array<CustomKeymapInfo & { facet: Facet }>,
  ): void {
    if (facetKeysInfo?.length && facetSettings.shouldShowFacetInstructions) {
      const modifiersToString = (modifiers: Modifier[]) => {
        return modifiers?.toString().replace(',', ' ');
      };

      const facetInstructionsEl = this.getCustomInstructionsEl('facets', parentEl);

      facetInstructionsEl.empty();
      parentEl.appendChild(facetInstructionsEl);

      // render the preamble
      let instructionEl = facetInstructionsEl.createDiv();
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

        instructionEl = facetInstructionsEl.createDiv();
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

  renderCustomInstructions(parentEl: HTMLElement, keymapInfo: CustomKeymapInfo[]): void {
    const customInstructionsEl = this.getCustomInstructionsEl('custom', parentEl);

    customInstructionsEl.empty();
    parentEl.appendChild(customInstructionsEl);

    keymapInfo.forEach((keymap) => {
      const instructionEl = customInstructionsEl.createDiv();

      instructionEl.createSpan({
        cls: 'prompt-instruction-command',
        text: keymap.command,
      });

      instructionEl.createSpan({ text: keymap.purpose });
    });
  }

  getCustomInstructionsEl(
    kind: 'custom' | 'facets',
    parentEl: HTMLElement,
  ): HTMLDivElement {
    let el = this.customInstructionEls.get(kind);

    if (!el) {
      // CSS classes for each kind of custom instruction element
      const cls = {
        custom: ['qsp-prompt-instructions'],
        facets: ['qsp-prompt-instructions-facets'],
      };

      el = this.createPromptInstructionsEl(cls[kind], parentEl);
      this.customInstructionEls.set(kind, el);
    }

    return el;
  }

  createPromptInstructionsEl(cls: string[], parentEl: HTMLElement): HTMLDivElement {
    const elInfo: DomElementInfo = {
      cls: ['prompt-instructions', ...cls],
    };

    return parentEl.createDiv(elInfo);
  }

  closeModalIfEmpty(evt: KeyboardEvent, _ctx: KeymapContext): boolean | void {
    const { modal, config } = this;

    if (config.shouldCloseModalOnBackspace && !modal?.inputEl.value) {
      modal.close();
      evt.preventDefault();
    }
  }

  useSelectedItem(evt: KeyboardEvent, _ctx: KeymapContext): boolean | void {
    this.chooser.useSelectedItem(evt);
  }

  insertIntoEditorAsLink(
    sugg: AnySuggestion,
    activeLeaf: WorkspaceLeaf,
    insertConfig: InsertLinkConfig,
  ): void {
    const {
      app: { workspace, fileManager, vault },
    } = this;

    const activeMarkdownView = workspace.getActiveViewOfType(MarkdownView);
    const isActiveMarkdown = activeMarkdownView?.leaf === activeLeaf;
    const activeFile = activeMarkdownView?.file;

    if (isActiveMarkdown && activeFile) {
      const linkStr = generateMarkdownLink(
        fileManager,
        vault,
        sugg,
        activeFile.path,
        insertConfig,
      );

      if (linkStr) {
        activeMarkdownView.editor?.replaceSelection(linkStr);
      }
    }
  }

  navigateItems(evt: KeyboardEvent, isNext: boolean): void {
    const { isOpen, chooser } = this;

    if (isOpen) {
      let index = chooser.selectedItem;
      index = isNext ? ++index : --index;
      chooser.setSelectedItem(index, evt);
    }
  }

  commandDisplayStr(modifiers: Modifier[], key: string): string {
    let displayStr = '';

    if (modifiers && key) {
      const { modifierToPlatformStrMap } = this;

      const modifierStr = modifiers
        .map((modifier) => {
          return modifierToPlatformStrMap[modifier]?.toLocaleLowerCase();
        })
        .join(' ');

      displayStr = `${modifierStr} ${key}`;
    }

    return displayStr;
  }
}
