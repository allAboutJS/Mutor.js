import { ExprType, LoopType, TokenType } from "../types/enums";
import type {
  ElseExpr,
  ElseIfExpr,
  Expr,
  ForExpr,
  IfExpr,
  ParseState,
  Token,
} from "../types/types";
import { getTokenTypeWords } from "../utils/get-token-type-words";
import {
  additiveOperators,
  comparisonOperators,
  equalityOperators,
  multiplicativeOperators,
  propertyAccessOperators,
  unaryOperators,
} from "./constants";

/**
 * Generates an abstract syntax tree from a stream of tokens. Validating structure as it does so.
 * @param tokens The stream of tokens
 * @param config Configuration option
 * @returns
 */

function expectOrThrow(state: ParseState, type: TokenType): Token;
function expectOrThrow(
  state: ParseState,
  type: TokenType,
  value: string,
): Token;
function expectOrThrow(
  state: ParseState,
  type: TokenType,
  value?: string,
): Token {
  const token = state.tokens[state.cursor];
  const lastToken = state.tokens[state.tokens.length - 1];

  if (!token) {
    const article = value
      ? `'${value}'`
      : `${type === TokenType.IDENT ? "an" : "a"} ${getTokenTypeWords(type)}`;
    throw {
      message: `Unexpected end of expression. Expected ${article}.`,
      pos: lastToken.pos + lastToken.value.length - 1,
    };
  }

  if (token.type !== type) {
    throw {
      message: `Unexpected token type. Expected ${value ? `'${value}'` : getTokenTypeWords(type)} but got ${getTokenTypeWords(token.type)} instead.`,
      pos: token.pos,
    };
  }

  if (value !== undefined && token.value !== value) {
    throw {
      message: `Unexpected token '${token.value}'. Expected ${type === TokenType.IDENT ? "an" : "a"} ${getTokenTypeWords(type)} instead.`,
      pos: token.pos,
    };
  }

  return state.tokens[state.cursor++];
}

function parseForLoop(state: ParseState): ForExpr {
  const pos = state.tokens[state.cursor - 1].pos;
  const variable = expectOrThrow(state, TokenType.IDENT).value;
  let token: Token;

  try {
    token = expectOrThrow(state, TokenType.KEYWORD, "in");
  } catch {
    token = expectOrThrow(state, TokenType.KEYWORD, "of");
  }

  const loopType = token.value === "in" ? LoopType.IN : LoopType.OF;
  const iterable = parseTernaryExpr(state);

  return { type: ExprType.FOR, loopType, iterable, variable, pos };
}

function parseIfExpression(state: ParseState): IfExpr {
  const condition = parseTernaryExpr(state);
  return { condition, pos: condition.pos, type: ExprType.IF };
}

function parseElseExpression(state: ParseState): ElseExpr | ElseIfExpr {
  const pos = state.tokens[state.cursor - 1].pos;

  try {
    expectOrThrow(state, TokenType.KEYWORD, "if");
    return { ...parseIfExpression(state), type: ExprType.ELSE_IF, pos };
  } catch {
    return { type: ExprType.ELSE, pos };
  }
}

function extractFnArgs(state: ParseState): Expr[] {
  const args: Expr[] = [];

  if (
    state.tokens[state.cursor]?.type === TokenType.OPERATOR &&
    state.tokens[state.cursor]?.value === ")"
  ) {
    return args;
  }

  args.push(parseTernaryExpr(state));

  while (
    state.tokens[state.cursor]?.type === TokenType.OPERATOR &&
    state.tokens[state.cursor]?.value === ","
  ) {
    state.cursor++;
    args.push(parseTernaryExpr(state));
  }

  return args;
}

