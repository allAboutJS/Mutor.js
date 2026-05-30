import type { MutorConfig } from "../types/types";

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

  const inner = templateBlock.slice(openLen, templateBlock.length - closeLen);
  const trimmed = inner.trim();

  const isComment = trimmed.startsWith(delimiters.commentTag);
  if (isComment) {
    return { isComment, leftTrim, rightTrim };
  }

  return {
    leftTrim,
    rightTrim,
    inner,
    isBlock:
      trimmed.startsWith("for ") ||
      trimmed.startsWith("if ") ||
      trimmed === "else" ||
      trimmed.startsWith("else if "),
    isBlockEnd: trimmed === "end",
    hasContext: trimmed.startsWith("for "),
    requiresBlockClose: trimmed.startsWith("for ") || trimmed.startsWith("if "),
    usesAwait: inner.includes("Mutor::await"),
  };
}
