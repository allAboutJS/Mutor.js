import { keywords, Mode, type Token, TokenType } from "./constants";

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
		if (this.isAtEnd() || this.src[this.cursor] !== char) return false;
		this.cursor++;
		return true;
	}

	private addToken(type: TokenType, text?: string) {
		this.tokens.push({ type, text });
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
			case "else":
				this.addToken(TokenType.ELSE);
				break;

			case "end":
				this.addToken(TokenType.END);
				break;

			case "for":
				this.addToken(TokenType.FOR);
				break;

			case "if":
				this.addToken(TokenType.IF);
				break;

			case "this":
				this.addToken(TokenType.THIS);
				break;
		}
	}

	private scanIdentifier() {
		let strBuffer = <(typeof keywords)[number]>"";
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
		while (!this.isAtEnd() && /[0-9.]/.test(<string>this.peek())) {
			const char = this.advance();
			if (char === "." && isDecimal) break;
			if (char === ".") isDecimal = true;
			numBuffer += char;
		}
		this.addToken(TokenType.NUMBER, numBuffer);
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
			this.textBuffer += char;
			return;
		}

		// Handle code characters.
		switch (true) {
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
				this.back();
				this.scanIdentifier();
				break;

			case /[0-9]/.test(char):
				this.back();
				this.scanNumber();
				break;

			default:
				throw new Error(
					`[Mutor.js] Unexpected token ${char} in line ${this.line}`,
				);
		}
	}

	scanTokens() {
		while (!this.isAtEnd()) {
			this.scanToken();
		}
		if (this.textBuffer.length) this.addToken(TokenType.TEXT, this.textBuffer);
		return this.tokens;
	}
}
