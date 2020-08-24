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
  focusEditorOnSymbolNavigation: false,
};

export { Settings as default };
