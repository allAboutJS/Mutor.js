import { getConfig } from "../providers/config";
import { BlockType } from "../types/enums";
import type { CompileMetadata, ForExpr } from "../types/types";
import build from "./build";
import MutorError from "./error";
import generateAst from "./generate-ast";
import parse from "./parse";
import tokenize from "./tokenize";
import getLineAndColumnNumbers from "./utils/get-line-and-column-nums";
import getLineSnapshot from "./utils/get-line-snapshot";

/**
 * Compiles a given template to native JS function which can be invoked with the required arguments.
 * @param src The template string.
 * @param meta Information about the template.
 * @returns A JS function which can be invoked with a context, and namespaces.
 */
export default function compile(src: string, meta: CompileMetadata) {
  const scope: string[] = [];
  const blockOpeningStack: { type: BlockType; pos: number }[] = [];
  const {
    delimiters,
    keepOpeningTagEscapeDelimiter,
    allowFnCalls,
    allowedProps,
    forbiddenProps,
    autoEscape,
  } = getConfig();

  // whitespace control
  let trimNext = false,
    cursor = 0,
    body = `let acc="",current="";`;

  while (cursor < src.length) {
    const templateOpenTagIdx = src.indexOf(delimiters.openingTag, cursor);
    if (templateOpenTagIdx === -1) {
      body += "acc+=current;";
      body += `current=\`${src.slice(cursor)}\`;`;
      break;
    }

    function isEscaped() {
      let j = templateOpenTagIdx,
        count = 0;
      while (
        src.slice(j - delimiters.openingTagEscape.length, j) ===
          delimiters.openingTagEscape &&
        j >= 0
      ) {
        count++;
        j -= delimiters.openingTagEscape.length;
      }
      return count % 2 === 1;
    }

    if (isEscaped()) {
      body += "acc+=current;";
      body += `current=\`${src.slice(
        cursor,
        keepOpeningTagEscapeDelimiter
          ? templateOpenTagIdx + delimiters.openingTagEscape.length + 1
          : templateOpenTagIdx - delimiters.openingTag.length + 1,
      )}\`;`;

      if (!keepOpeningTagEscapeDelimiter) {
        body += "acc+=current;";
        body += `current=\`${delimiters.openingTag}\`;`;
      }

      cursor = templateOpenTagIdx + delimiters.openingTag.length;
      continue;
    }

    const rawText = src.slice(cursor, templateOpenTagIdx);
    if (rawText) {
      if (trimNext) {
        body += "acc+=current.trimStart();";
        body += `current=\`${rawText}\`;`;
        trimNext = false;
      } else {
        body += "acc+=current;";
        body += `current=\`${rawText}\`;`;
      }
    }

    const templateEndTagIdx = src.indexOf(delimiters.closingTag, cursor);

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

      throw new MutorError(
        "No closing tag found for this opening tag.",
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

    cursor = templateEndTagIdx + delimiters.closingTag.length;
    const {
      inner,
      leftTrim,
      isBlock,
      isBlockEnd,
      hasContext,
      rightTrim,
      requiresBlockClose,
    } = parse(template);

    if (leftTrim) {
      body += "acc+=current.trimEnd();";
      body += 'current="";';
    }

    try {
      const tokens = tokenize(inner);
      const ast = generateAst(tokens, { allowFnCalls });

      // For loop
      if (isBlock && requiresBlockClose && hasContext) {
        scope.push((ast as ForExpr).variable);
        blockOpeningStack.push({
          type: BlockType.LOOP,
          pos: templateOpenTagIdx,
        });
      }

      // If conditional block
      if (isBlock && requiresBlockClose && !hasContext) {
        blockOpeningStack.push({
          type: BlockType.NON_LOOP,
          pos: templateOpenTagIdx,
        });
      }

      if (isBlockEnd) {
        const lastBlockOpened = blockOpeningStack.pop();

        if (lastBlockOpened?.type === BlockType.LOOP) {
          scope.pop();
        }

        if (lastBlockOpened === undefined) {
          throw {
            message: "Unexpected end of block",
            pos: templateOpenTagIdx,
          };
        }
      }

      const js = build(ast, {
        allowedProps,
        forbiddenProps,
        scope,
      });

      if (isBlock || isBlockEnd) {
        body += "acc+=current;current='';";
        body += js;
      } else {
        body += "acc+=current;";
        body += autoEscape ? `current=escapeFn(${js});` : `current=${js};`;

        if (trimNext) {
          body += "acc+=current.trimStart();current='';";
          trimNext = false;
        }

        if (rightTrim) {
          trimNext = true;
        }
      }
    } catch (e) {
      const { message, pos: relativeErrPos } = e as {
        message: string;
        pos: number;
      };

      const { line, lineIndex } = getLineAndColumnNumbers(
        src,
        templateOpenTagIdx,
      );

      const { line: lineText, pos } = getLineSnapshot(
        src,
        lineIndex,
        templateOpenTagIdx,
      );

      throw new MutorError(
        message,
        line,
        lineText,
        pos +
          relativeErrPos +
          (leftTrim
            ? delimiters.openingTag.length + delimiters.whitespaceTrim.length
            : delimiters.openingTag.length),
        meta.path,
      );
    }
  }

  if (blockOpeningStack.length) {
    const templateOpenTagIdx = blockOpeningStack.pop()?.pos;

    const { line, lineIndex } = getLineAndColumnNumbers(
      src,
      templateOpenTagIdx as number,
    );

    const { line: lineText, pos } = getLineSnapshot(
      src,
      lineIndex,
      templateOpenTagIdx as number,
    );

    throw new MutorError(
      "Expected a block end declaration for this block but found non.\n" +
        "Please add a block end declaration (`{{ end }}`) after your block's logic to close the block",
      line,
      lineText,
      pos + delimiters.openingTag.length,
      meta.path,
    );
  }

  body += `acc+=current;return acc;`;
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
