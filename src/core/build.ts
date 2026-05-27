import { ExprType, LoopType } from "../types/enums";
import type {
  BuildContext,
  BuildState,
  CallExpr,
  ElseIfExpr,
  Expr,
  ForExpr,
  IdentExpr,
  IfExpr,
  NamespaceExpr,
  PropAccessExpr,
} from "../types/types";
import escapeRawText from "../utils/escape-raw-text";
import { MutorError } from "./error";

function prefixWithCtx(state: BuildState, ident: string): string {
  return state.scope.includes(ident) ? ident : `ctx.${ident}`;
}

function buildNamespace(expr: NamespaceExpr): string {
  if (expr.left.type !== ExprType.IDENT) {
    throw {
      message: "Invalid usage of namespace operator.",
      pos: expr.pos,
    };
  }
  const leftValue = (expr.left as IdentExpr).value;
  const rightValue = (expr.right as IdentExpr).value;
  return `namespaces.${leftValue}.${rightValue}`;
}

function buildPropAccess(state: BuildState, expr: PropAccessExpr): string {
  const left = buildExpr(state, expr.left);
  const optionalChain = expr.optional ? "?." : "";

  if (expr.bracketNotation) {
    const right = buildExpr(state, expr.right);
    return expr.right.type === ExprType.STRING ||
      expr.right.type === ExprType.NUMBER
      ? `${left}${optionalChain}[${right}]`
      : `${left}${optionalChain}[validateComputedProps(${right}, ${state.allowedProps}, ${state.forbiddenProps})]`;
  }

  const propName = (expr.right as IdentExpr).value;

  if (state.forbiddenProps.has(propName) && !state.allowedProps.has(propName)) {
    throw { message: "Forbidden property access.", pos: expr.right.pos };
  }

  return `${left}${optionalChain}.${propName}`;
}

function buildCall(state: BuildState, expr: CallExpr): string {
  const func = buildExpr(state, expr.expr);
  const optionalChain = expr.optional ? "?." : "";
  const args = (expr.args as Expr[])
    .map((arg: Expr) => buildExpr(state, arg))
    .join(", ");

  return `${func}${optionalChain}(${args})`;
}

function buildForLoop(state: BuildState, expr: ForExpr): string {
  const { iterable, loopType, variable } = expr;
  const loopOperator = loopType === LoopType.IN ? "in" : "of";
  return `for(const ${variable} ${loopOperator} ${build(iterable, state.context)}){`;
}

function buildIfBlock(state: BuildState, expr: IfExpr): string {
  const { condition } = expr;
  return `if(${build(condition, state.context)}){`;
}

function buildElseIfBlock(state: BuildState, expr: ElseIfExpr): string {
  const { condition } = expr;
  return `}else if(${build(condition, state.context)}){`;
}

function buildExpr(state: BuildState, expr: Expr): string {
  const { type } = expr;

  if (type === ExprType.NUMBER) return expr.value;
  if (type === ExprType.NULL) return "null";
  if (type === ExprType.UNDEFINED) return "undefined";
  if (type === ExprType.BOOLEAN) return (expr as any).true ? "true" : "false";

  switch (type) {
    case ExprType.END:
      return "}";

    case ExprType.STRING:
      return `\`${/\$\\/.test(expr.value) ? escapeRawText(expr.value) : expr.value}\``;

    case ExprType.IDENT:
      return prefixWithCtx(state, (expr as any).value);

    case ExprType.GROUP:
      return `(${buildExpr(state, (expr as any).expr)})`;

    case ExprType.UNARY: {
      const { operator, expr: innerExpr } = expr as any;
      return `${operator}${buildExpr(state, innerExpr)}`;
    }

    case ExprType.BINARY: {
      const { left, operator, right } = expr as any;
      return `${buildExpr(state, left)} ${operator} ${buildExpr(state, right)}`;
    }

    case ExprType.TERNARY: {
      const { condition, left, right } = expr as any;
      return `${buildExpr(state, condition)} ? ${buildExpr(state, left)} : ${buildExpr(state, right)}`;
    }

    case ExprType.PROP_ACCESS:
      return buildPropAccess(state, expr as PropAccessExpr);

    case ExprType.CALL:
      return buildCall(state, expr as CallExpr);

    case ExprType.NAMESPACE:
      return buildNamespace(expr as NamespaceExpr);

    case ExprType.FOR:
      return buildForLoop(state, expr as ForExpr);

    case ExprType.ELSE:
      return "} else {";

    case ExprType.IF:
      return buildIfBlock(state, expr as IfExpr);

    case ExprType.ELSE_IF:
      return buildElseIfBlock(state, expr as ElseIfExpr);

    default:
      throw new MutorError(`Unsupported expression type '${type}'`);
  }
}

export default function build(ast: Expr, context: BuildContext): string {
  const state: BuildState = {
    scope: context.scope,
    forbiddenProps: context.forbiddenProps,
    allowedProps: context.allowedProps,
    context,
  };

  const result = buildExpr(state, ast);
  return result.includes("namespaces.Mutor.await")
    ? result.replaceAll(
        "namespaces.Mutor.await",
        "await namespaces.Mutor.await",
      )
    : result;
}
