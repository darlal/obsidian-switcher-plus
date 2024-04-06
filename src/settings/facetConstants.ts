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

export const BOOKMARKS_FACET_ID_MAP: Record<string, string> = {
  file: 'bookmarks-file',
  folder: 'bookmarks-folder',
  search: 'bookmarks-search',
  group: 'bookmarks-group',
};

export const BOOKMARKS_MODE_FACETS: Facet[] = [
  {
    id: BOOKMARKS_FACET_ID_MAP.file,
    mode: Mode.BookmarksList,
    label: 'files',
    isActive: false,
    isAvailable: true,
  },
  {
    id: BOOKMARKS_FACET_ID_MAP.folder,
    mode: Mode.BookmarksList,
    label: 'folders',
    isActive: false,
    isAvailable: true,
  },
  {
    id: BOOKMARKS_FACET_ID_MAP.search,
    mode: Mode.BookmarksList,
    label: 'searches',
    isActive: false,
    isAvailable: true,
  },
];

export enum CommandListFacetIds {
  Pinned = 'pinnedCommands',
  Recent = 'recentCommands',
}

export const COMMAND_MODE_FACETS: Facet[] = [
  {
    id: CommandListFacetIds.Pinned,
    mode: Mode.CommandList,
    label: 'pinned',
    isActive: false,
    isAvailable: true,
  },
  {
    id: CommandListFacetIds.Recent,
    mode: Mode.CommandList,
    label: 'recent',
    isActive: false,
    isAvailable: true,
  },
];

export enum HeadingsListFacetIds {
  RecentFiles = 'recentFilesSearch',
  Bookmarks = 'bookmarksSearch',
  Filenames = 'filenamesSearch',
  Headings = 'headingsSearch',
  ExternalFiles = 'externalFilesSearch',
}

export const HEADINGS_MODE_FACETS: Facet[] = [
  {
    id: HeadingsListFacetIds.RecentFiles,
    mode: Mode.HeadingsList,
    label: 'recent files',
    isActive: false,
    isAvailable: true,
  },
  {
    id: HeadingsListFacetIds.Bookmarks,
    mode: Mode.HeadingsList,
    label: 'bookmarks',
    isActive: false,
    isAvailable: true,
  },
  {
    id: HeadingsListFacetIds.Filenames,
    mode: Mode.HeadingsList,
    label: 'filenames',
    isActive: false,
    isAvailable: true,
  },
  {
    id: HeadingsListFacetIds.Headings,
    mode: Mode.HeadingsList,
    label: 'headings',
    isActive: false,
    isAvailable: true,
  },
  {
    id: HeadingsListFacetIds.ExternalFiles,
    mode: Mode.HeadingsList,
    label: 'external files',
    isActive: false,
    isAvailable: true,
  },
];

export function getFacetMap(): Record<string, Facet> {
  const facetMap: Record<string, Facet> = {};
  const facetLists = [
    SYMBOL_MODE_FACETS,
    RELATED_ITEMS_MODE_FACETS,
    BOOKMARKS_MODE_FACETS,
    COMMAND_MODE_FACETS,
    HEADINGS_MODE_FACETS,
  ];

  facetLists.flat().reduce((facetMap, facet) => {
    facetMap[facet.id] = Object.assign({}, facet);
    return facetMap;
  }, facetMap);

  return facetMap;
}
