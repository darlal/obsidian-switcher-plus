/**
 * Creates a YAML string representing a Base configuration file with views.
 * This fixture is used for testing Base view extraction functionality.
 *
 * @returns A YAML string containing a Base configuration with multiple views
 */
export function makeBaseFileContentString(): string {
  return `views:
  - type: table
    name: All Tasks
  - type: list
    name: Project List
  - type: cards
    name: Kanban Board
  - type: custom
    name: Custom View
`;
}

/**
 * Creates a YAML string representing a Base configuration file with an empty views array.
 * Used for testing edge cases where no views are defined.
 *
 * @returns A YAML string with an empty views array
 */
export function makeBaseFileContentStringEmptyViews(): string {
  return `views: []
`;
}

/**
 * Creates a YAML string representing a Base configuration file without a views property.
 * Used for testing edge cases where the views key is missing.
 *
 * @returns A YAML string without a views property
 */
export function makeBaseFileContentStringNoViews(): string {
  return `name: My Base
description: A test base file
`;
}

/**
 * Creates a YAML string representing an invalid Base configuration file.
 * Used for testing error handling when YAML parsing fails.
 *
 * @returns An invalid YAML string
 */
export function makeBaseFileContentStringInvalid(): string {
  return `views:
  - type: table
    name: All Tasks
    invalid: [unclosed array`;
}
