export enum TokenType {
	// Raw text.
	TEXT,
	// Single-character tokens.
	TERNARY,
	LEFT_PAREN,
	RIGHT_PAREN,
	LEFT_SQUARE_PAREN,
	RIGHT_SQUARE_PAREN,
	COMMA,
	DOT,
	COLON,
	MINUS,
	PLUS,
	SLASH,
	STAR,
	// One or two character tokens.
	BANG,
	BANG_EQUAL,
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
	OF,
	IF,
	OR,
	THIS,
	END,
	TRUE,
	// Template blocks.
	BLOCK_START,
	BLOCK_END,
}

export enum Mode {
	CODE,
	TEXT,
}

export interface Token {
	type: TokenType;
	text?: string;
	line: number;
}

export enum NodeType {
	TERNARY_EXPRESSION,
	BINARY_EXPRESSION,
	UNARY_EXPRESSION,
	STRING_LITERAL,
	NUMBER_LITERAL,
	IDENTIFIER,
	OBJECT,
	BLOCK_END,
	BLOCK_START,
	TEXT,
	FOR,
	END,
	IF,
	FUNCTION,
	GROUPED_EXPRESSION,
}

export type Expression =
	| PrimaryExpression
	| BinaryExpression
	| TernaryExpression
	| MemberExpression;

export type PrimaryExpression =
	| { type: NodeType }
	| { type: NodeType; value: string | number }
	| { type: NodeType; name: string; callable?: boolean; args?: Expression[] };

export type BinaryExpression = {
	type: NodeType;
	operator: Token;
	left: Expression;
	right: Expression;
};

export type TernaryExpression = BinaryExpression & {
	condition: Expression;
};

export type MemberExpression = {
	type: NodeType;
	property: Expression;
	shouldCompute: boolean;
	object: Expression;
};

export type IfConditionalExpression = {
	type: NodeType;
	body: Expression[];
	condition: Expression;
	elseBlock: Expression[] | IfConditionalExpression;
};