function parsePrimaryExpr(state: ParseState): Expr {
  const token = state.tokens[state.cursor++];

  if (!token) {
    throw {
      message: "Unexpected end of expression.",
      pos: state.tokens[state.tokens.length - 1].pos,
    };
  }

  if (token.type === TokenType.NUMBER) {
    return { type: ExprType.NUMBER, value: token.value, pos: token.pos };
  }

  if (token.type === TokenType.STRING) {
    return { type: ExprType.STRING, value: token.value, pos: token.pos };
  }

  if (token.type === TokenType.KEYWORD) {
    if (token.value === "for" && state.cursor === 1) {
      return parseForLoop(state);
    }

    if (token.value === "true") {
      return { type: ExprType.BOOLEAN, true: true, pos: token.pos };
    }

    if (token.value === "false") {
      return { type: ExprType.BOOLEAN, true: false, pos: token.pos };
    }

    if (token.value === "undefined") {
      return { type: ExprType.UNDEFINED, pos: token.pos };
    }

    if (token.value === "null") {
      return { type: ExprType.NULL, pos: token.pos };
    }

    if (token.value === "end" && state.tokens.length === 1) {
      return { type: ExprType.END, pos: token.pos };
    }

    if (token.value === "if" && state.cursor === 1) {
      return parseIfExpression(state);
    }

    if (token.value === "else" && state.cursor === 1) {
      return parseElseExpression(state);
    }
  }

  if (token.type === TokenType.IDENT) {
    return { type: ExprType.IDENT, value: token.value, pos: token.pos };
  }

  if (token.type === TokenType.OPERATOR && token.value === "(") {
    const expr = parseTernaryExpr(state);
    expectOrThrow(state, TokenType.OPERATOR, ")");
    return { type: ExprType.GROUP, expr, pos: token.pos };
  }

  if (token.type === TokenType.OPERATOR && unaryOperators.has(token.value)) {
    const expr = parseTernaryExpr(state);
    return {
      type: ExprType.UNARY,
      operator: token.value,
      expr,
      pos: token.pos,
    };
  }

  throw {
    message: `Unexpected token '${token.value}'.`,
    pos: token.pos,
  };
}

function parsePropertyAccess(state: ParseState): Expr {
  let left = parsePrimaryExpr(state);

  while (state.tokens[state.cursor]) {
    const token = state.tokens[state.cursor];

    if (token?.type === TokenType.OPERATOR && token?.value === "(") {
      state.cursor++;

      if (!state.generatingNamespace && !state.config.allowFnCalls) {
        throw {
          message: "Function calls are not allowed.",
          pos: token.pos,
        };
      }

      const args = extractFnArgs(state);
      expectOrThrow(state, TokenType.OPERATOR, ")");

      left = {
        type: ExprType.CALL,
        expr: left,
        args,
        pos: state.tokens[state.cursor - 1].pos,
      };
    } else if (
      token?.type === TokenType.OPERATOR &&
      token?.value === "?." &&
      state.tokens[state.cursor + 1]?.type === TokenType.OPERATOR &&
      state.tokens[state.cursor + 1]?.value === "("
    ) {
      state.cursor += 2;

      if (!state.generatingNamespace && !state.config.allowFnCalls) {
        throw {
          message: "Function calls are not allowed.",
          pos: token.pos,
        };
      }

      const args = extractFnArgs(state);
      expectOrThrow(state, TokenType.OPERATOR, ")");

      left = {
        type: ExprType.CALL,
        expr: left,
        args,
        optional: true,
        pos: state.tokens[state.cursor - 1].pos,
      };
    } else if (
      token?.type === TokenType.OPERATOR &&
      propertyAccessOperators.has(token?.value)
    ) {
      const isNamespace = token.value === "::";
      const isBracketNotation = token.value === "[";
      const isOptional = token.value === "?.";

      state.cursor++;

      if (
        isNamespace &&
        (state.tokens[state.cursor - 2]?.type !== TokenType.IDENT ||
          state.tokens[state.cursor]?.type !== TokenType.IDENT)
      ) {
        throw {
          message: `Invalid namespaces access. Expected syntax <IDENTIFIER>::<IDENTIFIER>, but got '${state.tokens[state.cursor - 2]?.value}::${state.tokens[state.cursor]?.value ?? ""}' instead.`,
          pos:
            state.tokens[state.cursor]?.pos ??
            state.tokens[state.cursor - 1].pos,
        };
      }

      if (isNamespace) {
        state.generatingNamespace = true;
        const right = parsePrimaryExpr(state);

        left = {
          type: ExprType.NAMESPACE,
          left,
          right,
          pos: state.tokens[state.cursor - 1].pos,
        };
      } else if (isBracketNotation) {
        const right = parseTernaryExpr(state);
        expectOrThrow(state, TokenType.OPERATOR, "]");

        left = {
          type: ExprType.PROP_ACCESS,
          left,
          right,
          bracketNotation: true,
          pos: state.tokens[state.cursor - 1].pos,
        };
      } else if (isOptional) {
        if (
          state.tokens[state.cursor]?.type === TokenType.OPERATOR &&
          state.tokens[state.cursor]?.value === "["
        ) {
          state.cursor++;
          const right = parseTernaryExpr(state);
          expectOrThrow(state, TokenType.OPERATOR, "]");

          left = {
            type: ExprType.PROP_ACCESS,
            left,
            right,
            bracketNotation: true,
            optional: true,
            pos: state.tokens[state.cursor - 1].pos,
          };
        } else {
          const right = parsePrimaryExpr(state);
          left = {
            type: ExprType.PROP_ACCESS,
            left,
            right,
            optional: true,
            pos: state.tokens[state.cursor - 1].pos,
          };
        }
      } else {
        const right = parsePrimaryExpr(state);
        left = {
          type: ExprType.PROP_ACCESS,
          left,
          right,
          pos: state.tokens[state.cursor - 1].pos,
        };
      }
    } else {
      break;
    }
  }

  state.generatingNamespace = false;
  return left;
}

