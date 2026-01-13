export enum TOKEN_TYPE {
	STRING_LITERAL = "STRING_LITERAL",
	PARENTHESES = "PARENTHESES",
	KEYWORD = "KEYWORD",
	TEXT = "TEXT",
	VARIABLE = "VARIABLE",
	DOT = "DOT",
	COLON = "COLON",
	COMMA = "COMMA",
	NUMBER_LITERAL = "NUMBER_LITERAL",
	OPERATOR = "OPERATOR",
}

export enum PARENTHESES {
	CURLY_OPEN = "{",
	CURLY_CLOSE = "}",
	OPEN = "(",
	CLOSE = ")",
}

export enum QUOTE {
	DOUBLE = '"',
	SINGLE = "'",
	BACKTICK = "`",
}

export interface BaseToken {
	value: string;
	type: TOKEN_TYPE;
}

export interface StringToken extends BaseToken {
	isInterpolated: boolean;
	type: TOKEN_TYPE.STRING_LITERAL;
}

export type Token = BaseToken | StringToken;
