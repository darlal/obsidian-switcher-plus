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

const LAUNCHER_BUTTON_CLASS = 'qsp-empty-state-action-launch';

/**
 * Adds a custom launcher button to the empty tab view. The button is created by
 * cloning a native empty-state action button so it inherits whatever markup and
 * classes core currently uses.
 * @param  {HTMLElement} containerEl The container element of the empty tab view.
 * @param  {string} buttonLabel The text label for the button.
 * @param  {string} iconName Icon to display, falls back to the core switcher icon when empty.
 * @param  {()=>void} onclickListener The event handler for the button click.
 */
function addLauncherButton(
  containerEl: HTMLElement,
  buttonLabel: string,
  iconName: string,
  onclickListener: () => void,
): void {
  const buttonListEl = containerEl.find('.empty-state-action-list');
  const templateEl = buttonListEl?.find('.empty-state-action');

  if (!templateEl) {
    return;
  }

  // cloneNode() does not copy listeners attached with addEventListener(),
  // so the clone should not carry any core behavior.
  const qspButton = templateEl.cloneNode(true) as HTMLElement;
  qspButton.addClass(LAUNCHER_BUTTON_CLASS);

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
}

export class EmptyTabMonitor {
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

    workspace.iterateAllLeaves((leaf: WorkspaceLeaf) => {
      if (leafHasLoadedViewOfType(leaf, 'empty')) {
        leaf.view.containerEl.find(`.${LAUNCHER_BUTTON_CLASS}`)?.detach();
      }
    });
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
      if (leafHasLoadedViewOfType(leaf, 'empty')) {
        const { containerEl } = leaf.view;

        if (!containerEl.find(`.${LAUNCHER_BUTTON_CLASS}`)) {
          addLauncherButton(containerEl, buttonLabel, iconName, onclickListener);
        }
      }
    });
  }
}
