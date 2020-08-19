export const QUICK_SWITCHER_ID = 'switcher';

// Switcher modes of operation
export const Mode = {
  Standard: 1,
  EditorList: 2,
  SymbolList: 4,
};

export const SymbolType = {
  Link: 1,
  Embed: 2,
  Tag: 4,
  Heading: 8,
};

export const SymbolIndicators = {};
SymbolIndicators[SymbolType.Link] = '🔗';
SymbolIndicators[SymbolType.Embed] = '!';
SymbolIndicators[SymbolType.Tag] = '#';
SymbolIndicators[SymbolType.Heading] = {
  1: 'H₁',
  2: 'H₂',
  3: 'H₃',
  4: 'H₄',
  5: 'H₅',
  6: 'H₆',
};
