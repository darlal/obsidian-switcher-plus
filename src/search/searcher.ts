import { prepareFuzzySearch, prepareSimpleSearch, SearchResult } from 'obsidian';
import { MatchType, PathSegments, SearchResultWithFallback } from 'src/types';

export interface StringSearcher {
  /**
   * The string query to search for.
   *
   * @readonly
   * @type {string}
   */
  readonly query: string;

  /**
   * True if query contains a search term, otherwise false.
   *
   * @readonly
   * @type {boolean}
   */
  readonly hasSearchTerm: boolean;

  /**
   * Searches through primaryString, if no match is found and pathSegments is not null,
   * it will fallback to searching 1) basename, 2) path
   * @param  {string} primaryString
   * @param  {PathSegments} pathSegments? TFile like object containing the basename and full path.
   * @returns SearchResultWithFallback
   */
  searchWithFallback(
    primaryString: string,
    pathSegments?: PathSegments,
  ): SearchResultWithFallback;

  /**
   * Search text for the previously supplied query.
   *
   * @param {string} text The text in which to find query.
   * @returns {(SearchResult | null)} SearchResult if query is found or query is an empty
   * string. Otherwise null.
   */
  executeSearch(text: string): SearchResult | null;
}

/**
 * Function that performs the string matching of text against the query.
 *
 * @export
 * @typedef {SearchDelegate}
 */
export type SearchDelegate = (text: string) => SearchResult | null;

export class Searcher implements StringSearcher {
  _searchDelegate: SearchDelegate;

  readonly query: string;
  readonly hasSearchTerm: boolean;

  constructor(
    query: string,
    readonly useSimpleSearch: boolean,
  ) {
    this.query = (query ?? '').trim().toLowerCase();
    this.hasSearchTerm = !!this.query.length;
  }

  /**
   * Utility function for creating a StringSearcher instance. Prefer this over calling
   * the constructor directly.
   *
   * @static
   * @param {string} query the query string that should be searched for.
   * @param {boolean} [useSimpleSearch=false] false to use fuzzy search (default). true to
   * use simple search which is better seaching against large vaults.
   * @returns {StringSearcher}
   */
  static create(query: string, useSimpleSearch = false): StringSearcher {
    return new Searcher(query, useSimpleSearch);
  }

  searchWithFallback(
    primaryString: string,
    pathSegments?: PathSegments,
  ): SearchResultWithFallback {
    let matchType = MatchType.None;
    let matchText: string;
    let match: SearchResult = null;

    let res = this.searchAndDownrankSecondaryMatch(primaryString);

    if (res.match) {
      match = res.match;
      matchType = MatchType.Primary;
      matchText = primaryString;
    } else if (pathSegments) {
      const { basename, path } = pathSegments;

      // Note: the fallback to path has to search through the entire path
      // because search needs to match over the filename/basename boundaries
      // e.g. search string "to my" should match "path/to/myfile.md"
      // that means MatchType.Basename will always be in the basename, while
      // MatchType.ParentPath can span both filename and basename
      res = this.searchAndDownrankSecondaryMatch(basename, path);

      if (res.isPrimary) {
        matchType = MatchType.Basename;
        matchText = basename;
      } else if (res.match) {
        matchType = MatchType.Path;
        matchText = path;
      }

      match = res.match;
    }

    return { matchType, matchText, match };
  }

  /**
   * Searches through primaryText, if not match is found, searches through secondaryText.
   * If a match is found in secondaryText, the downrank value is applied.
   * @param  {string} primaryText
   * @param  {string} secondaryText?
   * @returns { isPrimary: boolean; match?: SearchResult }
   */
  searchAndDownrankSecondaryMatch(
    primaryText: string,
    secondaryText?: string,
  ): { isPrimary: boolean; match?: SearchResult } {
    let isPrimary = false;
    let match: SearchResult = null;

    if (primaryText) {
      match = this.executeSearch(primaryText);
      isPrimary = !!match;
    }

    if (!match && secondaryText) {
      match = this.executeSearch(secondaryText);

      if (match) {
        match.score -= 1;
      }
    }

    return {
      isPrimary,
      match,
    };
  }

  executeSearch(text: string): SearchResult | null {
    const searchFn = this.getSearchDelegate();
    return searchFn ? searchFn(text) : null;
  }

  getSearchDelegate(): SearchDelegate {
    if (!this._searchDelegate) {
      const { query, useSimpleSearch } = this;

      this._searchDelegate = useSimpleSearch
        ? prepareSimpleSearch(query)
        : prepareFuzzySearch(query);
    }

    return this._searchDelegate;
  }
}
