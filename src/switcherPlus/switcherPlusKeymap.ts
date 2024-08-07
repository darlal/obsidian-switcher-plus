import { SwitcherPlusSettings } from 'src/settings';
import { generateMarkdownLink } from 'src/utils';
import {
  AnySuggestion,
  CommandSuggestion,
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
  Instruction,
  Platform,
  App,
  WorkspaceLeaf,
  MarkdownView,
  Hotkey,
  HotkeysSettingTab,
  KeymapEventListener,
} from 'obsidian';
import { CommandHandler } from 'src/Handlers';

export const MOD_KEY: Modifier = Platform.isMacOS ? 'Meta' : 'Ctrl';

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
      this.modifierToPlatformStrMap = {
        Mod: '⌘',
        Ctrl: '⌃',
        Meta: '⌘',
        Alt: '⌥',
        Shift: '⇧',
      };
    }

    this.initKeysInfo();
    this.bindNavigateToCommandHotkeySelector(this.customKeysInfo, config);
    this.bindTogglePinnedCommand(this.customKeysInfo, config);
    this.removeDefaultTabKeyBinding(scope, config);
    this.registerNavigationBindings(scope, config.navigationKeys);
    this.registerEditorTabBindings(scope);
    this.registerCloseWhenEmptyBindings(scope, config);
    this.renderModeTriggerInstructions(modal.modalEl, config);

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
    // should be unregistered in custom modes, then re-registered in standard mode.
    // Note: these won't have the eventListener when they are defined here, since
    // the listener is registered by core Obsidian.
    const standardKeysInfo: CustomKeymapInfo[] = [];

    // custom mode keys that should be registered, then unregistered in standard mode
    // Note: modifiers should be a comma separated string of Modifiers
    // without any padding space characters
    const customKeysInfo: CustomKeymapInfo[] = [
      {
        isInstructionOnly: true,
        modes: customFileBasedModes,
        modifiers: null,
        key: null,
        command: this.commandDisplayStr(['Mod'], '↵'),
        purpose: 'open in new tab',
      },
      {
        isInstructionOnly: true,
        modes: customFileBasedModes,
        modifiers: null,
        key: null,
        command: this.commandDisplayStr(['Mod'], '\\'),
        purpose: 'open to the right',
      },
      {
        isInstructionOnly: true,
        modes: customFileBasedModes,
        modifiers: null,
        key: null,
        command: this.commandDisplayStr(['Mod', 'Shift'], '\\'),
        purpose: 'open below',
      },
      {
        isInstructionOnly: true,
        modes: customFileBasedModes,
        modifiers: null,
        key: null,
        command: this.commandDisplayStr(['Mod'], 'o'),
        purpose: 'open in new window',
      },
      {
        isInstructionOnly: true,
        modes: [Mode.CommandList],
        modifiers: null,
        key: null,
        command: `↵`,
        purpose: 'execute command',
      },
      {
        isInstructionOnly: true,
        modes: [Mode.WorkspaceList],
        modifiers: null,
        key: null,
        command: `↵`,
        purpose: 'open workspace',
      },
    ];

    this.standardKeysInfo.push(...standardKeysInfo);
    this.customKeysInfo.push(...customKeysInfo);
  }

  /**
   * Adds the configured key combination for launching the Obsidian hotkey selection
   * dialog to customKeysInfo
   *
   * @param {CustomKeymapInfo[]} customKeysInfo
   * @param {SwitcherPlusSettings} config
   */
  bindNavigateToCommandHotkeySelector(
    customKeysInfo: CustomKeymapInfo[],
    config: SwitcherPlusSettings,
  ): void {
    const {
      navigateToHotkeySelectorKeys: { modifiers, key },
    } = config;

    const hotkeySelectorNavKeymap: CustomKeymapInfo = {
      modes: [Mode.CommandList],
      purpose: 'set hotkey',
      eventListener: this.navigateToCommandHotkeySelector.bind(this),
      command: this.commandDisplayStr(modifiers, key),
      modifiers: modifiers,
      key,
    };

    customKeysInfo.push(hotkeySelectorNavKeymap);
  }

  /**
   * Adds the configured key combination to pin/unpin Commands to customKeysInfo
   *
   * @param {CustomKeymapInfo[]} customKeysInfo
   * @param {SwitcherPlusSettings} config
   */
  bindTogglePinnedCommand(
    customKeysInfo: CustomKeymapInfo[],
    config: SwitcherPlusSettings,
  ): void {
    const {
      togglePinnedCommandKeys: { modifiers, key },
    } = config;

    const togglePinnedKeymap: CustomKeymapInfo = {
      modes: [Mode.CommandList],
      purpose: 'toggle pinned',
      eventListener: this.togglePinnedCommand.bind(this),
      command: this.commandDisplayStr(modifiers, key),
      modifiers: modifiers,
      key,
    };

    customKeysInfo.push(togglePinnedKeymap);
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
    const keys: [Modifier[], string][] = [
      [[MOD_KEY], '\\'],
      [[MOD_KEY, 'Shift'], '\\'],
      [[MOD_KEY], 'o'],
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
            command: this.commandDisplayStr(modifiers, key),
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
      const preamble = `filters | ${this.commandDisplayStr(facetSettings.modifiers)}`;
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
        // default modifier so display that too. Otherwise, just show the key alone
        const commandDisplayText = modifiers
          ? `(${this.commandDisplayStr(modifiers)}) ${key}`
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

  /**
   * Converts modifiers and key into a string that can be used for visual display purposes, taking into account platform specific modifier renderings.
   *
   * @param {Modifier[]} modifiers
   * @param {?string} [key]
   * @returns {string}
   */
  commandDisplayStr(modifiers: Modifier[], key?: string): string {
    let modifierStr = '';

    if (modifiers) {
      const { modifierToPlatformStrMap } = this;

      modifierStr = modifiers
        .map((modifier) => {
          return modifierToPlatformStrMap[modifier]?.toLocaleLowerCase();
        })
        .sort()
        .join(' ');
    }

    return key ? `${modifierStr} ${key}` : modifierStr;
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
      ?.map((modifier) => (modifier === 'Mod' ? MOD_KEY : modifier))
      .sort()
      .join(',');
  }
}
