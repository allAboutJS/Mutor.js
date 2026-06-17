import { ExprType, LoopType, TokenType } from "../types/enums";
import type {
  ElseExpr,
  ElseIfExpr,
  Expr,
  ForExpr,
  IdentExpr,
  IfExpr,
  ParseState,
  Token,
} from "../types/types";
import { getTokenTypeWords } from "../utils/get-token-type-words";
import {
  additiveOperators,
  bitwiseAndOperators,
  bitwiseOperators,
  bitwiseOrOperators,
  bitwiseXorOperators,
  comparisonOperators,
  equalityOperators,
  exponentiationOperators,
  multiplicativeOperators,
  propertyAccessOperators,
  unaryOperators,
} from "./constants";

/**
 * Throws an error if the current token does not match the expected type and value.
 * @param state - The current parse state.
 * @param type - The expected token type.
 * @param value - The expected token value (optional).
 * @returns The current token if it matches the expected type and value.
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

/** Parses a for loop expression from the given parse state. */
function parseForLoop(state: ParseState): ForExpr {
  const pos = state.tokens[state.cursor - 1].pos;
  const variable = expectOrThrow(state, TokenType.IDENT).value;
  let secondaryVariable: string | undefined;
  let token: Token;

  if (
    state.tokens[state.cursor]?.type === TokenType.OPERATOR &&
    state.tokens[state.cursor]?.value === ","
  ) {
    state.cursor++;
    secondaryVariable = expectOrThrow(state, TokenType.IDENT).value;
  }

  try {
    token = expectOrThrow(state, TokenType.KEYWORD, "in");
  } catch {
    token = expectOrThrow(state, TokenType.KEYWORD, "of");
  }

  const loopType = token.value === "in" ? LoopType.IN : LoopType.OF;
  const iterable = parseTernaryExpr(state);

  return {
    type: ExprType.FOR,
    loopType,
    iterable,
    variable,
    secondaryVariable,
    pos,
  };
}

/** Parses an if expression from the given parse state. */
function parseIfExpression(state: ParseState): IfExpr {
  const condition = parseTernaryExpr(state);
  return { condition, pos: condition.pos, type: ExprType.IF };
}

/** Parses an else expression from the given parse state. */
function parseElseExpression(state: ParseState): ElseExpr | ElseIfExpr {
  const pos = state.tokens[state.cursor - 1].pos;

  try {
    expectOrThrow(state, TokenType.KEYWORD, "if");
    return { ...parseIfExpression(state), type: ExprType.ELSE_IF, pos };
  } catch {
    return { type: ExprType.ELSE, pos };
  }
}

/** Extracts function arguments from the given parse state. */
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

/** Parses a primary expression from the given parse state. */
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

    if (
      (token.value === "endif" || token.value === "endfor") &&
      state.tokens.length === 1
    ) {
      return { type: ExprType.BLOCK_END, pos: token.pos };
    }

    if (token.value === "if" && state.cursor === 1) {
      return parseIfExpression(state);
    }

    if (token.value === "break" && state.tokens.length === 1) {
      return { type: ExprType.BREAK, pos: token.pos };
    }

    if (token.value === "continue" && state.tokens.length === 1) {
      return { type: ExprType.CONTINUE, pos: token.pos };
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
    const expr = parsePropertyAccess(state);
    return {
      type: ExprType.UNARY,
      operator: token.value,
      expr,
      pos: token.pos,
    };
  }

  // Allow ::propery as an alias for Mutor::property
  if (token.type === TokenType.OPERATOR && token.value === "::") {
    const left = {
      type: ExprType.IDENT,
      value: "Mutor",
      pos: token.pos,
    } as Expr;

    expectOrThrow(state, TokenType.IDENT);
    state.cursor--;

    const right = parsePrimaryExpr(state);

    return { type: ExprType.NAMESPACE, left, right, pos: token.pos };
  }

  throw {
    message: `Unexpected token '${token.value}'.`,
    pos: token.pos,
  };
}

/** Parses a property identifier from the given parse state. */
function parsePropertyIdentifier(state: ParseState): IdentExpr {
  const token = state.tokens[state.cursor++];

  if (
    !token ||
    (token.type !== TokenType.IDENT && token.type !== TokenType.KEYWORD)
  ) {
    throw {
      message: "Expected an identifier after property access.",
      pos: token?.pos ?? state.tokens[state.cursor - 2].pos,
    };
  }

  return { type: ExprType.IDENT, value: token.value, pos: token.pos };
}

