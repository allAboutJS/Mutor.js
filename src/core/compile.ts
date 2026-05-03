import { getConfig } from "../providers/config";
import { BlockType } from "../types/enums";
import type { ForExpr } from "../types/types";
import build from "./build";
import MutorError from "./error";
import { generateAst } from "./generate-ast";
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
export default function compile(
  src: string,
  meta = {
    path: "partial://anonymous",
    allowedProps: getConfig().allowedProps,
    forbiddenProps: getConfig().forbiddenProps,
  },
) {
  const scope: string[] = [];
  const blockOpeningStack: { type: BlockType; pos: number }[] = [];
  const { delimiters, keepOpeningTagEscapeDelimiter } = getConfig();

  // whitespace control
  let trimNext = false,
    sideToTrim: string | null = null;

  let cursor = 0,
    body = `
    function validateComputedProp(computed) {
      if (forbiddenProps.has(computed) && !allowedProps.has(computed)) {
        throw new Error(\`Forbidden property access. Access to this computed property "\${computed}" is forbidden.\`);
      }
      return computed;
    }

    var acc = "";
    `;

  while (cursor < src.length) {
    const templateOpenTagIdx = src.indexOf(delimiters.openingTag, cursor);
    if (templateOpenTagIdx === -1) {
      body += `acc+=\`${src.slice(cursor)}\`;`;
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
      body += `acc+=\`${src.slice(
        cursor,
        keepOpeningTagEscapeDelimiter
          ? templateOpenTagIdx + delimiters.openingTagEscape.length + 1
          : templateOpenTagIdx - delimiters.openingTag.length + 1,
      )}\`;`;

      if (!keepOpeningTagEscapeDelimiter) {
        body += `acc+=\`${delimiters.openingTag}\`;`;
      }

      cursor = templateOpenTagIdx + delimiters.openingTag.length;
      continue;
    }

    const rawText = src.slice(cursor, templateOpenTagIdx);
    if (rawText) {
      if (trimNext && sideToTrim === "left") {
        body += `acc+=\`${rawText.trimStart()}\`;\n`;
        trimNext = false;
        sideToTrim = null;
      } else {
        body += `acc+=\`${rawText}\`;\n`;
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

    cursor = templateEndTagIdx + 2;
    const { inner, leftTrim, isBlock, isBlockEnd, hasContext, rightTrim } =
      parse(template);

    if (leftTrim) {
      if (scope.length) {
        trimNext = true;
        sideToTrim = "left";
      } else {
        body += "acc=acc.trimEnd();\n";
      }
    }

    try {
      const tokens = tokenize(inner);
      const ast = generateAst(tokens);

      if (hasContext) {
        scope.push((ast as ForExpr).variable);
        blockOpeningStack.push({
          type: BlockType.LOOP,
          pos: templateOpenTagIdx,
        });
      }

      if (isBlock && !hasContext) {
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
        allowedProps: meta.allowedProps,
        forbiddenProps: meta.forbiddenProps,
        scope,
      });

      // APPLY DEFERRED RIGHT TRIM BEFORE PROCESSING NEXT TOKEN
      if (trimNext && sideToTrim === "left") {
        body += "acc=acc.trimEnd();\n";
        trimNext = false;
        sideToTrim = null;
      }

      if (isBlock || isBlockEnd) {
        body += js;
      } else {
        body += `acc+=""+(${js}) ?? "";\n`;

        if (rightTrim) {
          trimNext = true;
          sideToTrim = "left";
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

  body += `\nreturn acc;`;
  return new Function(
    "ctx",
    "namespaces",
    "allowedProps",
    "forbiddenProps",
    body,
  );
}
