import {
	type BinaryExpression,
	type ComparisonExpression,
	type Expression,
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

	constructor(exprs: Expression[], ctx: Record<string, unknown>) {
		this.ctx = ctx;
		this.exprs = exprs;
		this.results = [];
	}

	private executeComparisonExpr(expr: ComparisonExpression) {
		const { left, operator, right } = expr;
		const leftVal = this.evalExpr(left);

		switch (operator.type) {
			case TokenType.OR: {
				if (leftVal) {
					return true;
				}

				const rightVal = this.evalExpr(right);
				return leftVal || rightVal;
			}

			case TokenType.AND: {
				if (!leftVal) {
					return false;
				}

				const rightVal = this.evalExpr(right);
				return leftVal && rightVal;
			}

			case TokenType.GREATER:
			case TokenType.GREATER_EQUAL:
			case TokenType.LESS:
			case TokenType.LESS_EQUAL: {
				const rightVal = this.evalExpr(right);

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
	}

	private executeTernaryExpr(expr: TernaryExpression) {
		const { condition, left, right } = expr;
		const conditionVal = this.evalExpr(condition);
		const leftVal = this.evalExpr(left);

		if (conditionVal) {
			return leftVal;
		}

		return this.evalExpr(right);
	}

	private executeBinaryExpr(expr: BinaryExpression) {
		const op = expr.operator;
		const left = <unknown>this.evalExpr(expr.left);
		const right = <unknown>this.evalExpr(expr.right);
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

	private executeUnaryExpr(expr: UnaryExpression) {
		const op = expr.operator;
		const value = <unknown>this.evalExpr(expr.body);

		switch (op.type) {
			case TokenType.MINUS:
				return -(<number>value);

			case TokenType.BANG:
				return !value;

			default:
				throw new Error(`[Mutor.js] Unsupported operator: ${op}`);
		}
	}

	private evalExpr(expr: Expression, ctx = this.ctx) {
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
				return this.executeBinaryExpr(<BinaryExpression>expr);

			case NodeType.UNARY:
				return this.executeUnaryExpr(<UnaryExpression>expr);

			case NodeType.GROUP:
				return this.evalExpr(<Expression>expr.body);

			case NodeType.TERNARY:
				return this.executeTernaryExpr(<TernaryExpression>expr);

			case NodeType.COMPARISON:
				return this.executeComparisonExpr(<ComparisonExpression>expr);

			case NodeType.IDENTIFIER: {
				const { name, callable } = expr;
				return callable ? ctx[<string>name]() : ctx[<string>name];
			}

			case NodeType.OBJECT: {
				const { left, right } = <MemberExpression>expr;
				const leftVal = <Record<string, unknown>>this.evalExpr(left);
				const rightVal = <string>this.evalExpr(right, leftVal);

				return rightVal;
			}
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
I am {{ user.personalInfo.age }} years old.
I am {{ user.personalInfo.age >= 18 ? "" : "not"}} an adult.
I want {{ (1000 * 100000).toLocaleString() }} Naira.
`,
);

const parser = new Parser(lexer.scanTokens());
const executor = new Executor(parser.parse(), {
	user: { personalInfo: { fname: "Ugochukwu", lname: "Onah", age: 16 } },
});

const start = performance.now();
const res = executor.execute();

console.log("Executed in", (performance.now() - start).toFixed(2), "ms");
console.log(res);
