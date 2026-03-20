import {
  type BinaryExpression,
  type ComparisonExpression,
  type Expression,
  type ForLoopExpression,
  type IfConditionalExpression,
  type MemberExpression,
  NodeType,
  type PrimaryExpression,
  type TernaryExpression,
  TokenType,
  type UnaryExpression,
} from "../types";

export class Executor {
  exprs: Expression[];
  results: any[];
  currentResultsArr: any[];
  ctx: Record<string, unknown>;
  prevCtx: Record<string, unknown>;
  trimWhitespaceAfter: boolean;
  trimBlockEnd: boolean;

  constructor(exprs: Expression[], ctx: Record<string, unknown>) {
    this.ctx = ctx;
    this.prevCtx = ctx;
    this.exprs = exprs;
    this.results = [];
    this.currentResultsArr = this.results;
    this.trimWhitespaceAfter = false;
    this.trimBlockEnd = false;
  }

  private executeComparisonExpr(
    expr: ComparisonExpression,
    ctx: Record<string, unknown>,
  ) {
    const { left, operator, right } = expr;
    const leftVal = this.evalExpr(left, ctx);

    switch (operator.type) {
      case TokenType.OR: {
        if (leftVal) {
          return true;
        }

        const rightVal = this.evalExpr(right, ctx);
        return leftVal || rightVal;
      }

      case TokenType.AND: {
        if (!leftVal) {
          return false;
        }

        const rightVal = this.evalExpr(right, ctx);
        return leftVal && rightVal;
      }

      case TokenType.GREATER:
      case TokenType.GREATER_EQUAL:
      case TokenType.LESS:
      case TokenType.LESS_EQUAL: {
        const rightVal = this.evalExpr(right, ctx);

        if (operator.type === TokenType.GREATER) {
          return leftVal > rightVal;
        } else if (operator.type === TokenType.GREATER_EQUAL) {
          return leftVal >= rightVal;
        } else if (operator.type === TokenType.LESS) {
          return leftVal < rightVal;
        } else {
          return leftVal <= rightVal;
        }
      }
    }

    return false;
  }

  private executeTernaryExpr(
    expr: TernaryExpression,
    ctx: Record<string, unknown>,
  ) {
    const { condition, left, right } = expr;
    const conditionVal = this.evalExpr(condition, ctx);

    if (conditionVal) {
      return this.evalExpr(left, ctx);
    }

    return this.evalExpr(right, ctx);
  }

  private executeBinaryExpr(
    expr: BinaryExpression,
    ctx: Record<string, unknown>,
  ) {
    const op = expr.operator;
    const left = <unknown>this.evalExpr(expr.left, ctx);
    const right = <unknown>this.evalExpr(expr.right, ctx);

    switch (op.type) {
      case TokenType.PLUS:
        return <number>left + <number>right;

      case TokenType.MINUS:
        return <number>left - <number>right;

      case TokenType.STAR:
        return <number>left * <number>right;

      case TokenType.SLASH:
        return <number>left / <number>right;
    }
  }

  private executeUnaryExpr(
    expr: UnaryExpression,
    ctx: Record<string, unknown>,
  ) {
    const op = expr.operator;
    const value = this.evalExpr(expr.body, ctx);

    switch (op.type) {
      case TokenType.MINUS:
        return -value;

      case TokenType.BANG:
        return !value;
    }
  }

  private executeIfBlock(
    expr: IfConditionalExpression,
    ctx: Record<string, unknown>,
  ): string | undefined {
    const { body, condition, elseBlock } = expr;
    const conditionVal = this.evalExpr(condition, ctx);

    if (conditionVal) {
      return this.trimBlockEnd
        ? this.execute(body, [], ctx).trimEnd()
        : this.execute(body, [], ctx);
    }

    if (elseBlock) {
      const result = Array.isArray(elseBlock)
        ? this.execute(elseBlock, [], ctx)
        : this.executeIfBlock(elseBlock, ctx);

      if (this.trimBlockEnd && result) {
        this.trimBlockEnd = false;
        return result?.trimEnd();
      }

      return result;
    }
  }

