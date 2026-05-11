import type { MutorConfig } from "../types/types";

/**
 * Parses a given template block by analyzing it for syntax correctness and whitespace control.
 * @param templateBlock A block of template code (`{{~ for user of users ~}}`)
 */
export default function parse(
  templateBlock: string,
  { delimiters }: Pick<MutorConfig, "delimiters">,
) {
  const openingTagWithWhitespaceCtrl = `${delimiters.openingTag}${delimiters.whitespaceTrim}`;
  const closingTagWithWhitespaceCtrl = `${delimiters.whitespaceTrim}${delimiters.closingTag}`;

  const leftTrim = templateBlock.startsWith(openingTagWithWhitespaceCtrl);
  const rightTrim = templateBlock.endsWith(closingTagWithWhitespaceCtrl);

  const isComment = templateBlock.startsWith(
    leftTrim
      ? openingTagWithWhitespaceCtrl + delimiters.commentTag
      : delimiters.openingTag + delimiters.commentTag,
  );

  if (isComment) {
    return { isComment, leftTrim, rightTrim };
  }

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
    trimmed.startsWith("for") ||
    trimmed.startsWith("if") ||
    trimmed.startsWith("else");
  const requiresBlockClose =
    trimmed.startsWith("for") || trimmed.startsWith("if");
  const isBlockEnd = trimmed === "end";
  const hasContext = trimmed.startsWith("for");

  return {
    leftTrim,
    rightTrim,
    inner,
    isBlock,
    isBlockEnd,
    hasContext,
    requiresBlockClose,
  };
}
