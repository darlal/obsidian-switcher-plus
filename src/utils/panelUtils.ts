import { Workspace, WorkspaceLeaf } from 'obsidian';

export function isMainPanelLeaf(workspace: Workspace, leaf: WorkspaceLeaf): boolean {
  return leaf?.getRoot() === workspace.rootSplit;
}

export function activateLeaf(
  workspace: Workspace,
  leaf: WorkspaceLeaf,
  pushHistory?: boolean,
  eState?: Record<string, unknown>,
): void {
  const isInSidePanel = !isMainPanelLeaf(workspace, leaf);
  const state = { focus: true, ...eState };

  if (isInSidePanel) {
    workspace.revealLeaf(leaf);
  }

  workspace.setActiveLeaf(leaf, pushHistory);
  leaf.view.setEphemeralState(state);
}

export function getOpenLeaves(
  workspace: Workspace,
  excludeMainPanelViewTypes?: string[],
  includeSidePanelViewTypes?: string[],
): WorkspaceLeaf[] {
  const leaves: WorkspaceLeaf[] = [];

  const saveLeaf = (l: WorkspaceLeaf) => {
    const viewType = l.view?.getViewType();

    if (isMainPanelLeaf(workspace, l)) {
      if (!excludeMainPanelViewTypes?.includes(viewType)) {
        leaves.push(l);
      }
    } else if (includeSidePanelViewTypes?.includes(viewType)) {
      leaves.push(l);
    }
  };

  workspace.iterateAllLeaves(saveLeaf);
  return leaves;
}
