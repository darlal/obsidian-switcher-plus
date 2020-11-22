'use strict';

var obsidian = require('obsidian');

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
const ReferenceViews = ['backlink', 'outline', 'localgraph'];

const Config = {
  // command to enable filtering of open editors
  editorListCommand: 'edt ',
  // command to enable filtering of file symbols
  symbolListCommand: '@',
  // types of open views to hide from the suggestion list
  excludeViewTypes: ['empty']
};
class Settings {
  get alwaysNewPaneForSymbols() {
    const {
      data
    } = this;
    let val = null;

    if (data) {
      val = data.alwaysNewPaneForSymbols;
    }

    return val;
  }

  set alwaysNewPaneForSymbols(value) {
    let {
      data
    } = this;

    if (!data) {
      data = Settings.getDefaultData();
      this.data = data;
    }

    data.alwaysNewPaneForSymbols = value;
  }

  constructor(plugin) {
    this.plugin = plugin;
    this.data = null;
  }

  async loadSettings() {
    const {
      plugin
    } = this;
    let data = await plugin.loadData();

    if (!data) {
      data = Settings.getDefaultData();
    }

    this.data = data;
  }

  static getDefaultData() {
    return {
      alwaysNewPaneForSymbols: false
    };
  }

  saveSettings() {
    const {
      plugin,
      data
    } = this;

    if (plugin && data) {
      plugin.saveData(data);
    }
  }

}

/* eslint-disable import/no-unresolved */

class SettingTab extends obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const {
      containerEl,
      plugin: {
        settings
      }
    } = this;
    containerEl.empty();
    SettingTab.setAlwaysNewPaneForSymbols(containerEl, settings);
  }

  static setAlwaysNewPaneForSymbols(containerEl, settings) {
    new obsidian.Setting(containerEl).setName('Open Symbols in new pane').setDesc('Enabled, always open a new pane when navigating to Symbols. Disabled, navigate in an already open pane (if one exists)').addToggle(toggle => toggle.setValue(settings.alwaysNewPaneForSymbols).onChange(value => {
      settings.alwaysNewPaneForSymbols = value;
      settings.saveSettings();
    }));
  }

}

const indicatorStyle = 'color: var(--text-accent); width: 2.5em; text-align: center; float:left; font-weight:800;';

function getQuickSwitcher(app) {
  const switcher = app.internalPlugins.getPluginById(QUICK_SWITCHER_ID);

  if (!switcher) {
    return null;
  }

  return switcher.instance.modal.constructor;
}

