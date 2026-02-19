import {
	type Expression,
	type IfConditionalExpression,
	type MemberExpression,
	NodeType,
	type PrimaryExpression,
	type Token,
	TokenType,
} from "./types";

export class Parser {
	private tokens: Token[];
	private nodes: Expression[];
	private cursor: number;
	private readonly operators;

	constructor(tokens: Token[]) {
		this.tokens = tokens;
		this.nodes = [];
		this.cursor = 0;
		this.operators = [
			TokenType.AND,
			TokenType.OR,
			TokenType.BANG_EQUAL,
			TokenType.TERNARY,
			TokenType.GREATER,
			TokenType.GREATER_EQUAL,
			TokenType.LESS,
			TokenType.LESS_EQUAL,
			TokenType.EQUAL_EQUAL,
			TokenType.PLUS,
			TokenType.MINUS,
			TokenType.SLASH,
			TokenType.STAR,
			TokenType.COLON,
			TokenType.COMMA,
		];
	}

	/**
	 * Checks if the cursor has reached the end of the token stream.
	 */
	private isAtEnd() {
		return this.cursor >= this.tokens.length;
	}

	/**
	 * Consumes the current token and moves the cursor to the next.
	 */
	private advance(): Token | null {
		return this.tokens[this.cursor++] || null;
	}

	/**
	 * Returns the token at the current cursor position.
	 * If no token is found, `null` is return instead
	 */
	private peek(pos: number = 0): Token | null {
		return this.tokens[this.cursor + pos] || null;
	}

	/**
	 * Checks to see if the token at the current cursor
	 * position is of the same type as the argument passed.
	 */
	private expect(type: TokenType): Token {
		const token = this.peek();

		if (!token || token.type !== type) {
			throw new Error(`[Mutor.js] unexpected token on line ${token?.line}`);
		}

		return <Token>this.advance();
	}

	/**
	 * Checks to see if the token at the cursor's current position
	 * has it's type included in the `operators` array or is of `TokenType.BLOCK_END` or
	 * `TokenType.RIGHT_PAREN`
	 */
	private expectOperatorOrBlockEnd() {
		const token = this.peek();

		if (
			!token ||
			(!this.operators.includes(token.type) &&
				token?.type !== TokenType.BLOCK_END &&
				token?.type !== TokenType.RIGHT_PAREN)
		) {
			throw new Error(`[Mutor.js] unexpected token on line ${token?.line}`);
		}

		return true;
	}

	/**
	 * Ensures that the current block is an `{{ end }}` block.
	 * May be fragile but I couldn't find a better way to achieve the functionality.
	 */
	private expectEndBlock() {
		if (
			this.peek(-1)?.type !== TokenType.BLOCK_START &&
			this.peek()?.type !== TokenType.END &&
			this.peek(1)?.type !== TokenType.BLOCK_END
		) {
			throw new Error(
				`[Mutor.js] expected '{{ end }}' on line ${this.peek()?.line}`,
			);
		}

		// Skip the block end token (`TokenType.BLOCK_END`).
		this.advance();
	}

	/**
	 * Detects a `for` loop block.
	 */
	private detectForLoop() {
		if (this.peek()?.type === TokenType.FOR) {
			// Skip the 'for' keyword token (`TokenType.FOR`).
			this.advance();
			return true;
		}

		return false;
	}

	/**
	 * Detects a function call. The syntax for function calls is
	 * `identifier` + `paren_open` + `[expression [, expression]]` + `paren_close`.
	 * `[expression [, expression]]` denotes optional parameter or a comma separated list of parameters.
	 */
	private detectFunctionCall() {
		if (this.peek()?.type === TokenType.LEFT_PAREN) {
			// Skip the opening parentheses token (`TokenType.LEFT_PAREN`).
			this.advance();
			return true;
		}

		return false;
	}

	/**
	 * Detects an `if` condition block.
	 */
	private detectIfBlock() {
		if (this.peek()?.type === TokenType.IF) {
			// Skip the 'if' keyword token (`TokenType.IF`).
			this.advance();
			return true;
		}

		return false;
	}

	/**
	 * Detects an `else` block.
	 */
	private detectElseBlock() {
		if (this.peek()?.type === TokenType.ELSE) {
			// Skip the 'else' keyword token (`TokenType.ELSE`).
			this.advance();
			return true;
		}

		return false;
	}

	/**
	 * Parses the template until a token included
	 * in the `stoppers` array is encountered.
	 */
	private parseUntil(stoppers: TokenType[]) {
		const nodes: Expression[] = [];

		while (
			!this.isAtEnd() &&
			!stoppers.includes(<TokenType>this.peek()?.type)
		) {
			const expr = this.parseExpression();

			// Block delimiter tokens `{{` and  `}}` are ignored
			// as they will not be important to the executor.
			if (
				expr.type !== NodeType.BLOCK_END &&
				expr.type !== NodeType.BLOCK_START
			) {
				nodes.push(expr);
			}
		}

		return nodes;
	}