/** Parses a property access from the given parse state. */
function parsePropertyAccess(state: ParseState): Expr {
  let left = parsePrimaryExpr(state);

  while (state.tokens[state.cursor]) {
    const token = state.tokens[state.cursor];

    if (token?.type === TokenType.OPERATOR && token?.value === "(") {
      state.cursor++;

      // Only allow function calls for namespaces by default
      if (!state.config.allowFnCalls && left.type !== ExprType.NAMESPACE) {
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
      // Only allow function calls for namespaces by default
      if (!state.config.allowFnCalls && left.type !== ExprType.NAMESPACE) {
        throw {
          message: "Function calls are not allowed.",
          pos: state.tokens[state.cursor + 1].pos,
        };
      }

      // Move cursor to the postion of the first argument
      state.cursor += 2;

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
        state.tokens[state.cursor - 2]?.type !== TokenType.IDENT &&
        state.tokens[state.cursor]?.type !== TokenType.IDENT
      ) {
        throw {
          message: `Invalid namespaces access. Expected syntax <IDENTIFIER>::<IDENTIFIER>, but got '${state.tokens[state.cursor - 2]?.value}::${state.tokens[state.cursor]?.value ?? ""}' instead.`,
          pos:
            state.tokens[state.cursor]?.pos ??
            state.tokens[state.cursor - 1].pos,
        };
      }

      if (isNamespace) {
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
          const right = parsePropertyIdentifier(state);
          left = {
            type: ExprType.PROP_ACCESS,
            left,
            right,
            optional: true,
            pos: state.tokens[state.cursor - 1].pos,
          };
        }
      } else {
        const right = parsePropertyIdentifier(state);
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

  return left;
}

/** Parses a binary expression from the given parse state. */
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

/** Parses an exponentiation expression from the given parse state. */
function parseExponentiationExpr(state: ParseState): Expr {
  return parseBinaryExpr(state, parsePropertyAccess, exponentiationOperators);
}

/** Parses a multiplicative expression from the given parse state. */
function parseMultiplicativeExpr(state: ParseState): Expr {
  return parseBinaryExpr(
    state,
    parseExponentiationExpr,
    multiplicativeOperators,
  );
}

/** Parses an additive expression from the given parse state. */
function parseAdditiveExpr(state: ParseState): Expr {
  return parseBinaryExpr(state, parseMultiplicativeExpr, additiveOperators);
}

/** Parses a bitwise expression from the given parse state. */
function parseBitwiseExpr(state: ParseState): Expr {
  return parseBinaryExpr(state, parseAdditiveExpr, bitwiseOperators);
}

/** Parses a comparison expression from the given parse state. */
function parseComparisonExpr(state: ParseState): Expr {
  return parseBinaryExpr(state, parseBitwiseExpr, comparisonOperators);
}

/** Parses an equality expression from the given parse state. */
function parseEqualityExpr(state: ParseState): Expr {
  return parseBinaryExpr(state, parseComparisonExpr, equalityOperators);
}

/** Parses a bitwise OR expression from the given parse state. */
function parseBitwiseOrExpr(state: ParseState): Expr {
  return parseBinaryExpr(state, parseBitwiseXorExpr, bitwiseOrOperators);
}

/** Parses a bitwise XOR expression from the given parse state. */
function parseBitwiseXorExpr(state: ParseState): Expr {
  return parseBinaryExpr(state, parseBitwiseAndExpr, bitwiseXorOperators);
}

/** Parses a bitwise AND expression from the given parse state. */
function parseBitwiseAndExpr(state: ParseState): Expr {
  return parseBinaryExpr(state, parseEqualityExpr, bitwiseAndOperators);
}

/** Parses a logical AND expression from the given parse state. */
function parseLogicalAndExpr(state: ParseState): Expr {
  let left = parseBitwiseOrExpr(state);

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

/** Parses a logical OR expression from the given parse state. */
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

/** Parses a nullish coalesce expression from the given parse state. */
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

/** Parses a ternary expression from the given parse state. */
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

/**
 * Generates an abstract syntax tree (AST) from a list of tokens.
 * @param tokens The tokens to parse.
 * @param config The configuration for parsing.
 * @returns The parsed AST.
 */
export default function generateAst(
  tokens: Token[],
  config: { allowFnCalls: boolean },
): Expr {
  const state: ParseState = {
    cursor: 0,
    tokens,
    config,
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
