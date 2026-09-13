import { mock } from 'jest-mock-extended';
import {
  App,
  ButtonComponent,
  DropdownComponent,
  PluginSettingTab,
  SettingDefinitionItem,
  TextComponent,
} from 'obsidian';

export class MockPluginSettingTab implements PluginSettingTab {
  app: App;
  containerEl: HTMLElement;
  icon: string = '';
  settingItems: SettingDefinitionItem[] = [];

  constructor(app: App) {
    this.containerEl = mock<HTMLElement>();
    this.app = app;
  }

  hide() {
    throw new Error('Method not implemented.');
  }
  display() {
    throw new Error('Method not implemented.');
  }
  getSettingDefinitions(): SettingDefinitionItem[] {
    return [];
  }
  update(): void {
    this.settingItems = this.getSettingDefinitions();
  }
  refreshDomState(): void {
    // no-op in tests; the real implementation only touches CSS state
  }
  getControlValue(_key: string): unknown {
    return undefined;
  }
  setControlValue(_key: string, _value: unknown): void {
    // no-op; SwitcherPlusSettingTab overrides this
  }
}

export class MockSetting {
  private containerEl;
  public components: Array<any> = [];

  constructor(containerEl: HTMLElement) {
    this.containerEl = containerEl;
  }

  addText(cb: (component: TextComponent) => any): this {
    const comp = new MockTextComponent(this.containerEl);
    this.components.push(comp);
    cb(comp);
    return this;
  }

  addDropdown(cb: (component: DropdownComponent) => any): this {
    const comp = new MockDropdownComponent(this.containerEl);
    this.components.push(comp);
    cb(comp);
    return this;
  }

  addButton(cb: (component: ButtonComponent) => any): this {
    const comp = new MockButtonComponent(this.containerEl);
    this.components.push(comp);
    cb(comp as unknown as ButtonComponent);
    return this;
  }
}

export class MockTextComponent implements TextComponent {
  inputEl: HTMLInputElement;
  disabled: boolean;
  onChangeCB: (value: string) => any;

  constructor(public containerEl: HTMLElement) {
    this.inputEl = mock<HTMLInputElement>();
  }

  getValue(): string {
    return this.inputEl.value;
  }

  setValue(value: string): this {
    this.inputEl.value = value;

    if (this.onChangeCB) {
      this.onChangeCB(value);
    }

    return this;
  }

  setPlaceholder(placeholder: string): this {
    return this;
  }

  onChange(callback: (value: string) => any): this {
    this.onChangeCB = callback;
    return this;
  }

  setDisabled(disabled: boolean): this {
    throw new Error('Method not implemented.');
  }
  onChanged(): void {
    throw new Error('Method not implemented.');
  }
  registerOptionListener(
    listeners: Record<string, (value?: string) => string>,
    key: string,
  ): this {
    throw new Error('Method not implemented.');
  }
  then(cb: (component: this) => any): this {
    throw new Error('Method not implemented.');
  }
}

export class MockDropdownComponent implements DropdownComponent {
  selectEl: HTMLSelectElement;
  onChangeCB: (value: string) => any;
  options: Record<string, string>;

  constructor(public containerEl: HTMLElement) {
    this.selectEl = mock<HTMLSelectElement>();
  }

  getValue(): string {
    return this.selectEl.value;
  }

  setValue(value: string): this {
    this.selectEl.value = value;

    if (this.onChangeCB) {
      this.onChangeCB(value);
    }

    return this;
  }

  addOptions(options: Record<string, string>): this {
    this.options = options;
    return this;
  }

  onChange(callback: (value: string) => any): this {
    this.onChangeCB = callback;
    return this;
  }

  setDisabled(disabled: boolean): this {
    throw new Error('Method not implemented.');
  }
  addOption(value: string, display: string): this {
    throw new Error('Method not implemented.');
  }
  registerOptionListener(
    listeners: Record<string, (value?: string) => string>,
    key: string,
  ): this {
    throw new Error('Method not implemented.');
  }
  disabled: boolean;
  then(cb: (component: this) => any): this {
    throw new Error('Method not implemented.');
  }
}

export class MockButtonComponent {
  buttonEl: HTMLButtonElement;
  text: string;
  isCta = false;
  onClickCB: (evt: MouseEvent) => unknown;

  constructor(public containerEl: HTMLElement) {
    this.buttonEl = mock<HTMLButtonElement>();
  }

  setButtonText(name: string): this {
    this.text = name;
    return this;
  }

  setCta(): this {
    this.isCta = true;
    return this;
  }

  removeCta(): this {
    this.isCta = false;
    return this;
  }

  onClick(cb: (evt: MouseEvent) => unknown): this {
    this.onClickCB = cb;
    return this;
  }
}
