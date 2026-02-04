import { Modifier } from 'obsidian';
import { Facet, FacetSettingsData } from 'src/types';
import { CustomKeymapInfo } from './switcherPlusKeymap';

export class FacetInstructionRenderer {
  static render(
    parentEl: HTMLElement,
    facetSettings: FacetSettingsData,
    facetKeysInfo: Array<CustomKeymapInfo & { facet: Facet }>,
    helpers: {
      getCustomInstructionsEl: (
        type: 'custom' | 'facets' | 'modes',
        parent: HTMLElement,
      ) => HTMLDivElement;
      createPromptInstructionCommandEl: (
        parentEl: HTMLElement,
        command: string,
        purpose?: string,
        clsCommand?: string[],
        clsPurpose?: string[],
      ) => HTMLDivElement;
      commandDisplayStr: (modifiers: Modifier[], key?: string) => string;
    },
  ): void {
    if (facetKeysInfo?.length && facetSettings.shouldShowFacetInstructions) {
      const facetInstructionsEl = helpers.getCustomInstructionsEl('facets', parentEl);

      facetInstructionsEl.empty();
      parentEl.appendChild(facetInstructionsEl);

      // render the preamble
      const preamble = `filters | ${helpers.commandDisplayStr(facetSettings.modifiers)}`;
      helpers.createPromptInstructionCommandEl(facetInstructionsEl, preamble);

      // render each key instruction
      facetKeysInfo.forEach((facetKeyInfo) => {
        const { facet, command, purpose } = facetKeyInfo;
        let modifiers: Modifier[];
        let key: string;
        let activeCls: string[] = null;

        if (facet) {
          // Note: the command only contain the key, the modifiers has to be derived
          key = command;
          modifiers = facet.modifiers;

          if (facet.isActive) {
            activeCls = ['qsp-filter-active'];
          }
        } else {
          // Note: only the reset key is expected to not have an associated facet
          key = facetSettings.resetKey;
          modifiers = facetSettings.resetModifiers;
        }

        // if a modifier is specified for this specific facet, it overrides the
        // default modifier so display that too. Otherwise, just show the key alone.
        // Note: In this case the modifier is purposely displayed separately in parenthesis
        // to indicate to the user that it's not the "standard" modifier.
        const commandDisplayText = modifiers
          ? `(${helpers.commandDisplayStr(modifiers)}) ${key}`
          : `${key}`;

        helpers.createPromptInstructionCommandEl(
          facetInstructionsEl,
          commandDisplayText,
          purpose,
          [],
          activeCls,
        );
      });
    }
  }
}
