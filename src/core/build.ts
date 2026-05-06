import { ExprType, LoopType } from "../types/enums";
import type {
  BuildContext,
  CallExpr,
  ElseIfExpr,
  Expr,
  ForExpr,
  IdentExpr,
  IfExpr,
  NamespaceExpr,
  PropAccessExpr,
} from "../types/types";
import { MutorError } from "./error";

/**
 * Builds JavaScript code from an AST.
 * Handles property access protection, scope-based ctx prefixing, control flow, and loops.
 * @param ast The abstract syntax tree
 * @param context The build context containing scope, forbidden/allowed properties
 * @returns Generated JavaScript code as a string
 */
export default function build(
  ast: Expr | any, // any to handle control flow nodes not yet in AST types
  context: BuildContext,
): string {
  const { scope, forbiddenProps, allowedProps } = context;

  function prefixWithCtx(ident: string): string {
    return scope.includes(ident) ? ident : `ctx.${ident}`;
  }

  function buildExpr(expr: Expr): string {
    switch (expr.type) {
      case ExprType.END:
        return "}";

      case ExprType.NUMBER:
        return expr.value;

      case ExprType.STRING:
        return `"${expr.value}"`;

      case ExprType.BOOLEAN:
        return (expr as any).true ? "true" : "false";

      case ExprType.NULL:
        return "null";

      case ExprType.UNDEFINED:
        return "undefined";

      case ExprType.IDENT:
        return prefixWithCtx((expr as any).value);

      case ExprType.GROUP:
        return `(${buildExpr((expr as any).expr)})`;

      case ExprType.UNARY:
        return `${(expr as any).operator}${buildExpr((expr as any).expr)}`;

      case ExprType.BINARY:
        return `${buildExpr((expr as any).left)} ${(expr as any).operator} ${buildExpr((expr as any).right)}`;

      case ExprType.TERNARY:
        return `${buildExpr((expr as any).condition)} ? ${buildExpr((expr as any).left)} : ${buildExpr((expr as any).right)}`;

      case ExprType.PROP_ACCESS:
        return buildPropAccess(expr);

      case ExprType.CALL:
        return buildCall(expr);

      case ExprType.NAMESPACE:
        return buildNamespace(expr);

      case ExprType.FOR:
        return buildForLoop(expr);

      case ExprType.ELSE:
        return "} else {";

      case ExprType.IF:
        return buildIfBlock(expr);

      case ExprType.ELSE_IF:
        return buildElseIfBlock(expr);

      default:
        throw new MutorError(
          `Unsupported expression type: ${(expr as any).type}`,
        );
    }
  }

  function buildNamespace(expr: NamespaceExpr) {
    if (expr.left.type !== ExprType.IDENT) {
      throw {
        message: "Invalid usage of namespace operator.",
        pos: expr.pos,
      };
    }
    return `namespaces.${(expr.left as IdentExpr).value}.${(expr.right as IdentExpr).value}`;
  }

  function buildPropAccess(expr: PropAccessExpr): string {
    const left = buildExpr(expr.left);

    if (expr.bracketNotation) {
      // Bracket notation: evaluate the expression and check the resolved value at runtime
      const right = buildExpr(expr.right);
      const optionalChain = expr.optional ? "?." : "";

      return expr.right.type !== ExprType.STRING &&
        expr.right.type !== ExprType.NUMBER
        ? `${left}${optionalChain}[${right}]`
        : `${left}${optionalChain}[validateComputedProps(${right}, allowedProps, forbiddenProps)]`;
    } else {
      // Dot notation: static property name - check at build time
      const propName = (expr.right as IdentExpr).value; // Assuming right is always IDENT in dot notation
      const optionalChain = expr.optional ? "?." : ".";

      // Block access to forbidden prototype properties at build time
      if (forbiddenProps.has(propName) && !allowedProps.has(propName)) {
        throw { message: "Forbidden property access.", pos: expr.right.pos };
      }

      return `${left}${optionalChain}${propName}`;
    }
  }

  function buildCall(expr: CallExpr): string {
    const func = buildExpr(expr.expr);
    const optionalChain = expr.optional ? "?." : "";

    const args = (expr.args as Expr[])
      .map((arg: Expr) => buildExpr(arg))
      .join(", ");

    return `${func}${optionalChain}(${args})`;
  }

  function buildForLoop(expr: ForExpr) {
    const { iterable, loopType, variable } = expr;
    return `for(const ${variable} ${loopType === LoopType.IN ? "in" : "of"} ${build(iterable, context)}){`;
  }

  function buildIfBlock(expr: IfExpr) {
    const { condition } = expr;
    return `if(${build(condition, context)}){`;
  }

  function buildElseIfBlock(expr: ElseIfExpr) {
    const { condition } = expr;
    return `}else if(${build(condition, context)}){`;
  }

  return buildExpr(ast);
}
