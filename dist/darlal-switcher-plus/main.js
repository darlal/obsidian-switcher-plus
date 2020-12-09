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

/* eslint-disable import/no-unresolved */
const indicatorStyle = 'color: var(--text-accent); width: 2.5em; text-align: center; float:left; font-weight:800;';
class ExModeHandler extends obsidian.FuzzySuggestModal {
  get mode() {
    return this._mode;
  }

  constructor(app, settings) {
    super(app);
    this.settings = settings;
    this._mode = Mode.Standard;
    this.symbolTarget = null;
  }

  sessionWithMode(mode) {
    this._mode = mode || Mode.Standard;

    if (mode === Mode.SymbolList) {
      this.symbolTarget = null;
    }
  }

  parseInput(input, currentSuggestion) {
    const {
      editorListCommand,
      symbolListCommand
    } = Config; // determine if the editor command exists and if it's valid

    const hasEditorCmdPrefix = input.indexOf(editorListCommand) === 0; // get the index of symbol command and determine if it exists

    const symbolCmdIndex = input.indexOf(symbolListCommand);
    const hasSymbolCmd = symbolCmdIndex !== -1;
    const hasSymbolCmdPrefix = symbolCmdIndex === 0; // determine if the chooser is showing suggestions, and if so, is the
    // currently selected suggestion a valid target for symbols

    const selectedSuggInfo = ExModeHandler.getSelectedSuggInfo(hasSymbolCmd, currentSuggestion); // determine if the current active editor pane a valid target for symbols

    const activeEditorInfo = this.getActiveEditorInfo(hasSymbolCmdPrefix, selectedSuggInfo.isSuggValidSymbolTarget);
    const {
      mode,
      symbolTarget
    } = this.determineRunMode(hasEditorCmdPrefix, hasSymbolCmd, selectedSuggInfo, activeEditorInfo);
    this.symbolTarget = symbolTarget;
    this._mode = mode;
    return mode;
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

  static getSelectedSuggInfo(hasSymbolCmd, currentSuggestion) {
    let activeSugg = currentSuggestion;

    if (hasSymbolCmd) {
      // determine if there is a current suggestion that can be used as the
      // target for symbol search. This means the suggestion has to point to
      // a file
      const target = ExModeHandler.getSuggestionTarget(activeSugg);

      if (target && target.symbol) {
        // symbol suggestions don't point to a file
        activeSugg = null;
      }
    } // whether or not the current suggestion can be used for symbol search


    const isSuggValidSymbolTarget = !!activeSugg;
    return {
      currentSuggestion: activeSugg,
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
        symbolTarget = ExModeHandler.getSuggestionTarget(selectedSuggInfo.currentSuggestion);
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

  static getSuggestionTarget(suggestion) {
    if (!suggestion) {
      return null;
    }

    return suggestion.file ? suggestion.file : suggestion.item;
  }

  extractSearchQuery(input = '') {
    const {
      mode
    } = this;
    const {
      editorListCommand,
      symbolListCommand
    } = Config;
    let startIndex = 0;

    if (mode === Mode.SymbolList) {
      const symbolCmdIndex = input.indexOf(symbolListCommand);
      startIndex = symbolCmdIndex + symbolListCommand.length;
    } else if (mode === Mode.EditorList) {
      startIndex = editorListCommand.length;
    }

    return input.slice(startIndex).trim().toLowerCase();
  }

  getSuggestions(input) {
    const query = this.extractSearchQuery(input);
    return super.getSuggestions(query);
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
    }

    return items;
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

  getItemText(item) {
    const {
      mode
    } = this;
    let text;

    if (mode === Mode.SymbolList) {
      text = ExModeHandler.getSuggestionTextForSymbol(item);
    } else if (mode === Mode.EditorList) {
      text = item.getDisplayText();
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

  onChooseSuggestion(suggestionItem, evt) {
    const {
      mode
    } = this;

    if (mode === Mode.EditorList) {
      const {
        item
      } = suggestionItem;
      this.app.workspace.setActiveLeaf(item);
      item.view.setEphemeralState({
        focus: true
      });
    } else if (mode === Mode.SymbolList) {
      this.navigateToSymbol(suggestionItem);
    } else {
      super.onChooseSuggestion(suggestionItem, evt);
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
    } = suggestionItem.item.symbol.position; // object containing the state information for the target editor,
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
      this.exMode = new ExModeHandler(appObj, settingsObj);
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
      this.exMode.sessionWithMode(mode);
      this.open();
    }

    onOpen() {
      let val = '';
      const {
        exMode: {
          mode
        }
      } = this;

      if (mode === Mode.EditorList) {
        val = Config.editorListCommand;
      } else if (mode === Mode.SymbolList) {
        val = Config.symbolListCommand;
      }

      if (mode !== Mode.Standard) {
        this.chooser.setSuggestions([]);
      }

      this.isOpen = true;
      this.inputEl.value = val;
      this.inputEl.focus();
      this.onInput();
    }

    onInput() {
      const {
        exMode,
        inputEl: {
          value
        },
        chooser
      } = this;
      const currentSuggestion = chooser.values[chooser.selectedItem];
      const mode = exMode.parseInput(value, currentSuggestion);
      this.updateHelperTextForMode(mode);
      this.updateKeymapForMode(mode);
      this.updateSuggestions();
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

    updateSuggestions() {
      const {
        exMode,
        exMode: {
          mode
        },
        inputEl: {
          value
        }
      } = this;

      if (mode === Mode.Standard) {
        super.updateSuggestions();
      } else {
        const suggestions = exMode.getSuggestions(value);
        this.chooser.setSuggestions(suggestions);
      }
    }

    onChooseSuggestion(suggestionItem, evt) {
      const {
        exMode,
        exMode: {
          mode
        }
      } = this;

      if (mode === Mode.Standard) {
        super.onChooseSuggestion(suggestionItem, evt);
      } else {
        exMode.onChooseSuggestion(suggestionItem, evt);
      }
    }

    renderSuggestion(sugg, parentEl) {
      const {
        exMode,
        exMode: {
          mode
        }
      } = this;

      if (mode === Mode.Standard) {
        super.renderSuggestion(sugg, parentEl);
      } else {
        exMode.renderSuggestion(sugg, parentEl);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL21vZHVsZXMvY29uc3RhbnRzLmpzIiwiLi4vLi4vc3JjL21vZHVsZXMvc2V0dGluZ3MuanMiLCIuLi8uLi9zcmMvbW9kdWxlcy9zZXR0aW5nVGFiLmpzIiwiLi4vLi4vc3JjL21vZHVsZXMvZXhNb2RlSGFuZGxlci5qcyIsIi4uLy4uL3NyYy9tb2R1bGVzL3N3aXRjaGVyUGx1cy5qcyIsIi4uLy4uL3NyYy9tYWluLmpzIl0sInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCBjb25zdCBRVUlDS19TV0lUQ0hFUl9JRCA9ICdzd2l0Y2hlcic7XG5cbi8vIFN3aXRjaGVyIG1vZGVzIG9mIG9wZXJhdGlvblxuZXhwb3J0IGNvbnN0IE1vZGUgPSB7XG4gIFN0YW5kYXJkOiAxLFxuICBFZGl0b3JMaXN0OiAyLFxuICBTeW1ib2xMaXN0OiA0LFxufTtcblxuZXhwb3J0IGNvbnN0IFN5bWJvbFR5cGUgPSB7XG4gIExpbms6IDEsXG4gIEVtYmVkOiAyLFxuICBUYWc6IDQsXG4gIEhlYWRpbmc6IDgsXG59O1xuXG5leHBvcnQgY29uc3QgU3ltYm9sSW5kaWNhdG9ycyA9IHt9O1xuU3ltYm9sSW5kaWNhdG9yc1tTeW1ib2xUeXBlLkxpbmtdID0gJ/CflJcnO1xuU3ltYm9sSW5kaWNhdG9yc1tTeW1ib2xUeXBlLkVtYmVkXSA9ICchJztcblN5bWJvbEluZGljYXRvcnNbU3ltYm9sVHlwZS5UYWddID0gJyMnO1xuU3ltYm9sSW5kaWNhdG9yc1tTeW1ib2xUeXBlLkhlYWRpbmddID0ge1xuICAxOiAnSOKCgScsXG4gIDI6ICdI4oKCJyxcbiAgMzogJ0jigoMnLFxuICA0OiAnSOKChCcsXG4gIDU6ICdI4oKFJyxcbiAgNjogJ0jigoYnLFxufTtcblxuZXhwb3J0IGNvbnN0IFJlZmVyZW5jZVZpZXdzID0gWydiYWNrbGluaycsICdvdXRsaW5lJywgJ2xvY2FsZ3JhcGgnXTtcbiIsImV4cG9ydCBjb25zdCBDb25maWcgPSB7XG4gIC8vIGNvbW1hbmQgdG8gZW5hYmxlIGZpbHRlcmluZyBvZiBvcGVuIGVkaXRvcnNcbiAgZWRpdG9yTGlzdENvbW1hbmQ6ICdlZHQgJyxcbiAgLy8gY29tbWFuZCB0byBlbmFibGUgZmlsdGVyaW5nIG9mIGZpbGUgc3ltYm9sc1xuICBzeW1ib2xMaXN0Q29tbWFuZDogJ0AnLFxuICAvLyB0eXBlcyBvZiBvcGVuIHZpZXdzIHRvIGhpZGUgZnJvbSB0aGUgc3VnZ2VzdGlvbiBsaXN0XG4gIGV4Y2x1ZGVWaWV3VHlwZXM6IFsnZW1wdHknXSxcbn07XG5cbmV4cG9ydCBjbGFzcyBTZXR0aW5ncyB7XG4gIGdldCBhbHdheXNOZXdQYW5lRm9yU3ltYm9scygpIHtcbiAgICBjb25zdCB7IGRhdGEgfSA9IHRoaXM7XG5cbiAgICBsZXQgdmFsID0gbnVsbDtcbiAgICBpZiAoZGF0YSkgeyB2YWwgPSBkYXRhLmFsd2F5c05ld1BhbmVGb3JTeW1ib2xzOyB9XG5cbiAgICByZXR1cm4gdmFsO1xuICB9XG5cbiAgc2V0IGFsd2F5c05ld1BhbmVGb3JTeW1ib2xzKHZhbHVlKSB7XG4gICAgbGV0IHsgZGF0YSB9ID0gdGhpcztcblxuICAgIGlmICghZGF0YSkge1xuICAgICAgZGF0YSA9IFNldHRpbmdzLmdldERlZmF1bHREYXRhKCk7XG4gICAgICB0aGlzLmRhdGEgPSBkYXRhO1xuICAgIH1cblxuICAgIGRhdGEuYWx3YXlzTmV3UGFuZUZvclN5bWJvbHMgPSB2YWx1ZTtcbiAgfVxuXG4gIGNvbnN0cnVjdG9yKHBsdWdpbikge1xuICAgIHRoaXMucGx1Z2luID0gcGx1Z2luO1xuICAgIHRoaXMuZGF0YSA9IG51bGw7XG4gIH1cblxuICBhc3luYyBsb2FkU2V0dGluZ3MoKSB7XG4gICAgY29uc3QgeyBwbHVnaW4gfSA9IHRoaXM7XG4gICAgbGV0IGRhdGEgPSBhd2FpdCBwbHVnaW4ubG9hZERhdGEoKTtcblxuICAgIGlmICghZGF0YSkgeyBkYXRhID0gU2V0dGluZ3MuZ2V0RGVmYXVsdERhdGEoKTsgfVxuICAgIHRoaXMuZGF0YSA9IGRhdGE7XG4gIH1cblxuICBzdGF0aWMgZ2V0RGVmYXVsdERhdGEoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGFsd2F5c05ld1BhbmVGb3JTeW1ib2xzOiBmYWxzZSxcbiAgICB9O1xuICB9XG5cbiAgc2F2ZVNldHRpbmdzKCkge1xuICAgIGNvbnN0IHsgcGx1Z2luLCBkYXRhIH0gPSB0aGlzO1xuICAgIGlmIChwbHVnaW4gJiYgZGF0YSkgeyBwbHVnaW4uc2F2ZURhdGEoZGF0YSk7IH1cbiAgfVxufVxuIiwiLyogZXNsaW50LWRpc2FibGUgaW1wb3J0L25vLXVucmVzb2x2ZWQgKi9cbmltcG9ydCB7IFBsdWdpblNldHRpbmdUYWIsIFNldHRpbmcgfSBmcm9tICdvYnNpZGlhbic7XG5cbmNsYXNzIFNldHRpbmdUYWIgZXh0ZW5kcyBQbHVnaW5TZXR0aW5nVGFiIHtcbiAgY29uc3RydWN0b3IoYXBwLCBwbHVnaW4pIHtcbiAgICBzdXBlcihhcHAsIHBsdWdpbik7XG4gICAgdGhpcy5wbHVnaW4gPSBwbHVnaW47XG4gIH1cblxuICBkaXNwbGF5KCkge1xuICAgIGNvbnN0IHsgY29udGFpbmVyRWwsIHBsdWdpbjogeyBzZXR0aW5ncyB9IH0gPSB0aGlzO1xuXG4gICAgY29udGFpbmVyRWwuZW1wdHkoKTtcbiAgICBTZXR0aW5nVGFiLnNldEFsd2F5c05ld1BhbmVGb3JTeW1ib2xzKGNvbnRhaW5lckVsLCBzZXR0aW5ncyk7XG4gIH1cblxuICBzdGF0aWMgc2V0QWx3YXlzTmV3UGFuZUZvclN5bWJvbHMoY29udGFpbmVyRWwsIHNldHRpbmdzKSB7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZSgnT3BlbiBTeW1ib2xzIGluIG5ldyBwYW5lJylcbiAgICAgIC5zZXREZXNjKCdFbmFibGVkLCBhbHdheXMgb3BlbiBhIG5ldyBwYW5lIHdoZW4gbmF2aWdhdGluZyB0byBTeW1ib2xzLiBEaXNhYmxlZCwgbmF2aWdhdGUgaW4gYW4gYWxyZWFkeSBvcGVuIHBhbmUgKGlmIG9uZSBleGlzdHMpJylcbiAgICAgIC5hZGRUb2dnbGUoKHRvZ2dsZSkgPT4gdG9nZ2xlLnNldFZhbHVlKHNldHRpbmdzLmFsd2F5c05ld1BhbmVGb3JTeW1ib2xzKVxuICAgICAgICAub25DaGFuZ2UoKHZhbHVlKSA9PiB7XG4gICAgICAgICAgc2V0dGluZ3MuYWx3YXlzTmV3UGFuZUZvclN5bWJvbHMgPSB2YWx1ZTtcbiAgICAgICAgICBzZXR0aW5ncy5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgfSkpO1xuICB9XG59XG5cbmV4cG9ydCB7IFNldHRpbmdUYWIgYXMgZGVmYXVsdCB9O1xuIiwiLyogZXNsaW50LWRpc2FibGUgaW1wb3J0L25vLXVucmVzb2x2ZWQgKi9cbmltcG9ydCB7IEZ1enp5U3VnZ2VzdE1vZGFsIH0gZnJvbSAnb2JzaWRpYW4nO1xuaW1wb3J0IHtcbiAgTW9kZSxcbiAgU3ltYm9sVHlwZSxcbiAgU3ltYm9sSW5kaWNhdG9ycyxcbiAgUmVmZXJlbmNlVmlld3MsXG59IGZyb20gJy4vY29uc3RhbnRzJztcbmltcG9ydCB7IENvbmZpZyB9IGZyb20gJy4vc2V0dGluZ3MnO1xuXG5jb25zdCBpbmRpY2F0b3JTdHlsZSA9ICdjb2xvcjogdmFyKC0tdGV4dC1hY2NlbnQpOyB3aWR0aDogMi41ZW07IHRleHQtYWxpZ246IGNlbnRlcjsgZmxvYXQ6bGVmdDsgZm9udC13ZWlnaHQ6ODAwOyc7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEV4TW9kZUhhbmRsZXIgZXh0ZW5kcyBGdXp6eVN1Z2dlc3RNb2RhbCB7XG4gIGdldCBtb2RlKCkge1xuICAgIHJldHVybiB0aGlzLl9tb2RlO1xuICB9XG5cbiAgY29uc3RydWN0b3IoYXBwLCBzZXR0aW5ncykge1xuICAgIHN1cGVyKGFwcCk7XG5cbiAgICB0aGlzLnNldHRpbmdzID0gc2V0dGluZ3M7XG4gICAgdGhpcy5fbW9kZSA9IE1vZGUuU3RhbmRhcmQ7XG4gICAgdGhpcy5zeW1ib2xUYXJnZXQgPSBudWxsO1xuICB9XG5cbiAgc2Vzc2lvbldpdGhNb2RlKG1vZGUpIHtcbiAgICB0aGlzLl9tb2RlID0gbW9kZSB8fCBNb2RlLlN0YW5kYXJkO1xuICAgIGlmIChtb2RlID09PSBNb2RlLlN5bWJvbExpc3QpIHsgdGhpcy5zeW1ib2xUYXJnZXQgPSBudWxsOyB9XG4gIH1cblxuICBwYXJzZUlucHV0KGlucHV0LCBjdXJyZW50U3VnZ2VzdGlvbikge1xuICAgIGNvbnN0IHsgZWRpdG9yTGlzdENvbW1hbmQsIHN5bWJvbExpc3RDb21tYW5kIH0gPSBDb25maWc7XG5cbiAgICAvLyBkZXRlcm1pbmUgaWYgdGhlIGVkaXRvciBjb21tYW5kIGV4aXN0cyBhbmQgaWYgaXQncyB2YWxpZFxuICAgIGNvbnN0IGhhc0VkaXRvckNtZFByZWZpeCA9IGlucHV0LmluZGV4T2YoZWRpdG9yTGlzdENvbW1hbmQpID09PSAwO1xuXG4gICAgLy8gZ2V0IHRoZSBpbmRleCBvZiBzeW1ib2wgY29tbWFuZCBhbmQgZGV0ZXJtaW5lIGlmIGl0IGV4aXN0c1xuICAgIGNvbnN0IHN5bWJvbENtZEluZGV4ID0gaW5wdXQuaW5kZXhPZihzeW1ib2xMaXN0Q29tbWFuZCk7XG4gICAgY29uc3QgaGFzU3ltYm9sQ21kID0gc3ltYm9sQ21kSW5kZXggIT09IC0xO1xuICAgIGNvbnN0IGhhc1N5bWJvbENtZFByZWZpeCA9IHN5bWJvbENtZEluZGV4ID09PSAwO1xuXG4gICAgLy8gZGV0ZXJtaW5lIGlmIHRoZSBjaG9vc2VyIGlzIHNob3dpbmcgc3VnZ2VzdGlvbnMsIGFuZCBpZiBzbywgaXMgdGhlXG4gICAgLy8gY3VycmVudGx5IHNlbGVjdGVkIHN1Z2dlc3Rpb24gYSB2YWxpZCB0YXJnZXQgZm9yIHN5bWJvbHNcbiAgICBjb25zdCBzZWxlY3RlZFN1Z2dJbmZvID0gRXhNb2RlSGFuZGxlci5nZXRTZWxlY3RlZFN1Z2dJbmZvKGhhc1N5bWJvbENtZCxcbiAgICAgIGN1cnJlbnRTdWdnZXN0aW9uKTtcblxuICAgIC8vIGRldGVybWluZSBpZiB0aGUgY3VycmVudCBhY3RpdmUgZWRpdG9yIHBhbmUgYSB2YWxpZCB0YXJnZXQgZm9yIHN5bWJvbHNcbiAgICBjb25zdCBhY3RpdmVFZGl0b3JJbmZvID0gdGhpcy5nZXRBY3RpdmVFZGl0b3JJbmZvKGhhc1N5bWJvbENtZFByZWZpeCxcbiAgICAgIHNlbGVjdGVkU3VnZ0luZm8uaXNTdWdnVmFsaWRTeW1ib2xUYXJnZXQpO1xuXG4gICAgY29uc3QgeyBtb2RlLCBzeW1ib2xUYXJnZXQgfSA9IHRoaXMuZGV0ZXJtaW5lUnVuTW9kZShoYXNFZGl0b3JDbWRQcmVmaXgsXG4gICAgICBoYXNTeW1ib2xDbWQsIHNlbGVjdGVkU3VnZ0luZm8sIGFjdGl2ZUVkaXRvckluZm8pO1xuXG4gICAgdGhpcy5zeW1ib2xUYXJnZXQgPSBzeW1ib2xUYXJnZXQ7XG4gICAgdGhpcy5fbW9kZSA9IG1vZGU7XG5cbiAgICByZXR1cm4gbW9kZTtcbiAgfVxuXG4gIGdldEFjdGl2ZUVkaXRvckluZm8oaGFzU3ltYm9sQ21kUHJlZml4LCBpc1N1Z2dWYWxpZFN5bWJvbFRhcmdldCkge1xuICAgIGNvbnN0IHsgd29ya3NwYWNlIH0gPSB0aGlzLmFwcDtcbiAgICBjb25zdCB7IGV4Y2x1ZGVWaWV3VHlwZXMgfSA9IENvbmZpZztcblxuICAgIC8vIGRldGVybWluZSBpZiB0aGUgY3VycmVudCBhY3RpdmUgZWRpdG9yIHBhbmUgaXMgdmFsaWRcbiAgICBjb25zdCB7IHZpZXcsIHZpZXc6IHsgZmlsZTogY3VycmVudEVkaXRvckZpbGUgfSB9ID0gd29ya3NwYWNlLmFjdGl2ZUxlYWY7XG4gICAgY29uc3QgaXNDdXJyZW50RWRpdG9yVmFsaWQgPSAhZXhjbHVkZVZpZXdUeXBlcy5pbmNsdWRlcyh2aWV3LmdldFZpZXdUeXBlKCkpO1xuXG4gICAgLy8gd2hldGhlciBvciBub3QgdGhlIGN1cnJlbnQgYWN0aXZlIGVkaXRvciBjYW4gYmUgdXNlZCBhcyB0aGUgdGFyZ2V0IGZvclxuICAgIC8vIHN5bWJvbCBzZWFyY2hcbiAgICBjb25zdCBpc0VkaXRvclZhbGlkU3ltYm9sVGFyZ2V0ID0gaGFzU3ltYm9sQ21kUHJlZml4ICYmICFpc1N1Z2dWYWxpZFN5bWJvbFRhcmdldFxuICAgICAgJiYgaXNDdXJyZW50RWRpdG9yVmFsaWQgJiYgISFjdXJyZW50RWRpdG9yRmlsZTtcblxuICAgIHJldHVybiB7IGlzRWRpdG9yVmFsaWRTeW1ib2xUYXJnZXQsIGN1cnJlbnRFZGl0b3I6IHdvcmtzcGFjZS5hY3RpdmVMZWFmIH07XG4gIH1cblxuICBzdGF0aWMgZ2V0U2VsZWN0ZWRTdWdnSW5mbyhoYXNTeW1ib2xDbWQsIGN1cnJlbnRTdWdnZXN0aW9uKSB7XG4gICAgbGV0IGFjdGl2ZVN1Z2cgPSBjdXJyZW50U3VnZ2VzdGlvbjtcblxuICAgIGlmIChoYXNTeW1ib2xDbWQpIHtcbiAgICAgIC8vIGRldGVybWluZSBpZiB0aGVyZSBpcyBhIGN1cnJlbnQgc3VnZ2VzdGlvbiB0aGF0IGNhbiBiZSB1c2VkIGFzIHRoZVxuICAgICAgLy8gdGFyZ2V0IGZvciBzeW1ib2wgc2VhcmNoLiBUaGlzIG1lYW5zIHRoZSBzdWdnZXN0aW9uIGhhcyB0byBwb2ludCB0b1xuICAgICAgLy8gYSBmaWxlXG4gICAgICBjb25zdCB0YXJnZXQgPSBFeE1vZGVIYW5kbGVyLmdldFN1Z2dlc3Rpb25UYXJnZXQoYWN0aXZlU3VnZyk7XG4gICAgICBpZiAodGFyZ2V0ICYmIHRhcmdldC5zeW1ib2wpIHtcbiAgICAgICAgLy8gc3ltYm9sIHN1Z2dlc3Rpb25zIGRvbid0IHBvaW50IHRvIGEgZmlsZVxuICAgICAgICBhY3RpdmVTdWdnID0gbnVsbDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyB3aGV0aGVyIG9yIG5vdCB0aGUgY3VycmVudCBzdWdnZXN0aW9uIGNhbiBiZSB1c2VkIGZvciBzeW1ib2wgc2VhcmNoXG4gICAgY29uc3QgaXNTdWdnVmFsaWRTeW1ib2xUYXJnZXQgPSAhIWFjdGl2ZVN1Z2c7XG4gICAgcmV0dXJuIHsgY3VycmVudFN1Z2dlc3Rpb246IGFjdGl2ZVN1Z2csIGlzU3VnZ1ZhbGlkU3ltYm9sVGFyZ2V0IH07XG4gIH1cblxuICBkZXRlcm1pbmVSdW5Nb2RlKGhhc0VkaXRvckNtZFByZWZpeCwgaGFzU3ltYm9sQ21kLCBzZWxlY3RlZFN1Z2dJbmZvLCBhY3RpdmVFZGl0b3JJbmZvKSB7XG4gICAgbGV0IHsgbW9kZSwgc3ltYm9sVGFyZ2V0IH0gPSB0aGlzO1xuXG4gICAgLy8gd2V0aGVyIG9yIG5vdCBhIHN5bWJvbCB0YXJnZXQgZmlsZSBleGlzdHMuIEluZGljYXRlcyB0aGF0IHRoZSBwcmV2aW91c1xuICAgIC8vIG9wZXJhdGlvbiB3YXMgYSBzeW1ib2wgb3BlcmF0aW9uXG4gICAgY29uc3QgaGFzRXhpc3RpbmdTeW1ib2xUYXJnZXQgPSBtb2RlID09PSBNb2RlLlN5bWJvbExpc3QgJiYgISFzeW1ib2xUYXJnZXQ7XG5cbiAgICBpZiAoaGFzU3ltYm9sQ21kKSB7XG4gICAgICBtb2RlID0gTW9kZS5TeW1ib2xMaXN0O1xuXG4gICAgICBpZiAoc2VsZWN0ZWRTdWdnSW5mby5pc1N1Z2dWYWxpZFN5bWJvbFRhcmdldCkge1xuICAgICAgICBzeW1ib2xUYXJnZXQgPSBFeE1vZGVIYW5kbGVyLmdldFN1Z2dlc3Rpb25UYXJnZXQoXG4gICAgICAgICAgc2VsZWN0ZWRTdWdnSW5mby5jdXJyZW50U3VnZ2VzdGlvbixcbiAgICAgICAgKTtcbiAgICAgIH0gZWxzZSBpZiAoIWhhc0V4aXN0aW5nU3ltYm9sVGFyZ2V0ICYmIGFjdGl2ZUVkaXRvckluZm8uaXNFZGl0b3JWYWxpZFN5bWJvbFRhcmdldCkge1xuICAgICAgICBzeW1ib2xUYXJnZXQgPSBhY3RpdmVFZGl0b3JJbmZvLmN1cnJlbnRFZGl0b3I7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChoYXNFZGl0b3JDbWRQcmVmaXgpIHtcbiAgICAgIG1vZGUgPSBNb2RlLkVkaXRvckxpc3Q7XG4gICAgICBzeW1ib2xUYXJnZXQgPSBudWxsO1xuICAgIH0gZWxzZSB7XG4gICAgICBtb2RlID0gTW9kZS5TdGFuZGFyZDtcbiAgICAgIHN5bWJvbFRhcmdldCA9IG51bGw7XG4gICAgfVxuXG4gICAgcmV0dXJuIHsgbW9kZSwgc3ltYm9sVGFyZ2V0IH07XG4gIH1cblxuICBzdGF0aWMgZ2V0U3VnZ2VzdGlvblRhcmdldChzdWdnZXN0aW9uKSB7XG4gICAgaWYgKCFzdWdnZXN0aW9uKSB7IHJldHVybiBudWxsOyB9XG4gICAgcmV0dXJuIHN1Z2dlc3Rpb24uZmlsZSA/IHN1Z2dlc3Rpb24uZmlsZSA6IHN1Z2dlc3Rpb24uaXRlbTtcbiAgfVxuXG4gIGV4dHJhY3RTZWFyY2hRdWVyeShpbnB1dCA9ICcnKSB7XG4gICAgY29uc3QgeyBtb2RlIH0gPSB0aGlzO1xuICAgIGNvbnN0IHsgZWRpdG9yTGlzdENvbW1hbmQsIHN5bWJvbExpc3RDb21tYW5kIH0gPSBDb25maWc7XG4gICAgbGV0IHN0YXJ0SW5kZXggPSAwO1xuXG4gICAgaWYgKG1vZGUgPT09IE1vZGUuU3ltYm9sTGlzdCkge1xuICAgICAgY29uc3Qgc3ltYm9sQ21kSW5kZXggPSBpbnB1dC5pbmRleE9mKHN5bWJvbExpc3RDb21tYW5kKTtcbiAgICAgIHN0YXJ0SW5kZXggPSBzeW1ib2xDbWRJbmRleCArIHN5bWJvbExpc3RDb21tYW5kLmxlbmd0aDtcbiAgICB9IGVsc2UgaWYgKG1vZGUgPT09IE1vZGUuRWRpdG9yTGlzdCkge1xuICAgICAgc3RhcnRJbmRleCA9IGVkaXRvckxpc3RDb21tYW5kLmxlbmd0aDtcbiAgICB9XG5cbiAgICByZXR1cm4gaW5wdXQuc2xpY2Uoc3RhcnRJbmRleCkudHJpbSgpLnRvTG93ZXJDYXNlKCk7XG4gIH1cblxuICBnZXRTdWdnZXN0aW9ucyhpbnB1dCkge1xuICAgIGNvbnN0IHF1ZXJ5ID0gdGhpcy5leHRyYWN0U2VhcmNoUXVlcnkoaW5wdXQpO1xuICAgIHJldHVybiBzdXBlci5nZXRTdWdnZXN0aW9ucyhxdWVyeSk7XG4gIH1cblxuICBnZXRJdGVtcygpIHtcbiAgICBjb25zdCB7IG1vZGUgfSA9IHRoaXM7XG4gICAgbGV0IGl0ZW1zO1xuXG4gICAgaWYgKG1vZGUgPT09IE1vZGUuRWRpdG9yTGlzdCkge1xuICAgICAgaXRlbXMgPSB0aGlzLmdldE9wZW5Sb290U3BsaXRzKCk7XG4gICAgfSBlbHNlIGlmIChtb2RlID09PSBNb2RlLlN5bWJvbExpc3QpIHtcbiAgICAgIGl0ZW1zID0gdGhpcy5nZXRTeW1ib2xzRm9yVGFyZ2V0KCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGl0ZW1zO1xuICB9XG5cbiAgZ2V0T3BlblJvb3RTcGxpdHMoKSB7XG4gICAgY29uc3QgeyB3b3Jrc3BhY2UgfSA9IHRoaXMuYXBwO1xuICAgIGNvbnN0IGxlYXZlcyA9IFtdO1xuXG4gICAgY29uc3Qgc2F2ZUxlYWYgPSAobCkgPT4ge1xuICAgICAgaWYgKCFDb25maWcuZXhjbHVkZVZpZXdUeXBlcy5pbmNsdWRlcyhsLnZpZXcuZ2V0Vmlld1R5cGUoKSkpIHtcbiAgICAgICAgbGVhdmVzLnB1c2gobCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIHdvcmtzcGFjZS5pdGVyYXRlTGVhdmVzKHNhdmVMZWFmLCB3b3Jrc3BhY2Uucm9vdFNwbGl0KTtcbiAgICByZXR1cm4gbGVhdmVzO1xuICB9XG5cbiAgZ2V0U3ltYm9sc0ZvclRhcmdldCgpIHtcbiAgICBjb25zdCByZXQgPSBbXTtcbiAgICBjb25zdCB7IHN5bWJvbFRhcmdldCwgYXBwOiB7IG1ldGFkYXRhQ2FjaGUgfSB9ID0gdGhpcztcblxuICAgIGlmIChzeW1ib2xUYXJnZXQpIHtcbiAgICAgIGxldCBmaWxlID0gc3ltYm9sVGFyZ2V0O1xuXG4gICAgICAvLyBkZXRlcm1pbmUgaWYgc3ltYm9sVGFyZ2V0IGlzIGEgd29ya3NwYWNlIGxlYWYsIG9yIGZpbGVcbiAgICAgIGlmIChzeW1ib2xUYXJnZXQudHlwZSA9PT0gJ2xlYWYnICYmIHN5bWJvbFRhcmdldC52aWV3KSB7XG4gICAgICAgIGZpbGUgPSBzeW1ib2xUYXJnZXQudmlldy5maWxlO1xuICAgICAgfVxuXG4gICAgICBpZiAoZmlsZSkge1xuICAgICAgICBjb25zdCBtZEZpbGUgPSBtZXRhZGF0YUNhY2hlLmZpbGVDYWNoZVtmaWxlLnBhdGhdO1xuXG4gICAgICAgIGlmIChtZEZpbGUpIHtcbiAgICAgICAgICBjb25zdCBzeW1ib2xEYXRhID0gbWV0YWRhdGFDYWNoZS5tZXRhZGF0YUNhY2hlW21kRmlsZS5oYXNoXTtcblxuICAgICAgICAgIGlmIChzeW1ib2xEYXRhKSB7XG4gICAgICAgICAgICBjb25zdCBwdXNoID0gKHN5bWJvbHMgPSBbXSwgdHlwZSkgPT4ge1xuICAgICAgICAgICAgICBzeW1ib2xzLmZvckVhY2goKHN5bWJvbCkgPT4gcmV0LnB1c2goeyBzeW1ib2wsIHR5cGUgfSkpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgcHVzaChzeW1ib2xEYXRhLmhlYWRpbmdzLCBTeW1ib2xUeXBlLkhlYWRpbmcpO1xuICAgICAgICAgICAgcHVzaChzeW1ib2xEYXRhLnRhZ3MsIFN5bWJvbFR5cGUuVGFnKTtcbiAgICAgICAgICAgIHB1c2goc3ltYm9sRGF0YS5saW5rcywgU3ltYm9sVHlwZS5MaW5rKTtcbiAgICAgICAgICAgIHB1c2goc3ltYm9sRGF0YS5lbWJlZHMsIFN5bWJvbFR5cGUuRW1iZWQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiByZXQ7XG4gIH1cblxuICBnZXRJdGVtVGV4dChpdGVtKSB7XG4gICAgY29uc3QgeyBtb2RlIH0gPSB0aGlzO1xuICAgIGxldCB0ZXh0O1xuXG4gICAgaWYgKG1vZGUgPT09IE1vZGUuU3ltYm9sTGlzdCkge1xuICAgICAgdGV4dCA9IEV4TW9kZUhhbmRsZXIuZ2V0U3VnZ2VzdGlvblRleHRGb3JTeW1ib2woaXRlbSk7XG4gICAgfSBlbHNlIGlmIChtb2RlID09PSBNb2RlLkVkaXRvckxpc3QpIHtcbiAgICAgIHRleHQgPSBpdGVtLmdldERpc3BsYXlUZXh0KCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRleHQ7XG4gIH1cblxuICBzdGF0aWMgZ2V0U3VnZ2VzdGlvblRleHRGb3JTeW1ib2woaXRlbSkge1xuICAgIGNvbnN0IHsgc3ltYm9sLCB0eXBlIH0gPSBpdGVtO1xuICAgIGxldCB0ZXh0O1xuXG4gICAgaWYgKHR5cGUgPT09IFN5bWJvbFR5cGUuSGVhZGluZykge1xuICAgICAgdGV4dCA9IHN5bWJvbC5oZWFkaW5nO1xuICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gU3ltYm9sVHlwZS5UYWcpIHtcbiAgICAgIHRleHQgPSBzeW1ib2wudGFnLnNsaWNlKDEpO1xuICAgIH0gZWxzZSB7XG4gICAgICAoeyBsaW5rOiB0ZXh0IH0gPSBzeW1ib2wpO1xuICAgICAgY29uc3QgeyBkaXNwbGF5VGV4dCB9ID0gc3ltYm9sO1xuXG4gICAgICBpZiAoZGlzcGxheVRleHQgJiYgZGlzcGxheVRleHQgIT09IHRleHQpIHtcbiAgICAgICAgdGV4dCArPSBgfCR7ZGlzcGxheVRleHR9YDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdGV4dDtcbiAgfVxuXG4gIG9uQ2hvb3NlU3VnZ2VzdGlvbihzdWdnZXN0aW9uSXRlbSwgZXZ0KSB7XG4gICAgY29uc3QgeyBtb2RlIH0gPSB0aGlzO1xuXG4gICAgaWYgKG1vZGUgPT09IE1vZGUuRWRpdG9yTGlzdCkge1xuICAgICAgY29uc3QgeyBpdGVtIH0gPSBzdWdnZXN0aW9uSXRlbTtcbiAgICAgIHRoaXMuYXBwLndvcmtzcGFjZS5zZXRBY3RpdmVMZWFmKGl0ZW0pO1xuICAgICAgaXRlbS52aWV3LnNldEVwaGVtZXJhbFN0YXRlKHsgZm9jdXM6IHRydWUgfSk7XG4gICAgfSBlbHNlIGlmIChtb2RlID09PSBNb2RlLlN5bWJvbExpc3QpIHtcbiAgICAgIHRoaXMubmF2aWdhdGVUb1N5bWJvbChzdWdnZXN0aW9uSXRlbSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN1cGVyLm9uQ2hvb3NlU3VnZ2VzdGlvbihzdWdnZXN0aW9uSXRlbSwgZXZ0KTtcbiAgICB9XG4gIH1cblxuICBuYXZpZ2F0ZVRvU3ltYm9sKHN1Z2dlc3Rpb25JdGVtKSB7XG4gICAgY29uc3QgeyB3b3Jrc3BhY2UgfSA9IHRoaXMuYXBwO1xuXG4gICAgLy8gZGV0ZXJtaW5lIGlmIHRoZSB0YXJnZXQgaXMgYWxyZWFkeSBvcGVuIGluIGEgcGFuZVxuICAgIGNvbnN0IHsgbGVhZiwgdGFyZ2V0RmlsZVBhdGggfSA9IHRoaXMuZmluZE9wZW5FZGl0b3JNYXRjaGluZ1N5bWJvbFRhcmdldCgpO1xuXG4gICAgY29uc3Qge1xuICAgICAgc3RhcnQ6IHsgbGluZSwgb2Zmc2V0OiBzdGFydFBvcyB9LFxuICAgICAgZW5kOiB7IG9mZnNldDogZW5kUG9zIH0sXG4gICAgfSA9IHN1Z2dlc3Rpb25JdGVtLml0ZW0uc3ltYm9sLnBvc2l0aW9uO1xuXG4gICAgLy8gb2JqZWN0IGNvbnRhaW5pbmcgdGhlIHN0YXRlIGluZm9ybWF0aW9uIGZvciB0aGUgdGFyZ2V0IGVkaXRvcixcbiAgICAvLyBzdGFydCB3aXRoIHRoZSByYW5nZSB0byBoaWdobGlnaHQgaW4gdGFyZ2V0IGVkaXRvclxuICAgIGNvbnN0IGVTdGF0ZSA9IHtcbiAgICAgIHN0YXJ0UG9zLFxuICAgICAgZW5kUG9zLFxuICAgICAgbGluZSxcbiAgICAgIGZvY3VzOiB0cnVlLFxuICAgIH07XG5cbiAgICBpZiAobGVhZiAmJiAhdGhpcy5zZXR0aW5ncy5hbHdheXNOZXdQYW5lRm9yU3ltYm9scykge1xuICAgICAgLy8gYWN0aXZhdGUgdGhlIGFscmVhZHkgb3BlbiBwYW5lLCBhbmQgc2V0IHN0YXRlXG4gICAgICB3b3Jrc3BhY2Uuc2V0QWN0aXZlTGVhZihsZWFmLCB0cnVlKTtcbiAgICAgIGxlYWYudmlldy5zZXRFcGhlbWVyYWxTdGF0ZShlU3RhdGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICB3b3Jrc3BhY2Uub3BlbkxpbmtUZXh0KHRhcmdldEZpbGVQYXRoLCAnJywgdHJ1ZSwgeyBlU3RhdGUgfSk7XG4gICAgfVxuICB9XG5cbiAgZmluZE9wZW5FZGl0b3JNYXRjaGluZ1N5bWJvbFRhcmdldCgpIHtcbiAgICBjb25zdCB7IHN5bWJvbFRhcmdldCB9ID0gdGhpcztcbiAgICBjb25zdCBpc1RhcmdldExlYWYgPSBzeW1ib2xUYXJnZXQudHlwZSA9PT0gJ2xlYWYnO1xuICAgIGNvbnN0IGZpbGUgPSBpc1RhcmdldExlYWYgPyBzeW1ib2xUYXJnZXQudmlldy5maWxlIDogc3ltYm9sVGFyZ2V0O1xuXG4gICAgY29uc3QgcHJlZGljYXRlID0gKGxlYWYpID0+IHtcbiAgICAgIGNvbnN0IGlzTGVhZlJlZlZpZXcgPSBSZWZlcmVuY2VWaWV3cy5pbmNsdWRlcyhsZWFmLnZpZXcuZ2V0Vmlld1R5cGUoKSk7XG4gICAgICBjb25zdCBpc1RhcmdldFJlZlZpZXcgPSBpc1RhcmdldExlYWZcbiAgICAgICAgJiYgUmVmZXJlbmNlVmlld3MuaW5jbHVkZXMoc3ltYm9sVGFyZ2V0LnZpZXcuZ2V0Vmlld1R5cGUoKSk7XG4gICAgICBsZXQgdmFsID0gZmFsc2U7XG5cbiAgICAgIGlmICghaXNMZWFmUmVmVmlldykge1xuICAgICAgICB2YWwgPSBpc1RhcmdldExlYWYgJiYgIWlzVGFyZ2V0UmVmVmlld1xuICAgICAgICAgID8gbGVhZiA9PT0gc3ltYm9sVGFyZ2V0XG4gICAgICAgICAgOiBsZWFmLnZpZXcuZmlsZSA9PT0gZmlsZTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHZhbDtcbiAgICB9O1xuXG4gICAgY29uc3QgbGVhZiA9IHRoaXMuZ2V0T3BlblJvb3RTcGxpdHMoKS5maW5kKHByZWRpY2F0ZSk7XG4gICAgcmV0dXJuIHsgbGVhZiwgdGFyZ2V0RmlsZVBhdGg6IGZpbGUucGF0aCB9O1xuICB9XG5cbiAgcmVuZGVyU3VnZ2VzdGlvbihzdWdnLCBwYXJlbnRFbCkge1xuICAgIHN1cGVyLnJlbmRlclN1Z2dlc3Rpb24oc3VnZywgcGFyZW50RWwpO1xuICAgIHRoaXMudXBkYXRlU3VnZ2VzdGlvbkVsRm9yTW9kZShzdWdnLCBwYXJlbnRFbCk7XG4gIH1cblxuICB1cGRhdGVTdWdnZXN0aW9uRWxGb3JNb2RlKHN1Z2csIHBhcmVudEVsKSB7XG4gICAgY29uc3QgeyBtb2RlIH0gPSB0aGlzO1xuXG4gICAgaWYgKG1vZGUgPT09IE1vZGUuU3ltYm9sTGlzdCkge1xuICAgICAgLy8gYWRkIHN5bWJvbCB0eXBlIGluZGljYXRvclxuICAgICAgY29uc3QgeyB0eXBlLCBzeW1ib2wgfSA9IHN1Z2cuaXRlbTtcbiAgICAgIGxldCBpbmRpY2F0b3IgPSBTeW1ib2xJbmRpY2F0b3JzW3R5cGVdO1xuXG4gICAgICBpZiAodHlwZSA9PT0gU3ltYm9sVHlwZS5IZWFkaW5nKSB7XG4gICAgICAgIGluZGljYXRvciA9IGluZGljYXRvcltzeW1ib2wubGV2ZWxdO1xuICAgICAgfVxuXG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tdW5kZWZcbiAgICAgIGNvbnN0IGluZGljYXRvckVsID0gY3JlYXRlRWwoJ2RpdicsIHtcbiAgICAgICAgdGV4dDogaW5kaWNhdG9yLFxuICAgICAgICBhdHRyOiB7IHN0eWxlOiBpbmRpY2F0b3JTdHlsZSB9LFxuICAgICAgfSk7XG4gICAgICBwYXJlbnRFbC5pbnNlcnRBZGphY2VudEVsZW1lbnQoJ2FmdGVyYmVnaW4nLCBpbmRpY2F0b3JFbCk7XG4gICAgfVxuICB9XG59XG4iLCJpbXBvcnQge1xuICBRVUlDS19TV0lUQ0hFUl9JRCxcbiAgTW9kZSxcbn0gZnJvbSAnLi9jb25zdGFudHMnO1xuaW1wb3J0IEV4TW9kZUhhbmRsZXIgZnJvbSAnLi9leE1vZGVIYW5kbGVyJztcbmltcG9ydCB7IENvbmZpZyB9IGZyb20gJy4vc2V0dGluZ3MnO1xuXG5mdW5jdGlvbiBnZXRRdWlja1N3aXRjaGVyKGFwcCkge1xuICBjb25zdCBzd2l0Y2hlciA9IGFwcC5pbnRlcm5hbFBsdWdpbnMuZ2V0UGx1Z2luQnlJZChRVUlDS19TV0lUQ0hFUl9JRCk7XG4gIGlmICghc3dpdGNoZXIpIHsgcmV0dXJuIG51bGw7IH1cblxuICByZXR1cm4gc3dpdGNoZXIuaW5zdGFuY2UubW9kYWwuY29uc3RydWN0b3I7XG59XG5cbmV4cG9ydCBkZWZhdWx0IChhcHAsIHNldHRpbmdzKSA9PiB7XG4gIGNvbnN0IFF1aWNrU3dpdGNoZXIgPSBnZXRRdWlja1N3aXRjaGVyKGFwcCk7XG4gIGlmIChRdWlja1N3aXRjaGVyID09PSBudWxsKSB7IHJldHVybiBudWxsOyB9XG5cbiAgY2xhc3MgU3dpdGNoZXJQbHVzIGV4dGVuZHMgUXVpY2tTd2l0Y2hlciB7XG4gICAgY29uc3RydWN0b3IoYXBwT2JqLCBzZXR0aW5nc09iaikge1xuICAgICAgc3VwZXIoYXBwT2JqKTtcblxuICAgICAgdGhpcy5zZXR0aW5ncyA9IHNldHRpbmdzT2JqO1xuICAgICAgdGhpcy5leE1vZGUgPSBuZXcgRXhNb2RlSGFuZGxlcihhcHBPYmosIHNldHRpbmdzT2JqKTtcblxuICAgICAgdGhpcy5zY29wZS5yZWdpc3RlcktleShbJ0N0cmwnXSwgJ24nLCB0aGlzLm5leHRJdGVtLmJpbmQodGhpcy5jaG9vc2VyKSk7XG4gICAgICB0aGlzLnNjb3BlLnJlZ2lzdGVyS2V5KFsnQ3RybCddLCAncCcsIHRoaXMucHJldmlvdXNJdGVtLmJpbmQodGhpcy5jaG9vc2VyKSk7XG4gICAgfVxuXG4gICAgcHJldmlvdXNJdGVtKCkge1xuICAgICAgaWYgKHRoaXMuY2hvb3Nlci5pc09wZW4pIHtcbiAgICAgICAgdGhpcy5zZXRTZWxlY3RlZEl0ZW0odGhpcy5zZWxlY3RlZEl0ZW0gLSAxLCB0cnVlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBuZXh0SXRlbSgpIHtcbiAgICAgIGlmICh0aGlzLmNob29zZXIuaXNPcGVuKSB7XG4gICAgICAgIHRoaXMuc2V0U2VsZWN0ZWRJdGVtKHRoaXMuc2VsZWN0ZWRJdGVtICsgMSwgdHJ1ZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgb3BlbkluTW9kZShtb2RlKSB7XG4gICAgICB0aGlzLmV4TW9kZS5zZXNzaW9uV2l0aE1vZGUobW9kZSk7XG4gICAgICB0aGlzLm9wZW4oKTtcbiAgICB9XG5cbiAgICBvbk9wZW4oKSB7XG4gICAgICBsZXQgdmFsID0gJyc7XG4gICAgICBjb25zdCB7IGV4TW9kZTogeyBtb2RlIH0gfSA9IHRoaXM7XG5cbiAgICAgIGlmIChtb2RlID09PSBNb2RlLkVkaXRvckxpc3QpIHtcbiAgICAgICAgdmFsID0gQ29uZmlnLmVkaXRvckxpc3RDb21tYW5kO1xuICAgICAgfSBlbHNlIGlmIChtb2RlID09PSBNb2RlLlN5bWJvbExpc3QpIHtcbiAgICAgICAgdmFsID0gQ29uZmlnLnN5bWJvbExpc3RDb21tYW5kO1xuICAgICAgfVxuXG4gICAgICBpZiAobW9kZSAhPT0gTW9kZS5TdGFuZGFyZCkgeyB0aGlzLmNob29zZXIuc2V0U3VnZ2VzdGlvbnMoW10pOyB9XG5cbiAgICAgIHRoaXMuaXNPcGVuID0gdHJ1ZTtcbiAgICAgIHRoaXMuaW5wdXRFbC52YWx1ZSA9IHZhbDtcbiAgICAgIHRoaXMuaW5wdXRFbC5mb2N1cygpO1xuICAgICAgdGhpcy5vbklucHV0KCk7XG4gICAgfVxuXG4gICAgb25JbnB1dCgpIHtcbiAgICAgIGNvbnN0IHtcbiAgICAgICAgZXhNb2RlLFxuICAgICAgICBpbnB1dEVsOiB7IHZhbHVlIH0sXG4gICAgICAgIGNob29zZXIsXG4gICAgICB9ID0gdGhpcztcblxuICAgICAgY29uc3QgY3VycmVudFN1Z2dlc3Rpb24gPSBjaG9vc2VyLnZhbHVlc1tjaG9vc2VyLnNlbGVjdGVkSXRlbV07XG4gICAgICBjb25zdCBtb2RlID0gZXhNb2RlLnBhcnNlSW5wdXQodmFsdWUsIGN1cnJlbnRTdWdnZXN0aW9uKTtcbiAgICAgIHRoaXMudXBkYXRlSGVscGVyVGV4dEZvck1vZGUobW9kZSk7XG4gICAgICB0aGlzLnVwZGF0ZUtleW1hcEZvck1vZGUobW9kZSk7XG4gICAgICB0aGlzLnVwZGF0ZVN1Z2dlc3Rpb25zKCk7XG4gICAgfVxuXG4gICAgdXBkYXRlSGVscGVyVGV4dEZvck1vZGUobW9kZSkge1xuICAgICAgY29uc3QgeyBjb250YWluZXJFbCB9ID0gdGhpcztcbiAgICAgIGNvbnN0IHNlbGVjdG9yID0gJy5wcm9tcHQtaW5zdHJ1Y3Rpb25zJztcblxuICAgICAgY29uc3QgZWwgPSBjb250YWluZXJFbC5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKTtcbiAgICAgIGlmIChlbCkgeyBlbC5zdHlsZS5kaXNwbGF5ID0gbW9kZSA9PT0gTW9kZS5TdGFuZGFyZCA/ICcnIDogJ25vbmUnOyB9XG4gICAgfVxuXG4gICAgdXBkYXRlS2V5bWFwRm9yTW9kZShtb2RlKSB7XG4gICAgICBjb25zdCB7IHNjb3BlOiB7IGtleXMgfSB9ID0gdGhpcztcbiAgICAgIGxldCB7IGJhY2t1cEtleXMgPSBbXSB9ID0gdGhpcztcblxuICAgICAgaWYgKG1vZGUgPT09IE1vZGUuU3RhbmRhcmQpIHtcbiAgICAgICAgaWYgKGJhY2t1cEtleXMubGVuZ3RoKSB7IGJhY2t1cEtleXMuZm9yRWFjaCgoa2V5KSA9PiBrZXlzLnB1c2goa2V5KSk7IH1cbiAgICAgICAgYmFja3VwS2V5cyA9IHVuZGVmaW5lZDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIHVucmVnaXN0ZXIgdW51c2VkIGhvdGtleXMgZm9yIGN1c3RvbSBtb2Rlc1xuICAgICAgICBmb3IgKGxldCBpID0ga2V5cy5sZW5ndGggLSAxOyBpID49IDA7IC0taSkge1xuICAgICAgICAgIGNvbnN0IGtleSA9IGtleXNbaV07XG5cbiAgICAgICAgICBpZiAoa2V5LmtleSA9PT0gJ0VudGVyJ1xuICAgICAgICAgICAgJiYgKGtleS5tb2RpZmllcnMgPT09ICdNZXRhJyB8fCBrZXkubW9kaWZpZXJzID09PSAnU2hpZnQnKSkge1xuICAgICAgICAgICAga2V5cy5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgICBiYWNrdXBLZXlzLnB1c2goa2V5KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdGhpcy5iYWNrdXBLZXlzID0gYmFja3VwS2V5cztcbiAgICB9XG5cbiAgICB1cGRhdGVTdWdnZXN0aW9ucygpIHtcbiAgICAgIGNvbnN0IHtcbiAgICAgICAgZXhNb2RlLFxuICAgICAgICBleE1vZGU6IHsgbW9kZSB9LFxuICAgICAgICBpbnB1dEVsOiB7IHZhbHVlIH0sXG4gICAgICB9ID0gdGhpcztcblxuICAgICAgaWYgKG1vZGUgPT09IE1vZGUuU3RhbmRhcmQpIHtcbiAgICAgICAgc3VwZXIudXBkYXRlU3VnZ2VzdGlvbnMoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IHN1Z2dlc3Rpb25zID0gZXhNb2RlLmdldFN1Z2dlc3Rpb25zKHZhbHVlKTtcbiAgICAgICAgdGhpcy5jaG9vc2VyLnNldFN1Z2dlc3Rpb25zKHN1Z2dlc3Rpb25zKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBvbkNob29zZVN1Z2dlc3Rpb24oc3VnZ2VzdGlvbkl0ZW0sIGV2dCkge1xuICAgICAgY29uc3QgeyBleE1vZGUsIGV4TW9kZTogeyBtb2RlIH0gfSA9IHRoaXM7XG5cbiAgICAgIGlmIChtb2RlID09PSBNb2RlLlN0YW5kYXJkKSB7XG4gICAgICAgIHN1cGVyLm9uQ2hvb3NlU3VnZ2VzdGlvbihzdWdnZXN0aW9uSXRlbSwgZXZ0KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGV4TW9kZS5vbkNob29zZVN1Z2dlc3Rpb24oc3VnZ2VzdGlvbkl0ZW0sIGV2dCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmVuZGVyU3VnZ2VzdGlvbihzdWdnLCBwYXJlbnRFbCkge1xuICAgICAgY29uc3QgeyBleE1vZGUsIGV4TW9kZTogeyBtb2RlIH0gfSA9IHRoaXM7XG5cbiAgICAgIGlmIChtb2RlID09PSBNb2RlLlN0YW5kYXJkKSB7XG4gICAgICAgIHN1cGVyLnJlbmRlclN1Z2dlc3Rpb24oc3VnZywgcGFyZW50RWwpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZXhNb2RlLnJlbmRlclN1Z2dlc3Rpb24oc3VnZywgcGFyZW50RWwpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBuZXcgU3dpdGNoZXJQbHVzKGFwcCwgc2V0dGluZ3MpO1xufTtcbiIsIi8qIGVzbGludC1kaXNhYmxlIGltcG9ydC9uby11bnJlc29sdmVkICovXG5pbXBvcnQgeyBQbHVnaW4gfSBmcm9tICdvYnNpZGlhbic7XG5pbXBvcnQgeyBNb2RlIH0gZnJvbSAnLi9tb2R1bGVzL2NvbnN0YW50cyc7XG5pbXBvcnQgeyBTZXR0aW5ncyB9IGZyb20gJy4vbW9kdWxlcy9zZXR0aW5ncyc7XG5pbXBvcnQgU2V0dGluZ1RhYiBmcm9tICcuL21vZHVsZXMvc2V0dGluZ1RhYic7XG5pbXBvcnQgY3JlYXRlU3dpdGNoZXJQbHVzTW9kYWwgZnJvbSAnLi9tb2R1bGVzL3N3aXRjaGVyUGx1cyc7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFN3aXRjaGVyUGx1c1BsdWdpbiBleHRlbmRzIFBsdWdpbiB7XG4gIGFzeW5jIG9ubG9hZCgpIHtcbiAgICBjb25zdCBzZXR0aW5ncyA9IG5ldyBTZXR0aW5ncyh0aGlzKTtcbiAgICBhd2FpdCBzZXR0aW5ncy5sb2FkU2V0dGluZ3MoKTtcbiAgICB0aGlzLnNldHRpbmdzID0gc2V0dGluZ3M7XG4gICAgdGhpcy5hZGRTZXR0aW5nVGFiKG5ldyBTZXR0aW5nVGFiKHRoaXMuYXBwLCB0aGlzKSk7XG5cbiAgICB0aGlzLnJlZ2lzdGVyQ29tbWFuZCgnc3dpdGNoZXItcGx1czpvcGVuJyxcbiAgICAgICdPcGVuJywgTW9kZS5TdGFuZGFyZCk7XG4gICAgdGhpcy5yZWdpc3RlckNvbW1hbmQoJ3N3aXRjaGVyLXBsdXM6b3Blbi1lZGl0b3JzJyxcbiAgICAgICdPcGVuIGluIEVkaXRvciBNb2RlJywgTW9kZS5FZGl0b3JMaXN0KTtcbiAgICB0aGlzLnJlZ2lzdGVyQ29tbWFuZCgnc3dpdGNoZXItcGx1czpvcGVuLXN5bWJvbHMnLFxuICAgICAgJ09wZW4gaW4gU3ltYm9sIE1vZGUnLCBNb2RlLlN5bWJvbExpc3QpO1xuICB9XG5cbiAgb251bmxvYWQoKSB7XG4gICAgdGhpcy5tb2RhbCA9IG51bGw7XG4gIH1cblxuICByZWdpc3RlckNvbW1hbmQoaWQsIG5hbWUsIG1vZGUpIHtcbiAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgaWQsXG4gICAgICBuYW1lLFxuICAgICAgaG90a2V5czogW10sXG4gICAgICBjaGVja0NhbGxiYWNrOiAoY2hlY2tpbmcpID0+IHtcbiAgICAgICAgY29uc3QgbW9kYWwgPSB0aGlzLmdldE1vZGFsKCk7XG4gICAgICAgIGlmIChtb2RhbCkge1xuICAgICAgICAgIGlmICghY2hlY2tpbmcpIHtcbiAgICAgICAgICAgIG1vZGFsLm9wZW5Jbk1vZGUobW9kZSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9LFxuICAgIH0pO1xuICB9XG5cbiAgZ2V0TW9kYWwoKSB7XG4gICAgbGV0IHsgbW9kYWwgfSA9IHRoaXM7XG4gICAgY29uc3QgeyBhcHAsIHNldHRpbmdzIH0gPSB0aGlzO1xuICAgIGlmIChtb2RhbCkgeyByZXR1cm4gbW9kYWw7IH1cblxuICAgIG1vZGFsID0gY3JlYXRlU3dpdGNoZXJQbHVzTW9kYWwoYXBwLCBzZXR0aW5ncyk7XG4gICAgdGhpcy5tb2RhbCA9IG1vZGFsO1xuICAgIHJldHVybiBtb2RhbDtcbiAgfVxufVxuIl0sIm5hbWVzIjpbIlFVSUNLX1NXSVRDSEVSX0lEIiwiTW9kZSIsIlN0YW5kYXJkIiwiRWRpdG9yTGlzdCIsIlN5bWJvbExpc3QiLCJTeW1ib2xUeXBlIiwiTGluayIsIkVtYmVkIiwiVGFnIiwiSGVhZGluZyIsIlN5bWJvbEluZGljYXRvcnMiLCJSZWZlcmVuY2VWaWV3cyIsIkNvbmZpZyIsImVkaXRvckxpc3RDb21tYW5kIiwic3ltYm9sTGlzdENvbW1hbmQiLCJleGNsdWRlVmlld1R5cGVzIiwiU2V0dGluZ3MiLCJhbHdheXNOZXdQYW5lRm9yU3ltYm9scyIsImRhdGEiLCJ2YWwiLCJ2YWx1ZSIsImdldERlZmF1bHREYXRhIiwiY29uc3RydWN0b3IiLCJwbHVnaW4iLCJsb2FkU2V0dGluZ3MiLCJsb2FkRGF0YSIsInNhdmVTZXR0aW5ncyIsInNhdmVEYXRhIiwiU2V0dGluZ1RhYiIsIlBsdWdpblNldHRpbmdUYWIiLCJhcHAiLCJkaXNwbGF5IiwiY29udGFpbmVyRWwiLCJzZXR0aW5ncyIsImVtcHR5Iiwic2V0QWx3YXlzTmV3UGFuZUZvclN5bWJvbHMiLCJTZXR0aW5nIiwic2V0TmFtZSIsInNldERlc2MiLCJhZGRUb2dnbGUiLCJ0b2dnbGUiLCJzZXRWYWx1ZSIsIm9uQ2hhbmdlIiwiaW5kaWNhdG9yU3R5bGUiLCJFeE1vZGVIYW5kbGVyIiwiRnV6enlTdWdnZXN0TW9kYWwiLCJtb2RlIiwiX21vZGUiLCJzeW1ib2xUYXJnZXQiLCJzZXNzaW9uV2l0aE1vZGUiLCJwYXJzZUlucHV0IiwiaW5wdXQiLCJjdXJyZW50U3VnZ2VzdGlvbiIsImhhc0VkaXRvckNtZFByZWZpeCIsImluZGV4T2YiLCJzeW1ib2xDbWRJbmRleCIsImhhc1N5bWJvbENtZCIsImhhc1N5bWJvbENtZFByZWZpeCIsInNlbGVjdGVkU3VnZ0luZm8iLCJnZXRTZWxlY3RlZFN1Z2dJbmZvIiwiYWN0aXZlRWRpdG9ySW5mbyIsImdldEFjdGl2ZUVkaXRvckluZm8iLCJpc1N1Z2dWYWxpZFN5bWJvbFRhcmdldCIsImRldGVybWluZVJ1bk1vZGUiLCJ3b3Jrc3BhY2UiLCJ2aWV3IiwiZmlsZSIsImN1cnJlbnRFZGl0b3JGaWxlIiwiYWN0aXZlTGVhZiIsImlzQ3VycmVudEVkaXRvclZhbGlkIiwiaW5jbHVkZXMiLCJnZXRWaWV3VHlwZSIsImlzRWRpdG9yVmFsaWRTeW1ib2xUYXJnZXQiLCJjdXJyZW50RWRpdG9yIiwiYWN0aXZlU3VnZyIsInRhcmdldCIsImdldFN1Z2dlc3Rpb25UYXJnZXQiLCJzeW1ib2wiLCJoYXNFeGlzdGluZ1N5bWJvbFRhcmdldCIsInN1Z2dlc3Rpb24iLCJpdGVtIiwiZXh0cmFjdFNlYXJjaFF1ZXJ5Iiwic3RhcnRJbmRleCIsImxlbmd0aCIsInNsaWNlIiwidHJpbSIsInRvTG93ZXJDYXNlIiwiZ2V0U3VnZ2VzdGlvbnMiLCJxdWVyeSIsImdldEl0ZW1zIiwiaXRlbXMiLCJnZXRPcGVuUm9vdFNwbGl0cyIsImdldFN5bWJvbHNGb3JUYXJnZXQiLCJsZWF2ZXMiLCJzYXZlTGVhZiIsImwiLCJwdXNoIiwiaXRlcmF0ZUxlYXZlcyIsInJvb3RTcGxpdCIsInJldCIsIm1ldGFkYXRhQ2FjaGUiLCJ0eXBlIiwibWRGaWxlIiwiZmlsZUNhY2hlIiwicGF0aCIsInN5bWJvbERhdGEiLCJoYXNoIiwic3ltYm9scyIsImZvckVhY2giLCJoZWFkaW5ncyIsInRhZ3MiLCJsaW5rcyIsImVtYmVkcyIsImdldEl0ZW1UZXh0IiwidGV4dCIsImdldFN1Z2dlc3Rpb25UZXh0Rm9yU3ltYm9sIiwiZ2V0RGlzcGxheVRleHQiLCJoZWFkaW5nIiwidGFnIiwibGluayIsImRpc3BsYXlUZXh0Iiwib25DaG9vc2VTdWdnZXN0aW9uIiwic3VnZ2VzdGlvbkl0ZW0iLCJldnQiLCJzZXRBY3RpdmVMZWFmIiwic2V0RXBoZW1lcmFsU3RhdGUiLCJmb2N1cyIsIm5hdmlnYXRlVG9TeW1ib2wiLCJsZWFmIiwidGFyZ2V0RmlsZVBhdGgiLCJmaW5kT3BlbkVkaXRvck1hdGNoaW5nU3ltYm9sVGFyZ2V0Iiwic3RhcnQiLCJsaW5lIiwib2Zmc2V0Iiwic3RhcnRQb3MiLCJlbmQiLCJlbmRQb3MiLCJwb3NpdGlvbiIsImVTdGF0ZSIsIm9wZW5MaW5rVGV4dCIsImlzVGFyZ2V0TGVhZiIsInByZWRpY2F0ZSIsImlzTGVhZlJlZlZpZXciLCJpc1RhcmdldFJlZlZpZXciLCJmaW5kIiwicmVuZGVyU3VnZ2VzdGlvbiIsInN1Z2ciLCJwYXJlbnRFbCIsInVwZGF0ZVN1Z2dlc3Rpb25FbEZvck1vZGUiLCJpbmRpY2F0b3IiLCJsZXZlbCIsImluZGljYXRvckVsIiwiY3JlYXRlRWwiLCJhdHRyIiwic3R5bGUiLCJpbnNlcnRBZGphY2VudEVsZW1lbnQiLCJnZXRRdWlja1N3aXRjaGVyIiwic3dpdGNoZXIiLCJpbnRlcm5hbFBsdWdpbnMiLCJnZXRQbHVnaW5CeUlkIiwiaW5zdGFuY2UiLCJtb2RhbCIsIlF1aWNrU3dpdGNoZXIiLCJTd2l0Y2hlclBsdXMiLCJhcHBPYmoiLCJzZXR0aW5nc09iaiIsImV4TW9kZSIsInNjb3BlIiwicmVnaXN0ZXJLZXkiLCJuZXh0SXRlbSIsImJpbmQiLCJjaG9vc2VyIiwicHJldmlvdXNJdGVtIiwiaXNPcGVuIiwic2V0U2VsZWN0ZWRJdGVtIiwic2VsZWN0ZWRJdGVtIiwib3BlbkluTW9kZSIsIm9wZW4iLCJvbk9wZW4iLCJzZXRTdWdnZXN0aW9ucyIsImlucHV0RWwiLCJvbklucHV0IiwidmFsdWVzIiwidXBkYXRlSGVscGVyVGV4dEZvck1vZGUiLCJ1cGRhdGVLZXltYXBGb3JNb2RlIiwidXBkYXRlU3VnZ2VzdGlvbnMiLCJzZWxlY3RvciIsImVsIiwicXVlcnlTZWxlY3RvciIsImtleXMiLCJiYWNrdXBLZXlzIiwia2V5IiwidW5kZWZpbmVkIiwiaSIsIm1vZGlmaWVycyIsInNwbGljZSIsInN1Z2dlc3Rpb25zIiwiU3dpdGNoZXJQbHVzUGx1Z2luIiwiUGx1Z2luIiwib25sb2FkIiwiYWRkU2V0dGluZ1RhYiIsInJlZ2lzdGVyQ29tbWFuZCIsIm9udW5sb2FkIiwiaWQiLCJuYW1lIiwiYWRkQ29tbWFuZCIsImhvdGtleXMiLCJjaGVja0NhbGxiYWNrIiwiY2hlY2tpbmciLCJnZXRNb2RhbCIsImNyZWF0ZVN3aXRjaGVyUGx1c01vZGFsIl0sIm1hcHBpbmdzIjoiOzs7O0FBQU8sTUFBTUEsaUJBQWlCLEdBQUcsVUFBMUI7O0FBR0EsTUFBTUMsSUFBSSxHQUFHO0FBQ2xCQyxFQUFBQSxRQUFRLEVBQUUsQ0FEUTtBQUVsQkMsRUFBQUEsVUFBVSxFQUFFLENBRk07QUFHbEJDLEVBQUFBLFVBQVUsRUFBRTtBQUhNLENBQWI7QUFNQSxNQUFNQyxVQUFVLEdBQUc7QUFDeEJDLEVBQUFBLElBQUksRUFBRSxDQURrQjtBQUV4QkMsRUFBQUEsS0FBSyxFQUFFLENBRmlCO0FBR3hCQyxFQUFBQSxHQUFHLEVBQUUsQ0FIbUI7QUFJeEJDLEVB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
