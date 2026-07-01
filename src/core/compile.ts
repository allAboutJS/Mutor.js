import { BlockType } from "../types/enums";
import type {
  BlockState,
  CompileMetadata,
  ForExpr,
  MutorConfig,
} from "../types/types";
import escapeRawText from "../utils/escape-raw-text";
import getLineNumberAndIndex from "../utils/get-line-and-column-nums";
import getLineSnapshot from "../utils/get-line-snapshot";
import isEscaped from "../utils/is-escaped";
import build from "./build";
import { MutorCompilerError } from "./error";
import generateAst from "./generate-ast";
import parse from "./parse";
import tokenize from "./tokenize";

/**
 * Compiles the given template source into a JavaScript function.
 * @param src The template source string to compile.
 * @param config The Mutor configuration object.
 * @param meta The compile metadata object.
 * @returns A compiled JavaScript function as a string.
 */
export default function compile(
  src: string,
  config: MutorConfig,
  meta: CompileMetadata,
) {
  // Keep track of temp variables declared in loops
  const scope: string[] = [];
  // Keep track of block opening states to support nested blocks
  const blockOpeningStack: BlockState[] = [];
  const {
    delimiters,
    preserveEscapeDelimiter,
    allowFnCalls,
    allowedProps,
    forbiddenProps,
    autoEscape,
    debugRuntimeErrors,
  } = config;

  // Whitespace control state
  let trimNext = false,
    cursor = 0,
    body = `let acc="";`;

  while (cursor < src.length) {
    // Find a template expression
    const templateOpenTagIdx = src.indexOf(delimiters.openingTag, cursor);

    // No expression: handle final text chunk
    if (templateOpenTagIdx === -1) {
      const lastChunk = src.slice(cursor);
      body += `acc+=\`${escapeRawText(trimNext ? lastChunk.trimStart() : lastChunk)}\`;`;
      // Reset the whitespace control state
      trimNext = false;
      break;
    }

    // Check if template expression is escaped
    const escaped = isEscaped(
      src,
      templateOpenTagIdx,
      delimiters.openingTagEscape,
    );

    if (escaped) {
      const text = src.slice(
        cursor,
        preserveEscapeDelimiter
          ? templateOpenTagIdx
          : templateOpenTagIdx - delimiters.openingTagEscape.length,
      );
      const raw = `${text}${delimiters.openingTag}`;
      body += `acc+=\`${escapeRawText(trimNext ? raw.trimStart() : raw)}\`;`;
      // Reset the whitespace control state
      trimNext = false;
      cursor = templateOpenTagIdx + delimiters.openingTag.length;
      continue;
    }

    const templateEndTagIdx = src.indexOf(
      delimiters.closingTag,
      templateOpenTagIdx,
    );

    // Find the end of the template expression
    if (templateEndTagIdx === -1) {
      const [line, lineIndex] = getLineNumberAndIndex(src, templateOpenTagIdx);
      const lineText = getLineSnapshot(src, lineIndex);
      throw new MutorCompilerError(
        "No closing tag found.",
        line,
        lineText,
        templateOpenTagIdx,
        meta.path,
      );
    }

    const template = src.slice(
      templateOpenTagIdx,
      templateEndTagIdx + delimiters.closingTag.length,
    );
    const expressionMetadata = parse(template, { delimiters });

    // Accumulate text in between template tags
    const text = src.slice(cursor, templateOpenTagIdx);
    const trimmedText = trimNext ? text.trimStart() : text;

    // Reset the whitespace control state
    trimNext = false;

    body += `acc+=\`${escapeRawText(
      expressionMetadata.leftTrim ? trimmedText.trimEnd() : trimmedText,
    )}\`;`;
    // Advance the cursor to after the template expression closing tag
    cursor = templateEndTagIdx + delimiters.closingTag.length;

    // Set state for the NEXT raw text chunk
    if (expressionMetadata.rightTrim) {
      trimNext = true;
    }

    // Skip comments
    if (expressionMetadata.isComment) {
      continue;
    }

    try {
      const tokens = tokenize(expressionMetadata.inner);
      const ast = generateAst(tokens, { allowFnCalls });
      const js = build(ast, {
        allowedProps,
        forbiddenProps,
        scope,
        autoEscape,
      });

      // Handle for loop variables
      if (expressionMetadata.isBlock && expressionMetadata.requiresBlockClose) {
        if (expressionMetadata.hasContext) {
          const { variable, secondaryVariable } = ast as ForExpr;

          scope.push(variable);

          if (secondaryVariable) {
            scope.push(secondaryVariable);
          }

          blockOpeningStack.push({
            type: BlockType.LOOP,
            pos: templateOpenTagIdx,
            loopType: (ast as ForExpr).loopType,
            scopeSize: secondaryVariable === undefined ? 1 : 2,
          });
        } else {
          blockOpeningStack.push({
            type: BlockType.IF,
            pos: templateOpenTagIdx,
          });
        }
      }

      // Handle block end
      if (expressionMetadata.isBlockEnd) {
        const lastBlockOpened = blockOpeningStack.pop();

        // Handle hanging closing block '{{ endif }}' or '{{ endfor }}'
        if (!lastBlockOpened) {
          throw {
            message: `Unexpected '${expressionMetadata.inner}' without a matching opening block.`,
            pos: templateOpenTagIdx,
          };
        }

        // Closing tags for loop or if blocks must match
        if (
          (expressionMetadata.inner === "endif" &&
            lastBlockOpened.type !== BlockType.IF) ||
          (expressionMetadata.inner === "endfor" &&
            lastBlockOpened.type !== BlockType.LOOP)
        ) {
          throw {
            message: `Unexpected '${expressionMetadata.inner}'. Expected '${
              lastBlockOpened.type === BlockType.IF ? "endif" : "endfor"
            }'.`,
            pos: lastBlockOpened.pos,
          };
        }

        // Remove scope for the current block if it's a loop block
        if (lastBlockOpened.type === BlockType.LOOP) {
          scope.splice(-lastBlockOpened.scopeSize);
        }

        // Check for 'break' or 'continue' outside of a loop block
        if (
          (js === "break" || js === "continue") &&
          !blockOpeningStack.some((block) => block.type === BlockType.LOOP)
        ) {
          throw {
            message: `'break' or 'continue' are not allowed outside of a loop block.`,
            pos: ast.pos,
          };
        }

        body += js;
        continue;
      }

      if (expressionMetadata.isBlock) {
        body += js;
      } else {
        if (debugRuntimeErrors) {
          const [line, lineIndex] = getLineNumberAndIndex(
            src,
            templateOpenTagIdx,
          );

          const lineText = getLineSnapshot(src, lineIndex);

          body += `try{acc+=(${js})??"";}catch(e){throw new MutorRuntimeError(e??"An unknown error ocurred.",${line},\`${escapeRawText(lineText)}\`,${templateOpenTagIdx},\`${escapeRawText(meta.path)}\`);}`;
        } else {
          body += `acc+=(${js})??"";`;
        }
      }
    } catch (e) {
      const { message, pos: relPos } = e as { message: string; pos: number };
      const delimitersLength = expressionMetadata.leftTrim
        ? delimiters.whitespaceTrim.length + delimiters.openingTag.length
        : delimiters.openingTag.length;

      const finalPos = templateOpenTagIdx + relPos + delimitersLength;
      const [line, lineIndex] = getLineNumberAndIndex(src, finalPos);
      const lineText = getLineSnapshot(src, lineIndex);

      throw new MutorCompilerError(
        message,
        line,
        lineText,
        finalPos - lineIndex,
        meta.path,
      );
    }
  }

  // If there are any open blocks left in the stack, throw an error
  if (blockOpeningStack.length) {
    const lastPos = blockOpeningStack.pop()?.pos as number;
    const [line, lineIndex] = getLineNumberAndIndex(src, lastPos);
    const lineText = getLineSnapshot(src, lineIndex);
    throw new MutorCompilerError(
      "Unclosed block detected.",
      line,
      lineText,
      lastPos - lineIndex,
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
    "MutorRuntimeError",
    body,
  );
}