  private executeForLoop(
    expr: ForLoopExpression,
    ctx: Record<string, unknown>,
  ) {
    const { variable, iterable, body } = expr;
    const iterableVal = this.evalExpr(iterable, ctx);

    if (!Array.isArray(iterableVal)) {
      throw new Error(
        `[Mutor.js] unexpected type of iterable in for loop. Expected array, but got ${typeof iterableVal}`,
      );
    }

    const variableVal = <string>variable.name;
    const results = [];
    let scopedCtx: Record<string, unknown> | undefined;

    for (let i = 0; i < iterableVal.length; i++) {
      const item = iterableVal[i];

      if (!scopedCtx) {
        scopedCtx = { ...ctx, [variableVal]: item };
      } else {
        scopedCtx[variableVal] = item;
      }

      results.push(this.execute(body, [], scopedCtx));
    }

    if (this.trimBlockEnd) {
      this.trimBlockEnd = false;
      return results.join("").trimEnd();
    }

    return results.join("");
  }

  private evalMemberExpr(expr: MemberExpression, ctx: Record<string, unknown>) {
    const { left, right, shouldCompute, callable, args } = <MemberExpression>(
      expr
    );
    const leftVal = <Record<string, unknown>>this.evalExpr(left, ctx);
    const rightVal = <string>this.evalExpr(right, leftVal);

    this.prevCtx = ctx;

    if (callable) {
      const argsVals = [];

      if (args?.length) {
        for (let i = 0; i < args.length; i++) {
          argsVals.push(this.evalExpr(args[i], ctx));
        }
      }

      return (<typeof Function>leftVal[rightVal]).apply(
        leftVal,
        <string[]>argsVals,
      );
    }

    return shouldCompute ? leftVal[rightVal] : rightVal;
  }

  private evalIdentifierExpr(
    expr: PrimaryExpression,
    ctx: Record<string, unknown>,
  ) {
    const { name, callable, args } = expr;

    if (callable) {
      const argsVals = [];

      if (args?.length) {
        for (let i = 0; i < args.length; i++) {
          argsVals.push(this.evalExpr(args[i], this.prevCtx));
        }
      }

      return (<typeof Function>ctx[<string>name]).apply(
        ctx,
        <string[]>argsVals,
      );
    }

    return ctx[<string>name];
  }

  private evalExpr(expr: Expression, ctx = this.ctx): any {
    switch (expr.type) {
      case NodeType.NUMBER:
      case NodeType.TEXT:
      case NodeType.STRING:
        return expr.value;

      case NodeType.TRUE:
        return true;

      case NodeType.FALSE:
        return false;

      case NodeType.BINARY:
        return this.executeBinaryExpr(<BinaryExpression>expr, ctx);

      case NodeType.UNARY:
        return this.executeUnaryExpr(<UnaryExpression>expr, ctx);

      case NodeType.GROUP:
        return this.evalExpr(<Expression>expr.body, ctx);

      case NodeType.TERNARY:
        return this.executeTernaryExpr(<TernaryExpression>expr, ctx);

      case NodeType.COMPARISON:
        return this.executeComparisonExpr(<ComparisonExpression>expr, ctx);

      case NodeType.FOR:
        return this.executeForLoop(<ForLoopExpression>expr, ctx);

      case NodeType.IF:
        return this.executeIfBlock(<IfConditionalExpression>expr, ctx);

      case NodeType.IDENTIFIER:
        return this.evalIdentifierExpr(<PrimaryExpression>expr, ctx);

      case NodeType.OBJECT:
        return this.evalMemberExpr(<MemberExpression>expr, ctx);

      case NodeType.WHITESPACE_DIRECTIVE:
        if (expr.front) {
          const lastResItmIdx = this.currentResultsArr.length - 1;
          const lastResItm = this.currentResultsArr[lastResItmIdx];

          this.currentResultsArr[lastResItmIdx] = lastResItm?.trimEnd();
        } else {
          this.trimWhitespaceAfter = true;
        }
    }
  }

  execute(exprs = this.exprs, results = this.results, ctx = this.ctx) {
    const prevResultsArr = this.currentResultsArr;
    this.currentResultsArr = results;

    for (let i = 0; i < exprs.length; i++) {
      const expr = exprs[i];
      if (
        i === exprs.length - 1 &&
        expr.type === NodeType.WHITESPACE_DIRECTIVE &&
        !expr.front
      ) {
        this.trimBlockEnd = true;
        continue;
      }

      const val: any = this.evalExpr(expr, ctx);

      if (this.trimWhitespaceAfter && val) {
        const trimmed = val?.trimStart();
        results.push(trimmed);
        this.trimWhitespaceAfter = false;
      } else {
        results.push(val);
      }
    }

    this.currentResultsArr = prevResultsArr;
    return results.join("");
  }
}
