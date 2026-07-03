import { TAbstractFile, TFile, TFolder } from 'obsidian';
import { isTFile, isTFolder } from './utils';

/**
 * Callbacks driving a {@link walkVaultTree} traversal.
 */
export interface VaultWalkerCallbacks {
  /** Invoked once for every file encountered. */
  onFile: (file: TFile) => void;
  /**
   * Invoked once for every non-root folder that is not excluded. Traversal
   * descends into a folder's children regardless of whether this is supplied.
   */
  onFolder?: (folder: TFolder) => void;
  /**
   * Return true to prune a folder: neither reported to {@link onFolder} nor
   * descended into. When omitted, no folders are pruned.
   */
  shouldExcludeFolder?: (folderPath: string) => boolean;
}

/**
 * Walks a vault subtree depth-first from `roots`, invoking callbacks for each
 * file and folder. Owns the exclude/recurse/root-skip invariant shared by all
 * vault walks so call sites only supply per-walk behavior.
 *
 * Visitation order is pop-from-end (a stack): the last root is processed
 * first, and a folder's last child before its first. Callers that cap
 * unsorted results rely on this order being stable.
 *
 * @param roots nodes to start from; the collection is copied, never mutated
 * @param callbacks per-walk behavior, see {@link VaultWalkerCallbacks}
 */
export function walkVaultTree(
  roots: Iterable<TAbstractFile>,
  callbacks: VaultWalkerCallbacks,
): void {
  const { onFile, onFolder, shouldExcludeFolder } = callbacks;
  const nodes: TAbstractFile[] = [...roots];

  while (nodes.length > 0) {
    const node = nodes.pop();

    if (isTFile(node)) {
      onFile(node);
    } else if (isTFolder(node) && !shouldExcludeFolder?.(node.path)) {
      // .isRoot is optional-chained because mocked folders may not implement it
      if (onFolder && !node.isRoot?.()) {
        onFolder(node);
      }

      for (const child of node.children) {
        nodes.push(child);
      }
    }
  }
}
