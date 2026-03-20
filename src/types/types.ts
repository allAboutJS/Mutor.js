import type { NodeType, TokenType } from "./enums";

export interface Context extends Record<string, unknown> {}

export interface Token {
  type: TokenType;
  text?: string;
  line: number;
}

export type Expression =
  | PrimaryExpression
  | ComparisonExpression
  | GroupExpression
  | UnaryExpression
  | BinaryExpression
  | TernaryExpression
  | MemberExpression
  | IfConditionalExpression
  | ForLoopExpression;

export type PrimaryExpression = {
  type: NodeType;
  value?: string | number;
  name?: string;
  callable?: boolean;
  args?: Expression[];
  body?: Expression;
  front?: boolean;
};

export interface GroupExpression {
  type: NodeType.GROUP;
  body: Expression;
}

export interface UnaryExpression {
  type: NodeType.UNARY;
  operator: Token;
  body: Expression;
}

export interface BinaryExpression {
  type: NodeType.BINARY;
  operator: Token;
  left: Expression;
  right: Expression;
}

export interface ComparisonExpression extends Omit<BinaryExpression, "type"> {
  type: NodeType.COMPARISON;
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
  callable?: boolean;
  args?: Expression[];
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