	/**
	 * Parses an `if` block.
	 */
	private parseIfBlock(): IfConditionalExpression {
		const condition = this.parseExpression();

		this.expect(TokenType.BLOCK_END);

		const body = this.parseUntil([TokenType.ELSE, TokenType.END]);
		let elseBlock =
			undefined as unknown as IfConditionalExpression["elseBlock"];

		if (this.detectElseBlock()) {
			/**
			 * @description
			 * This is important as Mutor.js treats `{{ else if condition }}`
			 * as though it were:
			 * @example
			 * {{ else }}
			 *  	{{ if condition }}
			 *			...
			 */
			const isElseIf = this.detectIfBlock();

			if (isElseIf) {
				elseBlock = this.parseIfBlock();
			} else {
				elseBlock = this.parseUntil([TokenType.END]);
				this.expectEndBlock();
			}
		}

		return {
			type: NodeType.IF,
			body,
			condition,
			elseBlock,
		};
	}

	/**
	 * Parses a `for` loop block.
	 */
	private parseForLoop() {
		// Expects an identifier which will be used to hold the
		// value of each variable per iteration.
		if (this.peek()?.type !== TokenType.IDENTIFIER) {
			throw new Error(
				`[Mutor.js] malformed for loop on line ${this.peek()?.line}`,
			);
		}

		const variable = this.parsePrimaryExpression();

		this.expect(TokenType.OF);

		const iterable = this.parseExpression();
		const body = this.parseUntil([TokenType.END]);

		this.expectEndBlock();
		return { type: NodeType.FOR, iterable, variable, body };
	}

	/**
	 * Parses and returns the parameters passed to a  given function.
	 */
	parseFunctionParams() {
		const args: Expression[] = [];

		if (this.peek()?.type !== TokenType.RIGHT_PAREN) {
			// Add the first parameter...
			args.push(this.parseExpression());

			// ...then use a loop to extract subsequent parameters.
			while (!this.isAtEnd() && this.peek()?.type === TokenType.COMMA) {
				this.advance();
				args.push(this.parseExpression());
			}
		}

		return args;
	}

	/**
	 * Parses a unary expressions.
	 * @example
	 * !true,  !!true, -(2 + 2), !!(2 + 2), ...
	 */
	private parseUnaryExpression() {
		const operator = this.peek(-1);
		const token = this.peek();

		// Disallow expressions like --1 or +++2
		// Only allow -1, +2, -(-2), -(+2) and so on
		if (
			(operator?.type === TokenType.MINUS ||
				operator?.type === TokenType.PLUS) &&
			(token?.type === TokenType.MINUS || token?.type === TokenType.PLUS)
		) {
			throw new Error(
				`[Mutor.js] unexpected unary expression on ${token?.line}`,
			);
		}

		// Limit the successive use of '!'  to at most 2
		// That it the most that can be done is !!expression
		// Things like !!(!expression) or !!(!!expression) are still valid
		if (
			operator?.type === TokenType.BANG &&
			token?.type === TokenType.BANG &&
			this.peek(1)?.type === TokenType.BANG
		) {
			throw new Error(
				`[Mutor.js] Remove redundant double negation on line ${token?.line}`,
			);
		}

		const body = this.parseExpression();

		this.expectOperatorOrBlockEnd();
		return { type: NodeType.UNARY_EXPRESSION, operator, body };
	}

	/**
	 * Parses expressions grouped with parentheses.
	 */
	private parseGroupedExpression() {
		const body = this.parseExpression();

		this.expect(TokenType.RIGHT_PAREN);
		this.expectOperatorOrBlockEnd();
		return { type: NodeType.GROUPED_EXPRESSION, body };
	}

	/**
	 * Returns the primary node type of a given token.
	 */
	private parsePrimaryExpression(): PrimaryExpression {
		const token = this.advance();

		switch (token?.type) {
			case TokenType.LEFT_PAREN:
				return this.parseGroupedExpression();

			case TokenType.BANG:
			case TokenType.PLUS:
			case TokenType.MINUS:
				return this.parseUnaryExpression();

			case TokenType.BLOCK_START:
				if (this.detectForLoop()) {
					return this.parseForLoop();
				}

				if (this.detectIfBlock()) {
					return this.parseIfBlock();
				}

				return { type: NodeType.BLOCK_START };

			case TokenType.BLOCK_END:
				return { type: NodeType.BLOCK_END };

			case TokenType.NUMBER:
				return { type: NodeType.NUMBER_LITERAL, value: Number(token.text) };

			case TokenType.STRING:
				return { type: NodeType.STRING_LITERAL, value: token.text };

			case TokenType.TEXT:
				return { type: NodeType.TEXT, value: token.text };

			case TokenType.IDENTIFIER: {
				let callable = false,
					args: Expression[] = [];

				if (this.detectFunctionCall()) {
					callable = true;
					args = this.parseFunctionParams();
					this.expect(TokenType.RIGHT_PAREN);
				}

				return {
					type: NodeType.IDENTIFIER,
					name: token.text,
					callable,
					args,
				};
			}

			default:
				throw new Error(`[Mutor.js] unexpected token on line ${token?.line}`);
		}
	}

