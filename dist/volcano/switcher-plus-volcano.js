(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global['switcher-plus'] = factory());
}(this, (function () { 'use strict';

  const QUICK_SWITCHER_ID = 'switcher'; // Switcher modes of operation

  const Mode = {
    Standard: 1,
    EditorList: 2,
    SymbolList: 4
  };
  const SymbolType = {
    Link: 1,
    Embed: 2,
    Tag: 4,
    Heading: 8
  };
  const SymbolIndicators = {};
  SymbolIndicators[SymbolType.Link] = '🔗';
  SymbolIndicators[SymbolType.Embed] = '!';
  SymbolIndicators[SymbolType.Tag] = '#';
  SymbolIndicators[SymbolType.Heading] = {
    1: 'H₁',
    2: 'H₂',
    3: 'H₃',
    4: 'H₄',
    5: 'H₅',
    6: 'H₆'
  };

  const Settings = {
    // command to enable filtering of open editors
    editorListCommand: 'edt ',
    // command to enable filtering of file symbols
    symbolListCommand: '@',
    // types of open views to hide from the suggestion list
    excludeViewTypes: ['empty'],
    // true to always open a new pane when navigating to a Symbol
    alwaysNewPaneForSymbols: false
  };

  const indicatorStyle = 'color: var(--text-accent); width: 2.5em; text-align: center; float:left; font-weight:800;';

  function getQuickSwitcher(app) {
    const switcher = app.plugins.getPluginById(QUICK_SWITCHER_ID);

    if (!switcher) {
      return null;
    }

    return switcher.instance.modal.constructor;
  }

  var createModalPopup = (app => {
    const QuickSwitcher = getQuickSwitcher(app);

    if (QuickSwitcher === null) {
      return null;
    }

    class ModalPopup extends QuickSwitcher {
      constructor(appObj) {
        super(appObj);
        this.mode = Mode.Standard;
        this.symbolTargetPath = null;
      }

      openInMode(mode) {
        this.mode = mode || Mode.Standard;
        this.open();
      }

      onOpen() {
        let val = '';
        const {
          mode
        } = this;

        if (mode === Mode.EditorList) {
          val = Settings.editorListCommand;
        } else if (mode === Mode.SymbolList) {
          val = Settings.symbolListCommand; // force reset suggestions so any suggestions from a previous operation
          // won't be incorrectly used for symbol search

          this.chooser.setSuggestions([]);
        }

        this.isOpen = true;
        this.inputEl.value = val;
        this.inputEl.focus();
        this.onInput();
      }

      onInput() {
        let startIndex = 0;
        let {
          mode,
          symbolTargetPath
        } = this;
        const {
          editorListCommand,
          symbolListCommand
        } = Settings;
        const {
          value,
          hasSymbolCmd,
          canUseSuggForSymbolTarget,
          hasExistingSymbolTarget,
          canUseActiveEditorForSymbolTarget,
          symbolCmdIndex,
          currentSuggestion,
          currentEditorFile,
          hasEditorCmdPrefix
        } = this.parseInput();

        if (hasSymbolCmd && (canUseSuggForSymbolTarget || hasExistingSymbolTarget || canUseActiveEditorForSymbolTarget)) {
          mode = Mode.SymbolList;
          startIndex = symbolCmdIndex + symbolListCommand.length;

          if (canUseSuggForSymbolTarget) {
            symbolTargetPath = currentSuggestion.item;
          } else if (canUseActiveEditorForSymbolTarget) {
            symbolTargetPath = currentEditorFile.path;
          }
        } else if (hasEditorCmdPrefix) {
          mode = Mode.EditorList;
          startIndex = editorListCommand.length;
          symbolTargetPath = null;
        } else {
          mode = Mode.Standard;
          symbolTargetPath = null;
        }

        this.symbolTargetPath = symbolTargetPath;
        this.mode = mode;
        this.updateHelperTextForMode(mode);
        this.updateKeymapForMode(mode);

        if (mode === Mode.Standard) {
          super.onInput();
        } else {
          const search = ModalPopup.stringToCharCode(value, startIndex);
          this.triggerSearch(search);
        }
      }

      parseInput() {
        const {
          editorListCommand,
          symbolListCommand,
          excludeViewTypes
        } = Settings;
        const {
          symbolTargetPath,
          chooser,
          mode: oldMode,
          app: {
            workspace
          },
          inputEl: {
            value
          }
        } = this; // wether or not a symbol target file exists. Indicates that the previous
        // operation was a symbol operation

        const hasExistingSymbolTarget = oldMode === Mode.SymbolList && symbolTargetPath; // get the index of symbol command and determine if it exists

        const symbolCmdIndex = value.indexOf(symbolListCommand);
        const hasSymbolCmd = symbolCmdIndex !== -1;
        let currentSuggestion = null;

        if (hasSymbolCmd) {
          // determine if there is a current suggestion that can be used as the
          // target for symbol search. This means the suggestion has to point to
          // a file
          currentSuggestion = chooser.values[chooser.selectedItem];

          if (currentSuggestion && Object.prototype.hasOwnProperty.call(currentSuggestion, 'symbolType')) {
            // symbol suggestions don't point to a file
            currentSuggestion = null;
          }
        } // whether or not the current suggestion can be used for symbol search


        const canUseSuggForSymbolTarget = !!currentSuggestion; // determine if the current active editor pane is valid

        const {
          view,
          view: {
            file: currentEditorFile
          }
        } = workspace.activeLeaf;
        const isCurrentEditorValid = !excludeViewTypes.includes(view.getViewType()); // whether or not the current active editor can be used as the target for
        // symbol search

        const canUseActiveEditorForSymbolTarget = symbolCmdIndex === 0 && !canUseSuggForSymbolTarget && isCurrentEditorValid && currentEditorFile; // determine if the editor command exists and if it's valid

        const editorCmdIndex = value.indexOf(editorListCommand);
        const hasEditorCmdPrefix = editorCmdIndex === 0;
        return {
          value,
          hasSymbolCmd,
          canUseSuggForSymbolTarget,
          hasExistingSymbolTarget,
          canUseActiveEditorForSymbolTarget,
          symbolCmdIndex,
          currentSuggestion,
          currentEditorFile,
          hasEditorCmdPrefix
        };
      }

      updateHelperTextForMode(mode) {
        const {
          containerEl
        } = this;
        const selector = '.prompt-instructions';
        const el = containerEl.querySelector(selector);

        if (el) {
          el.style.display = mode === Mode.Standard ? '' : 'none';
        }
      }

      updateKeymapForMode(mode) {
        const {
          scope: {
            keys
          }
        } = this;
        let {
          backupKeys = []
        } = this;

        if (mode === Mode.Standard) {
          if (backupKeys.length) {
            backupKeys.forEach(key => keys.push(key));
          }

          backupKeys = undefined;
        } else {
          // unregister unused hotkeys for custom modes
          for (let i = keys.length - 1; i >= 0; --i) {
            const key = keys[i];

            if (key.key === 'Enter' && (key.modifiers === 'Meta' || key.modifiers === 'Shift')) {
              keys.splice(i, 1);
              backupKeys.push(key);
            }
          }
        }

        this.backupKeys = backupKeys;
      }

      static stringToCharCode(str = '', startIndex = 0) {
        const strLower = str.slice(startIndex).toLowerCase();
        const charCodes = [];

        for (let i = 0; i < strLower.length; i++) {
          charCodes[i] = strLower.charCodeAt(i);
        }

        return charCodes;
      }

      triggerSearch(search) {
        const {
          mode
        } = this;
        const items = this.getItemsToFilter();
        let suggestions;

        if (mode === Mode.EditorList) {
          suggestions = this.createEditorSuggestions(items, search);
        } else if (mode === Mode.SymbolList) {
          suggestions = this.createSymbolSuggestions(items, search);
        }

        this.chooser.setSuggestions(suggestions);
      }

      createSymbolSuggestions(data = {}, search) {
        const suggestions = [];
        const {
          links,
          embeds,
          tags,
          headings
        } = data;

        const getLinkValue = item => {
          let {
            link: value
          } = item;
          const {
            displayText
          } = item;

          if (displayText && displayText !== value) {
            value += `|${displayText}`;
          }

          return value;
        };

        this.makeSuggestions(headings, search, item => item.heading, suggestions, SymbolType.Heading);
        this.makeSuggestions(tags, search, item => item.tag.slice(1), suggestions, SymbolType.Tag);
        this.makeSuggestions(links, search, getLinkValue, suggestions, SymbolType.Link);
        this.makeSuggestions(embeds, search, getLinkValue, suggestions, SymbolType.Embed);
        return suggestions;
      }

      makeSuggestions(items = [], search, valueCallback, suggestions = [], symbolType) {
        items.forEach(item => {
          const value = valueCallback(item);

          if (value) {
            const sugg = search.length ? this.match(search, value) : {
              item: value,
              match: null
            };

            if (sugg) {
              sugg.data = item;

              if (symbolType) {
                sugg.symbolType = symbolType;
              }

              suggestions.push(sugg);
            }
          }
        });
        return suggestions;
      }

      createEditorSuggestions(data, search) {
        const getValue = item => {
          const {
            file
          } = item.view;
          return file ? file.path : null;
        };

        return this.makeSuggestions(data, search, getValue);
      }

      getSymbolsForTargetFile() {
        let ret;
        const {
          symbolTargetPath,
          app: {
            metadataCache
          }
        } = this;

        if (!symbolTargetPath) {
          return ret;
        }

        const file = metadataCache.fileCache[symbolTargetPath];
        return file ? metadataCache.metadataCache[file.hash] : ret;
      }

      getOpenRootSplits() {
        const {
          workspace
        } = this.app;
        const leaves = [];

        const saveLeaf = l => {
          if (!Settings.excludeViewTypes.includes(l.view.getViewType())) {
            leaves.push(l);
          }
        };

        workspace.iterateLeaves(saveLeaf, workspace.rootSplit);
        return leaves;
      }

      getItemsToFilter() {
        const {
          mode
        } = this;
        let items;

        switch (mode) {
          case Mode.EditorList:
            items = this.getOpenRootSplits();
            break;

          case Mode.SymbolList:
            items = this.getSymbolsForTargetFile();
            break;

          default:
            items = super.getItemsToFilter();
        }

        return items;
      }

      onSelectSuggestion(sugg, nextSegment) {
        const {
          mode
        } = this;

        if (mode === Mode.Standard) {
          super.onSelectSuggestion(sugg, nextSegment);
        } else {
          this.close();
          this.isOpen = false;

          if (mode === Mode.EditorList) {
            this.app.workspace.setActiveLeaf(sugg.data);
          } else if (mode === Mode.SymbolList) {
            this.navigateToSymbol(sugg);
          }
        }
      }

      navigateToSymbol(sugg) {
        const {
          symbolTargetPath,
          app: {
            workspace
          }
        } = this; // determine if the target is already open in a pane

        const leaf = this.getOpenRootSplits().find(({
          view
        }) => view.file && view.file.path === symbolTargetPath);
        const {
          data
        } = sugg;
        const line = Object.prototype.hasOwnProperty.call(data, 'line') ? data.line : data.lineStart;

        if (leaf && !Settings.alwaysNewPaneForSymbols) {
          // activate the already open pane
          workspace.setActiveLeaf(leaf); // scroll to the line containing the symbol

          leaf.view.setEphemeralState({
            line
          });
        } else {
          workspace.openLinkText(symbolTargetPath, '', false, {
            eState: {
              focus: true,
              line
            }
          });
        }
      }

      createSuggestion(sugg, parentEl) {
        super.createSuggestion(sugg, parentEl);
        this.updateSuggestionElForMode(sugg, parentEl);
      }

      updateSuggestionElForMode(sugg, parentEl) {
        const {
          mode
        } = this;

        if (mode !== Mode.SymbolList) {
          return;
        } // remove create kbd helper text


        const helperEl = parentEl.querySelector('.suggestion-hotkey');

        if (helperEl) {
          parentEl.removeChild(helperEl);
        } // add symbol type indicator


        const {
          symbolType
        } = sugg;
        let indicator = SymbolIndicators[symbolType];

        if (symbolType === SymbolType.Heading) {
          indicator = indicator[sugg.data.level];
        } // eslint-disable-next-line no-undef


        const indicatorEl = createEl('div', {
          text: indicator,
          attr: {
            style: indicatorStyle
          }
        });
        parentEl.insertAdjacentElement('afterbegin', indicatorEl);
      }

    }

    return new ModalPopup(app);
  });

  class SwitcherPlusVolcanoPlugin {
    constructor() {
      this.id = 'switcher-plus';
      this.name = 'Quick Switcher++';
      this.description = 'Enhanced Quick Switcher, search open panels, and symbols.';
      this.defaultOn = false;
      this.app = null;
      this.instance = null;
      this.modal = null;
    }

    init(app, instance) {
      this.app = app;
      this.instance = instance;
      this.registerGlobalCommands(instance);
    }

    registerGlobalCommands(instance) {
      instance.registerGlobalCommand({
        id: 'switcher-plus:open',
        name: 'Open Quick Switcher++',
        hotkeys: [],
        callback: () => {
          if (this.modal) {
            this.modal.openInMode(Mode.Standard);
          }
        }
      });
      instance.registerGlobalCommand({
        id: 'switcher-plus:open-editors',
        name: 'Open Quick Switcher++ in Editor Mode',
        hotkeys: [],
        callback: () => {
          if (this.modal) {
            this.modal.openInMode(Mode.EditorList);
          }
        }
      });
      instance.registerGlobalCommand({
        id: 'switcher-plus:open-symbols',
        name: 'Open Quick Switcher++ in Symbol Mode',
        hotkeys: [],
        callback: () => {
          if (this.modal) {
            this.modal.openInMode(Mode.SymbolList);
          }
        }
      });
    }

    onEnable() {
      const modal = createModalPopup(this.app);

      if (modal) {
        this.modal = modal;
      }
    }

    onDisable() {
      this.modal = null;
    }

  }

  var switcherPlusVolcano = (() => new SwitcherPlusVolcanoPlugin());

  return switcherPlusVolcano;

})));
