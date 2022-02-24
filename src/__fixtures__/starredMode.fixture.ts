import { FileStarredItem, SearchStarredItem } from 'obsidian';
import { Chance } from 'chance';

const chance = new Chance();

export function makeFileStarredItem(title?: string, path?: string): FileStarredItem {
  const item = {} as FileStarredItem;

  item.type = 'file';
  item.title = title ?? chance.word({ length: 4 });
  item.path = path ?? `path/to/${item.title}.md`;

  return item;
}

export function makeSearchStarredItem(): SearchStarredItem {
  const item = {} as SearchStarredItem;
  item.type = 'search';
  item.title = chance.word({ length: 4 });
  item.query = chance.word({ length: 4 });

  return item;
}
