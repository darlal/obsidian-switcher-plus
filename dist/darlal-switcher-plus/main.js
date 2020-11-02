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

const Settings = {
  // command to enable filtering of open editors
  editorListCommand: 'edt ',
  // command to enable filtering of file symbols
  symbolListCommand: '@',
  // types of open views to hide from the suggestion list
  excludeViewTypes: ['empty'],
  // true to always open a new pane when navigating to a Symbol
  alwaysNewPaneForSymbols: false,
  // true to both highligh the symbol for navigation and have
  // the editor focused, and ready for input
  focusEditorOnSymbolNavigation: false
};

const indicatorStyle = 'color: var(--text-accent); width: 2.5em; text-align: center; float:left; font-weight:800;';

function getQuickSwitcher(app) {
  const switcher = app.internalPlugins.getPluginById(QUICK_SWITCHER_ID);

  if (!switcher) {
    return null;
  }

  return switcher.instance.modal.constructor;
}

var createSwitcherPlusModal = (app => {
  const QuickSwitcher = getQuickSwitcher(app);

  if (QuickSwitcher === null) {
    return null;
  }

  class SwitcherPlus extends QuickSwitcher {
    constructor(appObj) {
      super(appObj);
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
        val = Settings.editorListCommand;
      } else if (mode === Mode.SymbolList) {
        val = Settings.symbolListCommand; // force reset suggestions so any suggestions from a previous operation
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
      } = Settings;
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
      } = Settings; // determine if the current active editor pane is valid

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
      } = Settings;
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
        if (!Settings.excludeViewTypes.includes(l.view.getViewType())) {
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
          col: ch,
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
        line
      };

      if (leaf && !Settings.alwaysNewPaneForSymbols) {
        // activate the already open pane, and set state
        workspace.setActiveLeaf(leaf, true);
        leaf.view.setEphemeralState(eState);
      } else {
        eState.focus = true;
        workspace.openLinkText(targetFilePath, '', false, {
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

  return new SwitcherPlus(app);
});

/* eslint-disable import/no-unresolved */
class SwitcherPlusPlugin extends obsidian.Plugin {
  onload() {
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
        const modal = this.getModal(this.app);

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

  getModal(app) {
    let {
      modal
    } = this;

    if (modal) {
      return modal;
    }

    modal = createSwitcherPlusModal(app);
    this.modal = modal;
    return modal;
  }

}

module.exports = SwitcherPlusPlugin;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL21vZHVsZXMvY29uc3RhbnRzLmpzIiwiLi4vLi4vc3JjL21vZHVsZXMvc2V0dGluZ3MuanMiLCIuLi8uLi9zcmMvbW9kdWxlcy9zd2l0Y2hlclBsdXMuanMiLCIuLi8uLi9zcmMvbWFpbi5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgY29uc3QgUVVJQ0tfU1dJVENIRVJfSUQgPSAnc3dpdGNoZXInO1xuXG4vLyBTd2l0Y2hlciBtb2RlcyBvZiBvcGVyYXRpb25cbmV4cG9ydCBjb25zdCBNb2RlID0ge1xuICBTdGFuZGFyZDogMSxcbiAgRWRpdG9yTGlzdDogMixcbiAgU3ltYm9sTGlzdDogNCxcbn07XG5cbmV4cG9ydCBjb25zdCBTeW1ib2xUeXBlID0ge1xuICBMaW5rOiAxLFxuICBFbWJlZDogMixcbiAgVGFnOiA0LFxuICBIZWFkaW5nOiA4LFxufTtcblxuZXhwb3J0IGNvbnN0IFN5bWJvbEluZGljYXRvcnMgPSB7fTtcblN5bWJvbEluZGljYXRvcnNbU3ltYm9sVHlwZS5MaW5rXSA9ICfwn5SXJztcblN5bWJvbEluZGljYXRvcnNbU3ltYm9sVHlwZS5FbWJlZF0gPSAnISc7XG5TeW1ib2xJbmRpY2F0b3JzW1N5bWJvbFR5cGUuVGFnXSA9ICcjJztcblN5bWJvbEluZGljYXRvcnNbU3ltYm9sVHlwZS5IZWFkaW5nXSA9IHtcbiAgMTogJ0jigoEnLFxuICAyOiAnSOKCgicsXG4gIDM6ICdI4oKDJyxcbiAgNDogJ0jigoQnLFxuICA1OiAnSOKChScsXG4gIDY6ICdI4oKGJyxcbn07XG5cbmV4cG9ydCBjb25zdCBSZWZlcmVuY2VWaWV3cyA9IFsnYmFja2xpbmsnLCAnb3V0bGluZScsICdsb2NhbGdyYXBoJ107XG4iLCJjb25zdCBTZXR0aW5ncyA9IHtcbiAgLy8gY29tbWFuZCB0byBlbmFibGUgZmlsdGVyaW5nIG9mIG9wZW4gZWRpdG9yc1xuICBlZGl0b3JMaXN0Q29tbWFuZDogJ2VkdCAnLFxuICAvLyBjb21tYW5kIHRvIGVuYWJsZSBmaWx0ZXJpbmcgb2YgZmlsZSBzeW1ib2xzXG4gIHN5bWJvbExpc3RDb21tYW5kOiAnQCcsXG4gIC8vIHR5cGVzIG9mIG9wZW4gdmlld3MgdG8gaGlkZSBmcm9tIHRoZSBzdWdnZXN0aW9uIGxpc3RcbiAgZXhjbHVkZVZpZXdUeXBlczogWydlbXB0eSddLFxuICAvLyB0cnVlIHRvIGFsd2F5cyBvcGVuIGEgbmV3IHBhbmUgd2hlbiBuYXZpZ2F0aW5nIHRvIGEgU3ltYm9sXG4gIGFsd2F5c05ld1BhbmVGb3JTeW1ib2xzOiBmYWxzZSxcbiAgLy8gdHJ1ZSB0byBib3RoIGhpZ2hsaWdoIHRoZSBzeW1ib2wgZm9yIG5hdmlnYXRpb24gYW5kIGhhdmVcbiAgLy8gdGhlIGVkaXRvciBmb2N1c2VkLCBhbmQgcmVhZHkgZm9yIGlucHV0XG4gIGZvY3VzRWRpdG9yT25TeW1ib2xOYXZpZ2F0aW9uOiBmYWxzZSxcbn07XG5cbmV4cG9ydCB7IFNldHRpbmdzIGFzIGRlZmF1bHQgfTtcbiIsImltcG9ydCB7XG4gIFFVSUNLX1NXSVRDSEVSX0lELFxuICBNb2RlLFxuICBTeW1ib2xUeXBlLFxuICBTeW1ib2xJbmRpY2F0b3JzLFxuICBSZWZlcmVuY2VWaWV3cyxcbn0gZnJvbSAnLi9jb25zdGFudHMnO1xuaW1wb3J0IFNldHRpbmdzIGZyb20gJy4vc2V0dGluZ3MnO1xuXG5jb25zdCBpbmRpY2F0b3JTdHlsZSA9ICdjb2xvcjogdmFyKC0tdGV4dC1hY2NlbnQpOyB3aWR0aDogMi41ZW07IHRleHQtYWxpZ246IGNlbnRlcjsgZmxvYXQ6bGVmdDsgZm9udC13ZWlnaHQ6ODAwOyc7XG5cbmZ1bmN0aW9uIGdldFF1aWNrU3dpdGNoZXIoYXBwKSB7XG4gIGNvbnN0IHN3aXRjaGVyID0gYXBwLmludGVybmFsUGx1Z2lucy5nZXRQbHVnaW5CeUlkKFFVSUNLX1NXSVRDSEVSX0lEKTtcbiAgaWYgKCFzd2l0Y2hlcikgeyByZXR1cm4gbnVsbDsgfVxuXG4gIHJldHVybiBzd2l0Y2hlci5pbnN0YW5jZS5tb2RhbC5jb25zdHJ1Y3Rvcjtcbn1cblxuZXhwb3J0IGRlZmF1bHQgKGFwcCkgPT4ge1xuICBjb25zdCBRdWlja1N3aXRjaGVyID0gZ2V0UXVpY2tTd2l0Y2hlcihhcHApO1xuICBpZiAoUXVpY2tTd2l0Y2hlciA9PT0gbnVsbCkgeyByZXR1cm4gbnVsbDsgfVxuXG4gIGNsYXNzIFN3aXRjaGVyUGx1cyBleHRlbmRzIFF1aWNrU3dpdGNoZXIge1xuICAgIGNvbnN0cnVjdG9yKGFwcE9iaikge1xuICAgICAgc3VwZXIoYXBwT2JqKTtcblxuICAgICAgdGhpcy5tb2RlID0gTW9kZS5TdGFuZGFyZDtcbiAgICAgIHRoaXMuc3ltYm9sVGFyZ2V0ID0gbnVsbDtcblxuICAgICAgdGhpcy5zY29wZS5yZWdpc3RlcktleShbJ0N0cmwnXSwgJ24nLCB0aGlzLm5leHRJdGVtLmJpbmQodGhpcy5jaG9vc2VyKSk7XG4gICAgICB0aGlzLnNjb3BlLnJlZ2lzdGVyS2V5KFsnQ3RybCddLCAncCcsIHRoaXMucHJldmlvdXNJdGVtLmJpbmQodGhpcy5jaG9vc2VyKSk7XG4gICAgfVxuXG4gICAgcHJldmlvdXNJdGVtKCkge1xuICAgICAgaWYgKHRoaXMuY2hvb3Nlci5pc09wZW4pIHtcbiAgICAgICAgdGhpcy5zZXRTZWxlY3RlZEl0ZW0odGhpcy5zZWxlY3RlZEl0ZW0gLSAxLCB0cnVlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBuZXh0SXRlbSgpIHtcbiAgICAgIGlmICh0aGlzLmNob29zZXIuaXNPcGVuKSB7XG4gICAgICAgIHRoaXMuc2V0U2VsZWN0ZWRJdGVtKHRoaXMuc2VsZWN0ZWRJdGVtICsgMSwgdHJ1ZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgb3BlbkluTW9kZShtb2RlKSB7XG4gICAgICB0aGlzLm1vZGUgPSBtb2RlIHx8IE1vZGUuU3RhbmRhcmQ7XG4gICAgICB0aGlzLm9wZW4oKTtcbiAgICB9XG5cbiAgICBvbk9wZW4oKSB7XG4gICAgICBsZXQgdmFsID0gJyc7XG4gICAgICBjb25zdCB7IG1vZGUgfSA9IHRoaXM7XG5cbiAgICAgIGlmIChtb2RlID09PSBNb2RlLkVkaXRvckxpc3QpIHtcbiAgICAgICAgdmFsID0gU2V0dGluZ3MuZWRpdG9yTGlzdENvbW1hbmQ7XG4gICAgICB9IGVsc2UgaWYgKG1vZGUgPT09IE1vZGUuU3ltYm9sTGlzdCkge1xuICAgICAgICB2YWwgPSBTZXR0aW5ncy5zeW1ib2xMaXN0Q29tbWFuZDtcblxuICAgICAgICAvLyBmb3JjZSByZXNldCBzdWdnZXN0aW9ucyBzbyBhbnkgc3VnZ2VzdGlvbnMgZnJvbSBhIHByZXZpb3VzIG9wZXJhdGlvblxuICAgICAgICAvLyB3b24ndCBiZSBpbmNvcnJlY3RseSB1c2VkIGZvciBzeW1ib2wgc2VhcmNoXG4gICAgICAgIHRoaXMuY2hvb3Nlci5zZXRTdWdnZXN0aW9ucyhbXSk7XG4gICAgICAgIHRoaXMuc3ltYm9sVGFyZ2V0ID0gbnVsbDtcbiAgICAgIH1cblxuICAgICAgdGhpcy5pc09wZW4gPSB0cnVlO1xuICAgICAgdGhpcy5pbnB1dEVsLnZhbHVlID0gdmFsO1xuICAgICAgdGhpcy5pbnB1dEVsLmZvY3VzKCk7XG4gICAgICB0aGlzLm9uSW5wdXQoKTtcbiAgICB9XG5cbiAgICBvbklucHV0KCkge1xuICAgICAgY29uc3QgeyBtb2RlLCBzeW1ib2xUYXJnZXQgfSA9IHRoaXMucGFyc2VJbnB1dCgpO1xuXG4gICAgICB0aGlzLnN5bWJvbFRhcmdldCA9IHN5bWJvbFRhcmdldDtcbiAgICAgIHRoaXMubW9kZSA9IG1vZGU7XG4gICAgICB0aGlzLnVwZGF0ZUhlbHBlclRleHRGb3JNb2RlKG1vZGUpO1xuICAgICAgdGhpcy51cGRhdGVLZXltYXBGb3JNb2RlKG1vZGUpO1xuICAgICAgdGhpcy51cGRhdGVTdWdnZXN0aW9ucygpO1xuICAgIH1cblxuICAgIHBhcnNlSW5wdXQoKSB7XG4gICAgICBjb25zdCB7IGVkaXRvckxpc3RDb21tYW5kLCBzeW1ib2xMaXN0Q29tbWFuZCB9ID0gU2V0dGluZ3M7XG4gICAgICBjb25zdCB7IGlucHV0RWw6IHsgdmFsdWUgfSB9ID0gdGhpcztcblxuICAgICAgLy8gZGV0ZXJtaW5lIGlmIHRoZSBlZGl0b3IgY29tbWFuZCBleGlzdHMgYW5kIGlmIGl0J3MgdmFsaWRcbiAgICAgIGNvbnN0IGhhc0VkaXRvckNtZFByZWZpeCA9IHZhbHVlLmluZGV4T2YoZWRpdG9yTGlzdENvbW1hbmQpID09PSAwO1xuXG4gICAgICAvLyBnZXQgdGhlIGluZGV4IG9mIHN5bWJvbCBjb21tYW5kIGFuZCBkZXRlcm1pbmUgaWYgaXQgZXhpc3RzXG4gICAgICBjb25zdCBzeW1ib2xDbWRJbmRleCA9IHZhbHVlLmluZGV4T2Yoc3ltYm9sTGlzdENvbW1hbmQpO1xuICAgICAgY29uc3QgaGFzU3ltYm9sQ21kID0gc3ltYm9sQ21kSW5kZXggIT09IC0xO1xuICAgICAgY29uc3QgaGFzU3ltYm9sQ21kUHJlZml4ID0gc3ltYm9sQ21kSW5kZXggPT09IDA7XG5cbiAgICAgIC8vIGRldGVybWluZSBpZiB0aGUgY2hvb3NlciBpcyBzaG93aW5nIHN1Z2dlc3Rpb25zLCBhbmQgaWYgc28sIGlzIHRoZVxuICAgICAgLy8gY3VycmVudGx5IHNlbGVjdGVkIHN1Z2dlc3Rpb24gYSB2YWxpZCB0YXJnZXQgZm9yIHN5bWJvbHNcbiAgICAgIGNvbnN0IHNlbGVjdGVkU3VnZ0luZm8gPSB0aGlzLmdldFNlbGVjdGVkU3VnZ0luZm8oaGFzU3ltYm9sQ21kKTtcblxuICAgICAgLy8gZGV0ZXJtaW5lIGlmIHRoZSBjdXJyZW50IGFjdGl2ZSBlZGl0b3IgcGFuZSBhIHZhbGlkIHRhcmdldCBmb3Igc3ltYm9sc1xuICAgICAgY29uc3QgYWN0aXZlRWRpdG9ySW5mbyA9IHRoaXMuZ2V0QWN0aXZlRWRpdG9ySW5mbyhoYXNTeW1ib2xDbWRQcmVmaXgsXG4gICAgICAgIHNlbGVjdGVkU3VnZ0luZm8uaXNTdWdnVmFsaWRTeW1ib2xUYXJnZXQpO1xuXG4gICAgICByZXR1cm4gdGhpcy5kZXRlcm1pbmVSdW5Nb2RlKGhhc0VkaXRvckNtZFByZWZpeCwgaGFzU3ltYm9sQ21kLFxuICAgICAgICBzZWxlY3RlZFN1Z2dJbmZvLCBhY3RpdmVFZGl0b3JJbmZvKTtcbiAgICB9XG5cbiAgICBnZXRBY3RpdmVFZGl0b3JJbmZvKGhhc1N5bWJvbENtZFByZWZpeCwgaXNTdWdnVmFsaWRTeW1ib2xUYXJnZXQpIHtcbiAgICAgIGNvbnN0IHsgd29ya3NwYWNlIH0gPSB0aGlzLmFwcDtcbiAgICAgIGNvbnN0IHsgZXhjbHVkZVZpZXdUeXBlcyB9ID0gU2V0dGluZ3M7XG5cbiAgICAgIC8vIGRldGVybWluZSBpZiB0aGUgY3VycmVudCBhY3RpdmUgZWRpdG9yIHBhbmUgaXMgdmFsaWRcbiAgICAgIGNvbnN0IHsgdmlldywgdmlldzogeyBmaWxlOiBjdXJyZW50RWRpdG9yRmlsZSB9IH0gPSB3b3Jrc3BhY2UuYWN0aXZlTGVhZjtcbiAgICAgIGNvbnN0IGlzQ3VycmVudEVkaXRvclZhbGlkID0gIWV4Y2x1ZGVWaWV3VHlwZXMuaW5jbHVkZXModmlldy5nZXRWaWV3VHlwZSgpKTtcblxuICAgICAgLy8gd2hldGhlciBvciBub3QgdGhlIGN1cnJlbnQgYWN0aXZlIGVkaXRvciBjYW4gYmUgdXNlZCBhcyB0aGUgdGFyZ2V0IGZvclxuICAgICAgLy8gc3ltYm9sIHNlYXJjaFxuICAgICAgY29uc3QgaXNFZGl0b3JWYWxpZFN5bWJvbFRhcmdldCA9IGhhc1N5bWJvbENtZFByZWZpeCAmJiAhaXNTdWdnVmFsaWRTeW1ib2xUYXJnZXRcbiAgICAgICAgJiYgaXNDdXJyZW50RWRpdG9yVmFsaWQgJiYgISFjdXJyZW50RWRpdG9yRmlsZTtcblxuICAgICAgcmV0dXJuIHsgaXNFZGl0b3JWYWxpZFN5bWJvbFRhcmdldCwgY3VycmVudEVkaXRvcjogd29ya3NwYWNlLmFjdGl2ZUxlYWYgfTtcbiAgICB9XG5cbiAgICBnZXRTZWxlY3RlZFN1Z2dJbmZvKGhhc1N5bWJvbENtZCkge1xuICAgICAgbGV0IGN1cnJlbnRTdWdnZXN0aW9uID0gbnVsbDtcblxuICAgICAgaWYgKGhhc1N5bWJvbENtZCkge1xuICAgICAgICBjb25zdCB7IGNob29zZXIgfSA9IHRoaXM7XG4gICAgICAgIGN1cnJlbnRTdWdnZXN0aW9uID0gY2hvb3Nlci52YWx1ZXNbY2hvb3Nlci5zZWxlY3RlZEl0ZW1dO1xuXG4gICAgICAgIC8vIGRldGVybWluZSBpZiB0aGVyZSBpcyBhIGN1cnJlbnQgc3VnZ2VzdGlvbiB0aGF0IGNhbiBiZSB1c2VkIGFzIHRoZVxuICAgICAgICAvLyB0YXJnZXQgZm9yIHN5bWJvbCBzZWFyY2guIFRoaXMgbWVhbnMgdGhlIHN1Z2dlc3Rpb24gaGFzIHRvIHBvaW50IHRvXG4gICAgICAgIC8vIGEgZmlsZVxuICAgICAgICBpZiAoY3VycmVudFN1Z2dlc3Rpb25cbiAgICAgICAgICAmJiAoIWN1cnJlbnRTdWdnZXN0aW9uLml0ZW0gfHwgY3VycmVudFN1Z2dlc3Rpb24udHlwZSA9PT0gTW9kZS5TeW1ib2xMaXN0KSkge1xuICAgICAgICAgIC8vIHN5bWJvbCBzdWdnZXN0aW9ucyBkb24ndCBwb2ludCB0byBhIGZpbGVcbiAgICAgICAgICBjdXJyZW50U3VnZ2VzdGlvbiA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gd2hldGhlciBvciBub3QgdGhlIGN1cnJlbnQgc3VnZ2VzdGlvbiBjYW4gYmUgdXNlZCBmb3Igc3ltYm9sIHNlYXJjaFxuICAgICAgY29uc3QgaXNTdWdnVmFsaWRTeW1ib2xUYXJnZXQgPSAhIWN1cnJlbnRTdWdnZXN0aW9uO1xuICAgICAgcmV0dXJuIHsgY3VycmVudFN1Z2dlc3Rpb24sIGlzU3VnZ1ZhbGlkU3ltYm9sVGFyZ2V0IH07XG4gICAgfVxuXG4gICAgZGV0ZXJtaW5lUnVuTW9kZShoYXNFZGl0b3JDbWRQcmVmaXgsIGhhc1N5bWJvbENtZCwgc2VsZWN0ZWRTdWdnSW5mbywgYWN0aXZlRWRpdG9ySW5mbykge1xuICAgICAgbGV0IHsgbW9kZSwgc3ltYm9sVGFyZ2V0IH0gPSB0aGlzO1xuXG4gICAgICAvLyB3ZXRoZXIgb3Igbm90IGEgc3ltYm9sIHRhcmdldCBmaWxlIGV4aXN0cy4gSW5kaWNhdGVzIHRoYXQgdGhlIHByZXZpb3VzXG4gICAgICAvLyBvcGVyYXRpb24gd2FzIGEgc3ltYm9sIG9wZXJhdGlvblxuICAgICAgY29uc3QgaGFzRXhpc3RpbmdTeW1ib2xUYXJnZXQgPSBtb2RlID09PSBNb2RlLlN5bWJvbExpc3QgJiYgISFzeW1ib2xUYXJnZXQ7XG5cbiAgICAgIGlmIChoYXNTeW1ib2xDbWQpIHtcbiAgICAgICAgbW9kZSA9IE1vZGUuU3ltYm9sTGlzdDtcblxuICAgICAgICBpZiAoc2VsZWN0ZWRTdWdnSW5mby5pc1N1Z2dWYWxpZFN5bWJvbFRhcmdldCkge1xuICAgICAgICAgIHN5bWJvbFRhcmdldCA9IHNlbGVjdGVkU3VnZ0luZm8uY3VycmVudFN1Z2dlc3Rpb24uaXRlbTtcbiAgICAgICAgfSBlbHNlIGlmICghaGFzRXhpc3RpbmdTeW1ib2xUYXJnZXQgJiYgYWN0aXZlRWRpdG9ySW5mby5pc0VkaXRvclZhbGlkU3ltYm9sVGFyZ2V0KSB7XG4gICAgICAgICAgc3ltYm9sVGFyZ2V0ID0gYWN0aXZlRWRpdG9ySW5mby5jdXJyZW50RWRpdG9yO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKGhhc0VkaXRvckNtZFByZWZpeCkge1xuICAgICAgICBtb2RlID0gTW9kZS5FZGl0b3JMaXN0O1xuICAgICAgICBzeW1ib2xUYXJnZXQgPSBudWxsO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbW9kZSA9IE1vZGUuU3RhbmRhcmQ7XG4gICAgICAgIHN5bWJvbFRhcmdldCA9IG51bGw7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB7IG1vZGUsIHN5bWJvbFRhcmdldCB9O1xuICAgIH1cblxuICAgIHVwZGF0ZUhlbHBlclRleHRGb3JNb2RlKG1vZGUpIHtcbiAgICAgIGNvbnN0IHsgY29udGFpbmVyRWwgfSA9IHRoaXM7XG4gICAgICBjb25zdCBzZWxlY3RvciA9ICcucHJvbXB0LWluc3RydWN0aW9ucyc7XG5cbiAgICAgIGNvbnN0IGVsID0gY29udGFpbmVyRWwucXVlcnlTZWxlY3RvcihzZWxlY3Rvcik7XG4gICAgICBpZiAoZWwpIHsgZWwuc3R5bGUuZGlzcGxheSA9IG1vZGUgPT09IE1vZGUuU3RhbmRhcmQgPyAnJyA6ICdub25lJzsgfVxuICAgIH1cblxuICAgIHVwZGF0ZUtleW1hcEZvck1vZGUobW9kZSkge1xuICAgICAgY29uc3QgeyBzY29wZTogeyBrZXlzIH0gfSA9IHRoaXM7XG4gICAgICBsZXQgeyBiYWNrdXBLZXlzID0gW10gfSA9IHRoaXM7XG5cbiAgICAgIGlmIChtb2RlID09PSBNb2RlLlN0YW5kYXJkKSB7XG4gICAgICAgIGlmIChiYWNrdXBLZXlzLmxlbmd0aCkgeyBiYWNrdXBLZXlzLmZvckVhY2goKGtleSkgPT4ga2V5cy5wdXNoKGtleSkpOyB9XG4gICAgICAgIGJhY2t1cEtleXMgPSB1bmRlZmluZWQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyB1bnJlZ2lzdGVyIHVudXNlZCBob3RrZXlzIGZvciBjdXN0b20gbW9kZXNcbiAgICAgICAgZm9yIChsZXQgaSA9IGtleXMubGVuZ3RoIC0gMTsgaSA+PSAwOyAtLWkpIHtcbiAgICAgICAgICBjb25zdCBrZXkgPSBrZXlzW2ldO1xuXG4gICAgICAgICAgaWYgKGtleS5rZXkgPT09ICdFbnRlcidcbiAgICAgICAgICAgICYmIChrZXkubW9kaWZpZXJzID09PSAnTWV0YScgfHwga2V5Lm1vZGlmaWVycyA9PT0gJ1NoaWZ0JykpIHtcbiAgICAgICAgICAgIGtleXMuc3BsaWNlKGksIDEpO1xuICAgICAgICAgICAgYmFja3VwS2V5cy5wdXNoKGtleSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHRoaXMuYmFja3VwS2V5cyA9IGJhY2t1cEtleXM7XG4gICAgfVxuXG4gICAgZ2V0U2VhcmNoRGF0YSgpIHtcbiAgICAgIGNvbnN0IHsgbW9kZSwgaW5wdXRFbDogeyB2YWx1ZSB9IH0gPSB0aGlzO1xuICAgICAgY29uc3QgeyBlZGl0b3JMaXN0Q29tbWFuZCwgc3ltYm9sTGlzdENvbW1hbmQgfSA9IFNldHRpbmdzO1xuICAgICAgbGV0IHN0YXJ0SW5kZXggPSAwO1xuXG4gICAgICBpZiAobW9kZSA9PT0gTW9kZS5TeW1ib2xMaXN0KSB7XG4gICAgICAgIGNvbnN0IHN5bWJvbENtZEluZGV4ID0gdmFsdWUuaW5kZXhPZihzeW1ib2xMaXN0Q29tbWFuZCk7XG4gICAgICAgIHN0YXJ0SW5kZXggPSBzeW1ib2xDbWRJbmRleCArIHN5bWJvbExpc3RDb21tYW5kLmxlbmd0aDtcbiAgICAgIH0gZWxzZSBpZiAobW9kZSA9PT0gTW9kZS5FZGl0b3JMaXN0KSB7XG4gICAgICAgIHN0YXJ0SW5kZXggPSBlZGl0b3JMaXN0Q29tbWFuZC5sZW5ndGg7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBTd2l0Y2hlclBsdXMuZXh0cmFjdFRva2Vucyh2YWx1ZSwgc3RhcnRJbmRleCk7XG4gICAgfVxuXG4gICAgc3RhdGljIGV4dHJhY3RUb2tlbnMoc3RyLCBzdGFydEluZGV4ID0gMCkge1xuICAgICAgLy8gc2hhbWVsZXNzbHkgc3RvbGVuIGRpcmVjdGx5IGZyb20gT2JzaWRpYW5cbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby11c2VsZXNzLWVzY2FwZVxuICAgICAgY29uc3QgcCA9IC9bXFx1MjAwMC1cXHUyMDZGXFx1MkUwMC1cXHUyRTdGXFxcXCchXCIjJCUmKCkqKyxcXC0uXFwvOjs8PT4/QFxcW1xcXV5fYHt8fX5dLztcbiAgICAgIGNvbnN0IHUgPSAvW1xcdTMwNDAtXFx1MzBmZlxcdTM0MDAtXFx1NGRiZlxcdTRlMDAtXFx1OWZmZlxcdWY5MDAtXFx1ZmFmZlxcdWZmNjYtXFx1ZmY5Zl0vO1xuICAgICAgY29uc3QgYiA9IC9cXHMvO1xuICAgICAgY29uc3QgcXVlcnkgPSBzdHIuc2xpY2Uoc3RhcnRJbmRleCkudG9Mb3dlckNhc2UoKTtcbiAgICAgIGNvbnN0IHRva2VucyA9IFtdO1xuICAgICAgbGV0IHBvcyA9IDA7XG5cbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcXVlcnkubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY29uc3QgY2hhciA9IHF1ZXJ5LmNoYXJBdChpKTtcblxuICAgICAgICBpZiAoYi50ZXN0KGNoYXIpKSB7XG4gICAgICAgICAgaWYgKHBvcyAhPT0gaSkgeyB0b2tlbnMucHVzaChxdWVyeS5zbGljZShwb3MsIGkpKTsgfVxuXG4gICAgICAgICAgcG9zID0gaSArIDE7XG4gICAgICAgIH0gZWxzZSBpZiAocC50ZXN0KGNoYXIpIHx8IHUudGVzdChjaGFyKSkge1xuICAgICAgICAgIGlmIChwb3MgIT09IGkpIHsgdG9rZW5zLnB1c2gocXVlcnkuc2xpY2UocG9zLCBpKSk7IH1cblxuICAgICAgICAgIHRva2Vucy5wdXNoKGNoYXIpO1xuICAgICAgICAgIHBvcyA9IGkgKyAxO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmIChwb3MgIT09IHF1ZXJ5Lmxlbmd0aCkgeyB0b2tlbnMucHVzaChxdWVyeS5zbGljZShwb3MsIHF1ZXJ5Lmxlbmd0aCkpOyB9XG5cbiAgICAgIHJldHVybiB7IHF1ZXJ5LCB0b2tlbnMsIGZ1enp5OiBxdWVyeS5zcGxpdCgnJykgfTtcbiAgICB9XG5cbiAgICB1cGRhdGVTdWdnZXN0aW9ucygpIHtcbiAgICAgIGNvbnN0IHsgbW9kZSB9ID0gdGhpcztcblxuICAgICAgaWYgKG1vZGUgPT09IE1vZGUuU3RhbmRhcmQpIHtcbiAgICAgICAgc3VwZXIudXBkYXRlU3VnZ2VzdGlvbnMoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IGl0ZW1zID0gdGhpcy5nZXRJdGVtcygpO1xuICAgICAgICBjb25zdCBzZWFyY2hEYXRhID0gdGhpcy5nZXRTZWFyY2hEYXRhKCk7XG4gICAgICAgIGNvbnN0IHN1Z2dlc3Rpb25zID0gdGhpcy5tYWtlU3VnZ2VzdGlvbnMoaXRlbXMsIHNlYXJjaERhdGEpO1xuXG4gICAgICAgIHRoaXMuY2hvb3Nlci5zZXRTdWdnZXN0aW9ucyhzdWdnZXN0aW9ucyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgbWFrZVN1Z2dlc3Rpb25zKGl0ZW1zID0gW10sIHNlYXJjaERhdGEpIHtcbiAgICAgIGNvbnN0IHN1Z2dlc3Rpb25zID0gW107XG4gICAgICBjb25zdCBoYXNTZWFyY2hUZXJtID0gc2VhcmNoRGF0YS5xdWVyeS5sZW5ndGggPiAwO1xuXG4gICAgICBpdGVtcy5mb3JFYWNoKChpdGVtKSA9PiB7XG4gICAgICAgIGxldCBzdWdnO1xuXG4gICAgICAgIGlmIChoYXNTZWFyY2hUZXJtKSB7XG4gICAgICAgICAgY29uc3QgbWF0Y2ggPSB0aGlzLm1hdGNoKHNlYXJjaERhdGEsIGl0ZW0pO1xuICAgICAgICAgIGlmIChtYXRjaCAhPT0gbnVsbCkgeyBzdWdnID0geyBtYXRjaCB9OyB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgc3VnZyA9IHsgbWF0Y2g6IG51bGwgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChzdWdnKSB7XG4gICAgICAgICAgc3VnZy5pdGVtID0gaXRlbTtcbiAgICAgICAgICBzdWdnLnR5cGUgPSB0aGlzLm1vZGU7XG4gICAgICAgICAgc3VnZ2VzdGlvbnMucHVzaChzdWdnKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIGlmIChoYXNTZWFyY2hUZXJtKSB7IHN1Z2dlc3Rpb25zLnNvcnQoKGEsIGIpID0+IGIubWF0Y2guc2NvcmUgLSBhLm1hdGNoLnNjb3JlKTsgfVxuICAgICAgcmV0dXJuIHN1Z2dlc3Rpb25zO1xuICAgIH1cblxuICAgIGdldFN5bWJvbHNGb3JUYXJnZXQoKSB7XG4gICAgICBjb25zdCByZXQgPSBbXTtcbiAgICAgIGNvbnN0IHsgc3ltYm9sVGFyZ2V0LCBhcHA6IHsgbWV0YWRhdGFDYWNoZSB9IH0gPSB0aGlzO1xuXG4gICAgICBpZiAoc3ltYm9sVGFyZ2V0KSB7XG4gICAgICAgIGxldCBmaWxlID0gc3ltYm9sVGFyZ2V0O1xuXG4gICAgICAgIC8vIGRldGVybWluZSBpZiBzeW1ib2xUYXJnZXQgaXMgYSB3b3Jrc3BhY2UgbGVhZiwgb3IgZmlsZVxuICAgICAgICBpZiAoc3ltYm9sVGFyZ2V0LnR5cGUgPT09ICdsZWFmJyAmJiBzeW1ib2xUYXJnZXQudmlldykge1xuICAgICAgICAgIGZpbGUgPSBzeW1ib2xUYXJnZXQudmlldy5maWxlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGZpbGUpIHtcbiAgICAgICAgICBjb25zdCBtZEZpbGUgPSBtZXRhZGF0YUNhY2hlLmZpbGVDYWNoZVtmaWxlLnBhdGhdO1xuXG4gICAgICAgICAgaWYgKG1kRmlsZSkge1xuICAgICAgICAgICAgY29uc3Qgc3ltYm9sRGF0YSA9IG1ldGFkYXRhQ2FjaGUubWV0YWRhdGFDYWNoZVttZEZpbGUuaGFzaF07XG5cbiAgICAgICAgICAgIGlmIChzeW1ib2xEYXRhKSB7XG4gICAgICAgICAgICAgIGNvbnN0IHB1c2ggPSAoc3ltYm9scyA9IFtdLCB0eXBlKSA9PiB7XG4gICAgICAgICAgICAgICAgc3ltYm9scy5mb3JFYWNoKChzeW1ib2wpID0+IHJldC5wdXNoKHsgc3ltYm9sLCB0eXBlIH0pKTtcbiAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICBwdXNoKHN5bWJvbERhdGEuaGVhZGluZ3MsIFN5bWJvbFR5cGUuSGVhZGluZyk7XG4gICAgICAgICAgICAgIHB1c2goc3ltYm9sRGF0YS50YWdzLCBTeW1ib2xUeXBlLlRhZyk7XG4gICAgICAgICAgICAgIHB1c2goc3ltYm9sRGF0YS5saW5rcywgU3ltYm9sVHlwZS5MaW5rKTtcbiAgICAgICAgICAgICAgcHVzaChzeW1ib2xEYXRhLmVtYmVkcywgU3ltYm9sVHlwZS5FbWJlZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiByZXQ7XG4gICAgfVxuXG4gICAgZ2V0T3BlblJvb3RTcGxpdHMoKSB7XG4gICAgICBjb25zdCB7IHdvcmtzcGFjZSB9ID0gdGhpcy5hcHA7XG4gICAgICBjb25zdCBsZWF2ZXMgPSBbXTtcblxuICAgICAgY29uc3Qgc2F2ZUxlYWYgPSAobCkgPT4ge1xuICAgICAgICBpZiAoIVNldHRpbmdzLmV4Y2x1ZGVWaWV3VHlwZXMuaW5jbHVkZXMobC52aWV3LmdldFZpZXdUeXBlKCkpKSB7XG4gICAgICAgICAgbGVhdmVzLnB1c2gobCk7XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIHdvcmtzcGFjZS5pdGVyYXRlTGVhdmVzKHNhdmVMZWFmLCB3b3Jrc3BhY2Uucm9vdFNwbGl0KTtcbiAgICAgIHJldHVybiBsZWF2ZXM7XG4gICAgfVxuXG4gICAgZ2V0SXRlbXMoKSB7XG4gICAgICBjb25zdCB7IG1vZGUgfSA9IHRoaXM7XG4gICAgICBsZXQgaXRlbXM7XG5cbiAgICAgIGlmIChtb2RlID09PSBNb2RlLkVkaXRvckxpc3QpIHtcbiAgICAgICAgaXRlbXMgPSB0aGlzLmdldE9wZW5Sb290U3BsaXRzKCk7XG4gICAgICB9IGVsc2UgaWYgKG1vZGUgPT09IE1vZGUuU3ltYm9sTGlzdCkge1xuICAgICAgICBpdGVtcyA9IHRoaXMuZ2V0U3ltYm9sc0ZvclRhcmdldCgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaXRlbXMgPSBzdXBlci5nZXRJdGVtcygpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gaXRlbXM7XG4gICAgfVxuXG4gICAgZ2V0SXRlbVRleHQoaXRlbSkge1xuICAgICAgY29uc3QgeyBtb2RlIH0gPSB0aGlzO1xuICAgICAgbGV0IHRleHQ7XG5cbiAgICAgIGlmIChtb2RlID09PSBNb2RlLlN5bWJvbExpc3QpIHtcbiAgICAgICAgdGV4dCA9IFN3aXRjaGVyUGx1cy5nZXRTdWdnZXN0aW9uVGV4dEZvclN5bWJvbChpdGVtKTtcbiAgICAgIH0gZWxzZSBpZiAobW9kZSA9PT0gTW9kZS5FZGl0b3JMaXN0KSB7XG4gICAgICAgIHRleHQgPSB0aGlzLmdldFN1Z2dlc3Rpb25UZXh0Rm9yRWRpdG9yKGl0ZW0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGV4dCA9IHN1cGVyLmdldEl0ZW1UZXh0KGl0ZW0pO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gdGV4dDtcbiAgICB9XG5cbiAgICBzdGF0aWMgZ2V0U3VnZ2VzdGlvblRleHRGb3JTeW1ib2woaXRlbSkge1xuICAgICAgY29uc3QgeyBzeW1ib2wsIHR5cGUgfSA9IGl0ZW07XG4gICAgICBsZXQgdGV4dDtcblxuICAgICAgaWYgKHR5cGUgPT09IFN5bWJvbFR5cGUuSGVhZGluZykge1xuICAgICAgICB0ZXh0ID0gc3ltYm9sLmhlYWRpbmc7XG4gICAgICB9IGVsc2UgaWYgKHR5cGUgPT09IFN5bWJvbFR5cGUuVGFnKSB7XG4gICAgICAgIHRleHQgPSBzeW1ib2wudGFnLnNsaWNlKDEpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgKHsgbGluazogdGV4dCB9ID0gc3ltYm9sKTtcbiAgICAgICAgY29uc3QgeyBkaXNwbGF5VGV4dCB9ID0gc3ltYm9sO1xuXG4gICAgICAgIGlmIChkaXNwbGF5VGV4dCAmJiBkaXNwbGF5VGV4dCAhPT0gdGV4dCkge1xuICAgICAgICAgIHRleHQgKz0gYHwke2Rpc3BsYXlUZXh0fWA7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRleHQ7XG4gICAgfVxuXG4gICAgZ2V0U3VnZ2VzdGlvblRleHRGb3JFZGl0b3IobGVhZikge1xuICAgICAgY29uc3QgeyB2aWV3LCB2aWV3OiB7IGZpbGUgfSB9ID0gbGVhZjtcbiAgICAgIGxldCB0ZXh0O1xuXG4gICAgICBpZiAoIWZpbGUgfHwgUmVmZXJlbmNlVmlld3MuaW5jbHVkZXModmlldy5nZXRWaWV3VHlwZSgpKSkge1xuICAgICAgICB0ZXh0ID0gbGVhZi5nZXREaXNwbGF5VGV4dCgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGV4dCA9IHN1cGVyLmdldEl0ZW1UZXh0KGZpbGUpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gdGV4dDtcbiAgICB9XG5cbiAgICBvbkNob29zZU9wdGlvbihzdWdnZXN0aW9uSXRlbSwgZXZ0KSB7XG4gICAgICBjb25zdCB7IG1vZGUgfSA9IHRoaXM7XG5cbiAgICAgIGlmIChtb2RlID09PSBNb2RlLkVkaXRvckxpc3QpIHtcbiAgICAgICAgdGhpcy5hcHAud29ya3NwYWNlLnNldEFjdGl2ZUxlYWYoc3VnZ2VzdGlvbkl0ZW0pO1xuICAgICAgfSBlbHNlIGlmIChtb2RlID09PSBNb2RlLlN5bWJvbExpc3QpIHtcbiAgICAgICAgdGhpcy5uYXZpZ2F0ZVRvU3ltYm9sKHN1Z2dlc3Rpb25JdGVtKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN1cGVyLm9uQ2hvb3NlT3B0aW9uKHN1Z2dlc3Rpb25JdGVtLCBldnQpO1xuICAgICAgfVxuICAgIH1cblxuICAgIG5hdmlnYXRlVG9TeW1ib2woc3VnZ2VzdGlvbkl0ZW0pIHtcbiAgICAgIGNvbnN0IHsgd29ya3NwYWNlIH0gPSB0aGlzLmFwcDtcblxuICAgICAgLy8gZGV0ZXJtaW5lIGlmIHRoZSB0YXJnZXQgaXMgYWxyZWFkeSBvcGVuIGluIGEgcGFuZVxuICAgICAgY29uc3QgeyBsZWFmLCB0YXJnZXRGaWxlUGF0aCB9ID0gdGhpcy5maW5kT3BlbkVkaXRvck1hdGNoaW5nU3ltYm9sVGFyZ2V0KCk7XG5cbiAgICAgIGNvbnN0IHtcbiAgICAgICAgc3RhcnQ6IHsgbGluZSwgY29sOiBjaCwgb2Zmc2V0OiBzdGFydFBvcyB9LFxuICAgICAgICBlbmQ6IHsgb2Zmc2V0OiBlbmRQb3MgfSxcbiAgICAgIH0gPSBzdWdnZXN0aW9uSXRlbS5zeW1ib2wucG9zaXRpb247XG5cbiAgICAgIC8vIG9iamVjdCBjb250YWluaW5nIHRoZSBzdGF0ZSBpbmZvcm1hdGlvbiBmb3IgdGhlIHRhcmdldCBlZGl0b3IsXG4gICAgICAvLyBzdGFydCB3aXRoIHRoZSByYW5nZSB0byBoaWdobGlnaHQgaW4gdGFyZ2V0IGVkaXRvclxuICAgICAgY29uc3QgZVN0YXRlID0geyBzdGFydFBvcywgZW5kUG9zLCBsaW5lIH07XG5cbiAgICAgIGlmIChTZXR0aW5ncy5mb2N1c0VkaXRvck9uU3ltYm9sTmF2aWdhdGlvbiA9PT0gdHJ1ZSkge1xuICAgICAgICAvLyBzZXQgdGhlIGN1cnNvciBwb3NpdGlvbiB0byBhbiBlbXB0eSBzZWxlY3Rpb24gYXQgdGhlIGJlZ2lubmluZyBvZiBzeW1ib2xcbiAgICAgICAgZVN0YXRlLmN1cnNvciA9IHtcbiAgICAgICAgICBmcm9tOiB7IGxpbmUsIGNoIH0sXG4gICAgICAgICAgdG86IHsgbGluZSwgY2ggfSxcbiAgICAgICAgfTtcbiAgICAgIH1cblxuICAgICAgaWYgKGxlYWYgJiYgIVNldHRpbmdzLmFsd2F5c05ld1BhbmVGb3JTeW1ib2xzKSB7XG4gICAgICAgIC8vIGFjdGl2YXRlIHRoZSBhbHJlYWR5IG9wZW4gcGFuZSwgYW5kIHNldCBzdGF0ZVxuICAgICAgICB3b3Jrc3BhY2Uuc2V0QWN0aXZlTGVhZihsZWFmLCB0cnVlKTtcbiAgICAgICAgbGVhZi52aWV3LnNldEVwaGVtZXJhbFN0YXRlKGVTdGF0ZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBlU3RhdGUuZm9jdXMgPSB0cnVlO1xuICAgICAgICB3b3Jrc3BhY2Uub3BlbkxpbmtUZXh0KHRhcmdldEZpbGVQYXRoLCAnJywgZmFsc2UsIHsgZVN0YXRlIH0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZpbmRPcGVuRWRpdG9yTWF0Y2hpbmdTeW1ib2xUYXJnZXQoKSB7XG4gICAgICBjb25zdCB7IHN5bWJvbFRhcmdldCB9ID0gdGhpcztcbiAgICAgIGNvbnN0IGlzVGFyZ2V0TGVhZiA9IHN5bWJvbFRhcmdldC50eXBlID09PSAnbGVhZic7XG4gICAgICBjb25zdCBmaWxlID0gaXNUYXJnZXRMZWFmID8gc3ltYm9sVGFyZ2V0LnZpZXcuZmlsZSA6IHN5bWJvbFRhcmdldDtcblxuICAgICAgY29uc3QgcHJlZGljYXRlID0gKGxlYWYpID0+IHtcbiAgICAgICAgY29uc3QgaXNMZWFmUmVmVmlldyA9IFJlZmVyZW5jZVZpZXdzLmluY2x1ZGVzKGxlYWYudmlldy5nZXRWaWV3VHlwZSgpKTtcbiAgICAgICAgY29uc3QgaXNUYXJnZXRSZWZWaWV3ID0gaXNUYXJnZXRMZWFmXG4gICAgICAgICAgJiYgUmVmZXJlbmNlVmlld3MuaW5jbHVkZXMoc3ltYm9sVGFyZ2V0LnZpZXcuZ2V0Vmlld1R5cGUoKSk7XG4gICAgICAgIGxldCB2YWwgPSBmYWxzZTtcblxuICAgICAgICBpZiAoIWlzTGVhZlJlZlZpZXcpIHtcbiAgICAgICAgICB2YWwgPSBpc1RhcmdldExlYWYgJiYgIWlzVGFyZ2V0UmVmVmlld1xuICAgICAgICAgICAgPyBsZWFmID09PSBzeW1ib2xUYXJnZXRcbiAgICAgICAgICAgIDogbGVhZi52aWV3LmZpbGUgPT09IGZpbGU7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdmFsO1xuICAgICAgfTtcblxuICAgICAgY29uc3QgbGVhZiA9IHRoaXMuZ2V0T3BlblJvb3RTcGxpdHMoKS5maW5kKHByZWRpY2F0ZSk7XG4gICAgICByZXR1cm4geyBsZWFmLCB0YXJnZXRGaWxlUGF0aDogZmlsZS5wYXRoIH07XG4gICAgfVxuXG4gICAgcmVuZGVyU3VnZ2VzdGlvbihzdWdnLCBwYXJlbnRFbCkge1xuICAgICAgc3VwZXIucmVuZGVyU3VnZ2VzdGlvbihzdWdnLCBwYXJlbnRFbCk7XG4gICAgICB0aGlzLnVwZGF0ZVN1Z2dlc3Rpb25FbEZvck1vZGUoc3VnZywgcGFyZW50RWwpO1xuICAgIH1cblxuICAgIHVwZGF0ZVN1Z2dlc3Rpb25FbEZvck1vZGUoc3VnZywgcGFyZW50RWwpIHtcbiAgICAgIGNvbnN0IHsgbW9kZSB9ID0gdGhpcztcblxuICAgICAgaWYgKG1vZGUgPT09IE1vZGUuU3ltYm9sTGlzdCkge1xuICAgICAgICAvLyBhZGQgc3ltYm9sIHR5cGUgaW5kaWNhdG9yXG4gICAgICAgIGNvbnN0IHsgdHlwZSwgc3ltYm9sIH0gPSBzdWdnLml0ZW07XG4gICAgICAgIGxldCBpbmRpY2F0b3IgPSBTeW1ib2xJbmRpY2F0b3JzW3R5cGVdO1xuXG4gICAgICAgIGlmICh0eXBlID09PSBTeW1ib2xUeXBlLkhlYWRpbmcpIHtcbiAgICAgICAgICBpbmRpY2F0b3IgPSBpbmRpY2F0b3Jbc3ltYm9sLmxldmVsXTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby11bmRlZlxuICAgICAgICBjb25zdCBpbmRpY2F0b3JFbCA9IGNyZWF0ZUVsKCdkaXYnLCB7XG4gICAgICAgICAgdGV4dDogaW5kaWNhdG9yLFxuICAgICAgICAgIGF0dHI6IHsgc3R5bGU6IGluZGljYXRvclN0eWxlIH0sXG4gICAgICAgIH0pO1xuICAgICAgICBwYXJlbnRFbC5pbnNlcnRBZGphY2VudEVsZW1lbnQoJ2FmdGVyYmVnaW4nLCBpbmRpY2F0b3JFbCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG5ldyBTd2l0Y2hlclBsdXMoYXBwKTtcbn07XG4iLCIvKiBlc2xpbnQtZGlzYWJsZSBpbXBvcnQvbm8tdW5yZXNvbHZlZCAqL1xuaW1wb3J0IHsgUGx1Z2luIH0gZnJvbSAnb2JzaWRpYW4nO1xuaW1wb3J0IHsgTW9kZSB9IGZyb20gJy4vbW9kdWxlcy9jb25zdGFudHMnO1xuaW1wb3J0IGNyZWF0ZVN3aXRjaGVyUGx1c01vZGFsIGZyb20gJy4vbW9kdWxlcy9zd2l0Y2hlclBsdXMnO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBTd2l0Y2hlclBsdXNQbHVnaW4gZXh0ZW5kcyBQbHVnaW4ge1xuICBvbmxvYWQoKSB7XG4gICAgdGhpcy5yZWdpc3RlckNvbW1hbmQoJ3N3aXRjaGVyLXBsdXM6b3BlbicsXG4gICAgICAnT3BlbicsIE1vZGUuU3RhbmRhcmQpO1xuICAgIHRoaXMucmVnaXN0ZXJDb21tYW5kKCdzd2l0Y2hlci1wbHVzOm9wZW4tZWRpdG9ycycsXG4gICAgICAnT3BlbiBpbiBFZGl0b3IgTW9kZScsIE1vZGUuRWRpdG9yTGlzdCk7XG4gICAgdGhpcy5yZWdpc3RlckNvbW1hbmQoJ3N3aXRjaGVyLXBsdXM6b3Blbi1zeW1ib2xzJyxcbiAgICAgICdPcGVuIGluIFN5bWJvbCBNb2RlJywgTW9kZS5TeW1ib2xMaXN0KTtcbiAgfVxuXG4gIG9udW5sb2FkKCkge1xuICAgIHRoaXMubW9kYWwgPSBudWxsO1xuICB9XG5cbiAgcmVnaXN0ZXJDb21tYW5kKGlkLCBuYW1lLCBtb2RlKSB7XG4gICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgIGlkLFxuICAgICAgbmFtZSxcbiAgICAgIGhvdGtleXM6IFtdLFxuICAgICAgY2hlY2tDYWxsYmFjazogKGNoZWNraW5nKSA9PiB7XG4gICAgICAgIGNvbnN0IG1vZGFsID0gdGhpcy5nZXRNb2RhbCh0aGlzLmFwcCk7XG4gICAgICAgIGlmIChtb2RhbCkge1xuICAgICAgICAgIGlmICghY2hlY2tpbmcpIHtcbiAgICAgICAgICAgIG1vZGFsLm9wZW5Jbk1vZGUobW9kZSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9LFxuICAgIH0pO1xuICB9XG5cbiAgZ2V0TW9kYWwoYXBwKSB7XG4gICAgbGV0IHsgbW9kYWwgfSA9IHRoaXM7XG4gICAgaWYgKG1vZGFsKSB7IHJldHVybiBtb2RhbDsgfVxuXG4gICAgbW9kYWwgPSBjcmVhdGVTd2l0Y2hlclBsdXNNb2RhbChhcHApO1xuICAgIHRoaXMubW9kYWwgPSBtb2RhbDtcbiAgICByZXR1cm4gbW9kYWw7XG4gIH1cbn1cbiJdLCJuYW1lcyI6WyJRVUlDS19TV0lUQ0hFUl9JRCIsIk1vZGUiLCJTdGFuZGFyZCIsIkVkaXRvckxpc3QiLCJTeW1ib2xMaXN0IiwiU3ltYm9sVHlwZSIsIkxpbmsiLCJFbWJlZCIsIlRhZyIsIkhlYWRpbmciLCJTeW1ib2xJbmRpY2F0b3JzIiwiUmVmZXJlbmNlVmlld3MiLCJTZXR0aW5ncyIsImVkaXRvckxpc3RDb21tYW5kIiwic3ltYm9sTGlzdENvbW1hbmQiLCJleGNsdWRlVmlld1R5cGVzIiwiYWx3YXlzTmV3UGFuZUZvclN5bWJvbHMiLCJmb2N1c0VkaXRvck9uU3ltYm9sTmF2aWdhdGlvbiIsImluZGljYXRvclN0eWxlIiwiZ2V0UXVpY2tTd2l0Y2hlciIsImFwcCIsInN3aXRjaGVyIiwiaW50ZXJuYWxQbHVnaW5zIiwiZ2V0UGx1Z2luQnlJZCIsImluc3RhbmNlIiwibW9kYWwiLCJjb25zdHJ1Y3RvciIsIlF1aWNrU3dpdGNoZXIiLCJTd2l0Y2hlclBsdXMiLCJhcHBPYmoiLCJtb2RlIiwic3ltYm9sVGFyZ2V0Iiwic2NvcGUiLCJyZWdpc3RlcktleSIsIm5leHRJdGVtIiwiYmluZCIsImNob29zZXIiLCJwcmV2aW91c0l0ZW0iLCJpc09wZW4iLCJzZXRTZWxlY3RlZEl0ZW0iLCJzZWxlY3RlZEl0ZW0iLCJvcGVuSW5Nb2RlIiwib3BlbiIsIm9uT3BlbiIsInZhbCIsInNldFN1Z2dlc3Rpb25zIiwiaW5wdXRFbCIsInZhbHVlIiwiZm9jdXMiLCJvbklucHV0IiwicGFyc2VJbnB1dCIsInVwZGF0ZUhlbHBlclRleHRGb3JNb2RlIiwidXBkYXRlS2V5bWFwRm9yTW9kZSIsInVwZGF0ZVN1Z2dlc3Rpb25zIiwiaGFzRWRpdG9yQ21kUHJlZml4IiwiaW5kZXhPZiIsInN5bWJvbENtZEluZGV4IiwiaGFzU3ltYm9sQ21kIiwiaGFzU3ltYm9sQ21kUHJlZml4Iiwic2VsZWN0ZWRTdWdnSW5mbyIsImdldFNlbGVjdGVkU3VnZ0luZm8iLCJhY3RpdmVFZGl0b3JJbmZvIiwiZ2V0QWN0aXZlRWRpdG9ySW5mbyIsImlzU3VnZ1ZhbGlkU3ltYm9sVGFyZ2V0IiwiZGV0ZXJtaW5lUnVuTW9kZSIsIndvcmtzcGFjZSIsInZpZXciLCJmaWxlIiwiY3VycmVudEVkaXRvckZpbGUiLCJhY3RpdmVMZWFmIiwiaXNDdXJyZW50RWRpdG9yVmFsaWQiLCJpbmNsdWRlcyIsImdldFZpZXdUeXBlIiwiaXNFZGl0b3JWYWxpZFN5bWJvbFRhcmdldCIsImN1cnJlbnRFZGl0b3IiLCJjdXJyZW50U3VnZ2VzdGlvbiIsInZhbHVlcyIsIml0ZW0iLCJ0eXBlIiwiaGFzRXhpc3RpbmdTeW1ib2xUYXJnZXQiLCJjb250YWluZXJFbCIsInNlbGVjdG9yIiwiZWwiLCJxdWVyeVNlbGVjdG9yIiwic3R5bGUiLCJkaXNwbGF5Iiwia2V5cyIsImJhY2t1cEtleXMiLCJsZW5ndGgiLCJmb3JFYWNoIiwia2V5IiwicHVzaCIsInVuZGVmaW5lZCIsImkiLCJtb2RpZmllcnMiLCJzcGxpY2UiLCJnZXRTZWFyY2hEYXRhIiwic3RhcnRJbmRleCIsImV4dHJhY3RUb2tlbnMiLCJzdHIiLCJwIiwidSIsImIiLCJxdWVyeSIsInNsaWNlIiwidG9Mb3dlckNhc2UiLCJ0b2tlbnMiLCJwb3MiLCJjaGFyIiwiY2hhckF0IiwidGVzdCIsImZ1enp5Iiwic3BsaXQiLCJpdGVtcyIsImdldEl0ZW1zIiwic2VhcmNoRGF0YSIsInN1Z2dlc3Rpb25zIiwibWFrZVN1Z2dlc3Rpb25zIiwiaGFzU2VhcmNoVGVybSIsInN1Z2ciLCJtYXRjaCIsInNvcnQiLCJhIiwic2NvcmUiLCJnZXRTeW1ib2xzRm9yVGFyZ2V0IiwicmV0IiwibWV0YWRhdGFDYWNoZSIsIm1kRmlsZSIsImZpbGVDYWNoZSIsInBhdGgiLCJzeW1ib2xEYXRhIiwiaGFzaCIsInN5bWJvbHMiLCJzeW1ib2wiLCJoZWFkaW5ncyIsInRhZ3MiLCJsaW5rcyIsImVtYmVkcyIsImdldE9wZW5Sb290U3BsaXRzIiwibGVhdmVzIiwic2F2ZUxlYWYiLCJsIiwiaXRlcmF0ZUxlYXZlcyIsInJvb3RTcGxpdCIsImdldEl0ZW1UZXh0IiwidGV4dCIsImdldFN1Z2dlc3Rpb25UZXh0Rm9yU3ltYm9sIiwiZ2V0U3VnZ2VzdGlvblRleHRGb3JFZGl0b3IiLCJoZWFkaW5nIiwidGFnIiwibGluayIsImRpc3BsYXlUZXh0IiwibGVhZiIsImdldERpc3BsYXlUZXh0Iiwib25DaG9vc2VPcHRpb24iLCJzdWdnZXN0aW9uSXRlbSIsImV2dCIsInNldEFjdGl2ZUxlYWYiLCJuYXZpZ2F0ZVRvU3ltYm9sIiwidGFyZ2V0RmlsZVBhdGgiLCJmaW5kT3BlbkVkaXRvck1hdGNoaW5nU3ltYm9sVGFyZ2V0Iiwic3RhcnQiLCJsaW5lIiwiY29sIiwiY2giLCJvZmZzZXQiLCJzdGFydFBvcyIsImVuZCIsImVuZFBvcyIsInBvc2l0aW9uIiwiZVN0YXRlIiwic2V0RXBoZW1lcmFsU3RhdGUiLCJvcGVuTGlua1RleHQiLCJpc1RhcmdldExlYWYiLCJwcmVkaWNhdGUiLCJpc0xlYWZSZWZWaWV3IiwiaXNUYXJnZXRSZWZWaWV3IiwiZmluZCIsInJlbmRlclN1Z2dlc3Rpb24iLCJwYXJlbnRFbCIsInVwZGF0ZVN1Z2dlc3Rpb25FbEZvck1vZGUiLCJpbmRpY2F0b3IiLCJsZXZlbCIsImluZGljYXRvckVsIiwiY3JlYXRlRWwiLCJhdHRyIiwiaW5zZXJ0QWRqYWNlbnRFbGVtZW50IiwiU3dpdGNoZXJQbHVzUGx1Z2luIiwiUGx1Z2luIiwib25sb2FkIiwicmVnaXN0ZXJDb21tYW5kIiwib251bmxvYWQiLCJpZCIsIm5hbWUiLCJhZGRDb21tYW5kIiwiaG90a2V5cyIsImNoZWNrQ2FsbGJhY2siLCJjaGVja2luZyIsImdldE1vZGFsIiwiY3JlYXRlU3dpdGNoZXJQbHVzTW9kYWwiXSwibWFwcGluZ3MiOiI7Ozs7QUFBTyxNQUFNQSxpQkFBaUIsR0FBRyxVQUExQjs7QUFHQSxNQUFNQyxJQUFJLEdBQUc7QUFDbEJDLEVBQUFBLFFBQVEsRUFBRSxDQURRO0FBRWxCQyxFQUFBQSxVQUFVLEVBQUUsQ0FGTTtBQUdsQkMsRUFBQUEsVUFBVSxFQUFFO0FBSE0sQ0FBYjtBQU1BLE1BQU1DLFVBQVUsR0FBRztBQUN4QkMsRUFBQUEsSUFBSSxFQUFFLENBRGtCO0FBRXhCQyxFQUFBQSxLQUFLLEVBQUUsQ0FGaUI7QUFHeEJDLEVBQUFBLEdBQUcsRUFBRSxDQUhtQjtBQUl4QkMsRUFBQUEsT0FBTyxFQUFFO0FBSmUsQ0FBbkI7QUFPQSxNQUFNQyxnQkFBZ0IsR0FBRyxFQUF6QjtBQUNQQSxnQkFB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
