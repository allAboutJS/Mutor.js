export enum TokenType {
  IDENT,
  KEYWORD,
  NUMBER,
  STRING,
  OPERATOR,
}

export enum ExprType {
  BINARY,
  TERNARY,
  UNARY,
  CALL,
  STRING,
  NUMBER,
  NAMESPACE,
  IDENT,
  PROP_ACCESS,
  GROUP,
  BOOLEAN,
  UNDEFINED,
  NULL,
  FOR,
  IF,
  ELSE_IF,
  ELSE,
  BREAK,
  CONTINUE,
  BLOCK_END,
}

export enum LoopType {
  OF,
  IN,
}

export enum BlockType {
  LOOP,
  IF,
}
