import {
  CachedMetadata,
  EmbedCache,
  FrontMatterCache,
  LinkCache,
  TagCache,
  HeadingCache,
  Loc,
  Pos,
  ReferenceCache,
  SectionCache,
} from 'obsidian';

export function makeLoc(line?: number, col?: number, offset?: number): Loc {
  return {
    line: line ?? 0,
    col: col ?? 0,
    offset: offset ?? 0,
  };
}

function makePos(startLoc?: Loc, endLoc?: Loc): Pos {
  const start = startLoc ?? makeLoc();
  const end = endLoc ?? makeLoc();

  return {
    start,
    end,
  };
}

export function makeLink(
  link: string,
  original: string,
  displayText?: string,
  startLoc?: Loc,
  endLoc?: Loc,
): ReferenceCache {
  const position = makePos(startLoc, endLoc);

  const refCache: ReferenceCache = {
    position,
    link,
    original,
  };

  if (displayText) {
    refCache.displayText = displayText;
  }

  return refCache;
}

function makeTag(tag: string, startLoc: Loc, endLoc: Loc): TagCache {
  return {
    position: makePos(startLoc, endLoc),
    tag,
  };
}

export function makeHeading(
  heading: string,
  level: number,
  startLoc?: Loc,
  endLoc?: Loc,
): HeadingCache {
  const position = makePos(startLoc, endLoc);

  return {
    position,
    heading,
    level,
  };
}

export function makeSectionCache(
  type: 'yaml' | 'heading' | 'paragraph' | 'callout',
  startLoc?: Loc,
  endLoc?: Loc,
  id?: string,
): SectionCache {
  const position = makePos(startLoc, endLoc);

  return {
    position,
    type,
    id,
  };
}

export function getLinks(): LinkCache[] {
  const l1 = makeLink(
    'Format your notes#^e476cc',
    '[[Format your notes#^e476cc]]',
    'Format your notes > ^e476cc',
    makeLoc(12, 70, 172),
    makeLoc(12, 99, 201),
  );

  const l2 = makeLink(
    'internal like to no-exist',
    '[[internal like to no-exist|with-alt-text]]',
    'with-alt-text',
    makeLoc(12, 136, 238),
    makeLoc(12, 179, 281),
  );

  return [l1, l2];
}

function getEmbeds(): EmbedCache[] {
  const e1 = makeLink(
    'google.jpg',
    '![[google.jpg]]',
    'google.jpg',
    makeLoc(16, 0, 303),
    makeLoc(16, 15, 318),
  );

  return [e1];
}

export function getTags(): TagCache[] {
  return [
    makeTag('#tag1', makeLoc(20, 11, 340), makeLoc(20, 16, 345)),
    makeTag('#tag2', makeLoc(20, 21, 350), makeLoc(20, 26, 355)),
  ];
}

export function getHeadings(): HeadingCache[] {
  return [
    makeHeading('Title heading1', 1, makeLoc(8, 0, 65), makeLoc(8, 16, 81)),
    makeHeading('another heading1', 1, makeLoc(9, 0, 83), makeLoc(9, 16, 89)),
    makeHeading('More headings2', 2, makeLoc(28, 0, 418), makeLoc(28, 17, 435)),
    makeHeading('heading3', 3, makeLoc(30, 0, 437), makeLoc(30, 12, 449)),
    makeHeading('heading4', 4, makeLoc(32, 0, 451), makeLoc(32, 13, 464)),
    makeHeading('heading5', 5, makeLoc(34, 0, 466), makeLoc(34, 14, 480)),
    makeHeading('heading6', 6, makeLoc(36, 0, 482), makeLoc(36, 15, 497)),
  ];
}

export function getCallouts(): SectionCache[] {
  return [makeSectionCache('callout', makeLoc(1, 0, 1), makeLoc(2, 18, 43))];
}

/**
 * Creates a FrontMatterCache object with tags.
 * Supports both single string and array of strings for tags.
 *
 * @param tags - A single tag string or array of tag strings
 * @returns A FrontMatterCache object with the tags in array format
 */
export function makeFrontmatterWithTags(tags: string | string[]): FrontMatterCache {
  const tagsArray = Array.isArray(tags) ? tags : [tags];

  return {
    tags: tagsArray,
    position: null,
  };
}

export interface GetCachedMetadataOptions {
  includeFrontmatter?: boolean;
  frontmatterTags?: string | string[];
  frontmatterStartLine?: number;
  frontmatterEndLine?: number;
}

/**
 * Creates a CachedMetadata object with optional frontmatter support.
 * When includeFrontmatter is true, includes both frontmatter and frontmatterPosition.
 *
 * @param options - Optional configuration for frontmatter inclusion
 * @param options.includeFrontmatter - If true, includes frontmatter and frontmatterPosition
 * @param options.frontmatterTags - Tags to include in frontmatter (defaults to ['tag1', 'tag2'])
 * @param options.frontmatterStartLine - Start line for frontmatter position (defaults to 0)
 * @param options.frontmatterEndLine - End line for frontmatter position (defaults to 2)
 * @returns A CachedMetadata object with optional frontmatter data
 */
export function getCachedMetadata(options?: GetCachedMetadataOptions): CachedMetadata {
  const metadata: CachedMetadata = {
    links: getLinks(),
    embeds: getEmbeds(),
    tags: getTags(),
    headings: getHeadings(),
    sections: [...getCallouts()],
  };

  if (options?.includeFrontmatter) {
    const tags = options.frontmatterTags ?? ['tag1', 'tag2'];
    const startLine = options.frontmatterStartLine ?? 0;
    const endLine = options.frontmatterEndLine ?? 2;

    metadata.frontmatter = makeFrontmatterWithTags(tags);
    metadata.frontmatterPosition = makePos(
      makeLoc(startLine, 0, 0),
      makeLoc(endLine, 0, 0),
    );
  }

  return metadata;
}