function parseBinaryExpr(
  state: ParseState,
  leftParser: (state: ParseState) => Expr,
  operators: Set<string>,
): Expr {
  let left = leftParser(state);

  while (
    state.tokens[state.cursor]?.type === TokenType.OPERATOR &&
    operators.has(state.tokens[state.cursor]?.value)
  ) {
    const operator = state.tokens[state.cursor++].value;
    const right = leftParser(state);
    left = {
      type: ExprType.BINARY,
      left,
      right,
      operator,
      pos: state.tokens[state.cursor - 1].pos,
    };
  }

  return left;
}

function parseMultiplicativeExpr(state: ParseState): Expr {
  return parseBinaryExpr(state, parsePropertyAccess, multiplicativeOperators);
}

function parseAdditiveExpr(state: ParseState): Expr {
  return parseBinaryExpr(state, parseMultiplicativeExpr, additiveOperators);
}

function parseBitwiseExpr(state: ParseState): Expr {
  return parseBinaryExpr(state, parseAdditiveExpr, comparisonOperators);
}

function parseComparisonExpr(state: ParseState): Expr {
  return parseBinaryExpr(state, parseBitwiseExpr, comparisonOperators);
}

function parseEqualityExpr(state: ParseState): Expr {
  return parseBinaryExpr(state, parseComparisonExpr, equalityOperators);
}

function parseLogicalAndExpr(state: ParseState): Expr {
  let left = parseEqualityExpr(state);

  while (
    state.tokens[state.cursor]?.type === TokenType.OPERATOR &&
    state.tokens[state.cursor]?.value === "&&"
  ) {
    state.cursor++;
    const right = parseEqualityExpr(state);
    left = {
      type: ExprType.BINARY,
      left,
      right,
      operator: "&&",
      pos: state.tokens[state.cursor - 1].pos,
    };
  }

  return left;
}

function parseLogicalOrExpr(state: ParseState): Expr {
  let left = parseLogicalAndExpr(state);

  while (
    state.tokens[state.cursor]?.type === TokenType.OPERATOR &&
    state.tokens[state.cursor]?.value === "||"
  ) {
    state.cursor++;
    const right = parseLogicalAndExpr(state);
    left = {
      type: ExprType.BINARY,
      left,
      right,
      operator: "||",
      pos: state.tokens[state.cursor - 1].pos,
    };
  }

  return left;
}

function parseNullishCoalesceExpr(state: ParseState): Expr {
  let left = parseLogicalOrExpr(state);

  while (
    state.tokens[state.cursor]?.type === TokenType.OPERATOR &&
    state.tokens[state.cursor]?.value === "??"
  ) {
    state.cursor++;
    const right = parseLogicalOrExpr(state);
    left = {
      type: ExprType.BINARY,
      left,
      right,
      operator: "??",
      pos: state.tokens[state.cursor - 1].pos,
    };
  }

  return left;
}

function parseTernaryExpr(state: ParseState): Expr {
  const condition = parseNullishCoalesceExpr(state);

  if (
    state.tokens[state.cursor]?.type !== TokenType.OPERATOR ||
    state.tokens[state.cursor]?.value !== "?"
  ) {
    return condition;
  }

  state.cursor++;
  const left = parseTernaryExpr(state);
  expectOrThrow(state, TokenType.OPERATOR, ":");
  const right = parseTernaryExpr(state);

  return {
    type: ExprType.TERNARY,
    condition,
    left,
    right,
    pos: state.tokens[state.cursor - 1].pos,
  };
}

export default function generateAst(
  tokens: Token[],
  config: { allowFnCalls: boolean },
): Expr {
  const state: ParseState = {
    cursor: 0,
    tokens,
    config,
    generatingNamespace: false,
  };

  const ast = parseTernaryExpr(state);

  if (state.cursor !== state.tokens.length) {
    throw {
      pos: state.tokens[state.cursor].pos,
      message: `Expected token '${state.tokens[state.cursor].value}'.\nExpected an operator or the end of the expression.`,
    };
  }

  return ast;
}
