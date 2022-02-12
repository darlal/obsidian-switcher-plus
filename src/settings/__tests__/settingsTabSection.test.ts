import { SwitcherPlusSettings } from '../switcherPlusSettings';
import { SettingsTabSection } from '../SettingsTabSection';
import { Chance } from 'chance';
import { mock } from 'jest-mock-extended';
import { App, PluginSettingTab, Setting } from 'obsidian';

const chance = new Chance();

class TestSettingsTabSection extends SettingsTabSection {
  public display(_containerEl: HTMLElement): void {
    throw new Error('Method not implemented.');
  }
}

describe('settingTabSection', () => {
  it('should create a Setting with name and description', () => {
    const setNameSpy = jest.spyOn(Setting.prototype, 'setName');
    const setDescSpy = jest.spyOn(Setting.prototype, 'setDesc');

    const sut = new TestSettingsTabSection(
      mock<App>(),
      mock<PluginSettingTab>(),
      mock<SwitcherPlusSettings>(),
    );

    const name = chance.word();
    const desc = chance.word();
    const setting = sut.createSetting(mock<HTMLElement>(), name, desc);

    expect(setting).not.toBeFalsy();
    expect(setNameSpy).toHaveBeenCalledWith(name);
    expect(setDescSpy).toHaveBeenCalledWith(desc);

    setNameSpy.mockRestore();
    setDescSpy.mockRestore();
  });
});
