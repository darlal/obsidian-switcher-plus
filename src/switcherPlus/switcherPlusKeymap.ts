import { SwitcherPlusSettings } from 'src/settings';
import {
  getDestinationFileForSuggestion,
  generateMarkdownLink,
  isHeadingCache,
  isHeadingSuggestion,
  isSymbolSuggestion,
  getSystemGlobalSearchInstance,
} from 'src/utils';
import {
  AnySuggestion,
  BackgroundOpenNavType,
  CommandSuggestion,
  Facet,
  FacetSettingsData,
  InsertLinkConfig,
  KeymapConfig,
  Mode,
  ModeDispatcher,
  NavigationKeysConfig,
  SwitcherPlus,
} from 'src/types';
import {
  Scope,
  KeymapContext,
  Chooser,
  Modifier,
  KeymapEventHandler,
  Instruction,
  Platform,
  App,
  WorkspaceLeaf,
  MarkdownView,
  Hotkey,
  HotkeysSettingTab,
  KeymapEventListener,
  HeadingCache,
  TFile,
  PaneType,
  SplitDirection,
} from 'obsidian';
import { CommandHandler, HeadingsHandler } from 'src/Handlers';

/**
 * Mapping of special keys to their string representation for display purposes.
 */
const SPECIAL_KEYS_DISPLAY_STR: Record<string, string> = {
  Enter: '↵',
  Backspace: '⌫',
  ArrowLeft: '←',
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowRight: '→',
  Tab: '↹',
};

/**
 * Mapping of keys to their string representation for display purposes.
 */
const KEYS_DISPLAY_STR: Record<string, string> = {
  ...SPECIAL_KEYS_DISPLAY_STR,
  Mod: 'Ctrl',
  Ctrl: 'Ctrl',
  Meta: 'Win',
  Alt: 'Alt',
  Shift: 'Shift',
};

/**
 * Mapping of keys to their string representation for display purposes on MacOS.
 */
const KEYS_DISPLAY_STR_MAC: Record<string, string> = {
  ...SPECIAL_KEYS_DISPLAY_STR,
  Mod: '⌘',
  Ctrl: '⌃',
  Meta: '⌘',
  Alt: '⌥',
  Shift: '⇧',
};

/**
 * Custom modes that rely on an underlying source file being present.
 */
const MODES_CUSTOM_FILE_BASED = [
  Mode.EditorList,
  Mode.HeadingsList,
  Mode.RelatedItemsList,
  Mode.BookmarksList,
  Mode.SymbolList,
];

const MODES_CUSTOM_ALL = [
  Mode.CommandList,
  Mode.VaultList,
  Mode.WorkspaceList,
  ...MODES_CUSTOM_FILE_BASED,
];

export type CustomKeymapInfo = Hotkey &
  Instruction & {
    isInstructionOnly?: boolean;
    modes?: Mode[];
    eventListener?: KeymapEventListener;
  };

export class SwitcherPlusKeymap {
  readonly standardKeysInfo: CustomKeymapInfo[] = [];
  readonly customKeysInfo: CustomKeymapInfo[] = [];
  readonly savedStandardKeysInfo: Array<[CustomKeymapInfo, KeymapEventHandler]> = [];
  private _isOpen: boolean;

  readonly customInstructionEls: Map<'custom' | 'facets' | 'modes', HTMLDivElement> =
    new Map();

  readonly standardInstructionsEl: HTMLElement;
  readonly facetKeysInfo: Array<CustomKeymapInfo & { facet: Facet }> = [];
  readonly insertIntoEditorKeysInfo: CustomKeymapInfo[] = [];

  get isOpen(): boolean {
    return this._isOpen;
  }

  set isOpen(value: boolean) {
    this._isOpen = value;
  }

  /**
   * Returns the "Mod" key based on the current Platform.
   */
  static get modKey(): Modifier {
    return Platform.isMacOS ? 'Meta' : 'Ctrl';
  }

  /**
   * A Map containing the string representation for various keys to be used for display purposes.
   */
  static get keyDisplayStr(): Record<string, string> {
    return Platform.isMacOS ? KEYS_DISPLAY_STR_MAC : KEYS_DISPLAY_STR;
  }

  get exModeHandler(): ModeDispatcher {
    return this.modal?.exMode;
  }

