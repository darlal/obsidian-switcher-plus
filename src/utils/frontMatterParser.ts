import { FrontMatterCache } from 'obsidian';

export class FrontMatterParser {
  static getAliases(frontMatter: FrontMatterCache): string[] {
    let aliases: string[] = [];

    if (frontMatter) {
      aliases = FrontMatterParser.getValueForKey(frontMatter, /^alias(es)?$/i);
    }

    return aliases;
  }

  /**
   * Extracts tags from frontmatter, supporting both 'tag' (singular) and 'tags' (plural) keys.
   * Handles both string (comma-separated) and array formats.
   *
   * @param frontMatter - The frontmatter cache object from Obsidian
   * @returns An array of tag strings, empty array if no tags found or frontmatter is falsy
   */
  static getTags(frontMatter: FrontMatterCache): string[] {
    let tags: string[] = [];

    if (frontMatter) {
      tags = FrontMatterParser.getValueForKey(frontMatter, /^tags?$/i);
    }

    return tags;
  }

  private static getValueForKey(
    frontMatter: FrontMatterCache,
    keyPattern: RegExp,
  ): string[] {
    const retVal: string[] = [];
    const fmKeys = Object.keys(frontMatter);
    const key = fmKeys.find((val) => keyPattern.test(val));

    if (key) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      let value = frontMatter[key];

      if (typeof value === 'string') {
        value = value.split(',');
      }

      if (Array.isArray(value)) {
        value.forEach((val) => {
          if (typeof val === 'string') {
            retVal.push(val.trim());
          }
        });
      }
    }

    return retVal;
  }
}
