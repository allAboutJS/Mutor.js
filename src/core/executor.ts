import {
	type BinaryExpression,
	type Expression,
	NodeType,
	TokenType,
	type UnaryExpression,
} from "../types";

export class Executor {
	exprs: Expression[];
	results: any[];

	constructor(exprs: Expression[]) {
		this.exprs = exprs;
		this.results = [];
	}

	private executeBinary(expr: BinaryExpression) {
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

	private executeUnary(expr: UnaryExpression) {
		const op = expr.operator;
		const value = <number>(expr.value as Expression).value;

		switch (op.type) {
			case TokenType.MINUS:
				return -value;

			default:
				throw new Error(`[Mutor.js] Unsupported operator: ${op}`);
		}
	}

	private evalExpr(expr: Expression) {
		switch (expr.type) {
			case NodeType.NUMBER:
			case NodeType.TEXT:
			case NodeType.STRING:
				return expr.value;

			case NodeType.BINARY:
				return this.executeBinary(<BinaryExpression>expr);

			case NodeType.UNARY:
				return this.executeUnary(<UnaryExpression>expr);

			case NodeType.IDENTIFIER:
				return expr.value;

			case NodeType.OBJECT:
				return expr.value;
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
const executor = new Executor([
	{
		type: NodeType.TEXT,
		value: "5 - 2 = ",
	},
	<Expression>{
		type: NodeType.BINARY,
		operator: { type: TokenType.MINUS },
		left: { type: NodeType.NUMBER, value: 5 },
		right: { type: NodeType.NUMBER, value: 2 },
	},
]);

const start = performance.now();
const res = executor.execute();

console.log("Executed in", (performance.now() - start).toFixed(2), "ms");
console.log(res);
