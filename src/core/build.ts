import { ExprType, LoopType } from "../types/enums";
import type {
  BinaryExpr,
  BuildState,
  CallExpr,
  ElseIfExpr,
  Expr,
  ForExpr,
  GroupExpr,
  IdentExpr,
  IfExpr,
  NamespaceExpr,
  PropAccessExpr,
  TernaryExpr,
  UnaryExpr,
} from "../types/types";
import escapeRawText from "../utils/escape-raw-text";

const BACKTICK_REGEX = /^`|`$/gm;
const STRING_ESCAPE_REGEX = /[$`\\]/;

/** Prefixes an identifier expression with `ctx.` if it is not in the current scope. */
function prefixWithCtx(state: BuildState, expr: IdentExpr): string {
  if (
    state.forbiddenProps.has(expr.value) &&
    !state.allowedProps.has(expr.value)
  ) {
    throw {
      message: `Access to the property "${expr.value}" is forbidden.`,
      pos: expr.pos,
    };
  }

  const result = state.scope.includes(expr.value)
    ? expr.value
    : `ctx.${expr.value}`;

  // Escape the result if autoEscape is enabled
  // and escapeCurrentToken is true
  if (state.autoEscape && state.escapeCurrentToken) {
    return `escapeFn(${result})`;
  }

  return result;
}

/** Builds a namespace expression, ensuring the namespace is allowed. */
function buildNamespace(state: BuildState, expr: NamespaceExpr): string {
  const leftValue = (expr.left as IdentExpr).value;
  const rightValue = (expr.right as IdentExpr).value;

  // Check if the property accessed on the namespace is forbidden
  if (
    (state.forbiddenProps.has(leftValue) &&
      !state.allowedProps.has(leftValue)) ||
    (state.forbiddenProps.has(rightValue) &&
      !state.allowedProps.has(rightValue))
  ) {
    throw { message: "Forbidden namespace access.", pos: expr.pos };
  }

  return `namespaces.${leftValue}.${rightValue}`;
}

/** Builds a property access expression, ensuring the property is allowed. */
function buildPropAccess(state: BuildState, expr: PropAccessExpr): string {
  const { autoEscape, escapeCurrentToken } = state;

  try {
    // If autoEscape is enabled and escapeCurrentToken is true,
    // set escapeCurrentToken to false to avoid double escaping
    if (autoEscape && escapeCurrentToken) {
      state.escapeCurrentToken = false;
    }

    const left = buildExpr(state, expr.left);
    const optionalChain = expr.optional ? "?." : "";

    if (expr.bracketNotation) {
      const right = buildExpr(state, expr.right);

      // Check if the property accessed via bracket notation is forbidden
      if (
        expr.right.type === ExprType.STRING &&
        state.forbiddenProps.has(right.replaceAll(BACKTICK_REGEX, "")) &&
        !state.allowedProps.has(right.replaceAll(BACKTICK_REGEX, ""))
      ) {
        throw {
          message: "Forbidden property access.",
          pos: expr.right.pos,
        };
      }

      const result =
        expr.right.type === ExprType.STRING ||
        expr.right.type === ExprType.NUMBER
          ? `${left}${optionalChain}[${right}]`
          : `${left}${optionalChain}[validateComputedProps(${right}, allowedProps, forbiddenProps)]`;

      // Escape the result if autoEscape is enabled and escapeCurrentToken is true
      if (autoEscape && escapeCurrentToken) {
        return `escapeFn(${result})`;
      }

      return result;
    }

    const propName = (expr.right as IdentExpr).value;

    // Check if the property accessed is forbidden and not allowed
    if (
      state.forbiddenProps.has(propName) &&
      !state.allowedProps.has(propName)
    ) {
      throw { message: "Forbidden property access.", pos: expr.right.pos };
    }

    const result = `${left}${optionalChain || "."}${propName}`;

    // Escape the result if autoEscape is enabled and escapeCurrentToken is true
    if (autoEscape && escapeCurrentToken) {
      return `escapeFn(${result})`;
    }

    return result;
  } finally {
    // Re-enable auto-escaping if it was disabled for this expression
    if (autoEscape && escapeCurrentToken) {
      state.escapeCurrentToken = true;
    }
  }
}

function buildCall(state: BuildState, expr: CallExpr): string {
  const { autoEscape, escapeCurrentToken } = state;

  try {
    // If autoEscape is enabled and escapeCurrentToken is true,
    // set escapeCurrentToken to false to avoid double escaping
    if (autoEscape && escapeCurrentToken) {
      state.escapeCurrentToken = false;
    }

    const func = buildExpr(state, expr.expr);
    const optionalChain = expr.optional ? "?." : "";
    const args = (expr.args as Expr[])
      .map((arg: Expr) => buildExpr(state, arg))
      .join(", ");

    const result = `${func}${optionalChain}(${args})`;

    // Escape function call values except Mutor::include
    if (
      autoEscape &&
      escapeCurrentToken &&
      !/namespaces.(Mutor.include|HTML.safe)\(.*[\s]*\)/.test(result)
    ) {
      return `escapeFn(${result})`;
    }

    return result;
  } finally {
    // Re-enable auto-escaping if it was disabled for this expression
    if (autoEscape && escapeCurrentToken) {
      state.escapeCurrentToken = true;
    }
  }
}

/** Builds a for loop expression, ensuring the loop operator is correct and iterable is allowed. */
function buildForLoop(state: BuildState, expr: ForExpr): string {
  try {
    // Disable auto-escaping for for loop expressions
    state.escapeCurrentToken = false;

    const { iterable, loopType, variable, secondaryVariable } = expr;
    const loopOperator = loopType === LoopType.IN ? "in" : "of";
    const iterableValue = build(iterable, state);

    // For loop with "of" operator
    if (loopOperator === "of") {
      return `for(let $__i=0,$__iterable=${iterableValue};$__i<$__iterable.length;$__i++){const ${variable}=$__iterable[$__i];${secondaryVariable ? `const ${secondaryVariable}=$__i;` : ""}`;
    }

    // For loop with "in" or "of" and secondary variable
    return secondaryVariable
      ? `for(const [${variable}, ${secondaryVariable}] of Object.entries(${iterableValue})){`
      : `for(const ${variable} in ${iterableValue}){`;
  } finally {
    // Re-enable auto-escaping
    state.escapeCurrentToken = true;
  }
}

/** Builds an if block expression. */
function buildIfBlock(state: BuildState, expr: IfExpr): string {
  try {
    // Disable auto-escaping for if block expressions
    state.escapeCurrentToken = false;
    return `if(${build(expr.condition, state)}){`;
  } finally {
    // Re-enable auto-escaping
    state.escapeCurrentToken = true;
  }
}

/** Builds an else block expression. */
function buildElseIfBlock(state: BuildState, expr: ElseIfExpr): string {
  try {
    // Disable auto-escaping for else if block expressions
    state.escapeCurrentToken = false;
    return `}else if(${build(expr.condition, state)}){`;
  } finally {
    // Re-enable auto-escaping
    state.escapeCurrentToken = true;
  }
}

/** Builds an expression. */
function buildExpr(state: BuildState, expr: Expr): string {
  const { type } = expr;

  if (type === ExprType.NUMBER) {
    return expr.value;
  }

  if (type === ExprType.NULL) {
    return "null";
  }

  if (type === ExprType.UNDEFINED) {
    return "undefined";
  }

  if (type === ExprType.BOOLEAN) {
    return (expr as any).true ? "true" : "false";
  }

  switch (type) {
    case ExprType.BLOCK_END:
      return "}";

    case ExprType.STRING: {
      const result = `\`${STRING_ESCAPE_REGEX.test(expr.value) ? escapeRawText(expr.value) : expr.value}\``;

      if (state.autoEscape && state.escapeCurrentToken) {
        return `escapeFn(${result})`;
      }

      return result;
    }
    case ExprType.IDENT:
      return prefixWithCtx(state, expr);

    case ExprType.GROUP:
      return `(${buildExpr(state, (expr as GroupExpr).expr)})`;

    case ExprType.UNARY: {
      const { operator, expr: innerExpr } = expr as UnaryExpr;
      return `${operator}${buildExpr(state, innerExpr)}`;
    }

    case ExprType.BINARY: {
      const { left, operator, right } = expr as BinaryExpr;
      return `${buildExpr(state, left)} ${operator} ${buildExpr(state, right)}`;
    }

    case ExprType.TERNARY: {
      const { condition, left, right } = expr as TernaryExpr;
      return `${buildExpr(state, condition)} ? ${buildExpr(state, left)} : ${buildExpr(state, right)}`;
    }

    case ExprType.PROP_ACCESS:
      return buildPropAccess(state, expr as PropAccessExpr);

    case ExprType.CALL:
      return buildCall(state, expr as CallExpr);

    case ExprType.NAMESPACE:
      return buildNamespace(state, expr as NamespaceExpr);

    case ExprType.FOR:
      return buildForLoop(state, expr as ForExpr);

    case ExprType.ELSE:
      return "} else {";

    case ExprType.IF:
      return buildIfBlock(state, expr as IfExpr);

    case ExprType.ELSE_IF:
      return buildElseIfBlock(state, expr as ElseIfExpr);

    case ExprType.BREAK:
      return "break;";

    case ExprType.CONTINUE:
      return "continue;";
  }
}

/**
 * Builds the AST into a string representation.
 * @param ast The AST to build.
 * @param context The build state context.
 * @returns The string representation of the AST.
 */
export default function build(ast: Expr, context: BuildState): string {
  const result = buildExpr(context, ast);
  return result;
}
