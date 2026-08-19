import { App, Modal, Setting } from 'obsidian';

/**
 * Shared by the single datalist a free text field can offer. Only one entry
 * modal is open at a time, so a fixed id is unambiguous.
 */
const SUGGESTIONS_DATALIST_ID = 'qsp-list-entry-suggestions';

export interface ListEntryModalOptions {
  title: string;
  /**
   * Explains the field's semantics. A list renders as its own setting group, so
   * there's no way to add descriptive text. The dialog that edits an entry is
   *  where that explanation stays attached to what it describes.
   */
  desc?: string;
  /** Fixed choices render a dropdown; omit for a free-text field. */
  options?: string[];
  /** Suggestion values for a free-text field, offered via a datalist. */
  suggestions?: string[];
  placeholder?: string;
  /** Present when editing an existing entry rather than adding a new one. */
  initialValue?: string;
  /** Return a message to reject, or undefined to accept. Runs on submit. */
  validate?: (value: string) => string | undefined;
  /** Last transform before the value is handed back. */
  normalize?: (value: string) => string;
  onSubmit: (value: string) => void;
}

/**
 * Composes the checks every free text list field shares, the shared failures are reported before the setting specific
 * rule, so a blank or duplicate entry never reaches a regex compile.
 * @param  {string[]} existingEntries entries already stored, excluding the one
 *   being edited
 * @param  {(value:string)=>string|undefined} rule? setting specific check
 * @returns the composed validator
 */
export function validateNewEntry(
  existingEntries: string[],
  rule?: (value: string) => string | undefined,
): (value: string) => string | undefined {
  return (value) => {
    if (!value.trim().length) {
      return 'Enter a value.';
    }

    if (existingEntries.includes(value)) {
      return `"${value}" is already in the list.`;
    }

    return rule ? rule(value) : undefined;
  };
}

/**
 * Opens the add/edit dialog for a single list entry. Validation runs
 * on submit, so an incomplete or rejected entry is never persisted.
 * @param  {App} app
 * @param  {ListEntryModalOptions} opts
 * @returns the Setting holding the input field and the action buttons
 */
export function openListEntryModal(app: App, opts: ListEntryModalOptions): Setting {
  const { title, desc, options, suggestions, placeholder, initialValue } = opts;
  const { validate, normalize, onSubmit } = opts;

  const modal = new Modal(app);
  modal.titleEl.setText(title);
  modal.contentEl.empty();

  if (desc) {
    modal.contentEl.createDiv({ cls: 'qsp-list-entry-description', text: desc });
  }

  const errorEl = modal.contentEl.createDiv({ cls: 'qsp-list-entry-error' });
  const setting = new Setting(modal.contentEl);

  let rawValue = initialValue ?? (options?.length ? options[0] : '');

  if (options) {
    setting.addDropdown((comp) => {
      comp.addOptions(Object.fromEntries(options.map((option) => [option, option])));
      comp.setValue(rawValue);
      comp.onChange((value) => {
        rawValue = value;
      });
    });
  } else {
    setting.addText((comp) => {
      comp.setPlaceholder(placeholder ?? '');
      comp.setValue(rawValue);
      comp.onChange((value) => {
        rawValue = value;
      });

      if (suggestions?.length) {
        const datalistEl = modal.contentEl.createEl('datalist', {
          attr: { id: SUGGESTIONS_DATALIST_ID },
        });

        suggestions.forEach((suggestion) => {
          datalistEl.createEl('option', { value: suggestion });
        });

        comp.inputEl.setAttribute('list', SUGGESTIONS_DATALIST_ID);
      }
    });
  }

  setting.addButton((comp) => {
    comp.setButtonText('Cancel');
    comp.onClick(() => modal.close());
  });

  setting.addButton((comp) => {
    comp.setButtonText(initialValue === undefined ? 'Add' : 'Save');
    comp.setCta();
    comp.onClick(() => {
      const value = normalize ? normalize(rawValue) : rawValue;
      const error = validate ? validate(value) : undefined;

      if (error) {
        errorEl.setText(error);
        return;
      }

      onSubmit(value);
      modal.close();
    });
  });

  modal.open();

  return setting;
}
