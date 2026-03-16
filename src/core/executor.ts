import {
	type BinaryExpression,
	type ComparisonExpression,
	type Expression,
	type ForLoopExpression,
	type MemberExpression,
	NodeType,
	type TernaryExpression,
	TokenType,
	type UnaryExpression,
} from "../types";
import { Lexer } from "./lexer";
import { Parser } from "./parser";

export class Executor {
	exprs: Expression[];
	results: any[];
	ctx: Record<string, unknown>;
	trimWhitespaceAfter: boolean;

	constructor(exprs: Expression[], ctx: Record<string, unknown>) {
		this.ctx = ctx;
		this.exprs = exprs;
		this.results = [];
		this.trimWhitespaceAfter = false;
	}

	private executeComparisonExpr(
		expr: ComparisonExpression,
		ctx: Record<string, unknown>,
	): boolean {
		const { left, operator, right } = expr;
		const leftVal = <any>this.evalExpr(left, ctx);

		switch (operator.type) {
			case TokenType.OR: {
				if (leftVal) {
					return true;
				}

				const rightVal = <any>this.evalExpr(right, ctx);
				return leftVal || rightVal;
			}

			case TokenType.AND: {
				if (!leftVal) {
					return false;
				}

				const rightVal = <any>this.evalExpr(right, ctx);
				return leftVal && rightVal;
			}

			case TokenType.GREATER:
			case TokenType.GREATER_EQUAL:
			case TokenType.LESS:
			case TokenType.LESS_EQUAL: {
				const rightVal = <any>this.evalExpr(right, ctx);

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
	): unknown {
		const { condition, left, right } = expr;
		const conditionVal = this.evalExpr(condition, ctx);
		const leftVal = this.evalExpr(left, ctx);

		if (conditionVal) {
			return leftVal;
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
		const hasStrType = typeof right === "string" || typeof left === "string";

		if (
			op.type !== TokenType.PLUS &&
			op.type !== TokenType.STAR &&
			hasStrType
		) {
			throw new Error(
				`[Mutor.js] unexpected operation ${op.type} on string type`,
			);
		}

		switch (op.type) {
			case TokenType.PLUS:
				return <number>left + <number>right;

			case TokenType.MINUS:
				return <number>left - <number>right;

			case TokenType.STAR:
				if (hasStrType) {
					if (typeof right === "string" && typeof left === "string") {
						throw new Error(
							`[Mutor.js] unexpected operation ${op.type} on string type`,
						);
					}

					if (typeof right === "string") {
						return right.repeat(<number>left);
					} else {
						return (<string>left).repeat(<number>right);
					}
				}

				return <number>left * <number>right;

			case TokenType.SLASH:
				return <number>left / <number>right;

			default:
				throw new Error(`[Mutor.js] Unsupported operator: ${op}`);
		}
	}

	private executeUnaryExpr(
		expr: UnaryExpression,
		ctx: Record<string, unknown>,
	) {
		const op = expr.operator;
		const value = <unknown>this.evalExpr(expr.body, ctx);

		switch (op.type) {
			case TokenType.MINUS:
				return -(<number>value);

			case TokenType.BANG:
				return !value;

			default:
				throw new Error(`[Mutor.js] Unsupported operator: ${op}`);
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

			for (let j = 0; j < body.length; j++) {
				const val = <string>this.evalExpr(body[j], scopedCtx);

				if (j === 0) {
					const isOnlyWhitespace = /^[\s]+$/.test(val);
					const hasNewline = /\n/u.test(val);

					if (isOnlyWhitespace && hasNewline) {
						// Trim up to the newline;
						const lastNewlineIdx = val.lastIndexOf("\n");
						const newVal = val.substring(lastNewlineIdx + 1);

						results.push(newVal);
						continue;
					}

					results.push(val);
					continue;
				}

				if (j === body.length) {
					results.push(val.trim());
					continue;
				}

				results.push(val);
			}
		}

		return results.join("");
	}

	private executeMemberExpr(
		expr: MemberExpression,
		ctx: Record<string, unknown>,
	) {
		const { left, right, shouldCompute, callable, args } = <MemberExpression>(
			expr
		);
		const leftVal = <Record<string, unknown>>this.evalExpr(left, ctx);
		const rightVal = <string>this.evalExpr(right, leftVal);

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

	private evalExpr(expr: Expression, ctx = this.ctx): unknown {
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

			case NodeType.IDENTIFIER: {
				const { name, callable, args } = expr;

				if (callable) {
					const argsVals = [];

					if (args?.length) {
						for (let i = 0; i < args.length; i++) {
							argsVals.push(this.evalExpr(args[i], ctx));
						}
					}

					return (<typeof Function>ctx[<string>name]).apply(
						ctx,
						<string[]>argsVals,
					);
				}

				return ctx[<string>name];
			}

			case NodeType.OBJECT:
				return this.executeMemberExpr(<MemberExpression>expr, ctx);
		}
	}

	execute() {
		for (const expr of this.exprs) {
			this.results.push(this.evalExpr(expr));
		}

		return this.results.join("");
	}
}

// Test
const lexer = new Lexer(
	`
Hi my name is {{ user.personalInfo.fname }} {{ user.personalInfo.lname }}.
I am {{ user['personalInfo']['age'] }} years old.
I am {{ user.personalInfo.age >= 18 ? "" : "not"}} an adult.
I want {{ (1000 * 100000).toLocaleString() }} Naira.
  {{ for i of loop }}
  {{ i.toUpperCase() + i }}
  {{ end }}`,
);

const start = performance.now();
const parser = new Parser(lexer.scanTokens());
const executor = new Executor(parser.parse(), {
	user: { personalInfo: { fname: "Ugochukwu", lname: "Onah", age: 16 } },
	loop: ["a", "b", "c"],
});

const res = executor.execute();
const end = performance.now() - start;

console.log("Executed in", end.toFixed(2), "ms");
console.log(res);
