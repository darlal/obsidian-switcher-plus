import {
  QUICK_SWITCHER_ID,
  Mode,
  SymbolType,
  SymbolIndicators,
  ReferenceViews,
} from './constants';
import Settings from './settings';

const indicatorStyle = 'color: var(--text-accent); width: 2.5em; text-align: center; float:left; font-weight:800;';

function getQuickSwitcher(app) {
  const switcher = app.plugins.getPluginById(QUICK_SWITCHER_ID);
  if (!switcher) { return null; }

  return switcher.instance.modal.constructor;
}

export default (app) => {
  const QuickSwitcher = getQuickSwitcher(app);
  if (QuickSwitcher === null) { return null; }

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
      const { mode } = this;

      if (mode === Mode.EditorList) {
        val = Settings.editorListCommand;
      } else if (mode === Mode.SymbolList) {
        val = Settings.symbolListCommand;

        // force reset suggestions so any suggestions from a previous operation
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
      const { mode, symbolTarget } = this.parseInput();

      this.symbolTarget = symbolTarget;
      this.mode = mode;
      this.updateHelperTextForMode(mode);
      this.updateKeymapForMode(mode);
      this.updateSuggestions();
    }

    parseInput() {
      const { editorListCommand, symbolListCommand } = Settings;
      const { inputEl: { value } } = this;

      // determine if the editor command exists and if it's valid
      const hasEditorCmdPrefix = value.indexOf(editorListCommand) === 0;

      // get the index of symbol command and determine if it exists
      const symbolCmdIndex = value.indexOf(symbolListCommand);
      const hasSymbolCmd = symbolCmdIndex !== -1;
      const hasSymbolCmdPrefix = symbolCmdIndex === 0;

      // determine if the chooser is showing suggestions, and if so, is the
      // currently selected suggestion a valid target for symbols
      const selectedSuggInfo = this.getSelectedSuggInfo(hasSymbolCmd);

      // determine if the current active editor pane a valid target for symbols
      const activeEditorInfo = this.getActiveEditorInfo(hasSymbolCmdPrefix,
        selectedSuggInfo.isSuggValidSymbolTarget);

      return this.determineRunMode(hasEditorCmdPrefix, hasSymbolCmd,
        selectedSuggInfo, activeEditorInfo);
    }

    getActiveEditorInfo(hasSymbolCmdPrefix, isSuggValidSymbolTarget) {
      const { workspace } = this.app;
      const { excludeViewTypes } = Settings;

      // determine if the current active editor pane is valid
      const { view, view: { file: currentEditorFile } } = workspace.activeLeaf;
      const isCurrentEditorValid = !excludeViewTypes.includes(view.getViewType());

      // whether or not the current active editor can be used as the target for
      // symbol search
      const isEditorValidSymbolTarget = hasSymbolCmdPrefix && !isSuggValidSymbolTarget
        && isCurrentEditorValid && !!currentEditorFile;

      return { isEditorValidSymbolTarget, currentEditor: workspace.activeLeaf };
    }

    getSelectedSuggInfo(hasSymbolCmd) {
      let currentSuggestion = null;

      if (hasSymbolCmd) {
        const { chooser } = this;
        currentSuggestion = chooser.values[chooser.selectedItem];

        // determine if there is a current suggestion that can be used as the
        // target for symbol search. This means the suggestion has to point to
        // a file
        if (currentSuggestion
          && (!currentSuggestion.item || currentSuggestion.type === Mode.SymbolList)) {
          // symbol suggestions don't point to a file
          currentSuggestion = null;
        }
      }

      // whether or not the current suggestion can be used for symbol search
      const isSuggValidSymbolTarget = !!currentSuggestion;
      return { currentSuggestion, isSuggValidSymbolTarget };
    }

    determineRunMode(hasEditorCmdPrefix, hasSymbolCmd, selectedSuggInfo, activeEditorInfo) {
      let { mode, symbolTarget } = this;

      // wether or not a symbol target file exists. Indicates that the previous
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

      return { mode, symbolTarget };
    }

    updateHelperTextForMode(mode) {
      const { containerEl } = this;
      const selector = '.prompt-instructions';

      const el = containerEl.querySelector(selector);
      if (el) { el.style.display = mode === Mode.Standard ? '' : 'none'; }
    }

    updateKeymapForMode(mode) {
      const { scope: { keys } } = this;
      let { backupKeys = [] } = this;

      if (mode === Mode.Standard) {
        if (backupKeys.length) { backupKeys.forEach((key) => keys.push(key)); }
        backupKeys = undefined;
      } else {
        // unregister unused hotkeys for custom modes
        for (let i = keys.length - 1; i >= 0; --i) {
          const key = keys[i];

          if (key.key === 'Enter'
            && (key.modifiers === 'Meta' || key.modifiers === 'Shift')) {
            keys.splice(i, 1);
            backupKeys.push(key);
          }
        }
      }

      this.backupKeys = backupKeys;
    }

    getSearchData() {
      const { mode, inputEl: { value } } = this;
      const { editorListCommand, symbolListCommand } = Settings;
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
          if (pos !== i) { tokens.push(query.slice(pos, i)); }

          pos = i + 1;
        } else if (p.test(char) || u.test(char)) {
          if (pos !== i) { tokens.push(query.slice(pos, i)); }

          tokens.push(char);
          pos = i + 1;
        }
      }

      if (pos !== query.length) { tokens.push(query.slice(pos, query.length)); }

      return { query, tokens, fuzzy: query.split('') };
    }

    updateSuggestions() {
      const { mode } = this;

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

      items.forEach((item) => {
        let sugg;

        if (hasSearchTerm) {
          const match = this.match(searchData, item);
          if (match !== null) { sugg = { match }; }
        } else {
          sugg = { match: null };
        }

        if (sugg) {
          sugg.item = item;
          sugg.type = this.mode;
          suggestions.push(sugg);
        }
      });

      if (hasSearchTerm) { suggestions.sort((a, b) => b.match.score - a.match.score); }
      return suggestions;
    }

    getSymbolsForTarget() {
      const ret = [];
      const { symbolTarget, app: { metadataCache } } = this;

      if (symbolTarget) {
        let file = symbolTarget;

        // determine if symbolTarget is a workspace leaf, or file
        if (symbolTarget.type === 'leaf' && symbolTarget.view) {
          file = symbolTarget.view.file;
        }

        if (file) {
          const mdFile = metadataCache.fileCache[file.path];

          if (mdFile) {
            const symbolData = metadataCache.metadataCache[mdFile.hash];

            if (symbolData) {
              const push = (symbols = [], type) => {
                symbols.forEach((symbol) => ret.push({ symbol, type }));
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
      const { workspace } = this.app;
      const leaves = [];

      const saveLeaf = (l) => {
        if (!Settings.excludeViewTypes.includes(l.view.getViewType())) {
          leaves.push(l);
        }
      };

      workspace.iterateLeaves(saveLeaf, workspace.rootSplit);
      return leaves;
    }

    getItems() {
      const { mode } = this;
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
      const { mode } = this;
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
      const { symbol, type } = item;
      let text;

      if (type === SymbolType.Heading) {
        text = symbol.heading;
      } else if (type === SymbolType.Tag) {
        text = symbol.tag.slice(1);
      } else {
        ({ link: text } = symbol);
        const { displayText } = symbol;

        if (displayText && displayText !== text) {
          text += `|${displayText}`;
        }
      }

      return text;
    }

    getSuggestionTextForEditor(leaf) {
      const { view, view: { file } } = leaf;
      let text;

      if (!file || ReferenceViews.includes(view.getViewType())) {
        text = leaf.getDisplayText();
      } else {
        text = super.getItemText(file);
      }

      return text;
    }

    onChooseOption(suggestionItem, evt) {
      const { mode } = this;

      if (mode === Mode.EditorList) {
        this.app.workspace.setActiveLeaf(suggestionItem);
      } else if (mode === Mode.SymbolList) {
        this.navigateToSymbol(suggestionItem);
      } else {
        super.onChooseOption(suggestionItem, evt);
      }
    }

    navigateToSymbol(suggestionItem) {
      const { workspace } = this.app;

      // determine if the target is already open in a pane
      const { leaf, targetFilePath } = this.findOpenEditorMatchingSymbolTarget();

      const {
        start: { line, col: ch, offset: startPos },
        end: { offset: endPos },
      } = suggestionItem.symbol.position;

      // object containing the state information for the target editor,
      // start with the range to highlight in target editor
      const eState = { startPos, endPos, line };

      if (Settings.focusEditorOnSymbolNavigation === true) {
        // set the cursor position to an empty selection at the beginning of symbol
        eState.cursor = {
          from: { line, ch },
          to: { line, ch },
        };
      }

      if (leaf && !Settings.alwaysNewPaneForSymbols) {
        // activate the already open pane, and set state
        workspace.setActiveLeaf(leaf, true);
        leaf.view.setEphemeralState(eState);
      } else {
        eState.focus = true;
        workspace.openLinkText(targetFilePath, '', false, { eState });
      }
    }

    findOpenEditorMatchingSymbolTarget() {
      const { symbolTarget } = this;
      const isTargetLeaf = symbolTarget.type === 'leaf';
      const file = isTargetLeaf ? symbolTarget.view.file : symbolTarget;

      const predicate = (leaf) => {
        const isLeafRefView = ReferenceViews.includes(leaf.view.getViewType());
        const isTargetRefView = isTargetLeaf
          && ReferenceViews.includes(symbolTarget.view.getViewType());
        let val = false;

        if (!isLeafRefView) {
          val = isTargetLeaf && !isTargetRefView
            ? leaf === symbolTarget
            : leaf.view.file === file;
        }

        return val;
      };

      const leaf = this.getOpenRootSplits().find(predicate);
      return { leaf, targetFilePath: file.path };
    }

    renderSuggestion(sugg, parentEl) {
      super.renderSuggestion(sugg, parentEl);
      this.updateSuggestionElForMode(sugg, parentEl);
    }

    updateSuggestionElForMode(sugg, parentEl) {
      const { mode } = this;

      if (mode === Mode.SymbolList) {
        // add symbol type indicator
        const { type, symbol } = sugg.item;
        let indicator = SymbolIndicators[type];

        if (type === SymbolType.Heading) {
          indicator = indicator[symbol.level];
        }

        // eslint-disable-next-line no-undef
        const indicatorEl = createEl('div', {
          text: indicator,
          attr: { style: indicatorStyle },
        });
        parentEl.insertAdjacentElement('afterbegin', indicatorEl);
      }
    }
  }

  return new SwitcherPlus(app);
};
