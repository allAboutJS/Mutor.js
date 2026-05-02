import { delimiters } from "./utils/defaults";

/**
 * Parses a given template block by analyzing it for syntax correctness and whitespace control.
 * @param templateBlock A block of template code (`{{~ for user of users ~}}`)
 */
export default function parse(templateBlock: string) {
  const openingTagWithWhitespaceCtrl = `${delimiters.openingTag}${delimiters.whitespaceTrim}`;
  const closingTagWithWhitespaceCtrl = `${delimiters.whitespaceTrim}${delimiters.closingTag}`;

  const leftTrim = templateBlock.startsWith(openingTagWithWhitespaceCtrl);
  const rightTrim = templateBlock.endsWith(closingTagWithWhitespaceCtrl);

  const inner = templateBlock.slice(
    leftTrim
      ? openingTagWithWhitespaceCtrl.length
      : delimiters.openingTag.length,
    templateBlock.length -
      (rightTrim
        ? closingTagWithWhitespaceCtrl.length
        : delimiters.closingTag.length),
  );

  const trimmed = inner.trim();
  const isBlock =
    trimmed.startsWith("for") || trimmed.startsWith("if") || trimmed === "else";
  const isBlockEnd = trimmed === "end";
  const hasContext = trimmed.startsWith("for");

  return {
    leftTrim,
    rightTrim,
    inner,
    isBlock,
    isBlockEnd,
    hasContext,
  };
}
