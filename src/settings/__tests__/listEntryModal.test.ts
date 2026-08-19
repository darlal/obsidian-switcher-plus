import { mock, MockProxy } from 'jest-mock-extended';
import { App, DropdownComponent, Modal, TextComponent } from 'obsidian';
import {
  ListEntryModalOptions,
  openListEntryModal,
  validateNewEntry,
} from '../listEntryModal';

// openListEntryModal returns the Setting it builds, which the obsidian mock
// resolves to a MockSetting exposing the components it was configured with.
type MockSettingLike = { components: unknown[] };
type MockDropdownLike = Pick<DropdownComponent, 'getValue' | 'setValue'> & {
  options: Record<string, string>;
};
type MockTextLike = Pick<TextComponent, 'getValue' | 'setValue' | 'inputEl'>;
type MockButtonLike = { text: string; onClickCB: (evt: MouseEvent) => unknown };

describe('listEntryModal', () => {
  let mockApp: MockProxy<App>;
  let mockContentEl: MockProxy<HTMLElement>;
  let mockTitleEl: MockProxy<HTMLElement>;
  let mockErrorEl: MockProxy<HTMLDivElement>;
  let mockDatalistEl: MockProxy<HTMLElement>;
  let mockModal: MockProxy<Modal>;

  /** The Setting the factory builds inside the modal body. */
  let bodySetting: MockSettingLike;

  /** Opens the modal, keeping the Setting it returns for the helpers below. */
  const openModal = (opts: ListEntryModalOptions) => {
    bodySetting = openListEntryModal(mockApp, opts);
  };

  const inputComponent = <T>() => bodySetting.components[0] as T;

  const buttonNamed = (text: string) =>
    bodySetting.components.find(
      (comp) => (comp as MockButtonLike).text === text,
    ) as MockButtonLike;

  beforeEach(() => {
    mockApp = mock<App>();
    mockErrorEl = mock<HTMLDivElement>();
    mockDatalistEl = mock<HTMLElement>();
    mockContentEl = mock<HTMLElement>();
    mockTitleEl = mock<HTMLElement>();

    mockContentEl.createDiv.mockReturnValue(mockErrorEl);
    mockContentEl.createEl.mockReturnValue(mockDatalistEl);

    mockModal = mock<Modal>({ contentEl: mockContentEl, titleEl: mockTitleEl });
    (Modal as unknown as jest.Mock).mockImplementation(() => mockModal);
  });

  afterAll(() => {
    (Modal as unknown as jest.Mock).mockReset();
  });

  describe('openListEntryModal', () => {
    it('should set the title, clear the body, and open the modal', () => {
      openModal({ title: 'Add tag', onSubmit: jest.fn() });

      expect(mockTitleEl.setText).toHaveBeenCalledWith('Add tag');
      expect(mockContentEl.empty).toHaveBeenCalled();
      expect(mockModal.open).toHaveBeenCalled();
    });

    it('should render the description above the field when desc is supplied', () => {
      openModal({
        title: 'Add excluded tag',
        desc: 'Tags should be entered without the # prefix.',
        onSubmit: jest.fn(),
      });

      expect(mockContentEl.createDiv).toHaveBeenCalledWith({
        cls: 'qsp-list-entry-description',
        text: 'Tags should be entered without the # prefix.',
      });
    });

    it('should render a dropdown seeded with the first option when options are supplied', () => {
      openModal({
        title: 'Add type',
        options: ['backlink', 'diskLocation'],
        onSubmit: jest.fn(),
      });

      const dropdown = inputComponent<MockDropdownLike>();

      expect(dropdown.options).toEqual({
        backlink: 'backlink',
        diskLocation: 'diskLocation',
      });
      expect(dropdown.getValue()).toBe('backlink');
    });

    it('should submit the selected dropdown value and close', () => {
      const onSubmit = jest.fn();
      openModal({
        title: 'Add type',
        options: ['backlink', 'diskLocation'],
        onSubmit,
      });

      inputComponent<MockDropdownLike>().setValue('diskLocation');
      buttonNamed('Add').onClickCB(null);

      expect(onSubmit).toHaveBeenCalledWith('diskLocation');
      expect(mockModal.close).toHaveBeenCalled();
    });

    it('should seed the dropdown with an empty value when no options remain', () => {
      openModal({
        title: 'Add type',
        options: [],
        onSubmit: jest.fn(),
      });

      expect(inputComponent<MockDropdownLike>().getValue()).toBe('');
    });

    it('should render an empty text field without a datalist when no options or suggestions are supplied', () => {
      openModal({
        title: 'Add folder',
        placeholder: '^Archive',
        onSubmit: jest.fn(),
      });

      expect(inputComponent<MockTextLike>().getValue()).toBe('');
      expect(mockContentEl.createEl).not.toHaveBeenCalled();
    });

    it('should populate a datalist and point the input at it when suggestions are supplied', () => {
      openModal({
        title: 'Add view type',
        suggestions: ['backlink', 'markdown'],
        onSubmit: jest.fn(),
      });

      expect(mockContentEl.createEl).toHaveBeenCalledWith('datalist', {
        attr: { id: 'qsp-list-entry-suggestions' },
      });
      expect(mockDatalistEl.createEl).toHaveBeenCalledWith('option', {
        value: 'backlink',
      });
      expect(mockDatalistEl.createEl).toHaveBeenCalledWith('option', {
        value: 'markdown',
      });
      expect(inputComponent<MockTextLike>().inputEl.setAttribute).toHaveBeenCalledWith(
        'list',
        'qsp-list-entry-suggestions',
      );
    });

    it('should seed the field and label the submit button Save in edit mode', () => {
      openModal({
        title: 'Edit folder',
        initialValue: '^Archive',
        onSubmit: jest.fn(),
      });

      expect(inputComponent<MockTextLike>().getValue()).toBe('^Archive');
      expect(buttonNamed('Save')).toBeDefined();
    });

    it('should normalize the value before validating and submitting', () => {
      const onSubmit = jest.fn();
      const validate = jest.fn().mockReturnValue(undefined);
      openModal({
        title: 'Add tag',
        normalize: (value) => value.trim().replace(/^#/, ''),
        validate,
        onSubmit,
      });

      inputComponent<MockTextLike>().setValue('  #draft ');
      buttonNamed('Add').onClickCB(null);

      expect(validate).toHaveBeenCalledWith('draft');
      expect(onSubmit).toHaveBeenCalledWith('draft');
    });

    it('should submit the raw value when no normalize or validate is supplied', () => {
      const onSubmit = jest.fn();
      openModal({ title: 'Add folder', onSubmit });

      inputComponent<MockTextLike>().setValue(' ^Draft ');
      buttonNamed('Add').onClickCB(null);

      expect(onSubmit).toHaveBeenCalledWith(' ^Draft ');
    });

    it('should show the rejection message and neither submit nor close when validation fails', () => {
      const onSubmit = jest.fn();
      openModal({
        title: 'Add folder',
        validate: () => 'Enter a value.',
        onSubmit,
      });

      buttonNamed('Add').onClickCB(null);

      expect(mockErrorEl.setText).toHaveBeenCalledWith('Enter a value.');
      expect(onSubmit).not.toHaveBeenCalled();
      expect(mockModal.close).not.toHaveBeenCalled();
    });

    it('should close without submitting when Cancel is clicked', () => {
      const onSubmit = jest.fn();
      openModal({ title: 'Add tag', onSubmit });

      buttonNamed('Cancel').onClickCB(null);

      expect(onSubmit).not.toHaveBeenCalled();
      expect(mockModal.close).toHaveBeenCalled();
    });
  });

  describe('validateNewEntry', () => {
    it('should reject a value that is empty after trimming', () => {
      expect(validateNewEntry([])('   ')).toEqual(expect.stringContaining('Enter'));
    });

    it('should reject a value already present, naming it', () => {
      expect(validateNewEntry(['canvas'])('canvas')).toEqual(
        expect.stringContaining('canvas'),
      );
    });

    it('should return the additional rule result for a value that passes both shared checks', () => {
      const rule = jest.fn().mockReturnValue('bad regex');

      expect(validateNewEntry([], rule)('[unclosed')).toBe('bad regex');
      expect(rule).toHaveBeenCalledWith('[unclosed');
    });

    it('should accept a new value when no additional rule is supplied', () => {
      expect(validateNewEntry(['canvas'])('pdf')).toBeUndefined();
    });
  });
});
