/**
 * Default configuration options for the compiler.
 */
export const config = {
  /**
   * Tells the compiler whether to include the opening tag escape delimiter in the output.
   */
  keepOpeningTagEscapeDelimiter: false,
};

/**
 * Default delimiters for template blocks.
 */
export const delimiters = {
  /**
   * Defines the beginning of a template block.
   */
  openingTag: "{{",
  /**
   * Defines the end of a template block.
   */
  closingTag: "}}",
  /**
   * Specifies whether to trim whitespace before or after template blocks.
   */
  whitespaceEscape: "-",
  /**
   * Tells the compiler that the following text should not be treated as an template block opening tag.
   */
  openingTagEscape: "!",
};
