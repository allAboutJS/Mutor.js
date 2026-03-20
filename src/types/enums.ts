export enum TokenType {
  // Directives
  WHITESPACE_DIRECTIVE,
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

export enum NodeType {
  COMPARISON,
  WHITESPACE_DIRECTIVE,
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

export enum Mode {
  CODE,
  TEXT,
}