	/**
	 * Parses property access expressions.
	 * @example
	 * a.b, a[1 + 1], ...
	 */
	private parseMemberExpression(): MemberExpression | PrimaryExpression {
		let object: MemberExpression | PrimaryExpression =
			this.parsePrimaryExpression();

		while (
			this.peek()?.type === TokenType.DOT ||
			this.peek()?.type === TokenType.LEFT_SQUARE_PAREN
		) {
			const operator = <Token>this.advance();
			const shouldCompute = operator.type === TokenType.LEFT_SQUARE_PAREN;
			let property: Expression;

			if (shouldCompute) {
				// Property access using `[...]` is parsed here
				property = this.parseExpression();
				this.expect(TokenType.RIGHT_SQUARE_PAREN);
			} else {
				property = this.parsePrimaryExpression();
			}

			object = { type: NodeType.OBJECT, shouldCompute, object, property };
		}

		// WHY? Well if the NodeType is not one of these,
		// calling expectOperatorOrBlockEnd would lead to an error.
		// Just remove it see. Make sure to put it back!!!
		if (
			object.type === NodeType.OBJECT ||
			object.type === NodeType.NUMBER_LITERAL ||
			object.type === NodeType.STRING_LITERAL ||
			object.type === NodeType.IDENTIFIER
		) {
			this.expectOperatorOrBlockEnd();
		}

		return object;
	}

	/**
	 * Parses multiplicative expressions.
	 * @example
	 * 1 * 1, 12 / 3, ...
	 */
	private parseMultiplicativeExpression() {
		let left: Expression = this.parseMemberExpression();

		while (
			this.peek()?.type === TokenType.SLASH ||
			this.peek()?.type === TokenType.STAR
		) {
			const operator = <Token>this.advance();
			const right = this.parseMemberExpression();

			left = { type: NodeType.BINARY_EXPRESSION, left, right, operator };
			this.expectOperatorOrBlockEnd();
		}

		return left;
	}

	/**
	 * Parses additive expressions.
	 * @example
	 * 1 + 1, 12 - 3, ...
	 */
	private parseAdditiveExpression() {
		let left = this.parseMultiplicativeExpression();

		while (
			this.peek()?.type === TokenType.PLUS ||
			this.peek()?.type === TokenType.MINUS
		) {
			const operator = <Token>this.advance();
			const right = this.parseMultiplicativeExpression();

			left = { type: NodeType.BINARY_EXPRESSION, left, right, operator };
			this.expectOperatorOrBlockEnd();
		}

		return left;
	}

	private parseBooleanExpression() {
		let left = this.parseAdditiveExpression();

		while (
			this.peek()?.type === TokenType.OR ||
			this.peek()?.type === TokenType.AND ||
			this.peek()?.type === TokenType.EQUAL_EQUAL ||
			this.peek()?.type === TokenType.LESS ||
			this.peek()?.type === TokenType.LESS_EQUAL ||
			this.peek()?.type === TokenType.GREATER ||
			this.peek()?.type === TokenType.GREATER_EQUAL ||
			this.peek()?.type === TokenType.BANG_EQUAL
		) {
			const operator = <Token>this.advance();
			const right = this.parseAdditiveExpression();

			left = { type: NodeType.BINARY_EXPRESSION, operator, left, right };
			this.expectOperatorOrBlockEnd();
		}

		return left;
	}

	/**
	 * Parses a ternary expression
	 * @example
	 * a > b ? "YES" : "NO"
	 */
	private parseTernaryExpression(): Expression {
		const condition = this.parseBooleanExpression();

		if (this.peek()?.type !== TokenType.TERNARY) {
			return condition;
		}

		this.advance();

		const left = this.parseExpression();
		const operator = this.expect(TokenType.COLON);
		const right = this.parseExpression();

		this.expectOperatorOrBlockEnd();

		return {
			type: NodeType.TERNARY_EXPRESSION,
			operator,
			condition,
			left,
			right,
		};
	}

	/**
	 * Parses any expression.
	 * This is the top-most level of the parsers.
	 */
	private parseExpression() {
		return this.parseTernaryExpression();
	}

	/**
	 * Parses a stream of tokens, and outputs a stream of expression nodes.
	 */
	parse() {
		while (!this.isAtEnd()) {
			const expr = this.parseExpression();

			if (
				expr.type !== NodeType.BLOCK_END &&
				expr.type !== NodeType.BLOCK_START
			) {
				this.nodes.push(expr);
			}
		}

		return this.nodes;
	}
}
