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
	TERNARY,
	BINARY,
	UNARY,
	STRING,
	NUMBER,
	IDENTIFIER,
	OBJECT,
	BLOCK_END,
	BLOCK_START,
	TEXT,
	FOR,
	END,
	IF,
	GROUP,
	TRUE,
	FALSE,
}

export type Expression =
	| PrimaryExpression
	| BinaryExpression
	| TernaryExpression
	| MemberExpression
	| IfConditionalExpression
	| ForLoopExpression;

export type PrimaryExpression =
	| { type: NodeType }
	| { type: NodeType; value: string | number }
	| { type: NodeType; name: string; callable?: boolean; args?: Expression[] };

export interface BinaryExpression {
	type: NodeType.BINARY;
	operator: Token;
	left: Expression;
	right: Expression;
}

export interface TernaryExpression
	extends Omit<BinaryExpression, "operator" | "type"> {
	type: NodeType.TERNARY;
	condition: Expression;
}

export interface MemberExpression
	extends Omit<BinaryExpression, "operator" | "type"> {
	type: NodeType.OBJECT;
	left: Expression;
	right: Expression;
	shouldCompute: boolean;
}

export interface IfConditionalExpression {
	type: NodeType.IF;
	body: Expression[];
	condition: Expression;
	elseBlock?: Expression[] | IfConditionalExpression;
}

export interface ForLoopExpression {
	type: NodeType.FOR;
	body: Expression[];
	variable: PrimaryExpression;
	iterable: Expression;
}
