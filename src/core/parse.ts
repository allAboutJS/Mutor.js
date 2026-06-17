import type { MutorConfig } from "../types/types";

/**
 * Parses a template directive block by removing delimiters, detecting whitespace-trim modifiers,
 * and classifying the block as a comment, control-flow directive, or block terminator.
 * @param templateBlock The template block to parse.
 * @param delimiters The delimiters to use for parsing.
 * @returns The parsed AST node.
 */
export default function parse(
  templateBlock: string,
  { delimiters }: Pick<MutorConfig, "delimiters">,
) {
  const openingTagWithWhitespaceCtrl = `${delimiters.openingTag}${delimiters.whitespaceTrim}`;
  const closingTagWithWhitespaceCtrl = `${delimiters.whitespaceTrim}${delimiters.closingTag}`;

  const leftTrim = templateBlock.startsWith(openingTagWithWhitespaceCtrl);
  const rightTrim = templateBlock.endsWith(closingTagWithWhitespaceCtrl);

  const openLen = leftTrim
    ? openingTagWithWhitespaceCtrl.length
    : delimiters.openingTag.length;
  const closeLen = rightTrim
    ? closingTagWithWhitespaceCtrl.length
    : delimiters.closingTag.length;

  const inner = templateBlock
    .slice(openLen, templateBlock.length - closeLen)
    .trim();

  const isComment = leftTrim
    ? templateBlock.startsWith(`${openingTagWithWhitespaceCtrl}#`)
    : templateBlock.startsWith(`${delimiters.openingTag}#`);

  if (isComment) {
    return { isComment, leftTrim, rightTrim };
  }

  return {
    leftTrim,
    rightTrim,
    inner,
    isBlock:
      inner.startsWith("for ") ||
      inner.startsWith("if ") ||
      inner === "else" ||
      inner.startsWith("else if ") ||
      inner === "break" ||
      inner === "continue",
    isBlockEnd: inner === "endif" || inner === "endfor",
    hasContext: inner.startsWith("for "),
    requiresBlockClose: inner.startsWith("for ") || inner.startsWith("if "),
  };
}
