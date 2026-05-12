import type { ExprType, LoopType, TokenType } from "./enums";

export type BaseToken = {
  type: TokenType;
  value: string;
  pos: number;
};

export type KeywordToken = BaseToken & { type: TokenType.KEYWORD };
export type IdentToken = BaseToken & { type: TokenType.IDENT };
export type StringToken = BaseToken & { type: TokenType.STRING };
export type NumberToken = BaseToken & { type: TokenType.NUMBER };
export type OperatorToken = BaseToken & { type: TokenType.OPERATOR };

export type Token =
  | BaseToken
  | KeywordToken
  | IdentToken
  | StringToken
  | NumberToken
  | OperatorToken;

export type EndExpr = {
  type: ExprType.END;
  pos: number;
};

export type ForExpr = {
  pos: number;
  type: ExprType.FOR;
  variable: string;
  iterable: Expr;
  loopType: LoopType;
};

export type IfExpr = {
  pos: number;
  type: ExprType.IF;
  condition: Expr;
};

export type ElseExpr = {
  pos: number;
  type: ExprType.ELSE;
};

export type ElseIfExpr = {
  pos: number;
  type: ExprType.ELSE_IF;
  condition: Expr;
};

export type BooleanExpr = {
  pos: number;
  type: ExprType.BOOLEAN;
  true: boolean;
};

export type UndefinedExpr = {
  pos: number;
  type: ExprType.UNDEFINED;
};

export type NullExpr = {
  pos: number;
  type: ExprType.NULL;
};

export type PropAccessExpr = {
  pos: number;
  type: ExprType.PROP_ACCESS;
  left: Expr;
  right: Expr;
  bracketNotation?: boolean;
  optional?: boolean;
};

export type BinaryExpr = {
  pos: number;
  type: ExprType.BINARY;
  left: Expr;
  right: Expr;
  operator: string;
};

export type UnaryExpr = {
  pos: number;
  type: ExprType.UNARY;
  operator: string;
  expr: Expr;
  isPostfix?: boolean;
};

export type TernaryExpr = {
  pos: number;
  type: ExprType.TERNARY;
  condition: Expr;
  left: Expr;
  right: Expr;
};

export type CallExpr = {
  pos: number;
  type: ExprType.CALL;
  expr: Expr;
  args: Expr[];
  optional?: boolean;
};

export type IdentExpr = {
  pos: number;
  type: ExprType.IDENT;
  value: string;
};

export type GroupExpr = {
  pos: number;
  type: ExprType.GROUP;
  expr: Expr;
};

export type StringExpr = {
  pos: number;
  type: ExprType.STRING;
  value: string;
};

export type NumberExpr = {
  pos: number;
  type: ExprType.NUMBER;
  value: string;
};

export type NamespaceExpr = {
  pos: number;
  type: ExprType.NAMESPACE;
  left: Expr;
  right: Expr;
};

export type Expr =
  | ForExpr
  | IfExpr
  | ElseIfExpr
  | ElseExpr
  | EndExpr
  | BooleanExpr
  | NullExpr
  | UndefinedExpr
  | PropAccessExpr
  | IdentExpr
  | BinaryExpr
  | UnaryExpr
  | TernaryExpr
  | CallExpr
  | GroupExpr
  | StringExpr
  | NumberExpr
  | NamespaceExpr;

export interface MutorConfig {
  cache: {
    active: boolean;
    maxSize: number;
  };
  keepOpeningTagEscapeDelimiter: boolean;
  allowedProps: Set<string>;
  forbiddenProps: Set<string>;
  allowFnCalls: boolean;
  autoEscape: boolean;
  onIncludeFail: "throw" | "ignore" | "ignoreLog";
  onIncludeError?: (
    meta: { from: string; path: string; absolutePath?: string },
    err: any,
  ) => void;
  build: {
    include: Set<string>;
    exclude: Set<string>;
  };
  delimiters: {
    openingTag: string;
    closingTag: string;
    whitespaceTrim: string;
    openingTagEscape: string;
    commentTag: string;
  };
}

export type PartialMutorConfig = Partial<Omit<MutorConfig, "delimiters">> & {
  delimiters?: Partial<MutorConfig["delimiters"]>;
  cache?: Partial<MutorConfig["cache"]>;
  build?: {
    include?: Set<string>;
    exclude?: Set<string>;
  };
};

export type BuildContext = {
  scope: string[];
  forbiddenProps: Set<string>;
  allowedProps: Set<string>;
};

export type CompileMetadata = {
  path: string;
};

export type CommandStruct = {
  command: string;
  commandData: string;
  "--out"?: string;
  "--data"?: string;
  "--config"?: string;
};

export type CleanupFn = () => void;

export type ExitCode =
  | 0 // Success
  | 1 // RuntimeError
  | 2; // ArgumentError