  constructor(
    public app: App,
    public readonly scope: Scope,
    private chooser: Chooser<AnySuggestion>,
    private modal: SwitcherPlus,
    private config: SwitcherPlusSettings,
  ) {
    this.initKeysInfo(config, scope);
    this.renderModeTriggerInstructions(modal.modalEl, config);

    this.standardInstructionsEl =
      modal.modalEl.querySelector<HTMLElement>('.prompt-instructions');
  }

  initKeysInfo(config: SwitcherPlusSettings, scope: Scope): void {
    // standard mode keys that are registered by default, and
    // should be unregistered in custom modes, then re-registered in standard mode.
    // Note: these won't have the eventListener when they are defined here, since
    // the listener is registered by core Obsidian.
    const standardKeysInfo: CustomKeymapInfo[] = [];
    this.standardKeysInfo.push(...standardKeysInfo);

    this.addCustomKeymaps(this.config);
    this.removeDefaultTabKeyBinding(scope, config);
    this.registerNavigationBindings(scope, config.navigationKeys);
    this.registerEditorTabBindings(scope);
    this.registerCloseWhenEmptyBindings(scope, config);
    this.registerQuickOpenBindings(scope, config);
    this.registerFulltextSearchBindings(scope, config);
    this.registerOpenInBackgroundBindings(scope, config);
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

        registerFn(facetModifiers, key, [facet], false);
        this.facetKeysInfo.push({
          facet,
          command: key,
          purpose: facet.label,
          modifiers: facetModifiers,
          key,
        });
      }

