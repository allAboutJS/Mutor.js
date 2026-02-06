export const keywords = ["for", "if", "else", "end", "of", "this"] as const;

export enum TokenType {
	// Raw text.
	TEXT,
	// Single-character tokens.
	LEFT_PAREN,
	RIGHT_PAREN,
	LEFT_SQUARE_PAREN,
	RIGHT_SQUARE_PAREN,
	COMMA,
	DOT,
	MINUS,
	PLUS,
	SLASH,
	STAR,
	// One or two character tokens.
	BANG,
	BANG_EQUAL,
	EQUAL,
	EQUAL_EQUAL,
	GREATER,
	GREATER_EQUAL,
	LESS,
	LESS_EQUAL,
	// Literals.
	IDENTIFIER,
	STRING,
	NUMBER,
	// Keywords.
	AND,
	ELSE,
	FALSE,
	FOR,
	IF,
	OR,
	THIS,
	END,
	TRUE,
	// Template blocks.
	BLOCK_START,
	BLOCK_END,
}

export interface Token {
	type: TokenType;
	text?: string;
}

export enum Mode {
	CODE,
	TEXT,
}
