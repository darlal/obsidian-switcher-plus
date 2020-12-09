/* eslint-disable import/no-unresolved */
import { FuzzySuggestModal } from 'obsidian';
import {
  Mode,
  SymbolType,
  SymbolIndicators,
  ReferenceViews,
} from './constants';
import { Config } from './settings';

const indicatorStyle = 'color: var(--text-accent); width: 2.5em; text-align: center; float:left; font-weight:800;';

export default class ExModeHandler extends FuzzySuggestModal {
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
    if (mode === Mode.SymbolList) { this.symbolTarget = null; }
  }

  parseInput(input, currentSuggestion) {
    const { editorListCommand, symbolListCommand } = Config;

    // determine if the editor command exists and if it's valid
    const hasEditorCmdPrefix = input.indexOf(editorListCommand) === 0;

    // get the index of symbol command and determine if it exists
    const symbolCmdIndex = input.indexOf(symbolListCommand);
    const hasSymbolCmd = symbolCmdIndex !== -1;
    const hasSymbolCmdPrefix = symbolCmdIndex === 0;

    // determine if the chooser is showing suggestions, and if so, is the
    // currently selected suggestion a valid target for symbols
    const selectedSuggInfo = ExModeHandler.getSelectedSuggInfo(hasSymbolCmd,
      currentSuggestion);

    // determine if the current active editor pane a valid target for symbols
    const activeEditorInfo = this.getActiveEditorInfo(hasSymbolCmdPrefix,
      selectedSuggInfo.isSuggValidSymbolTarget);

    const { mode, symbolTarget } = this.determineRunMode(hasEditorCmdPrefix,
      hasSymbolCmd, selectedSuggInfo, activeEditorInfo);

    this.symbolTarget = symbolTarget;
    this._mode = mode;

    return mode;
  }

  getActiveEditorInfo(hasSymbolCmdPrefix, isSuggValidSymbolTarget) {
    const { workspace } = this.app;
    const { excludeViewTypes } = Config;

    // determine if the current active editor pane is valid
    const { view, view: { file: currentEditorFile } } = workspace.activeLeaf;
    const isCurrentEditorValid = !excludeViewTypes.includes(view.getViewType());

    // whether or not the current active editor can be used as the target for
    // symbol search
    const isEditorValidSymbolTarget = hasSymbolCmdPrefix && !isSuggValidSymbolTarget
      && isCurrentEditorValid && !!currentEditorFile;

    return { isEditorValidSymbolTarget, currentEditor: workspace.activeLeaf };
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
    }

    // whether or not the current suggestion can be used for symbol search
    const isSuggValidSymbolTarget = !!activeSugg;
    return { currentSuggestion: activeSugg, isSuggValidSymbolTarget };
  }

  determineRunMode(hasEditorCmdPrefix, hasSymbolCmd, selectedSuggInfo, activeEditorInfo) {
    let { mode, symbolTarget } = this;

    // wether or not a symbol target file exists. Indicates that the previous
    // operation was a symbol operation
    const hasExistingSymbolTarget = mode === Mode.SymbolList && !!symbolTarget;

    if (hasSymbolCmd) {
      mode = Mode.SymbolList;

      if (selectedSuggInfo.isSuggValidSymbolTarget) {
        symbolTarget = ExModeHandler.getSuggestionTarget(
          selectedSuggInfo.currentSuggestion,
        );
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

  static getSuggestionTarget(suggestion) {
    if (!suggestion) { return null; }
    return suggestion.file ? suggestion.file : suggestion.item;
  }

  extractSearchQuery(input = '') {
    const { mode } = this;
    const { editorListCommand, symbolListCommand } = Config;
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
    const { mode } = this;
    let items;

    if (mode === Mode.EditorList) {
      items = this.getOpenRootSplits();
    } else if (mode === Mode.SymbolList) {
      items = this.getSymbolsForTarget();
    }

    return items;
  }

  getOpenRootSplits() {
    const { workspace } = this.app;
    const leaves = [];

    const saveLeaf = (l) => {
      if (!Config.excludeViewTypes.includes(l.view.getViewType())) {
        leaves.push(l);
      }
    };

    workspace.iterateLeaves(saveLeaf, workspace.rootSplit);
    return leaves;
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

  getItemText(item) {
    const { mode } = this;
    let text;

    if (mode === Mode.SymbolList) {
      text = ExModeHandler.getSuggestionTextForSymbol(item);
    } else if (mode === Mode.EditorList) {
      text = item.getDisplayText();
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

  onChooseSuggestion(suggestionItem, evt) {
    const { mode } = this;

    if (mode === Mode.EditorList) {
      const { item } = suggestionItem;
      this.app.workspace.setActiveLeaf(item);
      item.view.setEphemeralState({ focus: true });
    } else if (mode === Mode.SymbolList) {
      this.navigateToSymbol(suggestionItem);
    } else {
      super.onChooseSuggestion(suggestionItem, evt);
    }
  }

  navigateToSymbol(suggestionItem) {
    const { workspace } = this.app;

    // determine if the target is already open in a pane
    const { leaf, targetFilePath } = this.findOpenEditorMatchingSymbolTarget();

    const {
      start: { line, offset: startPos },
      end: { offset: endPos },
    } = suggestionItem.item.symbol.position;

    // object containing the state information for the target editor,
    // start with the range to highlight in target editor
    const eState = {
      startPos,
      endPos,
      line,
      focus: true,
    };

    if (leaf && !this.settings.alwaysNewPaneForSymbols) {
      // activate the already open pane, and set state
      workspace.setActiveLeaf(leaf, true);
      leaf.view.setEphemeralState(eState);
    } else {
      workspace.openLinkText(targetFilePath, '', true, { eState });
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