      // register the toggle key
      const resetMods = resetModifiers ?? modifiers;
      registerFn(resetMods, resetKey, facetList, true);
      this.facetKeysInfo.push({
        facet: null,
        command: resetKey,
        purpose: 'toggle all',
        modifiers: resetMods,
        key: resetKey,
      });
    }
  }

  registerEditorTabBindings(scope: Scope): void {
    const { modKey } = SwitcherPlusKeymap;
    const keys: [Modifier[], string][] = [
      [[modKey], '\\'],
      [[modKey, 'Shift'], '\\'],
      [[modKey], 'o'],
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

  /**
   * Registers the hotkeys for selecting a suggestion and opening it using its index number in the array.
   *
   * @param {Scope} scope
   * @param {SwitcherPlusSettings} config
   */
  registerQuickOpenBindings(scope: Scope, config: SwitcherPlusSettings): void {
    const { isEnabled, modifiers, keyList } = config.quickOpen;

    if (isEnabled) {
      keyList?.forEach((key) => {
        scope.register(modifiers, key, this.quickOpenByIndex.bind(this));
      });
    }
  }

  /**
   * Uses the vkey from KeymapContext and the QuickOpenConfig keyList to identify the
   * index of a suggestion in the chooser to open.
   *
   * @param {KeyboardEvent} evt
   * @param {KeymapContext} ctx
   * @returns {false}
   */
  quickOpenByIndex(evt: KeyboardEvent, ctx: KeymapContext): false {
    // The index of the key in the keyList array will be used to identify the
    // suggestion to open from the values array in the chooser.
    const index = this.config.quickOpen.keyList.indexOf(ctx.vkey);

    if (index !== -1) {
      const { chooser } = this;

      if (chooser.values.length > index) {
        chooser.setSelectedItem(index, evt);
        this.useSelectedItem(evt, ctx);
      }
    }

    return false; // Return false to prevent default.
  }

  /**
   * Registers the hotkeys for triggering a fulltext search
   *
   * @param {Scope} scope
   * @param {SwitcherPlusSettings} config
   */
  registerFulltextSearchBindings(scope: Scope, config: SwitcherPlusSettings): void {
    const { isEnabled, searchKeys } = config.fulltextSearch;

    if (isEnabled) {
      // The global-search plugin has to be enabled for the trigger to work. This call
      // returns a falsy value if the plugin is not enabled.
      const searchPlugin = getSystemGlobalSearchInstance(this.app);

      if (searchPlugin) {
        scope.register(
          searchKeys.modifiers,
          searchKeys.key,
          this.LaunchSystemGlobalSearch.bind(this),
        );
      }
    }
  }

  LaunchSystemGlobalSearch(_evt: KeyboardEvent, _ctx: KeymapContext): false {
    const { parsedInput, file } = this.modal.exMode.inputTextForFulltextSearch();
    let pathOperator = '';

    if (file) {
      // When file is non-null that means the current mode is a sourced mode scope to
      // file, so add a path operator for the text search.
      // Note: the trailing space is not required, but is only there to visually
      // separate path from search term
      pathOperator = `path:"${file.path}" `;
    }

    this.modal.close();
    getSystemGlobalSearchInstance(this.app)?.openGlobalSearch(
      `${pathOperator}${parsedInput}`,
    );

    return false; // Return false to prevent default.
  }

  /**
   * Registers the configured hotkeys for opening files in the background. Loops through
   * the hotkeys specified for each background navigation type and adds the hotkey
   * to the custom keymap list.
   *
   * @param {Scope} scope
   * @param {SwitcherPlusSettings} config
   */
  registerOpenInBackgroundBindings(scope: Scope, config: SwitcherPlusSettings): void {
    const {
      openInBackground: { isEnabled, openKeys },
    } = config;

    if (isEnabled) {
      // Map each navType to its associated purpose descriptor string
      const purposeDescriptions: Partial<Record<BackgroundOpenNavType, string>> = {
        tab: 'open in background tab',
        vertical: 'open in background to the right',
        horizontal: 'open in background below',
        window: 'open in background window',
      };

      openKeys
        // Remove all definitions that doesn't include a hotkey
        ?.filter((openKey) => openKey.hotkey)
        .forEach(({ openType, hotkey }) => {
          scope.register(hotkey.modifiers, hotkey.key, () =>
            this.openInBackground(this.chooser, openType),
          );

          // Add it to the custom keymap list so it gets rendered as instructions only
          this.createCustomKeymap(
            purposeDescriptions[openType],
            MODES_CUSTOM_ALL,
            hotkey,
            null,
            true,
            true,
          );
        });
    }
  }

  /**
   * Extracts the currently selected suggestion and forwards to modeHandler to open
   * using the specified navigation type.
   *
   * @param {Chooser<AnySuggestion>} chooser
   * @param {BackgroundOpenNavType} navType key of SplitDirection or
   * PaneType (excluding 'split')
   * @returns {false}
   */
  openInBackground(
    chooser: Chooser<AnySuggestion>,
    navType: BackgroundOpenNavType,
  ): false {
    let paneType: PaneType;
    let splitDirection: SplitDirection = 'vertical';

    if (navType === 'vertical' || navType === 'horizontal') {
      paneType = 'split';
      splitDirection = navType;
    } else {
      paneType = navType;
    }

    const sugg = chooser?.values?.[chooser.selectedItem];
    this.exModeHandler.openSuggestionInBackground(sugg, paneType, splitDirection);

    // Return false to prevent default
    return false;
  }

  /**
   * Adds a flair icon element to the first nth suggestionElements displaying the hotkey
   * that can be used to select and open that suggestion.
   *
   * @param {HTMLDivElement[]} suggestionElements Array of already rendered Suggestion elements.
   * @param {SwitcherPlusSettings} config
   */
  renderQuickOpenFlairIcons(
    suggestionElements: HTMLDivElement[],
    config: SwitcherPlusSettings,
  ): void {
    const { isEnabled, modifiers, keyList } = config.quickOpen;

    if (isEnabled) {
      for (let i = 0; i < keyList.length && i < suggestionElements.length; i++) {
        const key = keyList[i];
        const parentEl = suggestionElements[i];
        const containerEl = parentEl.createDiv({ cls: 'qsp-quick-open-aux' });

        // Create the hotkey flair element.
        containerEl?.createEl('kbd', {
          cls: ['suggestion-hotkey', 'qsp-quick-open-hotkey'],
          text: SwitcherPlusKeymap.commandDisplayStr(modifiers, key),
        });
      }
    }
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
            command: SwitcherPlusKeymap.commandDisplayStr(modifiers, key),
            modifiers,
            key,
            purpose,
          };

          customKeysInfo.push(keyInfo);
        }

        // update the handler to capture the active editor
        keyInfo.eventListener = () => {
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
      customKeysInfo,
      facetKeysInfo,
      standardKeysInfo,
      savedStandardKeysInfo,
      config: { insertLinkInEditor, showModeTriggerInstructions },
    } = this;
    this.updateInsertIntoEditorCommand(
      mode,
      activeLeaf,
      customKeysInfo,
      insertLinkInEditor,
    );

    // Unregister all custom keys that was previously registered
    const customKeymaps = customKeysInfo.filter((v) => !v.isInstructionOnly);
    this.unregisterKeys(scope, customKeymaps);

    // Remove facet keys and reset storage array
    this.unregisterKeys(scope, facetKeysInfo);
    facetKeysInfo.length = 0;

    // Filter to just the list of custom keys that should be
    // registered in the current mode
    const customKeysToAdd = customKeymaps.filter((v) => v.modes?.includes(mode));

    if (mode === Mode.Standard) {
      this.updateKeymapForStandardMode(scope, customKeysToAdd, savedStandardKeysInfo);
    } else {
      this.updateKeymapForCustomModes(
        scope,
        customKeysToAdd,
        standardKeysInfo,
        keymapConfig,
        modal,
      );
    }

    this.showModeTriggerInstructions(modal.modalEl, showModeTriggerInstructions);
  }

  /**
   * Re-register the standard mode keys that were previously unregistered, if any.
   * And enables displaying the standard prompt instructions
   *
   * @param {Scope} scope
   * @param {CustomKeymapInfo[]} customKeysToAdd Array of custom keymaps that should be registered
   * @param {Array<[CustomKeymapInfo, KeymapEventHandler]>} savedStandardKeysInfo Event
   * handler info for standard keys that were previously unregistered
   */
  updateKeymapForStandardMode(
    scope: Scope,
    customKeysToAdd: CustomKeymapInfo[],
    savedStandardKeysInfo: Array<[CustomKeymapInfo, KeymapEventHandler]>,
  ): void {
    // Merge the properties from the saved tuple into an object that can be used
    // for re-registering. This is because access to the listener is only available after
    // a standard keymap has already been unregistered.
    const reregisterKeymaps = savedStandardKeysInfo.map(([keymap, eventHandler]) => {
      return {
        eventListener: eventHandler.func,
        ...keymap,
      };
    });

    // Register the standard keys again
    this.registerKeys(scope, reregisterKeymaps);
    savedStandardKeysInfo.length = 0;

    // after (re)registering the standard keys, register any custom keys that
    // should also work in standard mode
    this.registerKeys(scope, customKeysToAdd);
    this.toggleStandardInstructions(true);
  }

  /**
   * Unregisters the standard mode keys, registers the custom keys and displays
   * the custom prompt instructions
   *
   * @param {Scope} scope
   * @param {CustomKeymapInfo[]} customKeysToAdd Array of custom keymaps that should be registered
   * @param {CustomKeymapInfo[]} standardKeysInfo Array of standard keymaps that should be unregistered
   * @param {KeymapConfig} keymapConfig
   * @param {SwitcherPlus} modal
   */
  updateKeymapForCustomModes(
    scope: Scope,
    customKeysToAdd: CustomKeymapInfo[],
    standardKeysInfo: CustomKeymapInfo[],
    keymapConfig: KeymapConfig,
    modal: SwitcherPlus,
  ): void {
    const { savedStandardKeysInfo, customKeysInfo, facetKeysInfo } = this;

    // Unregister the standard keys and save them so they can be registered
    // again later
    const standardKeysRemoved = this.unregisterKeys(scope, standardKeysInfo);
    if (standardKeysRemoved.length) {
      savedStandardKeysInfo.push(...standardKeysRemoved);
    }

    this.registerKeys(scope, customKeysToAdd);
    this.registerFacetBinding(scope, keymapConfig);
    this.showCustomInstructions(modal, keymapConfig, customKeysInfo, facetKeysInfo);
  }

  /**
   * Registers keymaps using the provided scope.
   *
   * @param {Scope} scope
   * @param {CustomKeymapInfo[]} keymaps
   */
  registerKeys(scope: Scope, keymaps: CustomKeymapInfo[]): void {
    keymaps.forEach(({ modifiers, key, eventListener }) => {
      scope.register(modifiers, key, eventListener);
    });
  }

  /**
   * Finds each keymap in Scope.keys and unregisters the associated KeymapEventHandler
   *
   * @param {Scope} scope
   * @param {CustomKeymapInfo[]} keymaps the keymaps to remove
   * @returns {Array<[CustomKeymapInfo, KeymapEventHandler]>} An array of tuples containing the keymap removed and the associated KeymapEventHandler that was unregistered.
   */
  unregisterKeys(
    scope: Scope,
    keymaps: CustomKeymapInfo[],
  ): Array<[CustomKeymapInfo, KeymapEventHandler]> {
    const removedEventHandlers: Array<[CustomKeymapInfo, KeymapEventHandler]> = [];

    // Map the keymaps to remove into an object that looks like:
    // { key: { modifiers1: keymap, modifiers2: keymap } }
    const keymapsByKey: Record<string, Record<string, CustomKeymapInfo>> = {};
    keymaps.map((keymap) => {
      const { key, modifiers } = keymap;
      const modifierStr = SwitcherPlusKeymap.modifiersToKeymapInfoStr(modifiers);
      const modifierList = keymapsByKey[key];

      if (modifierList) {
        modifierList[modifierStr] = keymap;
      } else {
        keymapsByKey[key] = { [modifierStr]: keymap };
      }
    });

    let i = scope.keys.length;
    while (i--) {
      const registeredHandler = scope.keys[i];
      const modifiersList = keymapsByKey[registeredHandler.key];
      const foundKeymap = modifiersList?.[registeredHandler.modifiers];

      if (foundKeymap) {
        scope.unregister(registeredHandler);
        removedEventHandlers.push([foundKeymap, registeredHandler]);
      }
    }

    return removedEventHandlers;
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
    this.renderCustomInstructions(modalEl, keymaps);
    this.renderFacetInstructions(modalEl, facets?.facetSettings, facetKeysInfo);
  }

  renderFacetInstructions(
    parentEl: HTMLElement,
    facetSettings: FacetSettingsData,
    facetKeysInfo: Array<CustomKeymapInfo & { facet: Facet }>,
  ): void {
    if (facetKeysInfo?.length && facetSettings.shouldShowFacetInstructions) {
      const facetInstructionsEl = this.getCustomInstructionsEl('facets', parentEl);

      facetInstructionsEl.empty();
      parentEl.appendChild(facetInstructionsEl);

      // render the preamble
      const preamble = `filters | ${SwitcherPlusKeymap.commandDisplayStr(facetSettings.modifiers)}`;
      this.createPromptInstructionCommandEl(facetInstructionsEl, preamble);

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
        // default modifier so display that too. Otherwise, just show the key alone.
        // Note: In this case the modifier is purposely displayed separately in parenthesis
        // to indicate to the user that it's not the "standard" modifier.
        const commandDisplayText = modifiers
          ? `(${SwitcherPlusKeymap.commandDisplayStr(modifiers)}) ${key}`
          : `${key}`;

        this.createPromptInstructionCommandEl(
          facetInstructionsEl,
          commandDisplayText,
          purpose,
          [],
          activeCls,
        );
      });
    }
  }

  renderCustomInstructions(parentEl: HTMLElement, keymapInfo: CustomKeymapInfo[]): void {
    const customInstructionsEl = this.getCustomInstructionsEl('custom', parentEl);

    customInstructionsEl.empty();
    parentEl.appendChild(customInstructionsEl);

    keymapInfo.forEach((keymap) => {
      this.createPromptInstructionCommandEl(
        customInstructionsEl,
        keymap.command,
        keymap.purpose,
      );
    });
  }

  showModeTriggerInstructions(parentEl: HTMLElement, isEnabled: boolean): void {
    if (isEnabled) {
      const el = this.customInstructionEls.get('modes');
      if (el) {
        parentEl.appendChild(el);
      }
    }
  }

  renderModeTriggerInstructions(
    parentEl: HTMLElement,
    config: SwitcherPlusSettings,
  ): void {
    // Map mode triggers to labels (purpose)
    const instructionsByModeTrigger = new Map<string, string>([
      [config.headingsListCommand, 'heading list'],
      [config.editorListCommand, 'editor list'],
      [config.bookmarksListCommand, 'bookmark list'],
      [config.commandListCommand, 'command list'],
      [config.workspaceListCommand, 'workspace list'],
      [config.vaultListCommand, 'vault list'],
      [config.symbolListActiveEditorCommand, 'symbol list (active editor)'],
      [config.symbolListCommand, 'symbol list (embedded)'],
      [config.relatedItemsListActiveEditorCommand, 'related items (active editor)'],
      [config.relatedItemsListCommand, 'related items (embedded)'],
    ]);

    const modeInstructionsEl = this.getCustomInstructionsEl('modes', parentEl);
    modeInstructionsEl.detach();
    modeInstructionsEl.empty();

    // Render the preamble
    this.createPromptInstructionCommandEl(modeInstructionsEl, 'mode triggers |');

    // Render each item
    instructionsByModeTrigger.forEach((purpose, modeTrigger) => {
      this.createPromptInstructionCommandEl(modeInstructionsEl, modeTrigger, purpose);
    });
  }

  getCustomInstructionsEl(
    kind: 'custom' | 'facets' | 'modes',
    parentEl: HTMLElement,
  ): HTMLDivElement {
    let el = this.customInstructionEls.get(kind);

    if (!el) {
      // CSS classes for each kind of custom instruction element
      const cls = {
        custom: ['qsp-prompt-instructions'],
        facets: ['qsp-prompt-instructions-facets'],
        modes: ['qsp-prompt-instructions-modes'],
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

  createPromptInstructionCommandEl(
    parentEl: HTMLElement,
    command: string,
    purpose?: string,
    clsCommand?: string[],
    clsPurpose?: string[],
  ): HTMLDivElement {
    clsCommand = clsCommand ?? [];
    const instructionEl = parentEl.createDiv();

    instructionEl.createSpan({
      cls: ['prompt-instruction-command', ...clsCommand],
      text: command,
    });

    if (purpose) {
      clsPurpose = clsPurpose ?? [];
      instructionEl.createSpan({ cls: clsPurpose, text: purpose });
    }

    return instructionEl;
  }

  closeModalIfEmpty(evt: KeyboardEvent, _ctx: KeymapContext): boolean | void {
    const { modal, config } = this;

    if (config.shouldCloseModalOnBackspace && !modal?.inputEl.value) {
      modal.close();
      evt.preventDefault();
    }
  }

  /**
   * Launches the builtin Obsidian hotkey selection dialog for assigning a hotkey to
   * the selected Command in the Chooser
   *
   * @param {KeyboardEvent} _evt
   * @param {KeymapContext} _ctx
   * @returns {(boolean | void)} false
   */
  navigateToCommandHotkeySelector(
    _evt: KeyboardEvent,
    _ctx: KeymapContext,
  ): boolean | void {
    const {
      modal,
      chooser,
      app: { setting },
    } = this;

    const selectedCommand = chooser.values?.[chooser.selectedItem] as CommandSuggestion;

    if (selectedCommand) {
      // Open the builtin hotkey selection settings tab
      setting.open();
      const hotkeysSettingTab = setting.openTabById('hotkeys') as HotkeysSettingTab;

      if (hotkeysSettingTab) {
        modal.close();

        const commandId = selectedCommand.item.id;
        hotkeysSettingTab.setQuery(`${commandId}`);
      }
    }

    // Return false to prevent default
    return false;
  }

  /**
   * Toggles the pinned status of the currently selected Command suggestion in the Chooser
   *
   * @param {KeyboardEvent} _evt
   * @param {KeymapContext} _ctx
   * @returns {(boolean | void)}
   */
  togglePinnedCommand(_evt: KeyboardEvent, _ctx: KeymapContext): boolean | void {
    const { app, config, chooser } = this;
    const selectedSugg = chooser.values?.[chooser.selectedItem] as CommandSuggestion;
    const pluginInstance = CommandHandler.getEnabledCommandPalettePluginInstance(app);

    if (selectedSugg && pluginInstance) {
      const commandId = selectedSugg.item.id;
      const parentEl = chooser.suggestions[chooser.selectedItem];
      let pinned = pluginInstance.options?.pinned;

      if (pinned) {
        const idx = pinned.indexOf(commandId);

        // When idx is not found, isPinned should be toggled on, and when idx is found
        // isPinned should be toggled off
        selectedSugg.isPinned = idx === -1;

        if (selectedSugg.isPinned) {
          // Add this command to the pinned list
          pinned.push(commandId);
        } else {
          // Remove this command command from the pinned list
          pinned.splice(idx, 1);
        }
      } else {
        pinned = [commandId];
        pluginInstance.options.pinned = pinned;
      }

      // Save the updated setting, and update the suggestion rendering
      pluginInstance.saveSettings(pluginInstance.plugin);
      parentEl.empty();
      new CommandHandler(app, config).renderSuggestion(selectedSugg, parentEl);
    }

    // Return false to prevent default
    return false;
  }

  toggleMarkdownContentRendering(
    _evt: KeyboardEvent,
    _ctx: KeymapContext,
  ): boolean | void {
    const { app, config, chooser } = this;
    const selectedSugg = chooser.values?.[chooser.selectedItem];
    let headingCache: HeadingCache = null;
    let file: TFile = null;

    if (isSymbolSuggestion(selectedSugg) && isHeadingCache(selectedSugg.item.symbol)) {
      // Suggestion is a Symbol suggestion with a HeadingCache payload
      headingCache = selectedSugg.item.symbol;
      file = selectedSugg.file;
    } else if (isHeadingSuggestion(selectedSugg)) {
      // Suggestion is a regular Heading Suggestion
      headingCache = selectedSugg.item;
      file = selectedSugg.file;
    }

    if (headingCache && file) {
      const parentEl = chooser.suggestions[chooser.selectedItem];
      const titleEl = parentEl.querySelector<HTMLElement>('.qsp-title');

      // If the .qsp-rendered-container element exists then the suggestion is
      // currently rendered as HTML, so toggle it to disable HTML rendering.
      const shouldRenderAsHTML = !titleEl.querySelector('.qsp-rendered-container');

      // Remove the child nodes from titleEl container since they will be re-rendered.
      titleEl.empty();

      HeadingsHandler.renderHeadingContent(
        app,
        config,
        titleEl,
        headingCache,
        file,
        selectedSugg.match,
        shouldRenderAsHTML,
      );
    }

    // Return false to prevent default
    return false;
  }

  /**
   * Triggers the system default app associated with the file extension of the
   * currently selected suggestion.
   *
   * @param {KeyboardEvent} _evt
   * @param {KeymapContext} _ctx
   * @returns {false}
   */
  openDefaultApp(_evt: KeyboardEvent, _ctx: KeymapContext): false {
    const {
      app,
      config: {
        openDefaultApp: { excludeFileExtensions },
      },
      chooser,
    } = this;

    const selectedSugg = chooser.values?.[chooser.selectedItem];
    const suggFile = getDestinationFileForSuggestion(selectedSugg);

    if (suggFile && !excludeFileExtensions.includes(suggFile.extension)) {
      // The file extension is not excluded try to launch the default app
      const message = `Switcher++: error opening file (${suggFile.path}) in default app. `;
      app.openWithDefaultApp(suggFile.path).catch((reason) => {
        console.log(message, reason);
      });
    }

    // Return false to prevent default
    return false;
  }

  useSelectedItem(evt: KeyboardEvent, _ctx: KeymapContext): false {
    this.chooser.useSelectedItem(evt);
    return false; // Return false to prevent default.
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

  /**
   * Converts modifiers and key into a string that can be used for visual display purposes,
   * taking into account platform specific modifier renderings.
   *
   * @param {Modifier[]} modifiers
   * @param {?string} [key]
   * @returns {string} A string representation of modifier and key usable for display purposes.
   */
  static commandDisplayStr(modifiers: Modifier[], key?: string): string {
    const { keyDisplayStr } = this;
    let modifierStr: string = null;
    let keyStr: string = null;

    if (modifiers) {
      modifierStr = modifiers
        .map((modifier) => {
          return keyDisplayStr[modifier]?.toLocaleLowerCase();
        })
        .sort()
        .join(' ');
    }

    if (key) {
      keyStr = Object.prototype.hasOwnProperty.call(keyDisplayStr, key)
        ? keyDisplayStr[key]
        : key;
    }

    // Filter out either of these if falsy, but if both have a value, join them with a space.
    return [modifierStr, keyStr].filter((str) => str).join(' ');
  }

  /**
   * Converts modifiers into a string that can be used to search against Scope.keys
   *
   * @static
   * @param {Modifier[]} modifiers
   * @returns {string}
   */
  static modifiersToKeymapInfoStr(modifiers: Modifier[]): string {
    // when the 'Mod' modifier is registered, it gets translated to the platform
    // specific version 'Meta' on MacOS or Ctrl on others
    return modifiers
      ?.map((modifier) => (modifier === 'Mod' ? this.modKey : modifier))
      .sort()
      .join(',');
  }

  /**
   * Generates a hotkey mapping bound to eventListener and optionally add it to the list
   * of custom keymaps
   *
   * @param {string} purpose The label for the keymap, this is user visible in the UI.
   * @param {Mode[]} modes An array of Modes in which the keymap should be registered.
   * @param {Hotkey} hotkey The hotkey combination to register.
   * @param {KeymapEventListener} eventListener The event handler to call when the keymap
   * combination is triggered.
   * @param {boolean} [shouldAddToColl=true] True to add the keymap to the list of custom
   * keymaps.
   * @param {boolean} [isInstructionOnly=false] True to indicated that the keymap is used
   * for display purposes only and should not be registered in Scope. This is useful for
   * core Obsidian keymaps that are already registered.
   * @returns {CustomKeymapInfo} The keymap that was created.
   */
  createCustomKeymap(
    purpose: string,
    modes: Mode[],
    hotkey: Hotkey,
    eventListener: KeymapEventListener,
    shouldAddToColl = true,
    isInstructionOnly = false,
  ): CustomKeymapInfo {
    let customKeymap: CustomKeymapInfo = null;

    if (hotkey) {
      const { modifiers, key } = hotkey;

      customKeymap = {
        modes,
        modifiers,
        key,
        eventListener,
        purpose,
        command: SwitcherPlusKeymap.commandDisplayStr(modifiers, key),
        isInstructionOnly,
      };

      if (shouldAddToColl) {
        this.customKeysInfo.push(customKeymap);
      }
    }

    return customKeymap;
  }

  /**
   * Defines the Hotkey combinations use to trigger actions when in custom modes.
   *
   * @param {SwitcherPlusSettings} config
   */
  addCustomKeymaps(config: SwitcherPlusSettings): void {
    // Display instructions for opening top nth suggestions using a dedicated hotkey
    const { quickOpen } = config;
    const openKeyList = quickOpen?.keyList;
    if (openKeyList?.length) {
      const quickOpenKeyStr = `${openKeyList[0]}~${openKeyList[openKeyList.length - 1]}`;
      this.createCustomKeymap(
        'open nth item',
        MODES_CUSTOM_ALL,
        { modifiers: quickOpen.modifiers, key: quickOpenKeyStr },
        null,
        quickOpen.isEnabled,
        true,
      );
    }

    // Builtin keymap to open file in a new tab.
    this.createCustomKeymap(
      'open in new tab',
      MODES_CUSTOM_FILE_BASED,
      { modifiers: ['Mod'], key: 'Enter' },
      null,
      true,
      true,
    );

    // Open file in new tab, in a pane on the right hand side.
    this.createCustomKeymap(
      'open to the right',
      MODES_CUSTOM_FILE_BASED,
      { modifiers: ['Mod'], key: '\\' },
      null,
      true,
      true,
    );

    // Open file in a new tab, in a pane below the current pane.
    this.createCustomKeymap(
      'open below',
      MODES_CUSTOM_FILE_BASED,
      { modifiers: ['Mod', 'Shift'], key: '\\' },
      null,
      true,
      true,
    );

    // Open file in a new Obsidian window.
    this.createCustomKeymap(
      'open in new window',
      MODES_CUSTOM_FILE_BASED,
      { modifiers: ['Mod'], key: 'o' },
      null,
      true,
      true,
    );

    this.createCustomKeymap(
      'execute command',
      [Mode.CommandList],
      { modifiers: [], key: 'Enter' },
      null,
      true,
      true,
    );

    this.createCustomKeymap(
      'open workspace',
      [Mode.WorkspaceList],
      { modifiers: [], key: 'Enter' },
      null,
      true,
      true,
    );

    // Launches the Obsidian hotkey selection dialog for a command.
    this.createCustomKeymap(
      'set hotkey',
      [Mode.CommandList],
      config.navigateToHotkeySelectorKeys,
      this.navigateToCommandHotkeySelector.bind(this),
    );

    // Toggles the pin/unpin state for a command.
    this.createCustomKeymap(
      'toggle pinned',
      [Mode.CommandList],
      config.togglePinnedCommandKeys,
      this.togglePinnedCommand.bind(this),
    );

    // Toggles between showing raw text content for a heading (with search match
    // highlights), or, showing rendered markdown content for the heading.
    const { renderMarkdownContentInSuggestions } = config;
    this.createCustomKeymap(
      'toggle preview (selected heading)',
      [Mode.HeadingsList, Mode.SymbolList],
      renderMarkdownContentInSuggestions.toggleContentRenderingKeys,
      this.toggleMarkdownContentRendering.bind(this),
      renderMarkdownContentInSuggestions.isEnabled,
    );

    // Open default app associated with file extension
    const { openDefaultApp } = config;
    this.createCustomKeymap(
      'open default app',
      MODES_CUSTOM_FILE_BASED,
      openDefaultApp.openInDefaultAppKeys,
      this.openDefaultApp.bind(this),
      openDefaultApp.isEnabled,
    );

    // Trigger fulltext search
    const { fulltextSearch } = config;
    this.createCustomKeymap(
      'fulltext search',
      MODES_CUSTOM_ALL,
      fulltextSearch.searchKeys,
      null,
      fulltextSearch.isEnabled,
      true,
    );
  }
}
