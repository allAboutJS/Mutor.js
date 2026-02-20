import { keywords } from "./constants";
import { Mode, type Token, TokenType } from "./types";

export class Lexer {
	private line: number;
	private src: string;
	private cursor: number;
	private tokens: Token[];
	private mode: Mode;
	private textBuffer: string;

	constructor(src: string) {
		this.line = 1;
		this.src = src;
		this.cursor = 0;
		this.tokens = [];
		this.mode = Mode.TEXT;
		this.textBuffer = "";
	}

	private isAtEnd() {
		return this.cursor >= this.src.length;
	}

	private advance() {
		return this.src[this.cursor++];
	}

	private back() {
		this.cursor--;
		return this.src[this.cursor];
	}

	private peek() {
		if (this.isAtEnd()) return null;
		return this.src[this.cursor];
	}

	private match(char: string) {
		if (this.isAtEnd() || this.src[this.cursor] !== char) {
			return false;
		}

		this.cursor++;
		return true;
	}

	private addToken(type: TokenType, text?: string) {
		this.tokens.push({ type, text, line: this.line });
	}

	private skipComment() {
		while (!this.isAtEnd() && this.peek() !== "}") {
			this.advance();
		}

		if (this.match("}")) {
			this.addToken(TokenType.BLOCK_END);
			this.mode = Mode.TEXT;
		}
	}

	private addKeyword(keyword: (typeof keywords)[number]) {
		switch (keyword) {
			case "end":
				this.addToken(TokenType.END);
				break;

			case "of":
				this.addToken(TokenType.OF);
				break;

			case "else":
				this.addToken(TokenType.ELSE);
				break;

			case "for":
				this.addToken(TokenType.FOR);
				break;

			case "if":
				this.addToken(TokenType.IF);
				break;

			case "true":
				this.addToken(TokenType.TRUE);
				break;

			case "false":
				this.addToken(TokenType.FALSE);
				break;
		}
	}

	private scanIdentifier() {
		let strBuffer = <(typeof keywords)[number]>"";

		this.back();

		while (!this.isAtEnd() && /[a-zA-Z_0-9]/.test(this.peek() ?? "")) {
			strBuffer += this.advance();
		}

		keywords.includes(strBuffer)
			? this.addKeyword(strBuffer)
			: this.addToken(TokenType.IDENTIFIER, strBuffer);
	}

	private scanNumber() {
		let isDecimal = false;
		let numBuffer = "";

		this.back();

		while (!this.isAtEnd() && /[0-9.]/.test(<string>this.peek())) {
			const char = this.advance();
			if (char === "." && isDecimal) break;
			if (char === ".") isDecimal = true;
			numBuffer += char;
		}

		this.addToken(TokenType.NUMBER, numBuffer);
	}

	private scanString() {
		const quote = this.back();
		let strBuffer = "";

		this.advance();

		while (!this.isAtEnd()) {
			const char = this.advance();

			if (char === quote) {
				break;
			}

			if (char === "\n" && quote !== "`") {
				throw new Error(`[Mutor.js] unterminated string on line ${this.line}`);
			}

			strBuffer += char;
		}

		if (this.isAtEnd()) {
			throw new Error(`[Mutor.js] unterminated string on line ${this.line}`);
		}

		this.addToken(TokenType.STRING, strBuffer);
	}

	private scanToken() {
		const char = this.advance();

		if (char === "{") {
			const isCodeStart = this.match(char);

			if (isCodeStart && this.mode !== Mode.CODE) {
				this.addToken(TokenType.TEXT, this.textBuffer);
				this.textBuffer = "";
				this.addToken(TokenType.BLOCK_START);
				this.mode = Mode.CODE;
			}

			return;
		}

		if (char === "}") {
			const isCodeEnd = this.match(char);

			if (isCodeEnd && this.mode === Mode.CODE) {
				this.addToken(TokenType.BLOCK_END);
				this.mode = Mode.TEXT;
			}

			return;
		}

		if (this.mode === Mode.TEXT) {
			if (char === "\n") {
				this.line++;
			}

			this.textBuffer += char;
			return;
		}

		// Handle code characters.
		switch (true) {
			case char === "&":
				if (this.match("&")) {
					this.addToken(TokenType.AND);
				} else {
					throw new Error(
						`[Mutor.js] Unexpected token ${char} on line ${this.line}`,
					);
				}
				break;

			case char === "|":
				if (this.match("|")) {
					this.addToken(TokenType.OR);
				} else {
					throw new Error(
						`[Mutor.js] Unexpected token ${char} on line ${this.line}`,
					);
				}
				break;

			case char === "=":
				if (this.match("=")) {
					this.addToken(TokenType.EQUAL_EQUAL);
				} else {
					throw new Error(
						`[Mutor.js] Unexpected token ${char} on line ${this.line}`,
					);
				}
				break;

			case char === ">":
				this.match("=")
					? this.addToken(TokenType.GREATER_EQUAL)
					: this.addToken(TokenType.GREATER);
				break;

			case char === "<":
				this.match("=")
					? this.addToken(TokenType.LESS_EQUAL)
					: this.addToken(TokenType.LESS);
				break;

			case char === "!":
				this.match("=")
					? this.addToken(TokenType.BANG_EQUAL)
					: this.addToken(TokenType.BANG);
				break;

			case char === "*":
				this.addToken(TokenType.STAR);
				break;

			case char === "+":
				this.addToken(TokenType.PLUS);
				break;

			case char === "-":
				this.addToken(TokenType.MINUS);
				break;

			case char === "(":
				this.addToken(TokenType.LEFT_PAREN);
				break;

			case char === ")":
				this.addToken(TokenType.RIGHT_PAREN);
				break;

			case char === "[":
				this.addToken(TokenType.LEFT_SQUARE_PAREN);
				break;

			case char === "]":
				this.addToken(TokenType.RIGHT_SQUARE_PAREN);
				break;

			case char === ".":
				this.addToken(TokenType.DOT);
				break;

			case char === ",":
				this.addToken(TokenType.COMMA);
				break;

			case char === "?":
				this.addToken(TokenType.TERNARY);
				break;

			case char === ":":
				this.addToken(TokenType.COLON);
				break;

			case char === "/":
				{
					const isComment = this.match(char);
					if (isComment) this.skipComment();
					else this.addToken(TokenType.SLASH);
				}
				break;

			case char === " ":
			case char === "\t":
			case char === "\r":
				// Ignore whitespace
				break;

			case char === "\n":
				this.line++;
				break;

			case /[a-zA-Z_]/.test(char):
				this.scanIdentifier();
				break;

			case char === '"':
			case char === "'":
			case char === "`":
				this.scanString();
				break;

			case /[0-9]/.test(char):
				this.scanNumber();
				break;

			default:
				throw new Error(
					`[Mutor.js] Unexpected token ${char} on line ${this.line}`,
				);
		}
	}

	/**
	 * Scans the given string source and returns a stream of tokens.
	 */
	scanTokens() {
		while (!this.isAtEnd()) {
			this.scanToken();
		}

		if (this.textBuffer.length) {
			this.addToken(TokenType.TEXT, this.textBuffer);
		}

		return this.tokens;
	}
}
