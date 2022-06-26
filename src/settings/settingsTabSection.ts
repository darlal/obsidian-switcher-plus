import { SwitcherPlusSettings } from './switcherPlusSettings';
import { App, PluginSettingTab, Setting } from 'obsidian';
import { WritableKeysWithValueOfType } from 'src/types';
import { WritableKeys } from 'ts-essentials';

type StringTypedConfigKey = WritableKeysWithValueOfType<SwitcherPlusSettings, string>;
type BooleanTypedConfigKey = WritableKeysWithValueOfType<SwitcherPlusSettings, boolean>;
type ListTypedConfigKey = WritableKeysWithValueOfType<
  SwitcherPlusSettings,
  Array<string>
>;

export abstract class SettingsTabSection {
  constructor(
    protected app: App,
    protected mainSettingsTab: PluginSettingTab,
    protected config: SwitcherPlusSettings,
  ) {}

  abstract display(containerEl: HTMLElement): void;

  /**
   * Creates a new Setting with the given name and description.
   * @param  {HTMLElement} containerEl
   * @param  {string} name
   * @param  {string} desc
   * @returns Setting
   */
  createSetting(containerEl: HTMLElement, name?: string, desc?: string): Setting {
    const setting = new Setting(containerEl);
    setting.setName(name);
    setting.setDesc(desc);

    return setting;
  }
  /**
   * Create section title elements and divider.
   * @param  {HTMLElement} containerEl
   * @param  {string} title
   * @param  {string} desc?
   * @returns Setting
   */
  addSectionTitle(containerEl: HTMLElement, title: string, desc = ''): Setting {
    const setting = this.createSetting(containerEl, title, desc);
    setting.setHeading();

    return setting;
  }

  /**
   * Creates a HTMLInput element setting.
   * @param  {HTMLElement} containerEl The element to attach the setting to.
   * @param  {string} name
   * @param  {string} desc
   * @param  {string} initialValue
   * @param  {StringTypedConfigKey} configStorageKey The SwitcherPlusSettings key where the value for this setting should be stored.
   * @param  {string} placeholderText?
   * @returns Setting
   */
  addTextSetting(
    containerEl: HTMLElement,
    name: string,
    desc: string,
    initialValue: string,
    configStorageKey: StringTypedConfigKey,
    placeholderText?: string,
  ): Setting {
    const setting = this.createSetting(containerEl, name, desc);

    setting.addText((comp) => {
      comp.setPlaceholder(placeholderText);
      comp.setValue(initialValue);

      comp.onChange((rawValue) => {
        const value = rawValue.length ? rawValue : initialValue;
        this.saveChangesToConfig(configStorageKey, value);
      });
    });

    return setting;
  }

  /**
   * Create a Checkbox element setting.
   * @param  {HTMLElement} containerEl The element to attach the setting to.
   * @param  {string} name
   * @param  {string} desc
   * @param  {boolean} initialValue
   * @param  {BooleanTypedConfigKey} configStorageKey The SwitcherPlusSettings key where the value for this setting should be stored.
   * @returns Setting
   */
  addToggleSetting(
    containerEl: HTMLElement,
    name: string,
    desc: string,
    initialValue: boolean,
    configStorageKey: BooleanTypedConfigKey,
  ): Setting {
    const setting = this.createSetting(containerEl, name, desc);

    setting.addToggle((comp) => {
      comp.setValue(initialValue);
      comp.onChange((value) => this.saveChangesToConfig(configStorageKey, value));
    });

    return setting;
  }

  /**
   * Create a TextArea element setting.
   * @param  {HTMLElement} containerEl The element to attach the setting to.
   * @param  {string} name
   * @param  {string} desc
   * @param  {string} initialValue
   * @param  {ListTypedConfigKey|StringTypedConfigKey} configStorageKey The SwitcherPlusSettings key where the value for this setting should be stored.
   * @param  {string} placeholderText?
   * @returns Setting
   */
  addTextAreaSetting(
    containerEl: HTMLElement,
    name: string,
    desc: string,
    initialValue: string,
    configStorageKey: ListTypedConfigKey | StringTypedConfigKey,
    placeholderText?: string,
  ): Setting {
    const setting = this.createSetting(containerEl, name, desc);

    setting.addTextArea((comp) => {
      comp.setPlaceholder(placeholderText);
      comp.setValue(initialValue);

      comp.onChange((rawValue) => {
        const value = rawValue.length ? rawValue : initialValue;
        const isArray = Array.isArray(this.config[configStorageKey]);
        this.saveChangesToConfig(configStorageKey, isArray ? value.split('\n') : value);
      });
    });

    return setting;
  }

  addDropdownSetting(
    containerEl: HTMLElement,
    name: string,
    desc: string,
    initialValue: string,
    options: Record<string, string>,
    configStorageKey: StringTypedConfigKey,
    onChange?: (rawValue: string, config: SwitcherPlusSettings) => void,
  ): Setting {
    const setting = this.createSetting(containerEl, name, desc);

    setting.addDropdown((comp) => {
      comp.addOptions(options);
      comp.setValue(initialValue);

      comp.onChange((rawValue) => {
        if (onChange) {
          onChange(rawValue, this.config);
        } else {
          this.saveChangesToConfig(configStorageKey, rawValue);
        }
      });
    });

    return setting;
  }

  /**
   * Updates the internal SwitcherPlusSettings configStorageKey with value, and writes it to disk.
   * @param  {K} configStorageKey The SwitcherPlusSettings key where the value for this setting should be stored.
   * @param  {SwitcherPlusSettings[K]} value
   * @returns void
   */
  saveChangesToConfig<K extends WritableKeys<SwitcherPlusSettings>>(
    configStorageKey: K,
    value: SwitcherPlusSettings[K],
  ): void {
    if (configStorageKey) {
      const { config } = this;
      config[configStorageKey] = value;
      config.save();
    }
  }
}
