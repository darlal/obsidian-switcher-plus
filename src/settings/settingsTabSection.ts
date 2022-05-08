import { SwitcherPlusSettings } from './switcherPlusSettings';
import { App, PluginSettingTab, Setting } from 'obsidian';

// type IfEquals<X, Y, A, B> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y
//   ? 1
//   : 2
//   ? A
//   : B;

// // Type that represents only the writable keys of an object
// // https://stackoverflow.com/a/49579497
// export type WritableKeysOf<T> = {
//   [P in keyof T]: IfEquals<{ [Q in P]: T[P] }, { -readonly [Q in P]: T[P] }, P, never>;
// }[keyof T];

// // type WritableSettingsConfigKeys = Pick<
// //   SwitcherPlusSettings,
// //   WritableKeysOf<SwitcherPlusSettings>
// // >;

// type ReadonlyKeys = 'builtInSystemOptions' | 'editorListPlaceholderText' | 'excludeViewTypes' | 'headingsListPlaceholderText' | 'includeSidePanelViewTypesPlaceholder' | 'referenceViews' | 'relatedItemsListPlaceholderText' | 'showAllFileTypes' | 'showAttachments' | 'showExistingOnly' | 'starredListPlaceholderText' | 'symbolListPlaceholderText' | 'workspaceListPlaceholderText';
// type WritableSettingsConfigKeys = keyof Omit<SwitcherPlusSettings, ReadonlyKeys>;

export abstract class SettingsTabSection {
  constructor(
    private app: App,
    private mainSettingsTab: PluginSettingTab,
    protected settings: SwitcherPlusSettings,
  ) {}

  public abstract display(containerEl: HTMLElement): void;

  public createSetting(containerEl: HTMLElement, name: string, desc: string): Setting {
    const setting = new Setting(containerEl);
    setting.setName(name);
    setting.setDesc(desc);

    return setting;
  }

  // public createTextSetting(
  //   containerEl: HTMLElement,
  //   name: string,
  //   desc: string,
  //   placeholderText: string,
  //   initialValue: string,
  //   // settingsConfigStorageKey: keyof WritableSettingsConfigKeys,
  //   settingsConfigStorageKey: keyof Omit<SwitcherPlusSettings, ReadonlyKeys>,
  // ): Setting {
  //   const setting = this.createSetting(containerEl, name, desc);
  //   setting.addText((textComponent) => {
  //     textComponent
  //       .setPlaceholder(placeholderText)
  //       .setValue(initialValue)
  //       .onChange((rawValue) => {
  //         const value = rawValue.length ? rawValue : initialValue;
  //         const settingsConfig = this.settings;

  //         settingsConfig[settingsConfigStorageKey] = value;
  //         settingsConfig.save();
  //       });
  //   });

  //   return setting;
  // }
}