var createSwitcherPlusModal = ((app, settings) => {
  const QuickSwitcher = getQuickSwitcher(app);

  if (QuickSwitcher === null) {
    return null;
  }

  class SwitcherPlus extends QuickSwitcher {
    constructor(appObj, settingsObj) {
      super(appObj);
      this.settings = settingsObj;
      this.mode = Mode.Standard;
      this.symbolTarget = null;
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
      this.mode = mode || Mode.Standard;
      this.open();
    }

    onOpen() {
      let val = '';
      const {
        mode
      } = this;

      if (mode === Mode.EditorList) {
        val = Config.editorListCommand;
      } else if (mode === Mode.SymbolList) {
        val = Config.symbolListCommand; // force reset suggestions so any suggestions from a previous operation
        // won't be incorrectly used for symbol search

        this.chooser.setSuggestions([]);
        this.symbolTarget = null;
      }

      this.isOpen = true;
      this.inputEl.value = val;
      this.inputEl.focus();
      this.onInput();
    }

    onInput() {
      const {
        mode,
        symbolTarget
      } = this.parseInput();
      this.symbolTarget = symbolTarget;
      this.mode = mode;
      this.updateHelperTextForMode(mode);
      this.updateKeymapForMode(mode);
      this.updateSuggestions();
    }

    parseInput() {
      const {
        editorListCommand,
        symbolListCommand
      } = Config;
      const {
        inputEl: {
          value
        }
      } = this; // determine if the editor command exists and if it's valid

      const hasEditorCmdPrefix = value.indexOf(editorListCommand) === 0; // get the index of symbol command and determine if it exists

      const symbolCmdIndex = value.indexOf(symbolListCommand);
      const hasSymbolCmd = symbolCmdIndex !== -1;
      const hasSymbolCmdPrefix = symbolCmdIndex === 0; // determine if the chooser is showing suggestions, and if so, is the
      // currently selected suggestion a valid target for symbols

      const selectedSuggInfo = this.getSelectedSuggInfo(hasSymbolCmd); // determine if the current active editor pane a valid target for symbols

      const activeEditorInfo = this.getActiveEditorInfo(hasSymbolCmdPrefix, selectedSuggInfo.isSuggValidSymbolTarget);
      return this.determineRunMode(hasEditorCmdPrefix, hasSymbolCmd, selectedSuggInfo, activeEditorInfo);
    }

    getActiveEditorInfo(hasSymbolCmdPrefix, isSuggValidSymbolTarget) {
      const {
        workspace
      } = this.app;
      const {
        excludeViewTypes
      } = Config; // determine if the current active editor pane is valid

      const {
        view,
        view: {
          file: currentEditorFile
        }
      } = workspace.activeLeaf;
      const isCurrentEditorValid = !excludeViewTypes.includes(view.getViewType()); // whether or not the current active editor can be used as the target for
      // symbol search

      const isEditorValidSymbolTarget = hasSymbolCmdPrefix && !isSuggValidSymbolTarget && isCurrentEditorValid && !!currentEditorFile;
      return {
        isEditorValidSymbolTarget,
        currentEditor: workspace.activeLeaf
      };
    }

    getSelectedSuggInfo(hasSymbolCmd) {
      let currentSuggestion = null;

      if (hasSymbolCmd) {
        const {
          chooser
        } = this;
        currentSuggestion = chooser.values[chooser.selectedItem]; // determine if there is a current suggestion that can be used as the
        // target for symbol search. This means the suggestion has to point to
        // a file

        if (currentSuggestion && (!currentSuggestion.item || currentSuggestion.type === Mode.SymbolList)) {
          // symbol suggestions don't point to a file
          currentSuggestion = null;
        }
      } // whether or not the current suggestion can be used for symbol search


      const isSuggValidSymbolTarget = !!currentSuggestion;
      return {
        currentSuggestion,
        isSuggValidSymbolTarget
      };
    }

    determineRunMode(hasEditorCmdPrefix, hasSymbolCmd, selectedSuggInfo, activeEditorInfo) {
      let {
        mode,
        symbolTarget
      } = this; // wether or not a symbol target file exists. Indicates that the previous
      // operation was a symbol operation

      const hasExistingSymbolTarget = mode === Mode.SymbolList && !!symbolTarget;

      if (hasSymbolCmd) {
        mode = Mode.SymbolList;

        if (selectedSuggInfo.isSuggValidSymbolTarget) {
          symbolTarget = selectedSuggInfo.currentSuggestion.item;
        } else if (!hasExistingSymbolTarget && activeEditorInfo.isEditorValidSymbolTarget) {
          symbolTarget = activeEditorInfo.currentEditor;
        }
      } else if (hasEditorCmdPrefix) {
        mode = Mode.EditorList;
        symbolTarget = null;
      } else {
        mode = Mode.Standard;
        symbolTarget = null;
      }

      return {
        mode,
        symbolTarget
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

    getSearchData() {
      const {
        mode,
        inputEl: {
          value
        }
      } = this;
      const {
        editorListCommand,
        symbolListCommand
      } = Config;
      let startIndex = 0;

      if (mode === Mode.SymbolList) {
        const symbolCmdIndex = value.indexOf(symbolListCommand);
        startIndex = symbolCmdIndex + symbolListCommand.length;
      } else if (mode === Mode.EditorList) {
        startIndex = editorListCommand.length;
      }

      return SwitcherPlus.extractTokens(value, startIndex);
    }

    static extractTokens(str, startIndex = 0) {
      // shamelessly stolen directly from Obsidian
      // eslint-disable-next-line no-useless-escape
      const p = /[\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,\-.\/:;<=>?@\[\]^_`{|}~]/;
      const u = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f]/;
      const b = /\s/;
      const query = str.slice(startIndex).toLowerCase();
      const tokens = [];
      let pos = 0;

      for (let i = 0; i < query.length; i++) {
        const char = query.charAt(i);

        if (b.test(char)) {
          if (pos !== i) {
            tokens.push(query.slice(pos, i));
          }

          pos = i + 1;
        } else if (p.test(char) || u.test(char)) {
          if (pos !== i) {
            tokens.push(query.slice(pos, i));
          }

          tokens.push(char);
          pos = i + 1;
        }
      }

      if (pos !== query.length) {
        tokens.push(query.slice(pos, query.length));
      }

      return {
        query,
        tokens,
        fuzzy: query.split('')
      };
    }

    updateSuggestions() {
      const {
        mode
      } = this;

      if (mode === Mode.Standard) {
        super.updateSuggestions();
      } else {
        const items = this.getItems();
        const searchData = this.getSearchData();
        const suggestions = this.makeSuggestions(items, searchData);
        this.chooser.setSuggestions(suggestions);
      }
    }

    makeSuggestions(items = [], searchData) {
      const suggestions = [];
      const hasSearchTerm = searchData.query.length > 0;
      items.forEach(item => {
        let sugg;

        if (hasSearchTerm) {
          const match = this.match(searchData, item);

          if (match !== null) {
            sugg = {
              match
            };
          }
        } else {
          sugg = {
            match: null
          };
        }

        if (sugg) {
          sugg.item = item;
          sugg.type = this.mode;
          suggestions.push(sugg);
        }
      });

      if (hasSearchTerm) {
        suggestions.sort((a, b) => b.match.score - a.match.score);
      }

      return suggestions;
    }

    getSymbolsForTarget() {
      const ret = [];
      const {
        symbolTarget,
        app: {
          metadataCache
        }
      } = this;

      if (symbolTarget) {
        let file = symbolTarget; // determine if symbolTarget is a workspace leaf, or file

        if (symbolTarget.type === 'leaf' && symbolTarget.view) {
          file = symbolTarget.view.file;
        }

        if (file) {
          const mdFile = metadataCache.fileCache[file.path];

          if (mdFile) {
            const symbolData = metadataCache.metadataCache[mdFile.hash];

            if (symbolData) {
              const push = (symbols = [], type) => {
                symbols.forEach(symbol => ret.push({
                  symbol,
                  type
                }));
              };

              push(symbolData.headings, SymbolType.Heading);
              push(symbolData.tags, SymbolType.Tag);
              push(symbolData.links, SymbolType.Link);
              push(symbolData.embeds, SymbolType.Embed);
            }
          }
        }
      }

      return ret;
    }

    getOpenRootSplits() {
      const {
        workspace
      } = this.app;
      const leaves = [];

      const saveLeaf = l => {
        if (!Config.excludeViewTypes.includes(l.view.getViewType())) {
          leaves.push(l);
        }
      };

      workspace.iterateLeaves(saveLeaf, workspace.rootSplit);
      return leaves;
    }

    getItems() {
      const {
        mode
      } = this;
      let items;

      if (mode === Mode.EditorList) {
        items = this.getOpenRootSplits();
      } else if (mode === Mode.SymbolList) {
        items = this.getSymbolsForTarget();
      } else {
        items = super.getItems();
      }

      return items;
    }

    getItemText(item) {
      const {
        mode
      } = this;
      let text;

      if (mode === Mode.SymbolList) {
        text = SwitcherPlus.getSuggestionTextForSymbol(item);
      } else if (mode === Mode.EditorList) {
        text = this.getSuggestionTextForEditor(item);
      } else {
        text = super.getItemText(item);
      }

      return text;
    }

    static getSuggestionTextForSymbol(item) {
      const {
        symbol,
        type
      } = item;
      let text;

      if (type === SymbolType.Heading) {
        text = symbol.heading;
      } else if (type === SymbolType.Tag) {
        text = symbol.tag.slice(1);
      } else {
        ({
          link: text
        } = symbol);
        const {
          displayText
        } = symbol;

        if (displayText && displayText !== text) {
          text += `|${displayText}`;
        }
      }

      return text;
    }

    getSuggestionTextForEditor(leaf) {
      const {
        view,
        view: {
          file
        }
      } = leaf;
      let text;

      if (!file || ReferenceViews.includes(view.getViewType())) {
        text = leaf.getDisplayText();
      } else {
        text = super.getItemText(file);
      }

      return text;
    }

    onChooseOption(suggestionItem, evt) {
      const {
        mode
      } = this;

      if (mode === Mode.EditorList) {
        this.app.workspace.setActiveLeaf(suggestionItem);
        suggestionItem.view.setEphemeralState({
          focus: true
        });
      } else if (mode === Mode.SymbolList) {
        this.navigateToSymbol(suggestionItem);
      } else {
        super.onChooseOption(suggestionItem, evt);
      }
    }

    navigateToSymbol(suggestionItem) {
      const {
        workspace
      } = this.app; // determine if the target is already open in a pane

      const {
        leaf,
        targetFilePath
      } = this.findOpenEditorMatchingSymbolTarget();
      const {
        start: {
          line,
          offset: startPos
        },
        end: {
          offset: endPos
        }
      } = suggestionItem.symbol.position; // object containing the state information for the target editor,
      // start with the range to highlight in target editor

      const eState = {
        startPos,
        endPos,
        line,
        focus: true
      };

      if (leaf && !this.settings.alwaysNewPaneForSymbols) {
        // activate the already open pane, and set state
        workspace.setActiveLeaf(leaf, true);
        leaf.view.setEphemeralState(eState);
      } else {
        workspace.openLinkText(targetFilePath, '', true, {
          eState
        });
      }
    }

    findOpenEditorMatchingSymbolTarget() {
      const {
        symbolTarget
      } = this;
      const isTargetLeaf = symbolTarget.type === 'leaf';
      const file = isTargetLeaf ? symbolTarget.view.file : symbolTarget;

      const predicate = leaf => {
        const isLeafRefView = ReferenceViews.includes(leaf.view.getViewType());
        const isTargetRefView = isTargetLeaf && ReferenceViews.includes(symbolTarget.view.getViewType());
        let val = false;

        if (!isLeafRefView) {
          val = isTargetLeaf && !isTargetRefView ? leaf === symbolTarget : leaf.view.file === file;
        }

        return val;
      };

      const leaf = this.getOpenRootSplits().find(predicate);
      return {
        leaf,
        targetFilePath: file.path
      };
    }

    renderSuggestion(sugg, parentEl) {
      super.renderSuggestion(sugg, parentEl);
      this.updateSuggestionElForMode(sugg, parentEl);
    }

    updateSuggestionElForMode(sugg, parentEl) {
      const {
        mode
      } = this;

      if (mode === Mode.SymbolList) {
        // add symbol type indicator
        const {
          type,
          symbol
        } = sugg.item;
        let indicator = SymbolIndicators[type];

        if (type === SymbolType.Heading) {
          indicator = indicator[symbol.level];
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

  }

  return new SwitcherPlus(app, settings);
});

/* eslint-disable import/no-unresolved */
class SwitcherPlusPlugin extends obsidian.Plugin {
  async onload() {
    const settings = new Settings(this);
    await settings.loadSettings();
    this.settings = settings;
    this.addSettingTab(new SettingTab(this.app, this));
    this.registerCommand('switcher-plus:open', 'Open', Mode.Standard);
    this.registerCommand('switcher-plus:open-editors', 'Open in Editor Mode', Mode.EditorList);
    this.registerCommand('switcher-plus:open-symbols', 'Open in Symbol Mode', Mode.SymbolList);
  }

  onunload() {
    this.modal = null;
  }

  registerCommand(id, name, mode) {
    this.addCommand({
      id,
      name,
      hotkeys: [],
      checkCallback: checking => {
        const modal = this.getModal();

        if (modal) {
          if (!checking) {
            modal.openInMode(mode);
          }

          return true;
        }

        return false;
      }
    });
  }

  getModal() {
    let {
      modal
    } = this;
    const {
      app,
      settings
    } = this;

    if (modal) {
      return modal;
    }

    modal = createSwitcherPlusModal(app, settings);
    this.modal = modal;
    return modal;
  }

}

module.exports = SwitcherPlusPlugin;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL21vZHVsZXMvY29uc3RhbnRzLmpzIiwiLi4vLi4vc3JjL21vZHVsZXMvc2V0dGluZ3MuanMiLCIuLi8uLi9zcmMvbW9kdWxlcy9zZXR0aW5nVGFiLmpzIiwiLi4vLi4vc3JjL21vZHVsZXMvc3dpdGNoZXJQbHVzLmpzIiwiLi4vLi4vc3JjL21haW4uanMiXSwic291cmNlc0NvbnRlbnQiOlsiZXhwb3J0IGNvbnN0IFFVSUNLX1NXSVRDSEVSX0lEID0gJ3N3aXRjaGVyJztcblxuLy8gU3dpdGNoZXIgbW9kZXMgb2Ygb3BlcmF0aW9uXG5leHBvcnQgY29uc3QgTW9kZSA9IHtcbiAgU3RhbmRhcmQ6IDEsXG4gIEVkaXRvckxpc3Q6IDIsXG4gIFN5bWJvbExpc3Q6IDQsXG59O1xuXG5leHBvcnQgY29uc3QgU3ltYm9sVHlwZSA9IHtcbiAgTGluazogMSxcbiAgRW1iZWQ6IDIsXG4gIFRhZzogNCxcbiAgSGVhZGluZzogOCxcbn07XG5cbmV4cG9ydCBjb25zdCBTeW1ib2xJbmRpY2F0b3JzID0ge307XG5TeW1ib2xJbmRpY2F0b3JzW1N5bWJvbFR5cGUuTGlua10gPSAn8J+Ulyc7XG5TeW1ib2xJbmRpY2F0b3JzW1N5bWJvbFR5cGUuRW1iZWRdID0gJyEnO1xuU3ltYm9sSW5kaWNhdG9yc1tTeW1ib2xUeXBlLlRhZ10gPSAnIyc7XG5TeW1ib2xJbmRpY2F0b3JzW1N5bWJvbFR5cGUuSGVhZGluZ10gPSB7XG4gIDE6ICdI4oKBJyxcbiAgMjogJ0jigoInLFxuICAzOiAnSOKCgycsXG4gIDQ6ICdI4oKEJyxcbiAgNTogJ0jigoUnLFxuICA2OiAnSOKChicsXG59O1xuXG5leHBvcnQgY29uc3QgUmVmZXJlbmNlVmlld3MgPSBbJ2JhY2tsaW5rJywgJ291dGxpbmUnLCAnbG9jYWxncmFwaCddO1xuIiwiZXhwb3J0IGNvbnN0IENvbmZpZyA9IHtcbiAgLy8gY29tbWFuZCB0byBlbmFibGUgZmlsdGVyaW5nIG9mIG9wZW4gZWRpdG9yc1xuICBlZGl0b3JMaXN0Q29tbWFuZDogJ2VkdCAnLFxuICAvLyBjb21tYW5kIHRvIGVuYWJsZSBmaWx0ZXJpbmcgb2YgZmlsZSBzeW1ib2xzXG4gIHN5bWJvbExpc3RDb21tYW5kOiAnQCcsXG4gIC8vIHR5cGVzIG9mIG9wZW4gdmlld3MgdG8gaGlkZSBmcm9tIHRoZSBzdWdnZXN0aW9uIGxpc3RcbiAgZXhjbHVkZVZpZXdUeXBlczogWydlbXB0eSddLFxufTtcblxuZXhwb3J0IGNsYXNzIFNldHRpbmdzIHtcbiAgZ2V0IGFsd2F5c05ld1BhbmVGb3JTeW1ib2xzKCkge1xuICAgIGNvbnN0IHsgZGF0YSB9ID0gdGhpcztcblxuICAgIGxldCB2YWwgPSBudWxsO1xuICAgIGlmIChkYXRhKSB7IHZhbCA9IGRhdGEuYWx3YXlzTmV3UGFuZUZvclN5bWJvbHM7IH1cblxuICAgIHJldHVybiB2YWw7XG4gIH1cblxuICBzZXQgYWx3YXlzTmV3UGFuZUZvclN5bWJvbHModmFsdWUpIHtcbiAgICBsZXQgeyBkYXRhIH0gPSB0aGlzO1xuXG4gICAgaWYgKCFkYXRhKSB7XG4gICAgICBkYXRhID0gU2V0dGluZ3MuZ2V0RGVmYXVsdERhdGEoKTtcbiAgICAgIHRoaXMuZGF0YSA9IGRhdGE7XG4gICAgfVxuXG4gICAgZGF0YS5hbHdheXNOZXdQYW5lRm9yU3ltYm9scyA9IHZhbHVlO1xuICB9XG5cbiAgY29uc3RydWN0b3IocGx1Z2luKSB7XG4gICAgdGhpcy5wbHVnaW4gPSBwbHVnaW47XG4gICAgdGhpcy5kYXRhID0gbnVsbDtcbiAgfVxuXG4gIGFzeW5jIGxvYWRTZXR0aW5ncygpIHtcbiAgICBjb25zdCB7IHBsdWdpbiB9ID0gdGhpcztcbiAgICBsZXQgZGF0YSA9IGF3YWl0IHBsdWdpbi5sb2FkRGF0YSgpO1xuXG4gICAgaWYgKCFkYXRhKSB7IGRhdGEgPSBTZXR0aW5ncy5nZXREZWZhdWx0RGF0YSgpOyB9XG4gICAgdGhpcy5kYXRhID0gZGF0YTtcbiAgfVxuXG4gIHN0YXRpYyBnZXREZWZhdWx0RGF0YSgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgYWx3YXlzTmV3UGFuZUZvclN5bWJvbHM6IGZhbHNlLFxuICAgIH07XG4gIH1cblxuICBzYXZlU2V0dGluZ3MoKSB7XG4gICAgY29uc3QgeyBwbHVnaW4sIGRhdGEgfSA9IHRoaXM7XG4gICAgaWYgKHBsdWdpbiAmJiBkYXRhKSB7IHBsdWdpbi5zYXZlRGF0YShkYXRhKTsgfVxuICB9XG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZSBpbXBvcnQvbm8tdW5yZXNvbHZlZCAqL1xuaW1wb3J0IHsgUGx1Z2luU2V0dGluZ1RhYiwgU2V0dGluZyB9IGZyb20gJ29ic2lkaWFuJztcblxuY2xhc3MgU2V0dGluZ1RhYiBleHRlbmRzIFBsdWdpblNldHRpbmdUYWIge1xuICBjb25zdHJ1Y3RvcihhcHAsIHBsdWdpbikge1xuICAgIHN1cGVyKGFwcCwgcGx1Z2luKTtcbiAgICB0aGlzLnBsdWdpbiA9IHBsdWdpbjtcbiAgfVxuXG4gIGRpc3BsYXkoKSB7XG4gICAgY29uc3QgeyBjb250YWluZXJFbCwgcGx1Z2luOiB7IHNldHRpbmdzIH0gfSA9IHRoaXM7XG5cbiAgICBjb250YWluZXJFbC5lbXB0eSgpO1xuICAgIFNldHRpbmdUYWIuc2V0QWx3YXlzTmV3UGFuZUZvclN5bWJvbHMoY29udGFpbmVyRWwsIHNldHRpbmdzKTtcbiAgfVxuXG4gIHN0YXRpYyBzZXRBbHdheXNOZXdQYW5lRm9yU3ltYm9scyhjb250YWluZXJFbCwgc2V0dGluZ3MpIHtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKCdPcGVuIFN5bWJvbHMgaW4gbmV3IHBhbmUnKVxuICAgICAgLnNldERlc2MoJ0VuYWJsZWQsIGFsd2F5cyBvcGVuIGEgbmV3IHBhbmUgd2hlbiBuYXZpZ2F0aW5nIHRvIFN5bWJvbHMuIERpc2FibGVkLCBuYXZpZ2F0ZSBpbiBhbiBhbHJlYWR5IG9wZW4gcGFuZSAoaWYgb25lIGV4aXN0cyknKVxuICAgICAgLmFkZFRvZ2dsZSgodG9nZ2xlKSA9PiB0b2dnbGUuc2V0VmFsdWUoc2V0dGluZ3MuYWx3YXlzTmV3UGFuZUZvclN5bWJvbHMpXG4gICAgICAgIC5vbkNoYW5nZSgodmFsdWUpID0+IHtcbiAgICAgICAgICBzZXR0aW5ncy5hbHdheXNOZXdQYW5lRm9yU3ltYm9scyA9IHZhbHVlO1xuICAgICAgICAgIHNldHRpbmdzLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICB9KSk7XG4gIH1cbn1cblxuZXhwb3J0IHsgU2V0dGluZ1RhYiBhcyBkZWZhdWx0IH07XG4iLCJpbXBvcnQge1xuICBRVUlDS19TV0lUQ0hFUl9JRCxcbiAgTW9kZSxcbiAgU3ltYm9sVHlwZSxcbiAgU3ltYm9sSW5kaWNhdG9ycyxcbiAgUmVmZXJlbmNlVmlld3MsXG59IGZyb20gJy4vY29uc3RhbnRzJztcbmltcG9ydCB7IENvbmZpZyB9IGZyb20gJy4vc2V0dGluZ3MnO1xuXG5jb25zdCBpbmRpY2F0b3JTdHlsZSA9ICdjb2xvcjogdmFyKC0tdGV4dC1hY2NlbnQpOyB3aWR0aDogMi41ZW07IHRleHQtYWxpZ246IGNlbnRlcjsgZmxvYXQ6bGVmdDsgZm9udC13ZWlnaHQ6ODAwOyc7XG5cbmZ1bmN0aW9uIGdldFF1aWNrU3dpdGNoZXIoYXBwKSB7XG4gIGNvbnN0IHN3aXRjaGVyID0gYXBwLmludGVybmFsUGx1Z2lucy5nZXRQbHVnaW5CeUlkKFFVSUNLX1NXSVRDSEVSX0lEKTtcbiAgaWYgKCFzd2l0Y2hlcikgeyByZXR1cm4gbnVsbDsgfVxuXG4gIHJldHVybiBzd2l0Y2hlci5pbnN0YW5jZS5tb2RhbC5jb25zdHJ1Y3Rvcjtcbn1cblxuZXhwb3J0IGRlZmF1bHQgKGFwcCwgc2V0dGluZ3MpID0+IHtcbiAgY29uc3QgUXVpY2tTd2l0Y2hlciA9IGdldFF1aWNrU3dpdGNoZXIoYXBwKTtcbiAgaWYgKFF1aWNrU3dpdGNoZXIgPT09IG51bGwpIHsgcmV0dXJuIG51bGw7IH1cblxuICBjbGFzcyBTd2l0Y2hlclBsdXMgZXh0ZW5kcyBRdWlja1N3aXRjaGVyIHtcbiAgICBjb25zdHJ1Y3RvcihhcHBPYmosIHNldHRpbmdzT2JqKSB7XG4gICAgICBzdXBlcihhcHBPYmopO1xuXG4gICAgICB0aGlzLnNldHRpbmdzID0gc2V0dGluZ3NPYmo7XG4gICAgICB0aGlzLm1vZGUgPSBNb2RlLlN0YW5kYXJkO1xuICAgICAgdGhpcy5zeW1ib2xUYXJnZXQgPSBudWxsO1xuXG4gICAgICB0aGlzLnNjb3BlLnJlZ2lzdGVyS2V5KFsnQ3RybCddLCAnbicsIHRoaXMubmV4dEl0ZW0uYmluZCh0aGlzLmNob29zZXIpKTtcbiAgICAgIHRoaXMuc2NvcGUucmVnaXN0ZXJLZXkoWydDdHJsJ10sICdwJywgdGhpcy5wcmV2aW91c0l0ZW0uYmluZCh0aGlzLmNob29zZXIpKTtcbiAgICB9XG5cbiAgICBwcmV2aW91c0l0ZW0oKSB7XG4gICAgICBpZiAodGhpcy5jaG9vc2VyLmlzT3Blbikge1xuICAgICAgICB0aGlzLnNldFNlbGVjdGVkSXRlbSh0aGlzLnNlbGVjdGVkSXRlbSAtIDEsIHRydWUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIG5leHRJdGVtKCkge1xuICAgICAgaWYgKHRoaXMuY2hvb3Nlci5pc09wZW4pIHtcbiAgICAgICAgdGhpcy5zZXRTZWxlY3RlZEl0ZW0odGhpcy5zZWxlY3RlZEl0ZW0gKyAxLCB0cnVlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBvcGVuSW5Nb2RlKG1vZGUpIHtcbiAgICAgIHRoaXMubW9kZSA9IG1vZGUgfHwgTW9kZS5TdGFuZGFyZDtcbiAgICAgIHRoaXMub3BlbigpO1xuICAgIH1cblxuICAgIG9uT3BlbigpIHtcbiAgICAgIGxldCB2YWwgPSAnJztcbiAgICAgIGNvbnN0IHsgbW9kZSB9ID0gdGhpcztcblxuICAgICAgaWYgKG1vZGUgPT09IE1vZGUuRWRpdG9yTGlzdCkge1xuICAgICAgICB2YWwgPSBDb25maWcuZWRpdG9yTGlzdENvbW1hbmQ7XG4gICAgICB9IGVsc2UgaWYgKG1vZGUgPT09IE1vZGUuU3ltYm9sTGlzdCkge1xuICAgICAgICB2YWwgPSBDb25maWcuc3ltYm9sTGlzdENvbW1hbmQ7XG5cbiAgICAgICAgLy8gZm9yY2UgcmVzZXQgc3VnZ2VzdGlvbnMgc28gYW55IHN1Z2dlc3Rpb25zIGZyb20gYSBwcmV2aW91cyBvcGVyYXRpb25cbiAgICAgICAgLy8gd29uJ3QgYmUgaW5jb3JyZWN0bHkgdXNlZCBmb3Igc3ltYm9sIHNlYXJjaFxuICAgICAgICB0aGlzLmNob29zZXIuc2V0U3VnZ2VzdGlvbnMoW10pO1xuICAgICAgICB0aGlzLnN5bWJvbFRhcmdldCA9IG51bGw7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuaXNPcGVuID0gdHJ1ZTtcbiAgICAgIHRoaXMuaW5wdXRFbC52YWx1ZSA9IHZhbDtcbiAgICAgIHRoaXMuaW5wdXRFbC5mb2N1cygpO1xuICAgICAgdGhpcy5vbklucHV0KCk7XG4gICAgfVxuXG4gICAgb25JbnB1dCgpIHtcbiAgICAgIGNvbnN0IHsgbW9kZSwgc3ltYm9sVGFyZ2V0IH0gPSB0aGlzLnBhcnNlSW5wdXQoKTtcblxuICAgICAgdGhpcy5zeW1ib2xUYXJnZXQgPSBzeW1ib2xUYXJnZXQ7XG4gICAgICB0aGlzLm1vZGUgPSBtb2RlO1xuICAgICAgdGhpcy51cGRhdGVIZWxwZXJUZXh0Rm9yTW9kZShtb2RlKTtcbiAgICAgIHRoaXMudXBkYXRlS2V5bWFwRm9yTW9kZShtb2RlKTtcbiAgICAgIHRoaXMudXBkYXRlU3VnZ2VzdGlvbnMoKTtcbiAgICB9XG5cbiAgICBwYXJzZUlucHV0KCkge1xuICAgICAgY29uc3QgeyBlZGl0b3JMaXN0Q29tbWFuZCwgc3ltYm9sTGlzdENvbW1hbmQgfSA9IENvbmZpZztcbiAgICAgIGNvbnN0IHsgaW5wdXRFbDogeyB2YWx1ZSB9IH0gPSB0aGlzO1xuXG4gICAgICAvLyBkZXRlcm1pbmUgaWYgdGhlIGVkaXRvciBjb21tYW5kIGV4aXN0cyBhbmQgaWYgaXQncyB2YWxpZFxuICAgICAgY29uc3QgaGFzRWRpdG9yQ21kUHJlZml4ID0gdmFsdWUuaW5kZXhPZihlZGl0b3JMaXN0Q29tbWFuZCkgPT09IDA7XG5cbiAgICAgIC8vIGdldCB0aGUgaW5kZXggb2Ygc3ltYm9sIGNvbW1hbmQgYW5kIGRldGVybWluZSBpZiBpdCBleGlzdHNcbiAgICAgIGNvbnN0IHN5bWJvbENtZEluZGV4ID0gdmFsdWUuaW5kZXhPZihzeW1ib2xMaXN0Q29tbWFuZCk7XG4gICAgICBjb25zdCBoYXNTeW1ib2xDbWQgPSBzeW1ib2xDbWRJbmRleCAhPT0gLTE7XG4gICAgICBjb25zdCBoYXNTeW1ib2xDbWRQcmVmaXggPSBzeW1ib2xDbWRJbmRleCA9PT0gMDtcblxuICAgICAgLy8gZGV0ZXJtaW5lIGlmIHRoZSBjaG9vc2VyIGlzIHNob3dpbmcgc3VnZ2VzdGlvbnMsIGFuZCBpZiBzbywgaXMgdGhlXG4gICAgICAvLyBjdXJyZW50bHkgc2VsZWN0ZWQgc3VnZ2VzdGlvbiBhIHZhbGlkIHRhcmdldCBmb3Igc3ltYm9sc1xuICAgICAgY29uc3Qgc2VsZWN0ZWRTdWdnSW5mbyA9IHRoaXMuZ2V0U2VsZWN0ZWRTdWdnSW5mbyhoYXNTeW1ib2xDbWQpO1xuXG4gICAgICAvLyBkZXRlcm1pbmUgaWYgdGhlIGN1cnJlbnQgYWN0aXZlIGVkaXRvciBwYW5lIGEgdmFsaWQgdGFyZ2V0IGZvciBzeW1ib2xzXG4gICAgICBjb25zdCBhY3RpdmVFZGl0b3JJbmZvID0gdGhpcy5nZXRBY3RpdmVFZGl0b3JJbmZvKGhhc1N5bWJvbENtZFByZWZpeCxcbiAgICAgICAgc2VsZWN0ZWRTdWdnSW5mby5pc1N1Z2dWYWxpZFN5bWJvbFRhcmdldCk7XG5cbiAgICAgIHJldHVybiB0aGlzLmRldGVybWluZVJ1bk1vZGUoaGFzRWRpdG9yQ21kUHJlZml4LCBoYXNTeW1ib2xDbWQsXG4gICAgICAgIHNlbGVjdGVkU3VnZ0luZm8sIGFjdGl2ZUVkaXRvckluZm8pO1xuICAgIH1cblxuICAgIGdldEFjdGl2ZUVkaXRvckluZm8oaGFzU3ltYm9sQ21kUHJlZml4LCBpc1N1Z2dWYWxpZFN5bWJvbFRhcmdldCkge1xuICAgICAgY29uc3QgeyB3b3Jrc3BhY2UgfSA9IHRoaXMuYXBwO1xuICAgICAgY29uc3QgeyBleGNsdWRlVmlld1R5cGVzIH0gPSBDb25maWc7XG5cbiAgICAgIC8vIGRldGVybWluZSBpZiB0aGUgY3VycmVudCBhY3RpdmUgZWRpdG9yIHBhbmUgaXMgdmFsaWRcbiAgICAgIGNvbnN0IHsgdmlldywgdmlldzogeyBmaWxlOiBjdXJyZW50RWRpdG9yRmlsZSB9IH0gPSB3b3Jrc3BhY2UuYWN0aXZlTGVhZjtcbiAgICAgIGNvbnN0IGlzQ3VycmVudEVkaXRvclZhbGlkID0gIWV4Y2x1ZGVWaWV3VHlwZXMuaW5jbHVkZXModmlldy5nZXRWaWV3VHlwZSgpKTtcblxuICAgICAgLy8gd2hldGhlciBvciBub3QgdGhlIGN1cnJlbnQgYWN0aXZlIGVkaXRvciBjYW4gYmUgdXNlZCBhcyB0aGUgdGFyZ2V0IGZvclxuICAgICAgLy8gc3ltYm9sIHNlYXJjaFxuICAgICAgY29uc3QgaXNFZGl0b3JWYWxpZFN5bWJvbFRhcmdldCA9IGhhc1N5bWJvbENtZFByZWZpeCAmJiAhaXNTdWdnVmFsaWRTeW1ib2xUYXJnZXRcbiAgICAgICAgJiYgaXNDdXJyZW50RWRpdG9yVmFsaWQgJiYgISFjdXJyZW50RWRpdG9yRmlsZTtcblxuICAgICAgcmV0dXJuIHsgaXNFZGl0b3JWYWxpZFN5bWJvbFRhcmdldCwgY3VycmVudEVkaXRvcjogd29ya3NwYWNlLmFjdGl2ZUxlYWYgfTtcbiAgICB9XG5cbiAgICBnZXRTZWxlY3RlZFN1Z2dJbmZvKGhhc1N5bWJvbENtZCkge1xuICAgICAgbGV0IGN1cnJlbnRTdWdnZXN0aW9uID0gbnVsbDtcblxuICAgICAgaWYgKGhhc1N5bWJvbENtZCkge1xuICAgICAgICBjb25zdCB7IGNob29zZXIgfSA9IHRoaXM7XG4gICAgICAgIGN1cnJlbnRTdWdnZXN0aW9uID0gY2hvb3Nlci52YWx1ZXNbY2hvb3Nlci5zZWxlY3RlZEl0ZW1dO1xuXG4gICAgICAgIC8vIGRldGVybWluZSBpZiB0aGVyZSBpcyBhIGN1cnJlbnQgc3VnZ2VzdGlvbiB0aGF0IGNhbiBiZSB1c2VkIGFzIHRoZVxuICAgICAgICAvLyB0YXJnZXQgZm9yIHN5bWJvbCBzZWFyY2guIFRoaXMgbWVhbnMgdGhlIHN1Z2dlc3Rpb24gaGFzIHRvIHBvaW50IHRvXG4gICAgICAgIC8vIGEgZmlsZVxuICAgICAgICBpZiAoY3VycmVudFN1Z2dlc3Rpb25cbiAgICAgICAgICAmJiAoIWN1cnJlbnRTdWdnZXN0aW9uLml0ZW0gfHwgY3VycmVudFN1Z2dlc3Rpb24udHlwZSA9PT0gTW9kZS5TeW1ib2xMaXN0KSkge1xuICAgICAgICAgIC8vIHN5bWJvbCBzdWdnZXN0aW9ucyBkb24ndCBwb2ludCB0byBhIGZpbGVcbiAgICAgICAgICBjdXJyZW50U3VnZ2VzdGlvbiA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gd2hldGhlciBvciBub3QgdGhlIGN1cnJlbnQgc3VnZ2VzdGlvbiBjYW4gYmUgdXNlZCBmb3Igc3ltYm9sIHNlYXJjaFxuICAgICAgY29uc3QgaXNTdWdnVmFsaWRTeW1ib2xUYXJnZXQgPSAhIWN1cnJlbnRTdWdnZXN0aW9uO1xuICAgICAgcmV0dXJuIHsgY3VycmVudFN1Z2dlc3Rpb24sIGlzU3VnZ1ZhbGlkU3ltYm9sVGFyZ2V0IH07XG4gICAgfVxuXG4gICAgZGV0ZXJtaW5lUnVuTW9kZShoYXNFZGl0b3JDbWRQcmVmaXgsIGhhc1N5bWJvbENtZCwgc2VsZWN0ZWRTdWdnSW5mbywgYWN0aXZlRWRpdG9ySW5mbykge1xuICAgICAgbGV0IHsgbW9kZSwgc3ltYm9sVGFyZ2V0IH0gPSB0aGlzO1xuXG4gICAgICAvLyB3ZXRoZXIgb3Igbm90IGEgc3ltYm9sIHRhcmdldCBmaWxlIGV4aXN0cy4gSW5kaWNhdGVzIHRoYXQgdGhlIHByZXZpb3VzXG4gICAgICAvLyBvcGVyYXRpb24gd2FzIGEgc3ltYm9sIG9wZXJhdGlvblxuICAgICAgY29uc3QgaGFzRXhpc3RpbmdTeW1ib2xUYXJnZXQgPSBtb2RlID09PSBNb2RlLlN5bWJvbExpc3QgJiYgISFzeW1ib2xUYXJnZXQ7XG5cbiAgICAgIGlmIChoYXNTeW1ib2xDbWQpIHtcbiAgICAgICAgbW9kZSA9IE1vZGUuU3ltYm9sTGlzdDtcblxuICAgICAgICBpZiAoc2VsZWN0ZWRTdWdnSW5mby5pc1N1Z2dWYWxpZFN5bWJvbFRhcmdldCkge1xuICAgICAgICAgIHN5bWJvbFRhcmdldCA9IHNlbGVjdGVkU3VnZ0luZm8uY3VycmVudFN1Z2dlc3Rpb24uaXRlbTtcbiAgICAgICAgfSBlbHNlIGlmICghaGFzRXhpc3RpbmdTeW1ib2xUYXJnZXQgJiYgYWN0aXZlRWRpdG9ySW5mby5pc0VkaXRvclZhbGlkU3ltYm9sVGFyZ2V0KSB7XG4gICAgICAgICAgc3ltYm9sVGFyZ2V0ID0gYWN0aXZlRWRpdG9ySW5mby5jdXJyZW50RWRpdG9yO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKGhhc0VkaXRvckNtZFByZWZpeCkge1xuICAgICAgICBtb2RlID0gTW9kZS5FZGl0b3JMaXN0O1xuICAgICAgICBzeW1ib2xUYXJnZXQgPSBudWxsO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbW9kZSA9IE1vZGUuU3RhbmRhcmQ7XG4gICAgICAgIHN5bWJvbFRhcmdldCA9IG51bGw7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB7IG1vZGUsIHN5bWJvbFRhcmdldCB9O1xuICAgIH1cblxuICAgIHVwZGF0ZUhlbHBlclRleHRGb3JNb2RlKG1vZGUpIHtcbiAgICAgIGNvbnN0IHsgY29udGFpbmVyRWwgfSA9IHRoaXM7XG4gICAgICBjb25zdCBzZWxlY3RvciA9ICcucHJvbXB0LWluc3RydWN0aW9ucyc7XG5cbiAgICAgIGNvbnN0IGVsID0gY29udGFpbmVyRWwucXVlcnlTZWxlY3RvcihzZWxlY3Rvcik7XG4gICAgICBpZiAoZWwpIHsgZWwuc3R5bGUuZGlzcGxheSA9IG1vZGUgPT09IE1vZGUuU3RhbmRhcmQgPyAnJyA6ICdub25lJzsgfVxuICAgIH1cblxuICAgIHVwZGF0ZUtleW1hcEZvck1vZGUobW9kZSkge1xuICAgICAgY29uc3QgeyBzY29wZTogeyBrZXlzIH0gfSA9IHRoaXM7XG4gICAgICBsZXQgeyBiYWNrdXBLZXlzID0gW10gfSA9IHRoaXM7XG5cbiAgICAgIGlmIChtb2RlID09PSBNb2RlLlN0YW5kYXJkKSB7XG4gICAgICAgIGlmIChiYWNrdXBLZXlzLmxlbmd0aCkgeyBiYWNrdXBLZXlzLmZvckVhY2goKGtleSkgPT4ga2V5cy5wdXNoKGtleSkpOyB9XG4gICAgICAgIGJhY2t1cEtleXMgPSB1bmRlZmluZWQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyB1bnJlZ2lzdGVyIHVudXNlZCBob3RrZXlzIGZvciBjdXN0b20gbW9kZXNcbiAgICAgICAgZm9yIChsZXQgaSA9IGtleXMubGVuZ3RoIC0gMTsgaSA+PSAwOyAtLWkpIHtcbiAgICAgICAgICBjb25zdCBrZXkgPSBrZXlzW2ldO1xuXG4gICAgICAgICAgaWYgKGtleS5rZXkgPT09ICdFbnRlcidcbiAgICAgICAgICAgICYmIChrZXkubW9kaWZpZXJzID09PSAnTWV0YScgfHwga2V5Lm1vZGlmaWVycyA9PT0gJ1NoaWZ0JykpIHtcbiAgICAgICAgICAgIGtleXMuc3BsaWNlKGksIDEpO1xuICAgICAgICAgICAgYmFja3VwS2V5cy5wdXNoKGtleSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHRoaXMuYmFja3VwS2V5cyA9IGJhY2t1cEtleXM7XG4gICAgfVxuXG4gICAgZ2V0U2VhcmNoRGF0YSgpIHtcbiAgICAgIGNvbnN0IHsgbW9kZSwgaW5wdXRFbDogeyB2YWx1ZSB9IH0gPSB0aGlzO1xuICAgICAgY29uc3QgeyBlZGl0b3JMaXN0Q29tbWFuZCwgc3ltYm9sTGlzdENvbW1hbmQgfSA9IENvbmZpZztcbiAgICAgIGxldCBzdGFydEluZGV4ID0gMDtcblxuICAgICAgaWYgKG1vZGUgPT09IE1vZGUuU3ltYm9sTGlzdCkge1xuICAgICAgICBjb25zdCBzeW1ib2xDbWRJbmRleCA9IHZhbHVlLmluZGV4T2Yoc3ltYm9sTGlzdENvbW1hbmQpO1xuICAgICAgICBzdGFydEluZGV4ID0gc3ltYm9sQ21kSW5kZXggKyBzeW1ib2xMaXN0Q29tbWFuZC5sZW5ndGg7XG4gICAgICB9IGVsc2UgaWYgKG1vZGUgPT09IE1vZGUuRWRpdG9yTGlzdCkge1xuICAgICAgICBzdGFydEluZGV4ID0gZWRpdG9yTGlzdENvbW1hbmQubGVuZ3RoO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gU3dpdGNoZXJQbHVzLmV4dHJhY3RUb2tlbnModmFsdWUsIHN0YXJ0SW5kZXgpO1xuICAgIH1cblxuICAgIHN0YXRpYyBleHRyYWN0VG9rZW5zKHN0ciwgc3RhcnRJbmRleCA9IDApIHtcbiAgICAgIC8vIHNoYW1lbGVzc2x5IHN0b2xlbiBkaXJlY3RseSBmcm9tIE9ic2lkaWFuXG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tdXNlbGVzcy1lc2NhcGVcbiAgICAgIGNvbnN0IHAgPSAvW1xcdTIwMDAtXFx1MjA2RlxcdTJFMDAtXFx1MkU3RlxcXFwnIVwiIyQlJigpKissXFwtLlxcLzo7PD0+P0BcXFtcXF1eX2B7fH1+XS87XG4gICAgICBjb25zdCB1ID0gL1tcXHUzMDQwLVxcdTMwZmZcXHUzNDAwLVxcdTRkYmZcXHU0ZTAwLVxcdTlmZmZcXHVmOTAwLVxcdWZhZmZcXHVmZjY2LVxcdWZmOWZdLztcbiAgICAgIGNvbnN0IGIgPSAvXFxzLztcbiAgICAgIGNvbnN0IHF1ZXJ5ID0gc3RyLnNsaWNlKHN0YXJ0SW5kZXgpLnRvTG93ZXJDYXNlKCk7XG4gICAgICBjb25zdCB0b2tlbnMgPSBbXTtcbiAgICAgIGxldCBwb3MgPSAwO1xuXG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHF1ZXJ5Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGNvbnN0IGNoYXIgPSBxdWVyeS5jaGFyQXQoaSk7XG5cbiAgICAgICAgaWYgKGIudGVzdChjaGFyKSkge1xuICAgICAgICAgIGlmIChwb3MgIT09IGkpIHsgdG9rZW5zLnB1c2gocXVlcnkuc2xpY2UocG9zLCBpKSk7IH1cblxuICAgICAgICAgIHBvcyA9IGkgKyAxO1xuICAgICAgICB9IGVsc2UgaWYgKHAudGVzdChjaGFyKSB8fCB1LnRlc3QoY2hhcikpIHtcbiAgICAgICAgICBpZiAocG9zICE9PSBpKSB7IHRva2Vucy5wdXNoKHF1ZXJ5LnNsaWNlKHBvcywgaSkpOyB9XG5cbiAgICAgICAgICB0b2tlbnMucHVzaChjaGFyKTtcbiAgICAgICAgICBwb3MgPSBpICsgMTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAocG9zICE9PSBxdWVyeS5sZW5ndGgpIHsgdG9rZW5zLnB1c2gocXVlcnkuc2xpY2UocG9zLCBxdWVyeS5sZW5ndGgpKTsgfVxuXG4gICAgICByZXR1cm4geyBxdWVyeSwgdG9rZW5zLCBmdXp6eTogcXVlcnkuc3BsaXQoJycpIH07XG4gICAgfVxuXG4gICAgdXBkYXRlU3VnZ2VzdGlvbnMoKSB7XG4gICAgICBjb25zdCB7IG1vZGUgfSA9IHRoaXM7XG5cbiAgICAgIGlmIChtb2RlID09PSBNb2RlLlN0YW5kYXJkKSB7XG4gICAgICAgIHN1cGVyLnVwZGF0ZVN1Z2dlc3Rpb25zKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBpdGVtcyA9IHRoaXMuZ2V0SXRlbXMoKTtcbiAgICAgICAgY29uc3Qgc2VhcmNoRGF0YSA9IHRoaXMuZ2V0U2VhcmNoRGF0YSgpO1xuICAgICAgICBjb25zdCBzdWdnZXN0aW9ucyA9IHRoaXMubWFrZVN1Z2dlc3Rpb25zKGl0ZW1zLCBzZWFyY2hEYXRhKTtcblxuICAgICAgICB0aGlzLmNob29zZXIuc2V0U3VnZ2VzdGlvbnMoc3VnZ2VzdGlvbnMpO1xuICAgICAgfVxuICAgIH1cblxuICAgIG1ha2VTdWdnZXN0aW9ucyhpdGVtcyA9IFtdLCBzZWFyY2hEYXRhKSB7XG4gICAgICBjb25zdCBzdWdnZXN0aW9ucyA9IFtdO1xuICAgICAgY29uc3QgaGFzU2VhcmNoVGVybSA9IHNlYXJjaERhdGEucXVlcnkubGVuZ3RoID4gMDtcblxuICAgICAgaXRlbXMuZm9yRWFjaCgoaXRlbSkgPT4ge1xuICAgICAgICBsZXQgc3VnZztcblxuICAgICAgICBpZiAoaGFzU2VhcmNoVGVybSkge1xuICAgICAgICAgIGNvbnN0IG1hdGNoID0gdGhpcy5tYXRjaChzZWFyY2hEYXRhLCBpdGVtKTtcbiAgICAgICAgICBpZiAobWF0Y2ggIT09IG51bGwpIHsgc3VnZyA9IHsgbWF0Y2ggfTsgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHN1Z2cgPSB7IG1hdGNoOiBudWxsIH07XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoc3VnZykge1xuICAgICAgICAgIHN1Z2cuaXRlbSA9IGl0ZW07XG4gICAgICAgICAgc3VnZy50eXBlID0gdGhpcy5tb2RlO1xuICAgICAgICAgIHN1Z2dlc3Rpb25zLnB1c2goc3VnZyk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICBpZiAoaGFzU2VhcmNoVGVybSkgeyBzdWdnZXN0aW9ucy5zb3J0KChhLCBiKSA9PiBiLm1hdGNoLnNjb3JlIC0gYS5tYXRjaC5zY29yZSk7IH1cbiAgICAgIHJldHVybiBzdWdnZXN0aW9ucztcbiAgICB9XG5cbiAgICBnZXRTeW1ib2xzRm9yVGFyZ2V0KCkge1xuICAgICAgY29uc3QgcmV0ID0gW107XG4gICAgICBjb25zdCB7IHN5bWJvbFRhcmdldCwgYXBwOiB7IG1ldGFkYXRhQ2FjaGUgfSB9ID0gdGhpcztcblxuICAgICAgaWYgKHN5bWJvbFRhcmdldCkge1xuICAgICAgICBsZXQgZmlsZSA9IHN5bWJvbFRhcmdldDtcblxuICAgICAgICAvLyBkZXRlcm1pbmUgaWYgc3ltYm9sVGFyZ2V0IGlzIGEgd29ya3NwYWNlIGxlYWYsIG9yIGZpbGVcbiAgICAgICAgaWYgKHN5bWJvbFRhcmdldC50eXBlID09PSAnbGVhZicgJiYgc3ltYm9sVGFyZ2V0LnZpZXcpIHtcbiAgICAgICAgICBmaWxlID0gc3ltYm9sVGFyZ2V0LnZpZXcuZmlsZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChmaWxlKSB7XG4gICAgICAgICAgY29uc3QgbWRGaWxlID0gbWV0YWRhdGFDYWNoZS5maWxlQ2FjaGVbZmlsZS5wYXRoXTtcblxuICAgICAgICAgIGlmIChtZEZpbGUpIHtcbiAgICAgICAgICAgIGNvbnN0IHN5bWJvbERhdGEgPSBtZXRhZGF0YUNhY2hlLm1ldGFkYXRhQ2FjaGVbbWRGaWxlLmhhc2hdO1xuXG4gICAgICAgICAgICBpZiAoc3ltYm9sRGF0YSkge1xuICAgICAgICAgICAgICBjb25zdCBwdXNoID0gKHN5bWJvbHMgPSBbXSwgdHlwZSkgPT4ge1xuICAgICAgICAgICAgICAgIHN5bWJvbHMuZm9yRWFjaCgoc3ltYm9sKSA9PiByZXQucHVzaCh7IHN5bWJvbCwgdHlwZSB9KSk7XG4gICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgcHVzaChzeW1ib2xEYXRhLmhlYWRpbmdzLCBTeW1ib2xUeXBlLkhlYWRpbmcpO1xuICAgICAgICAgICAgICBwdXNoKHN5bWJvbERhdGEudGFncywgU3ltYm9sVHlwZS5UYWcpO1xuICAgICAgICAgICAgICBwdXNoKHN5bWJvbERhdGEubGlua3MsIFN5bWJvbFR5cGUuTGluayk7XG4gICAgICAgICAgICAgIHB1c2goc3ltYm9sRGF0YS5lbWJlZHMsIFN5bWJvbFR5cGUuRW1iZWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gcmV0O1xuICAgIH1cblxuICAgIGdldE9wZW5Sb290U3BsaXRzKCkge1xuICAgICAgY29uc3QgeyB3b3Jrc3BhY2UgfSA9IHRoaXMuYXBwO1xuICAgICAgY29uc3QgbGVhdmVzID0gW107XG5cbiAgICAgIGNvbnN0IHNhdmVMZWFmID0gKGwpID0+IHtcbiAgICAgICAgaWYgKCFDb25maWcuZXhjbHVkZVZpZXdUeXBlcy5pbmNsdWRlcyhsLnZpZXcuZ2V0Vmlld1R5cGUoKSkpIHtcbiAgICAgICAgICBsZWF2ZXMucHVzaChsKTtcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgd29ya3NwYWNlLml0ZXJhdGVMZWF2ZXMoc2F2ZUxlYWYsIHdvcmtzcGFjZS5yb290U3BsaXQpO1xuICAgICAgcmV0dXJuIGxlYXZlcztcbiAgICB9XG5cbiAgICBnZXRJdGVtcygpIHtcbiAgICAgIGNvbnN0IHsgbW9kZSB9ID0gdGhpcztcbiAgICAgIGxldCBpdGVtcztcblxuICAgICAgaWYgKG1vZGUgPT09IE1vZGUuRWRpdG9yTGlzdCkge1xuICAgICAgICBpdGVtcyA9IHRoaXMuZ2V0T3BlblJvb3RTcGxpdHMoKTtcbiAgICAgIH0gZWxzZSBpZiAobW9kZSA9PT0gTW9kZS5TeW1ib2xMaXN0KSB7XG4gICAgICAgIGl0ZW1zID0gdGhpcy5nZXRTeW1ib2xzRm9yVGFyZ2V0KCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpdGVtcyA9IHN1cGVyLmdldEl0ZW1zKCk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBpdGVtcztcbiAgICB9XG5cbiAgICBnZXRJdGVtVGV4dChpdGVtKSB7XG4gICAgICBjb25zdCB7IG1vZGUgfSA9IHRoaXM7XG4gICAgICBsZXQgdGV4dDtcblxuICAgICAgaWYgKG1vZGUgPT09IE1vZGUuU3ltYm9sTGlzdCkge1xuICAgICAgICB0ZXh0ID0gU3dpdGNoZXJQbHVzLmdldFN1Z2dlc3Rpb25UZXh0Rm9yU3ltYm9sKGl0ZW0pO1xuICAgICAgfSBlbHNlIGlmIChtb2RlID09PSBNb2RlLkVkaXRvckxpc3QpIHtcbiAgICAgICAgdGV4dCA9IHRoaXMuZ2V0U3VnZ2VzdGlvblRleHRGb3JFZGl0b3IoaXRlbSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0ZXh0ID0gc3VwZXIuZ2V0SXRlbVRleHQoaXRlbSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0ZXh0O1xuICAgIH1cblxuICAgIHN0YXRpYyBnZXRTdWdnZXN0aW9uVGV4dEZvclN5bWJvbChpdGVtKSB7XG4gICAgICBjb25zdCB7IHN5bWJvbCwgdHlwZSB9ID0gaXRlbTtcbiAgICAgIGxldCB0ZXh0O1xuXG4gICAgICBpZiAodHlwZSA9PT0gU3ltYm9sVHlwZS5IZWFkaW5nKSB7XG4gICAgICAgIHRleHQgPSBzeW1ib2wuaGVhZGluZztcbiAgICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gU3ltYm9sVHlwZS5UYWcpIHtcbiAgICAgICAgdGV4dCA9IHN5bWJvbC50YWcuc2xpY2UoMSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAoeyBsaW5rOiB0ZXh0IH0gPSBzeW1ib2wpO1xuICAgICAgICBjb25zdCB7IGRpc3BsYXlUZXh0IH0gPSBzeW1ib2w7XG5cbiAgICAgICAgaWYgKGRpc3BsYXlUZXh0ICYmIGRpc3BsYXlUZXh0ICE9PSB0ZXh0KSB7XG4gICAgICAgICAgdGV4dCArPSBgfCR7ZGlzcGxheVRleHR9YDtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gdGV4dDtcbiAgICB9XG5cbiAgICBnZXRTdWdnZXN0aW9uVGV4dEZvckVkaXRvcihsZWFmKSB7XG4gICAgICBjb25zdCB7IHZpZXcsIHZpZXc6IHsgZmlsZSB9IH0gPSBsZWFmO1xuICAgICAgbGV0IHRleHQ7XG5cbiAgICAgIGlmICghZmlsZSB8fCBSZWZlcmVuY2VWaWV3cy5pbmNsdWRlcyh2aWV3LmdldFZpZXdUeXBlKCkpKSB7XG4gICAgICAgIHRleHQgPSBsZWFmLmdldERpc3BsYXlUZXh0KCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0ZXh0ID0gc3VwZXIuZ2V0SXRlbVRleHQoZmlsZSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0ZXh0O1xuICAgIH1cblxuICAgIG9uQ2hvb3NlT3B0aW9uKHN1Z2dlc3Rpb25JdGVtLCBldnQpIHtcbiAgICAgIGNvbnN0IHsgbW9kZSB9ID0gdGhpcztcblxuICAgICAgaWYgKG1vZGUgPT09IE1vZGUuRWRpdG9yTGlzdCkge1xuICAgICAgICB0aGlzLmFwcC53b3Jrc3BhY2Uuc2V0QWN0aXZlTGVhZihzdWdnZXN0aW9uSXRlbSk7XG4gICAgICAgIHN1Z2dlc3Rpb25JdGVtLnZpZXcuc2V0RXBoZW1lcmFsU3RhdGUoeyBmb2N1czogdHJ1ZSB9KTtcbiAgICAgIH0gZWxzZSBpZiAobW9kZSA9PT0gTW9kZS5TeW1ib2xMaXN0KSB7XG4gICAgICAgIHRoaXMubmF2aWdhdGVUb1N5bWJvbChzdWdnZXN0aW9uSXRlbSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdXBlci5vbkNob29zZU9wdGlvbihzdWdnZXN0aW9uSXRlbSwgZXZ0KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBuYXZpZ2F0ZVRvU3ltYm9sKHN1Z2dlc3Rpb25JdGVtKSB7XG4gICAgICBjb25zdCB7IHdvcmtzcGFjZSB9ID0gdGhpcy5hcHA7XG5cbiAgICAgIC8vIGRldGVybWluZSBpZiB0aGUgdGFyZ2V0IGlzIGFscmVhZHkgb3BlbiBpbiBhIHBhbmVcbiAgICAgIGNvbnN0IHsgbGVhZiwgdGFyZ2V0RmlsZVBhdGggfSA9IHRoaXMuZmluZE9wZW5FZGl0b3JNYXRjaGluZ1N5bWJvbFRhcmdldCgpO1xuXG4gICAgICBjb25zdCB7XG4gICAgICAgIHN0YXJ0OiB7IGxpbmUsIG9mZnNldDogc3RhcnRQb3MgfSxcbiAgICAgICAgZW5kOiB7IG9mZnNldDogZW5kUG9zIH0sXG4gICAgICB9ID0gc3VnZ2VzdGlvbkl0ZW0uc3ltYm9sLnBvc2l0aW9uO1xuXG4gICAgICAvLyBvYmplY3QgY29udGFpbmluZyB0aGUgc3RhdGUgaW5mb3JtYXRpb24gZm9yIHRoZSB0YXJnZXQgZWRpdG9yLFxuICAgICAgLy8gc3RhcnQgd2l0aCB0aGUgcmFuZ2UgdG8gaGlnaGxpZ2h0IGluIHRhcmdldCBlZGl0b3JcbiAgICAgIGNvbnN0IGVTdGF0ZSA9IHtcbiAgICAgICAgc3RhcnRQb3MsXG4gICAgICAgIGVuZFBvcyxcbiAgICAgICAgbGluZSxcbiAgICAgICAgZm9jdXM6IHRydWUsXG4gICAgICB9O1xuXG4gICAgICBpZiAobGVhZiAmJiAhdGhpcy5zZXR0aW5ncy5hbHdheXNOZXdQYW5lRm9yU3ltYm9scykge1xuICAgICAgICAvLyBhY3RpdmF0ZSB0aGUgYWxyZWFkeSBvcGVuIHBhbmUsIGFuZCBzZXQgc3RhdGVcbiAgICAgICAgd29ya3NwYWNlLnNldEFjdGl2ZUxlYWYobGVhZiwgdHJ1ZSk7XG4gICAgICAgIGxlYWYudmlldy5zZXRFcGhlbWVyYWxTdGF0ZShlU3RhdGUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgd29ya3NwYWNlLm9wZW5MaW5rVGV4dCh0YXJnZXRGaWxlUGF0aCwgJycsIHRydWUsIHsgZVN0YXRlIH0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZpbmRPcGVuRWRpdG9yTWF0Y2hpbmdTeW1ib2xUYXJnZXQoKSB7XG4gICAgICBjb25zdCB7IHN5bWJvbFRhcmdldCB9ID0gdGhpcztcbiAgICAgIGNvbnN0IGlzVGFyZ2V0TGVhZiA9IHN5bWJvbFRhcmdldC50eXBlID09PSAnbGVhZic7XG4gICAgICBjb25zdCBmaWxlID0gaXNUYXJnZXRMZWFmID8gc3ltYm9sVGFyZ2V0LnZpZXcuZmlsZSA6IHN5bWJvbFRhcmdldDtcblxuICAgICAgY29uc3QgcHJlZGljYXRlID0gKGxlYWYpID0+IHtcbiAgICAgICAgY29uc3QgaXNMZWFmUmVmVmlldyA9IFJlZmVyZW5jZVZpZXdzLmluY2x1ZGVzKGxlYWYudmlldy5nZXRWaWV3VHlwZSgpKTtcbiAgICAgICAgY29uc3QgaXNUYXJnZXRSZWZWaWV3ID0gaXNUYXJnZXRMZWFmXG4gICAgICAgICAgJiYgUmVmZXJlbmNlVmlld3MuaW5jbHVkZXMoc3ltYm9sVGFyZ2V0LnZpZXcuZ2V0Vmlld1R5cGUoKSk7XG4gICAgICAgIGxldCB2YWwgPSBmYWxzZTtcblxuICAgICAgICBpZiAoIWlzTGVhZlJlZlZpZXcpIHtcbiAgICAgICAgICB2YWwgPSBpc1RhcmdldExlYWYgJiYgIWlzVGFyZ2V0UmVmVmlld1xuICAgICAgICAgICAgPyBsZWFmID09PSBzeW1ib2xUYXJnZXRcbiAgICAgICAgICAgIDogbGVhZi52aWV3LmZpbGUgPT09IGZpbGU7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdmFsO1xuICAgICAgfTtcblxuICAgICAgY29uc3QgbGVhZiA9IHRoaXMuZ2V0T3BlblJvb3RTcGxpdHMoKS5maW5kKHByZWRpY2F0ZSk7XG4gICAgICByZXR1cm4geyBsZWFmLCB0YXJnZXRGaWxlUGF0aDogZmlsZS5wYXRoIH07XG4gICAgfVxuXG4gICAgcmVuZGVyU3VnZ2VzdGlvbihzdWdnLCBwYXJlbnRFbCkge1xuICAgICAgc3VwZXIucmVuZGVyU3VnZ2VzdGlvbihzdWdnLCBwYXJlbnRFbCk7XG4gICAgICB0aGlzLnVwZGF0ZVN1Z2dlc3Rpb25FbEZvck1vZGUoc3VnZywgcGFyZW50RWwpO1xuICAgIH1cblxuICAgIHVwZGF0ZVN1Z2dlc3Rpb25FbEZvck1vZGUoc3VnZywgcGFyZW50RWwpIHtcbiAgICAgIGNvbnN0IHsgbW9kZSB9ID0gdGhpcztcblxuICAgICAgaWYgKG1vZGUgPT09IE1vZGUuU3ltYm9sTGlzdCkge1xuICAgICAgICAvLyBhZGQgc3ltYm9sIHR5cGUgaW5kaWNhdG9yXG4gICAgICAgIGNvbnN0IHsgdHlwZSwgc3ltYm9sIH0gPSBzdWdnLml0ZW07XG4gICAgICAgIGxldCBpbmRpY2F0b3IgPSBTeW1ib2xJbmRpY2F0b3JzW3R5cGVdO1xuXG4gICAgICAgIGlmICh0eXBlID09PSBTeW1ib2xUeXBlLkhlYWRpbmcpIHtcbiAgICAgICAgICBpbmRpY2F0b3IgPSBpbmRpY2F0b3Jbc3ltYm9sLmxldmVsXTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby11bmRlZlxuICAgICAgICBjb25zdCBpbmRpY2F0b3JFbCA9IGNyZWF0ZUVsKCdkaXYnLCB7XG4gICAgICAgICAgdGV4dDogaW5kaWNhdG9yLFxuICAgICAgICAgIGF0dHI6IHsgc3R5bGU6IGluZGljYXRvclN0eWxlIH0sXG4gICAgICAgIH0pO1xuICAgICAgICBwYXJlbnRFbC5pbnNlcnRBZGphY2VudEVsZW1lbnQoJ2FmdGVyYmVnaW4nLCBpbmRpY2F0b3JFbCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG5ldyBTd2l0Y2hlclBsdXMoYXBwLCBzZXR0aW5ncyk7XG59O1xuIiwiLyogZXNsaW50LWRpc2FibGUgaW1wb3J0L25vLXVucmVzb2x2ZWQgKi9cbmltcG9ydCB7IFBsdWdpbiB9IGZyb20gJ29ic2lkaWFuJztcbmltcG9ydCB7IE1vZGUgfSBmcm9tICcuL21vZHVsZXMvY29uc3RhbnRzJztcbmltcG9ydCB7IFNldHRpbmdzIH0gZnJvbSAnLi9tb2R1bGVzL3NldHRpbmdzJztcbmltcG9ydCBTZXR0aW5nVGFiIGZyb20gJy4vbW9kdWxlcy9zZXR0aW5nVGFiJztcbmltcG9ydCBjcmVhdGVTd2l0Y2hlclBsdXNNb2RhbCBmcm9tICcuL21vZHVsZXMvc3dpdGNoZXJQbHVzJztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgU3dpdGNoZXJQbHVzUGx1Z2luIGV4dGVuZHMgUGx1Z2luIHtcbiAgYXN5bmMgb25sb2FkKCkge1xuICAgIGNvbnN0IHNldHRpbmdzID0gbmV3IFNldHRpbmdzKHRoaXMpO1xuICAgIGF3YWl0IHNldHRpbmdzLmxvYWRTZXR0aW5ncygpO1xuICAgIHRoaXMuc2V0dGluZ3MgPSBzZXR0aW5ncztcbiAgICB0aGlzLmFkZFNldHRpbmdUYWIobmV3IFNldHRpbmdUYWIodGhpcy5hcHAsIHRoaXMpKTtcblxuICAgIHRoaXMucmVnaXN0ZXJDb21tYW5kKCdzd2l0Y2hlci1wbHVzOm9wZW4nLFxuICAgICAgJ09wZW4nLCBNb2RlLlN0YW5kYXJkKTtcbiAgICB0aGlzLnJlZ2lzdGVyQ29tbWFuZCgnc3dpdGNoZXItcGx1czpvcGVuLWVkaXRvcnMnLFxuICAgICAgJ09wZW4gaW4gRWRpdG9yIE1vZGUnLCBNb2RlLkVkaXRvckxpc3QpO1xuICAgIHRoaXMucmVnaXN0ZXJDb21tYW5kKCdzd2l0Y2hlci1wbHVzOm9wZW4tc3ltYm9scycsXG4gICAgICAnT3BlbiBpbiBTeW1ib2wgTW9kZScsIE1vZGUuU3ltYm9sTGlzdCk7XG4gIH1cblxuICBvbnVubG9hZCgpIHtcbiAgICB0aGlzLm1vZGFsID0gbnVsbDtcbiAgfVxuXG4gIHJlZ2lzdGVyQ29tbWFuZChpZCwgbmFtZSwgbW9kZSkge1xuICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICBpZCxcbiAgICAgIG5hbWUsXG4gICAgICBob3RrZXlzOiBbXSxcbiAgICAgIGNoZWNrQ2FsbGJhY2s6IChjaGVja2luZykgPT4ge1xuICAgICAgICBjb25zdCBtb2RhbCA9IHRoaXMuZ2V0TW9kYWwoKTtcbiAgICAgICAgaWYgKG1vZGFsKSB7XG4gICAgICAgICAgaWYgKCFjaGVja2luZykge1xuICAgICAgICAgICAgbW9kYWwub3BlbkluTW9kZShtb2RlKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH0sXG4gICAgfSk7XG4gIH1cblxuICBnZXRNb2RhbCgpIHtcbiAgICBsZXQgeyBtb2RhbCB9ID0gdGhpcztcbiAgICBjb25zdCB7IGFwcCwgc2V0dGluZ3MgfSA9IHRoaXM7XG4gICAgaWYgKG1vZGFsKSB7IHJldHVybiBtb2RhbDsgfVxuXG4gICAgbW9kYWwgPSBjcmVhdGVTd2l0Y2hlclBsdXNNb2RhbChhcHAsIHNldHRpbmdzKTtcbiAgICB0aGlzLm1vZGFsID0gbW9kYWw7XG4gICAgcmV0dXJuIG1vZGFsO1xuICB9XG59XG4iXSwibmFtZXMiOlsiUVVJQ0tfU1dJVENIRVJfSUQiLCJNb2RlIiwiU3RhbmRhcmQiLCJFZGl0b3JMaXN0IiwiU3ltYm9sTGlzdCIsIlN5bWJvbFR5cGUiLCJMaW5rIiwiRW1iZWQiLCJUYWciLCJIZWFkaW5nIiwiU3ltYm9sSW5kaWNhdG9ycyIsIlJlZmVyZW5jZVZpZXdzIiwiQ29uZmlnIiwiZWRpdG9yTGlzdENvbW1hbmQiLCJzeW1ib2xMaXN0Q29tbWFuZCIsImV4Y2x1ZGVWaWV3VHlwZXMiLCJTZXR0aW5ncyIsImFsd2F5c05ld1BhbmVGb3JTeW1ib2xzIiwiZGF0YSIsInZhbCIsInZhbHVlIiwiZ2V0RGVmYXVsdERhdGEiLCJjb25zdHJ1Y3RvciIsInBsdWdpbiIsImxvYWRTZXR0aW5ncyIsImxvYWREYXRhIiwic2F2ZVNldHRpbmdzIiwic2F2ZURhdGEiLCJTZXR0aW5nVGFiIiwiUGx1Z2luU2V0dGluZ1RhYiIsImFwcCIsImRpc3BsYXkiLCJjb250YWluZXJFbCIsInNldHRpbmdzIiwiZW1wdHkiLCJzZXRBbHdheXNOZXdQYW5lRm9yU3ltYm9scyIsIlNldHRpbmciLCJzZXROYW1lIiwic2V0RGVzYyIsImFkZFRvZ2dsZSIsInRvZ2dsZSIsInNldFZhbHVlIiwib25DaGFuZ2UiLCJpbmRpY2F0b3JTdHlsZSIsImdldFF1aWNrU3dpdGNoZXIiLCJzd2l0Y2hlciIsImludGVybmFsUGx1Z2lucyIsImdldFBsdWdpbkJ5SWQiLCJpbnN0YW5jZSIsIm1vZGFsIiwiUXVpY2tTd2l0Y2hlciIsIlN3aXRjaGVyUGx1cyIsImFwcE9iaiIsInNldHRpbmdzT2JqIiwibW9kZSIsInN5bWJvbFRhcmdldCIsInNjb3BlIiwicmVnaXN0ZXJLZXkiLCJuZXh0SXRlbSIsImJpbmQiLCJjaG9vc2VyIiwicHJldmlvdXNJdGVtIiwiaXNPcGVuIiwic2V0U2VsZWN0ZWRJdGVtIiwic2VsZWN0ZWRJdGVtIiwib3BlbkluTW9kZSIsIm9wZW4iLCJvbk9wZW4iLCJzZXRTdWdnZXN0aW9ucyIsImlucHV0RWwiLCJmb2N1cyIsIm9uSW5wdXQiLCJwYXJzZUlucHV0IiwidXBkYXRlSGVscGVyVGV4dEZvck1vZGUiLCJ1cGRhdGVLZXltYXBGb3JNb2RlIiwidXBkYXRlU3VnZ2VzdGlvbnMiLCJoYXNFZGl0b3JDbWRQcmVmaXgiLCJpbmRleE9mIiwic3ltYm9sQ21kSW5kZXgiLCJoYXNTeW1ib2xDbWQiLCJoYXNTeW1ib2xDbWRQcmVmaXgiLCJzZWxlY3RlZFN1Z2dJbmZvIiwiZ2V0U2VsZWN0ZWRTdWdnSW5mbyIsImFjdGl2ZUVkaXRvckluZm8iLCJnZXRBY3RpdmVFZGl0b3JJbmZvIiwiaXNTdWdnVmFsaWRTeW1ib2xUYXJnZXQiLCJkZXRlcm1pbmVSdW5Nb2RlIiwid29ya3NwYWNlIiwidmlldyIsImZpbGUiLCJjdXJyZW50RWRpdG9yRmlsZSIsImFjdGl2ZUxlYWYiLCJpc0N1cnJlbnRFZGl0b3JWYWxpZCIsImluY2x1ZGVzIiwiZ2V0Vmlld1R5cGUiLCJpc0VkaXRvclZhbGlkU3ltYm9sVGFyZ2V0IiwiY3VycmVudEVkaXRvciIsImN1cnJlbnRTdWdnZXN0aW9uIiwidmFsdWVzIiwiaXRlbSIsInR5cGUiLCJoYXNFeGlzdGluZ1N5bWJvbFRhcmdldCIsInNlbGVjdG9yIiwiZWwiLCJxdWVyeVNlbGVjdG9yIiwic3R5bGUiLCJrZXlzIiwiYmFja3VwS2V5cyIsImxlbmd0aCIsImZvckVhY2giLCJrZXkiLCJwdXNoIiwidW5kZWZpbmVkIiwiaSIsIm1vZGlmaWVycyIsInNwbGljZSIsImdldFNlYXJjaERhdGEiLCJzdGFydEluZGV4IiwiZXh0cmFjdFRva2VucyIsInN0ciIsInAiLCJ1IiwiYiIsInF1ZXJ5Iiwic2xpY2UiLCJ0b0xvd2VyQ2FzZSIsInRva2VucyIsInBvcyIsImNoYXIiLCJjaGFyQXQiLCJ0ZXN0IiwiZnV6enkiLCJzcGxpdCIsIml0ZW1zIiwiZ2V0SXRlbXMiLCJzZWFyY2hEYXRhIiwic3VnZ2VzdGlvbnMiLCJtYWtlU3VnZ2VzdGlvbnMiLCJoYXNTZWFyY2hUZXJtIiwic3VnZyIsIm1hdGNoIiwic29ydCIsImEiLCJzY29yZSIsImdldFN5bWJvbHNGb3JUYXJnZXQiLCJyZXQiLCJtZXRhZGF0YUNhY2hlIiwibWRGaWxlIiwiZmlsZUNhY2hlIiwicGF0aCIsInN5bWJvbERhdGEiLCJoYXNoIiwic3ltYm9scyIsInN5bWJvbCIsImhlYWRpbmdzIiwidGFncyIsImxpbmtzIiwiZW1iZWRzIiwiZ2V0T3BlblJvb3RTcGxpdHMiLCJsZWF2ZXMiLCJzYXZlTGVhZiIsImwiLCJpdGVyYXRlTGVhdmVzIiwicm9vdFNwbGl0IiwiZ2V0SXRlbVRleHQiLCJ0ZXh0IiwiZ2V0U3VnZ2VzdGlvblRleHRGb3JTeW1ib2wiLCJnZXRTdWdnZXN0aW9uVGV4dEZvckVkaXRvciIsImhlYWRpbmciLCJ0YWciLCJsaW5rIiwiZGlzcGxheVRleHQiLCJsZWFmIiwiZ2V0RGlzcGxheVRleHQiLCJvbkNob29zZU9wdGlvbiIsInN1Z2dlc3Rpb25JdGVtIiwiZXZ0Iiwic2V0QWN0aXZlTGVhZiIsInNldEVwaGVtZXJhbFN0YXRlIiwibmF2aWdhdGVUb1N5bWJvbCIsInRhcmdldEZpbGVQYXRoIiwiZmluZE9wZW5FZGl0b3JNYXRjaGluZ1N5bWJvbFRhcmdldCIsInN0YXJ0IiwibGluZSIsIm9mZnNldCIsInN0YXJ0UG9zIiwiZW5kIiwiZW5kUG9zIiwicG9zaXRpb24iLCJlU3RhdGUiLCJvcGVuTGlua1RleHQiLCJpc1RhcmdldExlYWYiLCJwcmVkaWNhdGUiLCJpc0xlYWZSZWZWaWV3IiwiaXNUYXJnZXRSZWZWaWV3IiwiZmluZCIsInJlbmRlclN1Z2dlc3Rpb24iLCJwYXJlbnRFbCIsInVwZGF0ZVN1Z2dlc3Rpb25FbEZvck1vZGUiLCJpbmRpY2F0b3IiLCJsZXZlbCIsImluZGljYXRvckVsIiwiY3JlYXRlRWwiLCJhdHRyIiwiaW5zZXJ0QWRqYWNlbnRFbGVtZW50IiwiU3dpdGNoZXJQbHVzUGx1Z2luIiwiUGx1Z2luIiwib25sb2FkIiwiYWRkU2V0dGluZ1RhYiIsInJlZ2lzdGVyQ29tbWFuZCIsIm9udW5sb2FkIiwiaWQiLCJuYW1lIiwiYWRkQ29tbWFuZCIsImhvdGtleXMiLCJjaGVja0NhbGxiYWNrIiwiY2hlY2tpbmciLCJnZXRNb2RhbCIsImNyZWF0ZVN3aXRjaGVyUGx1c01vZGFsIl0sIm1hcHBpbmdzIjoiOzs7O0FBQU8sTUFBTUEsaUJBQWlCLEdBQUcsVUFBMUI7O0FBR0EsTUFBTUMsSUFBSSxHQUFHO0FBQ2xCQyxFQUFBQSxRQUFRLEVBQUUsQ0FEUTtBQUVsQkMsRUFBQUEsVUFBVSxFQUFFLENBRk07QUFH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
