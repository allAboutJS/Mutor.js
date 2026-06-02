import { BlockType, ExprType } from "../types/enums";
import type {
  BlockState,
  CompileMetadata,
  ForExpr,
  MutorConfig,
} from "../types/types";
import escapeRawText from "../utils/escape-raw-text";
import getLineNumberAndIndex from "../utils/get-line-and-column-nums";
import getLineSnapshot from "../utils/get-line-snapshot";
import build from "./build";
import { AsyncFunction } from "./constants";
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
  // Keep track of block opening states to support nested blocks
  const blockOpeningStack: BlockState[] = [];

  const {
    delimiters,
    keepOpeningTagEscapeDelimiter,
    allowFnCalls,
    allowedProps,
    forbiddenProps,
    autoEscape,
  } = config;

  // Function mode (sync/async)
  let mode: "sync" | "async" = "sync";

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

      if (!keepOpeningTagEscapeDelimiter) {
        body += `acc+=\`${delimiters.openingTag}\`;`;
      }

      cursor = templateOpenTagIdx + delimiters.openingTag.length;
      continue;
    }

    // Parse Tag Metadata (to check for leftTrim BEFORE processing rawText)
    const templateEndTagIdx = src.indexOf(
      delimiters.closingTag,
      templateOpenTagIdx,
    );

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
    const {
      inner,
      leftTrim,
      rightTrim,
      isBlock,
      isBlockEnd,
      hasContext,
      requiresBlockClose,
      isComment,
      usesAwait,
    } = parse(template, { delimiters });

    // Switch to async mode if Mutor::await is used
    if (usesAwait && mode !== "async") {
      mode = "async";
    }

    // Process Raw Text (between cursor and current tag)
    let rawText = src.slice(cursor, templateOpenTagIdx);
    if (rawText) {
      const lastBlockOpened = blockOpeningStack[blockOpeningStack.length - 1];

      if (
        lastBlockOpened?.type === BlockType.SWITCH &&
        !lastBlockOpened.hasCase
      ) {
        const firstNonWhitespace = rawText.search(/\S/);

        // Prevent raw text from being processed if it doesn't start with a case or default tag
        if (firstNonWhitespace === -1) {
          rawText = "";
        } else {
          const pos = cursor + firstNonWhitespace;
          const [line, lineIndex] = getLineNumberAndIndex(src, pos);
          const lineText = getLineSnapshot(src, lineIndex);

          throw new MutorCompilerError(
            "A switch block must begin with a case or default tag.",
            line,
            lineText,
            pos - lineIndex,
            meta.path,
          );
        }
      }

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
      if (!isComment) {
        const tokens = tokenize(inner);
        const ast = generateAst(tokens, { allowFnCalls });
        const lastBlockOpened = blockOpeningStack[blockOpeningStack.length - 1];

        if (
          lastBlockOpened?.type === BlockType.SWITCH &&
          !lastBlockOpened.hasCase &&
          ast.type !== ExprType.CASE &&
          ast.type !== ExprType.DEFAULT &&
          ast.type !== ExprType.END
        ) {
          throw {
            message: "A switch block must begin with a case or default tag.",
            pos: ast.pos,
          };
        }

        if (
          (ast.type === ExprType.CASE || ast.type === ExprType.DEFAULT) &&
          lastBlockOpened?.type !== BlockType.SWITCH
        ) {
          throw {
            message: `'${ast.type === ExprType.CASE ? "case" : "default"}' can only be used directly inside a switch block.`,
            pos: ast.pos,
          };
        }

        if (ast.type === ExprType.DEFAULT) {
          if (lastBlockOpened!.hasDefault) {
            throw {
              message: "A switch block can only have one default case.",
              pos: ast.pos,
            };
          }

          lastBlockOpened!.hasDefault = true;
        }

        if (ast.type === ExprType.CASE || ast.type === ExprType.DEFAULT) {
          lastBlockOpened!.hasCase = true;
        }

        if (
          (ast.type === ExprType.ELSE || ast.type === ExprType.ELSE_IF) &&
          lastBlockOpened?.type !== BlockType.IF
        ) {
          throw {
            message: `'${ast.type === ExprType.ELSE ? "else" : "else if"}' can only be used directly inside an if block.`,
            pos: ast.pos,
          };
        }

        if (
          (ast.type === ExprType.ELSE || ast.type === ExprType.ELSE_IF) &&
          lastBlockOpened!.hasElse
        ) {
          throw {
            message: `'${ast.type === ExprType.ELSE ? "else" : "else if"}' cannot be used after an else block.`,
            pos: ast.pos,
          };
        }

        if (ast.type === ExprType.ELSE) {
          lastBlockOpened!.hasElse = true;
        }

        if (
          ast.type === ExprType.BREAK &&
          !blockOpeningStack.some(
            ({ type }) => type === BlockType.LOOP || type === BlockType.SWITCH,
          )
        ) {
          throw {
            message: "'break' can only be used inside a loop or switch block.",
            pos: ast.pos,
          };
        }

        if (
          ast.type === ExprType.CONTINUE &&
          !blockOpeningStack.some(({ type }) => type === BlockType.LOOP)
        ) {
          throw {
            message: "'continue' can only be used inside a loop block.",
            pos: ast.pos,
          };
        }

        const js = build(ast, { allowedProps, forbiddenProps, scope });

        if (isBlock && requiresBlockClose && hasContext) {
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
            hasCase: false,
            hasDefault: false,
            hasElse: false,
          });
        } else if (isBlock && requiresBlockClose && !hasContext) {
          blockOpeningStack.push({
            type:
              ast.type === ExprType.SWITCH ? BlockType.SWITCH : BlockType.IF,
            pos: templateOpenTagIdx,
            loopType: undefined,
            scopeSize: 0,
            hasCase: false,
            hasDefault: false,
            hasElse: false,
          });
        }

        if (isBlockEnd) {
          const lastBlockOpened = blockOpeningStack.pop();

          if (lastBlockOpened === undefined) {
            throw {
              message: "Unexpected end of block",
              pos: templateOpenTagIdx,
            };
          }

          // Remove scope for the current block if it's a loop block
          if (lastBlockOpened?.type === BlockType.LOOP) {
            scope.splice(-lastBlockOpened.scopeSize);
          }
        }

        if (isBlock || isBlockEnd) {
          body += js;
        } else {
          // Only escape unknown values returned from fn calls or object property resolution
          // Values returned from Mutor::include should be taken as is.
          body +=
            // Escape the return values of unknown values at runtime
            autoEscape && !js.startsWith("namespaces.Mutor.include")
              ? `acc+=escapeFn(${js});`
              : `acc+=${js};`;
        }
      }

      // Set state for the NEXT raw text chunk
      if (rightTrim) {
        trimNext = true;
      }
    } catch (e) {
      const { message, pos: relPos } = e as { message: string; pos: number };
      const delimitersLength = leftTrim
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
  return mode === "async"
    ? new AsyncFunction(
        "ctx",
        "namespaces",
        "allowedProps",
        "forbiddenProps",
        "escapeFn",
        "validateComputedProps",
        body,
      )
    : new Function(
        "ctx",
        "namespaces",
        "allowedProps",
        "forbiddenProps",
        "escapeFn",
        "validateComputedProps",
        body,
      );
}
