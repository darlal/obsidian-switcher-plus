import { Facet, Mode, RelationType, SymbolType } from 'src/types';

// map Canvas node data types to facet id
export const CANVAS_NODE_FACET_ID_MAP: Record<string, string> = {
  file: 'canvas-node-file',
  text: 'canvas-node-text',
  link: 'canvas-node-link',
  group: 'canvas-node-group',
};

export const SYMBOL_MODE_FACETS: Facet[] = [
  {
    id: SymbolType[SymbolType.Heading],
    mode: Mode.SymbolList,
    label: 'headings',
    isActive: false,
    isAvailable: true,
  },
  {
    id: SymbolType[SymbolType.Tag],
    mode: Mode.SymbolList,
    label: 'tags',
    isActive: false,
    isAvailable: true,
  },
  {
    id: SymbolType[SymbolType.Callout],
    mode: Mode.SymbolList,
    label: 'callouts',
    isActive: false,
    isAvailable: true,
  },
  {
    id: SymbolType[SymbolType.Link],
    mode: Mode.SymbolList,
    label: 'links',
    isActive: false,
    isAvailable: true,
  },
  {
    id: SymbolType[SymbolType.Embed],
    mode: Mode.SymbolList,
    label: 'embeds',
    isActive: false,
    isAvailable: true,
  },
  {
    id: CANVAS_NODE_FACET_ID_MAP.file,
    mode: Mode.SymbolList,
    label: 'file cards',
    isActive: false,
    isAvailable: true,
  },
  {
    id: CANVAS_NODE_FACET_ID_MAP.text,
    mode: Mode.SymbolList,
    label: 'text cards',
    isActive: false,
    isAvailable: true,
  },
  {
    id: CANVAS_NODE_FACET_ID_MAP.link,
    mode: Mode.SymbolList,
    label: 'link cards',
    isActive: false,
    isAvailable: true,
  },
  {
    id: CANVAS_NODE_FACET_ID_MAP.group,
    mode: Mode.SymbolList,
    label: 'groups',
    isActive: false,
    isAvailable: true,
  },
];

export const RELATED_ITEMS_MODE_FACETS: Facet[] = [
  {
    id: RelationType.Backlink,
    mode: Mode.RelatedItemsList,
    label: 'backlinks',
    isActive: false,
    isAvailable: true,
  },
  {
    id: RelationType.OutgoingLink,
    mode: Mode.RelatedItemsList,
    label: 'outgoing links',
    isActive: false,
    isAvailable: true,
  },
  {
    id: RelationType.DiskLocation,
    mode: Mode.RelatedItemsList,
    label: 'disk location',
    isActive: false,
    isAvailable: true,
  },
];

export const FACETS_ALL: Facet[] = [...SYMBOL_MODE_FACETS, ...RELATED_ITEMS_MODE_FACETS];
