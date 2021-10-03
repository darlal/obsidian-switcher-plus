import {
  CachedMetadata,
  EmbedCache,
  LinkCache,
  TagCache,
  HeadingCache,
  Loc,
  Pos,
  ReferenceCache,
} from 'obsidian';

export function makeLoc(line: number, col?: number, offset?: number): Loc {
  return {
    line,
    col: col ?? 0,
    offset: offset ?? 0,
  };
}

function makePos(startLoc: Loc, endLoc: Loc): Pos {
  return {
    start: startLoc,
    end: endLoc,
  };
}

function makeLink(
  link: string,
  original: string,
  displayText: string,
  startLoc: Loc,
  endLoc: Loc,
): ReferenceCache {
  return {
    position: makePos(startLoc, endLoc),
    link,
    original,
    displayText,
  };
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
  const position = makePos(startLoc ?? makeLoc(0, 0, 0), endLoc ?? makeLoc(0, 0, 0));

  return {
    position,
    heading,
    level,
  };
}

function getLinks(): LinkCache[] {
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

export function getCachedMetadata(): CachedMetadata {
  return {
    links: getLinks(),
    embeds: getEmbeds(),
    tags: getTags(),
    headings: getHeadings(),
  };
}
