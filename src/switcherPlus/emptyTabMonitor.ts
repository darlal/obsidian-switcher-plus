import { EventRef, setIcon, setTooltip, Workspace, WorkspaceLeaf } from 'obsidian';
import { leafHasLoadedViewOfType } from 'src/utils';
import { Mode } from 'src/types';
import { SwitcherPlusModal } from './switcherPlus';
import SwitcherPlusPlugin from 'src/main';

interface EmptyTabLauncherConfig {
  isEnabled: boolean;
  buttonLabel: string;
  mode: Mode;
  iconName: string;
}

// Matches the "🔍" icon of the core quick switcher, which the mobile launcher
// also keeps when no custom iconName is configured.
const DEFAULT_LAUNCHER_ICON = 'lucide-search';

/**
 * Adds a custom launcher button to the empty tab view. The button is created by
 * cloning a native empty-state action button so it inherits whatever markup and
 * classes core currently uses.
 * @param  {HTMLElement} containerEl The container element of the empty tab view.
 * @param  {string} buttonLabel The text label for the button.
 * @param  {string} iconName Icon to display, falls back to the core switcher icon when empty.
 * @param  {()=>void} onclickListener The event handler for the button click.
 * @returns HTMLElement The created button element, or null if no native action
 * button was found to clone.
 */
function addLauncherButton(
  containerEl: HTMLElement,
  buttonLabel: string,
  iconName: string,
  onclickListener: () => void,
): HTMLElement {
  const buttonListEl = containerEl.find('.empty-state-action-list');
  const templateEl = buttonListEl?.find('.empty-state-action');

  if (!templateEl) {
    return null;
  }

  // cloneNode() does not copy listeners attached with addEventListener(),
  // so the clone should not carry any core behavior.
  const qspButton = templateEl.cloneNode(true) as HTMLElement;
  qspButton.addClass('qsp-empty-state-action-launch');

  // Hotkey badge belongs to the cloned core command, not to this launcher
  qspButton.find('.empty-state-hotkey')?.detach();

  const iconEl = qspButton.find('.text-button-icon');
  if (iconEl) {
    setIcon(iconEl, iconName?.length ? iconName : DEFAULT_LAUNCHER_ICON);
  }

  const labelEl = qspButton.find('.text-button-label');
  if (labelEl) {
    labelEl.setText(buttonLabel);
  } else {
    // Unrecognized inner structure, keep the outer styling and show the label
    qspButton.setText(buttonLabel);
  }

  // The clone still carries the template's aria-label, core sets it via setTooltip
  setTooltip(qspButton, buttonLabel);

  qspButton.addEventListener('click', onclickListener);

  // The clone keeps the template's tabindex/role="button", so it must also be
  // activatable from the keyboard too.
  qspButton.addEventListener('keydown', (evt: KeyboardEvent) => {
    if (!evt.isComposing && (evt.key === 'Enter' || evt.key === ' ')) {
      evt.preventDefault();
      onclickListener();
    }
  });

  buttonListEl.appendChild(qspButton);
  return qspButton;
}

export class EmptyTabMonitor {
  static readonly emptyLeaves = new Map<WorkspaceLeaf, HTMLElement>();
  private static layoutChangeEventRef: EventRef;

  static installEmptyTabMonitor(
    plugin: SwitcherPlusPlugin,
    config: EmptyTabLauncherConfig,
  ): void {
    if (!config?.isEnabled) {
      return;
    }

    const { workspace } = plugin.app;
    EmptyTabMonitor.layoutChangeEventRef = workspace.on('layout-change', () => {
      EmptyTabMonitor.updateEmptyTabs(workspace, plugin, config);
    });

    plugin.registerEvent(EmptyTabMonitor.layoutChangeEventRef);

    // Initial check when monitoring starts
    workspace.onLayoutReady(() => {
      EmptyTabMonitor.updateEmptyTabs(workspace, plugin, config);
    });
  }

  static removeEmptyTabButtons(workspace: Workspace): void {
    workspace.offref(EmptyTabMonitor.layoutChangeEventRef);
    EmptyTabMonitor.layoutChangeEventRef = null;

    const { emptyLeaves } = EmptyTabMonitor;
    for (const key of emptyLeaves.keys()) {
      emptyLeaves.get(key)?.detach();
      emptyLeaves.delete(key);
    }
  }

  /**
   * Iterates through all workspace leaves and adds a custom launcher button to any
   * empty leaves that do not already have one.
   * @param workspace
   * @param plugin - The Switcher++ plugin instance.
   * @param config
   */
  static updateEmptyTabs(
    workspace: Workspace,
    plugin: SwitcherPlusPlugin,
    config: EmptyTabLauncherConfig,
  ): void {
    if (!config.isEnabled) {
      return;
    }
    const { buttonLabel, mode, iconName } = config;
    const onclickListener = () => {
      if (mode) {
        SwitcherPlusModal.createAndOpen(plugin.app, plugin, mode);
      }
    };

    workspace.iterateAllLeaves((leaf: WorkspaceLeaf) => {
      const { emptyLeaves } = EmptyTabMonitor;

      if (leafHasLoadedViewOfType(leaf, 'empty') && !emptyLeaves.has(leaf)) {
        const { containerEl } = leaf.view;
        const qspButton = addLauncherButton(
          containerEl,
          buttonLabel,
          iconName,
          onclickListener,
        );

        if (qspButton) {
          emptyLeaves.set(leaf, qspButton);
        }
      }
    });
  }
}
