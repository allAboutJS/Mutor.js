import { BlockType } from "../types/enums";
import type { CompileMetadata, ForExpr, MutorConfig } from "../types/types";
import escapeRawText from "../utils/escape-raw-text";
import getLineAndColumnNumbers from "../utils/get-line-and-column-nums";
import getLineSnapshot from "../utils/get-line-snapshot";
import build from "./build";
import { MutorCompilerError } from "./error";
import generateAst from "./generate-ast";
import parse from "./parse";
import tokenize from "./tokenize";

export default function compile(
  src: string,
  config: MutorConfig,
  meta: CompileMetadata,
) {
  const scope: string[] = [];
  const blockOpeningStack: { type: BlockType; pos: number }[] = [];
  const {
    delimiters,
    keepOpeningTagEscapeDelimiter,
    allowFnCalls,
    allowedProps,
    forbiddenProps,
    autoEscape,
  } = config;

  // Whitespace control state
  let trimNext = false,
    cursor = 0,
    body = `let acc="";`;

  while (cursor < src.length) {
    const templateOpenTagIdx = src.indexOf(delimiters.openingTag, cursor);

    // Handle Final Text Chunk
    if (templateOpenTagIdx === -1) {
      let lastChunk = src.slice(cursor);
      if (trimNext) lastChunk = lastChunk.trimStart();
      if (lastChunk) body += `acc+=\`${escapeRawText(lastChunk)}\`;`;
      break;
    }

    // Escape Logic
    function isEscaped() {
      let j = templateOpenTagIdx,
        count = 0;
      while (
        j >= delimiters.openingTagEscape.length &&
        src.slice(j - delimiters.openingTagEscape.length, j) ===
          delimiters.openingTagEscape
      ) {
        count++;
        j -= delimiters.openingTagEscape.length;
      }
      return count % 2 === 1;
    }

    if (isEscaped()) {
      let escapedChunk = src.slice(
        cursor,
        keepOpeningTagEscapeDelimiter
          ? templateOpenTagIdx + delimiters.openingTagEscape.length + 1
          : templateOpenTagIdx - delimiters.openingTag.length + 1,
      );

      if (trimNext) {
        escapedChunk = escapedChunk.trimStart();
        trimNext = false;
      }

      body += `acc+=\`${escapeRawText(escapedChunk)}\`;`;
      if (!keepOpeningTagEscapeDelimiter)
        body += `acc+=\`${delimiters.openingTag}\`;`;

      cursor = templateOpenTagIdx + delimiters.openingTag.length;
      continue;
    }

    // Parse Tag Metadata (to check for leftTrim BEFORE processing rawText)
    const templateEndTagIdx = src.indexOf(
      delimiters.closingTag,
      templateOpenTagIdx,
    );

    if (templateEndTagIdx === -1) {
      const { line, lineIndex } = getLineAndColumnNumbers(
        src,
        templateOpenTagIdx,
      );

      const { line: lineText, pos } = getLineSnapshot(
        src,
        lineIndex,
        templateOpenTagIdx,
      );

      throw new MutorCompilerError(
        "No closing tag found.",
        line,
        lineText,
        pos,
        meta.path,
      );
    }

    const template = src.slice(
      templateOpenTagIdx,
      templateEndTagIdx + delimiters.closingTag.length,
    );
    const {
      inner,
      leftTrim,
      rightTrim,
      isBlock,
      isBlockEnd,
      hasContext,
      requiresBlockClose,
    } = parse(template, { delimiters });

    // Process Raw Text (between cursor and current tag)
    let rawText = src.slice(cursor, templateOpenTagIdx);
    if (rawText) {
      if (trimNext) {
        rawText = rawText.trimStart();
      }

      if (leftTrim) {
        rawText = rawText.trimEnd();
      }

      if (rawText) {
        body += `acc+=\`${escapeRawText(rawText)}\`;`;
      }
    }

    // Reset after use
    trimNext = false;

    cursor = templateEndTagIdx + delimiters.closingTag.length;

    try {
      const tokens = tokenize(inner);
      const ast = generateAst(tokens, { allowFnCalls });

      if (isBlock && requiresBlockClose && hasContext) {
        scope.push((ast as ForExpr).variable);
        blockOpeningStack.push({
          type: BlockType.LOOP,
          pos: templateOpenTagIdx,
        });
      } else if (isBlock && requiresBlockClose && !hasContext) {
        blockOpeningStack.push({
          type: BlockType.NON_LOOP,
          pos: templateOpenTagIdx,
        });
      }

      if (isBlockEnd) {
        const lastBlockOpened = blockOpeningStack.pop();
        if (lastBlockOpened?.type === BlockType.LOOP) scope.pop();
        if (lastBlockOpened === undefined)
          throw { message: "Unexpected end of block", pos: templateOpenTagIdx };
      }

      const js = build(ast, { allowedProps, forbiddenProps, scope });

      if (isBlock || isBlockEnd) {
        body += js;
      } else {
        body += autoEscape ? `acc+=escapeFn(${js});` : `acc+=${js};`;
      }

      // Set state for the NEXT raw text chunk
      if (rightTrim) trimNext = true;
    } catch (e) {
      const { message, pos: relPos } = e as { message: string; pos: number };
      const { line, lineIndex } = getLineAndColumnNumbers(
        src,
        templateOpenTagIdx,
      );
      const { line: lineText, pos } = getLineSnapshot(
        src,
        lineIndex,
        templateOpenTagIdx,
      );
      throw new MutorCompilerError(
        message,
        line,
        lineText,
        pos +
          relPos +
          (leftTrim
            ? delimiters.openingTag.length + delimiters.whitespaceTrim.length
            : delimiters.openingTag.length),
        meta.path,
      );
    }
  }

  if (blockOpeningStack.length) {
    const lastPos = blockOpeningStack.pop()?.pos as number;
    const { line, lineIndex } = getLineAndColumnNumbers(src, lastPos);
    const { line: lineText, pos } = getLineSnapshot(src, lineIndex, lastPos);
    throw new MutorCompilerError(
      "Unclosed block detected.",
      line,
      lineText,
      pos + delimiters.openingTag.length,
      meta.path,
    );
  }

  body += `return acc;`;
  return new Function(
    "ctx",
    "namespaces",
    "allowedProps",
    "forbiddenProps",
    "escapeFn",
    "validateComputedProps",
    body,
  );
}
