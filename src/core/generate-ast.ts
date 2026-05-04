import { ExprType, LoopType, TokenType } from "../types/enums";
import type {
  ElseExpr,
  ElseIfExpr,
  Expr,
  ForExpr,
  IfExpr,
  Token,
} from "../types/types";
import {
  additiveOperators,
  comparisonOperators,
  equalityOperators,
  multiplicativeOperators,
  propertyAccessOperators,
  unaryOperators,
} from "./constants";
import { getTokenTypeWords } from "./utils/get-token-type-words";

/**
 * Generates an abstract syntax tree from a stream of tokens. Validating structure as it does so.
 * @param tokens The stream of tokens
 * @param config Configuration option
 * @returns
 */
export default function generateAst(
  tokens: Token[],
  config: { allowFnCalls: boolean },
): Expr {
  let cursor = 0;

  /**
   * Asserts that a token at the cursor's current position is of the same type and value as the function arguments.
   * @param type The expected token's type
   * @param value THe expected token's value
   */
  function expectOrThrow(type: TokenType): Token;
  function expectOrThrow(type: TokenType, value: string): Token;
  function expectOrThrow(type: TokenType, value?: string): Token {
    const token = tokens[cursor];
    const lastToken = tokens[tokens.length - 1];

    if (!token) {
      throw {
        message: `Unexpected end of expression. Expected ${value ? `'${value}'` : `${type === TokenType.IDENT ? "an" : "a"} ${getTokenTypeWords(type)}`}.`,
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
        message: `Unexpected token '${token?.value}'. Expected ${type === TokenType.IDENT ? "an" : "a"} ${getTokenTypeWords(type)} instead.`,
        pos: token.pos,
      };
    }

    return tokens[cursor++];
  }

  /**
   * Parses a for loop contructor
   * Handles `{{ for prop in obj }}` and `{{ for item of arr }}`
   */
  function parseForLoop(): ForExpr {
    const pos = tokens[cursor - 1].pos;
    // Extract the variable
    const variable = expectOrThrow(TokenType.IDENT).value;
    let token: Token;

    try {
      token = expectOrThrow(TokenType.KEYWORD, "in");
    } catch {
      token = expectOrThrow(TokenType.KEYWORD, "of");
    }

    const loopType = token.value === "in" ? LoopType.IN : LoopType.OF;
    const iterable = parseTernaryExpr();

    return { type: ExprType.FOR, loopType, iterable, variable, pos };
  }

  /**
   * Parses an if expression.
   */
  function parseIfExpression(): IfExpr {
    const condition = parseTernaryExpr();
    return { condition, pos: condition.pos, type: ExprType.IF };
  }

  /**
   * Parses an `else` or `else if` expression.
   */
  function parseElseExpression(): ElseExpr | ElseIfExpr {
    const pos = tokens[cursor - 1].pos;

    try {
      // Try to parse `else if`
      expectOrThrow(TokenType.KEYWORD, "if");
      return { ...parseIfExpression(), type: ExprType.ELSE_IF, pos };
    } catch {
      return { type: ExprType.ELSE, pos };
    }
  }

  /**
   * Extracts the arguments of a function call.
   * Parses comma-separated expressions until the closing parenthesis is reached.
   * Returns an array of parsed argument expressions, which may be empty for calls with no arguments.
   */
  function extractFnArgs() {
    const args: Expr[] = [];

    const emptyArgs =
      tokens[cursor]?.type === TokenType.OPERATOR &&
      tokens[cursor]?.value === ")";

    if (emptyArgs) {
      return args;
    }

    // Consume the first argument;
    args.push(parseTernaryExpr());

    while (
      tokens[cursor]?.type === TokenType.OPERATOR &&
      tokens[cursor]?.value === "," &&
      tokens[cursor]?.value !== ")"
    ) {
      cursor++; // Skip the comma operator ','
      args.push(parseTernaryExpr());
    }

    return args;
  }

  /**
   * Parses primary expressions whose values can be resolved during compilation.
   * Handles literals (numbers, strings, booleans), keywords (null, undefined),
   * identifiers, parenthesized expressions, and unary prefix operators.
   * This is the base level of the expression parsing hierarchy.
   */
  function parsePrimaryExpr(): Expr {
    const token = tokens[cursor++];

    if (token?.type === TokenType.NUMBER) {
      return { type: ExprType.NUMBER, value: token.value, pos: token.pos };
    }

    if (token?.type === TokenType.STRING) {
      return { type: ExprType.STRING, value: token.value, pos: token.pos };
    }

    if (token?.type === TokenType.KEYWORD) {
      if (token.value === "for" && cursor === 1) {
        return parseForLoop();
      }

      if (token.value === "true" || token.value === "false") {
        return {
          type: ExprType.BOOLEAN,
          true: token.value === "true",
          pos: token.pos,
        };
      }

      if (token.value === "undefined") {
        return { type: ExprType.UNDEFINED, pos: token.pos };
      }

      if (token.value === "null") {
        return { type: ExprType.NULL, pos: token.pos };
      }

      if (token.value === "end" && tokens.length === 1) {
        return { type: ExprType.END, pos: token.pos };
      }

      if (token.value === "if" && cursor === 1) {
        return parseIfExpression();
      }

      if (token.value === "else" && cursor === 1) {
        return parseElseExpression();
      }
    }

    if (token?.type === TokenType.IDENT) {
      return { type: ExprType.IDENT, value: token.value, pos: token.pos };
    }

    if (token?.type === TokenType.OPERATOR && token.value === "(") {
      const expr = parseTernaryExpr();
      expectOrThrow(TokenType.OPERATOR, ")");
      return { type: ExprType.GROUP, expr, pos: token.pos };
    }

    if (token?.type === TokenType.OPERATOR && unaryOperators.has(token.value)) {
      const operator = token.value;
      const expr = parseTernaryExpr();
      return { type: ExprType.UNARY, operator, expr, pos: token.pos };
    }

    if (cursor > tokens.length) {
      throw {
        message: `Unexpected end of expression.`,
        pos: tokens[tokens.length - 1].pos,
      };
    }

    throw {
      message: `Unexpected token '${token?.value}'.`,
      pos: token.pos,
    };
  }

  /**
   * Parses property access expressions or function calls.
   * Handles member access via dot notation (.prop), bracket notation ([expr]),
   * optional chaining (?.), optional bracket notation (?.[expr]), namespace access (::),
   * and function calls (() and ?.()).
   * This parser left-associates sequential property accesses and function calls.
   * @example
   * {{ obj?.prop }}
   * {{ obj.prop }}
   * {{ obj?.['prop']?.() }}
   */
  function parsePropertyAccess(): Expr {
    let left = parsePrimaryExpr();

    while (tokens[cursor]) {
      const token = tokens[cursor];

      // Check for function call: (
      if (token?.type === TokenType.OPERATOR && token?.value === "(") {
        cursor++; // Skip the opening parentheses

        if (!config.allowFnCalls) {
          throw {
            message: "Function calls are not allowed.",
            pos: tokens[cursor - 1].pos,
          };
        }

        const args = extractFnArgs();
        expectOrThrow(TokenType.OPERATOR, ")");

        left = {
          type: ExprType.CALL,
          expr: left,
          args,
          pos: tokens[cursor - 1].pos,
        };
      }
      // Check for optional call: ?.(
      else if (
        token?.type === TokenType.OPERATOR &&
        token?.value === "?." &&
        tokens[cursor + 1]?.type === TokenType.OPERATOR &&
        tokens[cursor + 1]?.value === "("
      ) {
        cursor++; // Skip ?.
        cursor++; // Skip (

        if (!config.allowFnCalls) {
          throw {
            message: "Function calls are not allowed.",
            pos: tokens[cursor - 1].pos,
          };
        }

        const args = extractFnArgs();
        expectOrThrow(TokenType.OPERATOR, ")");

        left = {
          type: ExprType.CALL,
          expr: left,
          args,
          optional: true,
          pos: tokens[cursor - 1].pos,
        };
      }
      // Check for property access: . or ?. or [ or ::
      // Handles all forms of member access with optional chaining support
      else if (
        token?.type === TokenType.OPERATOR &&
        propertyAccessOperators.has(token?.value)
      ) {
        const isNamespace = token?.value === "::";
        const isBracketNotation = token?.value === "[";
        const isOptional = token?.value === "?.";

        cursor++; // Skip operator

        // Enforce <IDENT>::<IDENT> syntax for namespaces
        if (
          isNamespace &&
          (tokens[cursor - 2]?.type !== TokenType.IDENT ||
            tokens[cursor]?.type !== TokenType.IDENT)
        ) {
          throw {
            message: `Invalid namespaces access. Expected syntax <IDENTIFIER>::<IDENTIFIER>, but got '${tokens[cursor - 2]?.value}::${tokens[cursor]?.value}' instead.`,
            pos: tokens[cursor]?.pos,
          };
        }

        if (isNamespace) {
          const right = parsePrimaryExpr();
          left = {
            type: ExprType.NAMESPACE,
            left,
            right,
            pos: tokens[cursor - 1].pos,
          };
        } else if (isBracketNotation) {
          const right = parseTernaryExpr();
          expectOrThrow(TokenType.OPERATOR, "]");

          left = {
            type: ExprType.PROP_ACCESS,
            right,
            left,
            bracketNotation: true,
            pos: tokens[cursor - 1].pos,
          };
        } else if (isOptional) {
          // Check if optional bracket notation: ?.[
          if (
            tokens[cursor]?.type === TokenType.OPERATOR &&
            tokens[cursor]?.value === "["
          ) {
            cursor++; // Skip the opening bracket '['
            const right = parseTernaryExpr();
            expectOrThrow(TokenType.OPERATOR, "]");

            left = {
              type: ExprType.PROP_ACCESS,
              left,
              right,
              bracketNotation: true,
              optional: true,
              pos: tokens[cursor - 1].pos,
            };
          } else {
            const right = parsePrimaryExpr();
            left = {
              type: ExprType.PROP_ACCESS,
              left,
              right,
              optional: true,
              pos: tokens[cursor - 1].pos,
            };
          }
        } else {
          // Regular dot notation: .
          const right = parsePrimaryExpr();
          left = {
            type: ExprType.PROP_ACCESS,
            left,
            right,
            pos: tokens[cursor - 1].pos,
          };
        }
      } else {
        break;
      }
    }

    return left;
  }

  /**
   * Parses multiplicative expressions.
   * Handles operators: *, /, % with left-to-right associativity.
   * Higher precedence than additive operators.
   * @example
   * {{ a * b }}
   * {{ 1 / 2 }}
   * {{ 20 % 3 }}
   */
  function parseMultiplicativeExpr(): Expr {
    let left = parsePropertyAccess();

    while (
      tokens[cursor]?.type === TokenType.OPERATOR &&
      multiplicativeOperators.has(tokens[cursor]?.value)
    ) {
      const operator = tokens[cursor++].value;
      const right = parsePropertyAccess();
      left = {
        type: ExprType.BINARY,
        left,
        right,
        operator,
        pos: tokens[cursor - 1].pos,
      };
    }

    return left;
  }

  /**
   * Parses additive expressions.
   * Handles operators: +, - with left-to-right associativity.
   * Higher precedence than comparison operators, lower than multiplicative.
   * @example
   * {{ a + b }}
   * {{ 1 - 2 }}
   */
  function parseAdditiveExpr(): Expr {
    let left = parseMultiplicativeExpr();

    while (
      tokens[cursor]?.type === TokenType.OPERATOR &&
      additiveOperators.has(tokens[cursor]?.value)
    ) {
      const operator = tokens[cursor++].value;
      const right = parseMultiplicativeExpr();
      left = {
        type: ExprType.BINARY,
        left,
        right,
        operator,
        pos: tokens[cursor - 1].pos,
      };
    }

    return left;
  }

  /**
   * Parses bitwise shift expressions.
   * Handles operators: >>, <<, >>> with left-to-right associativity.
   * Higher precedence than comparison operators, lower than additive.
   * @example
   * {{ 22 >> 3 }}
   * {{ 12 << 3 }}
   */
  function parseBitwiseExpr(): Expr {
    let left = parseAdditiveExpr();

    while (
      tokens[cursor]?.type === TokenType.OPERATOR &&
      comparisonOperators.has(tokens[cursor]?.value)
    ) {
      const operator = tokens[cursor++].value;
      const right = parseAdditiveExpr();
      left = {
        type: ExprType.BINARY,
        left,
        right,
        operator,
        pos: tokens[cursor - 1].pos,
      };
    }

    return left;
  }

  /**
   * Parses comparison expressions.
   * Handles operators: <, >, <=, >= with left-to-right associativity.
   * Lower precedence than additive/bitwise operators, higher than equality.
   */
  function parseComparisonExpr(): Expr {
    let left = parseBitwiseExpr();

    while (
      tokens[cursor]?.type === TokenType.OPERATOR &&
      comparisonOperators.has(tokens[cursor]?.value)
    ) {
      const operator = tokens[cursor++].value;
      const right = parseBitwiseExpr();
      left = {
        type: ExprType.BINARY,
        left,
        right,
        operator,
        pos: tokens[cursor - 1].pos,
      };
    }

    return left;
  }

  /**
   * Parses equality expressions.
   * Handles operators: ==, !=, ===, !== with left-to-right associativity.
   * Lower precedence than comparison operators, higher than logical operators.
   */
  function parseEqualityExpr(): Expr {
    let left = parseComparisonExpr();

    while (
      tokens[cursor]?.type === TokenType.OPERATOR &&
      equalityOperators.has(tokens[cursor]?.value)
    ) {
      const operator = tokens[cursor++].value;
      const right = parseComparisonExpr();
      left = {
        type: ExprType.BINARY,
        left,
        right,
        operator,
        pos: tokens[cursor - 1].pos,
      };
    }

    return left;
  }

  /**
   * Parses logical OR expressions.
   * Handles operator: || with left-to-right associativity.
   * Lower precedence than logical AND, higher than ternary conditional.
   * Short-circuits on truthy left operand.
   */
  function parseLogicalOrExpr(): Expr {
    let left = parseLogicalAndExpr();

    while (
      tokens[cursor]?.type === TokenType.OPERATOR &&
      tokens[cursor]?.value === "||"
    ) {
      const operator = tokens[cursor++].value;
      const right = parseLogicalAndExpr();
      left = {
        type: ExprType.BINARY,
        left,
        right,
        operator,
        pos: tokens[cursor - 1].pos,
      };
    }

    return left;
  }

  /**
   * Parses logical AND expressions.
   * Handles operator: && with left-to-right associativity.
   * Lower precedence than equality operators, higher than logical OR.
   * Short-circuits on falsy left operand.
   */
  function parseLogicalAndExpr(): Expr {
    let left = parseNullishCoalesceExpr();

    while (
      tokens[cursor]?.type === TokenType.OPERATOR &&
      tokens[cursor]?.value === "&&"
    ) {
      const operator = tokens[cursor++].value;
      const right = parseNullishCoalesceExpr();
      left = {
        type: ExprType.BINARY,
        left,
        right,
        operator,
        pos: tokens[cursor - 1].pos,
      };
    }

    return left;
  }

  /**
   * Parses nullish coalescing expressions.
   * Handles operator: ?? with left-to-right associativity.
   * Returns left operand if not null/undefined, otherwise returns right operand.
   * Lower precedence than logical AND, higher than logical OR.
   */
  function parseNullishCoalesceExpr(): Expr {
    let left = parseEqualityExpr();

    while (
      tokens[cursor]?.type === TokenType.OPERATOR &&
      tokens[cursor]?.value === "??"
    ) {
      const operator = tokens[cursor++].value;
      const right = parseEqualityExpr();
      left = {
        type: ExprType.BINARY,
        left,
        right,
        operator,
        pos: tokens[cursor - 1].pos,
      };
    }

    return left;
  }

  /**
   * Parses ternary conditional expressions.
   * Handles operator: ? : with right-to-left associativity.
   * Lowest precedence of all operators, allowing nested ternaries on the right side.
   * Format: condition ? trueExpr : falseExpr
   */
  function parseTernaryExpr(): Expr {
    const condition = parseLogicalOrExpr();

    if (
      tokens[cursor]?.type !== TokenType.OPERATOR ||
      tokens[cursor]?.value !== "?"
    ) {
      return condition;
    }

    cursor++; // consume ?
    const left = parseTernaryExpr();
    expectOrThrow(TokenType.OPERATOR, ":");
    const right = parseTernaryExpr();

    return {
      type: ExprType.TERNARY,
      left,
      right,
      condition,
      pos: tokens[cursor - 1].pos,
    };
  }

  const ast = parseTernaryExpr();
  return ast;
}
