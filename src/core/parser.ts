import {
  type Expression,
  type ForLoopExpression,
  type IfConditionalExpression,
  NodeType,
  type PrimaryExpression,
  type TernaryExpression,
  type Token,
  TokenType,
} from "../types";

export class Parser {
  private tokens: Token[];
  private nodes: Expression[];
  private cursor: number;
  private trimNextExpr: boolean;
  private currentNodesArr: Expression[];

  private static readonly operators = [
    TokenType.AND,
    TokenType.OR,
    TokenType.BANG_EQUAL,
    TokenType.TERNARY,
    TokenType.GREATER,
    TokenType.GREATER_EQUAL,
    TokenType.LESS,
    TokenType.LESS_EQUAL,
    TokenType.EQUAL_EQUAL,
    TokenType.PLUS,
    TokenType.MINUS,
    TokenType.SLASH,
    TokenType.STAR,
    TokenType.COLON,
    TokenType.COMMA,
    TokenType.DOT,
  ];

  constructor(tokens: Token[]) {
    this.tokens = tokens;
    this.nodes = [];
    this.currentNodesArr = this.nodes;
    this.trimNextExpr = false;
    this.cursor = 0;
  }

  /**
   * Checks if the cursor has reached the end of the token stream.
   */
  private isAtEnd() {
    return this.cursor >= this.tokens.length;
  }

  /**
   * Consumes the current token and moves the cursor to the next.
   */
  private advance(): Token | null {
    return this.tokens[this.cursor++] || null;
  }

  /**
   * Returns the token at the current cursor position.
   * If no token is found, `null` is return instead
   */
  private peek(pos: number = 0): Token | null {
    return this.tokens[this.cursor + pos] || null;
  }

  /**
   * Checks to see if the token at the current cursor
   * position is of the same type as the argument passed.
   */
  private expect(type: TokenType): Token {
    const token = this.peek();

    if (!token || token.type !== type) {
      throw new Error(`[Mutor.js] unexpected token on line ${token?.line}`);
    }

    return <Token>this.advance();
  }

  /**
   * Checks to see if the token at the cursor's current position
   * has it's type included in the `operators` array or is of `TokenType.BLOCK_END` or
   * `TokenType.RIGHT_PAREN`
   */
  private expectOperatorOrBlockEnd() {
    let token = this.peek();

    // A whitespace directive appears before the block end token
    // Like this: -}}
    // This helps loop and if conditional blocks to know that
    // their logic body requires trimming. For loops
    // This means that on every iteration the result Property
    // iteration should be trimmed
    if (token?.type === TokenType.WHITESPACE_DIRECTIVE) {
      this.trimNextExpr = true;
      this.advance();
      token = this.peek();
    }

    if (
      !token ||
      (!Parser.operators.includes(token.type) &&
        token?.type !== TokenType.BLOCK_END &&
        token?.type !== TokenType.RIGHT_PAREN &&
        token?.type !== TokenType.RIGHT_SQUARE_PAREN)
    ) {
      throw new Error(`[Mutor.js] unexpected token on line ${token?.line}`);
    }

    return true;
  }

  /**
   * Ensures that the current block is an `{{ end }}` block.
   * May be fragile but I couldn't find a better way to achieve the functionality.
   */
  private expectEndBlock() {
    const prev1 = this.peek(-1);
    const prev2 = this.peek(-2);

    const next1 = this.peek(1);
    const next2 = this.peek(2);

    const line = this.peek()?.line;

    const hasLeftDirective = prev1?.type === TokenType.WHITESPACE_DIRECTIVE;
    const hasRightDirective = next1?.type === TokenType.WHITESPACE_DIRECTIVE;

    const leftValid =
      prev1?.type === TokenType.BLOCK_START ||
      (hasLeftDirective && prev2?.type === TokenType.BLOCK_START);

    const rightValid =
      next1?.type === TokenType.BLOCK_END ||
      (hasRightDirective && next2?.type === TokenType.BLOCK_END);

    if (!leftValid || !rightValid) {
      throw new Error(
        `[Mutor.js] invalid end block syntax on line ${line}. Expected '{{ end }}', '{{- end }}', '{{ end -}}', or '{{- end -}}'`,
      );
    }

    // consume END
    this.advance();

    // handle {{ end -}}
    if (hasRightDirective) {
      this.advance(); // skip directive
    }

    // consume }}
    if (this.peek()?.type === TokenType.BLOCK_END) {
      this.advance();
    }

    return hasRightDirective;
  }

  /**
   * Detects a `for` loop block.
   */
  private detectForLoop() {
    if (this.peek()?.type === TokenType.FOR) {
      // Skip the 'for' keyword token (`TokenType.FOR`).
      this.advance();
      return true;
    }

    return false;
  }

  /**
   * Detects a function call. The syntax for function calls is
   * `identifier` + `paren_open` + `[expression [, expression]]` + `paren_close`.
   * `[expression [, expression]]` denotes optional parameter or a comma separated list of parameters.
   */
  private detectFunctionCall() {
    if (this.peek()?.type === TokenType.LEFT_PAREN) {
      // Skip the opening parentheses token (`TokenType.LEFT_PAREN`).
      this.advance();
      return true;
    }

    return false;
  }

  /**
   * Detects an `if` condition block.
   */
  private detectIfBlock() {
    if (this.peek()?.type === TokenType.IF) {
      // Skip the 'if' keyword token (`TokenType.IF`).
      this.advance();
      return true;
    }

    return false;
  }

  /**
   * Detects an `else` block.
   */
  private detectElseBlock() {
    if (this.peek()?.type === TokenType.ELSE) {
      // Skip the 'else' keyword token (`TokenType.ELSE`).
      this.advance();
      return true;
    }

    return false;
  }

  /**
   * Parses an `if` block.
   */
  private parseIfBlock(
    pushWhitespaceDirective?: true,
  ): IfConditionalExpression {
    // This means that the if block declaration contains
    // a whitespace directive {{- if condition }}
    if (pushWhitespaceDirective) {
      this.currentNodesArr.push({
        type: NodeType.WHITESPACE_DIRECTIVE,
        front: true,
      });
    }

    const condition = this.parseExpression();
    this.expect(TokenType.BLOCK_END);

    const body: Expression[] = [];
    if (this.trimNextExpr) {
      body.unshift({ type: NodeType.WHITESPACE_DIRECTIVE, front: false });
      this.trimNextExpr = false;
    }

    this.parse(body, [TokenType.ELSE, TokenType.END]);
    let elseBlock: IfConditionalExpression | Expression[] | undefined;

    if (this.detectElseBlock()) {
      // This is important as Mutor treats `{{ else if condition }}`
      // as though it were:
      // {{ else }}
      //   {{ if condition }}
      //      ...
      const isElseIf = this.detectIfBlock();

      if (isElseIf) {
        elseBlock = this.parseIfBlock();
      } else {
        elseBlock = <Expression[]>this.parse([], [TokenType.END]);
        const hasDirective = this.expectEndBlock();

        if (hasDirective) {
          elseBlock.push({ type: NodeType.WHITESPACE_DIRECTIVE, front: false });
        }
      }
    } else {
      const hasDirective = this.expectEndBlock();
      if (hasDirective) {
        body.push({
          type: NodeType.WHITESPACE_DIRECTIVE,
          front: false,
        });
      }
    }

    return {
      type: NodeType.IF,
      body,
      condition,
      elseBlock,
    };
  }

  /**
   * Parses a `for` loop block.
   */
  private parseForLoop(pushWhitespaceDirective?: true): ForLoopExpression {
    // This means that the if block declaration contains
    // a whitespace directive {{- for variable of iterable }}
    if (pushWhitespaceDirective) {
      this.currentNodesArr.push({
        type: NodeType.WHITESPACE_DIRECTIVE,
        front: true,
      });
    }

    // Expects an identifier which will be used to hold the
    // value of each variable per iteration.
    if (this.peek()?.type !== TokenType.IDENTIFIER) {
      throw new Error(
        `[Mutor.js] malformed for loop on line ${this.peek()?.line}`,
      );
    }

    const variable = <PrimaryExpression>this.parsePrimaryExpression();
    this.expect(TokenType.OF);

    // The iterable would usually be an expression
    // But for the sake of the whitespace directive the parser
    // has to parse it. So it just parses until the block end token
    // It could have started with parseExpression
    const iterable = this.parseExpression();
    this.expect(TokenType.BLOCK_END);

    const body: Expression[] = [];
    if (this.trimNextExpr) {
      body.unshift({ type: NodeType.WHITESPACE_DIRECTIVE, front: false });
      this.trimNextExpr = false;
    }

    this.parse(body, [TokenType.END]);

    const hasDirective = this.expectEndBlock();
    if (hasDirective) {
      body.push({
        type: NodeType.WHITESPACE_DIRECTIVE,
        front: false,
      });
    }

    return { type: NodeType.FOR, iterable, variable, body };
  }

  /**
   * Parses and returns the parameters passed to a  given function.
   */
  private parseFunctionParams() {
    const args: Expression[] = [];

    if (this.peek()?.type !== TokenType.RIGHT_PAREN) {
      // Add the first parameter...
      args.push(this.parseExpression());

      // ...then use a loop to extract subsequent parameters.
      while (!this.isAtEnd() && this.peek()?.type === TokenType.COMMA) {
        this.advance();
        args.push(this.parseExpression());
      }
    }

    this.expect(TokenType.RIGHT_PAREN);
    return args;
  }

  /**
   * Parses a unary expressions.
   * @example
   * !true,  !!true, -(2 + 2), !!(2 + 2), ...
   */
  private parseUnaryExpression() {
    const operator = this.peek(-1);
    const token = this.peek();

    // Disallow expressions like --1 or +++2
    // Only allow -1, +2, -(-2), -(+2) and so on
    if (
      (operator?.type === TokenType.MINUS ||
        operator?.type === TokenType.PLUS) &&
      (token?.type === TokenType.MINUS || token?.type === TokenType.PLUS)
    ) {
      throw new Error(
        `[Mutor.js] unexpected unary expression on ${token?.line}`,
      );
    }

    // Limit the successive use of '!'  to at most 2
    // That it the most that can be done is !!expression
    // Things like !!(!expression) or !!(!!expression) are still valid
    if (
      operator?.type === TokenType.BANG &&
      token?.type === TokenType.BANG &&
      this.peek(1)?.type === TokenType.BANG
    ) {
      throw new Error(
        `[Mutor.js] Remove redundant double negation on line ${token?.line}`,
      );
    }

    const body = this.parseExpression();

    this.expectOperatorOrBlockEnd();
    return { type: NodeType.UNARY, operator, body };
  }

  /**
   * Parses expressions GROUP with parentheses.
   */
  private parseGroupExpression() {
    const body = this.parseExpression();

    this.expect(TokenType.RIGHT_PAREN);
    this.expectOperatorOrBlockEnd();
    return { type: NodeType.GROUP, body };
  }

  /**
   * Parses an identifier.
   */
  private parseIdentifier(token: Token) {
    let callable: boolean | undefined, args: Expression[] | undefined;

    if (this.detectFunctionCall()) {
      callable = true;
      args = this.parseFunctionParams();
    }

    return {
      type: NodeType.IDENTIFIER,
      name: token.text,
      callable,
      args: args || undefined,
    };
  }

  /**
   * Returns the primary node type of a given token.
   */
  private parsePrimaryExpression(): Expression {
    const token = this.advance();

    switch (token?.type) {
      case TokenType.FALSE:
        return { type: NodeType.FALSE };

      case TokenType.TRUE:
        return { type: NodeType.TRUE };

      case TokenType.LEFT_PAREN:
        return this.parseGroupExpression();

      case TokenType.BANG:
      case TokenType.PLUS:
      case TokenType.MINUS:
        return this.parseUnaryExpression();

      case TokenType.WHITESPACE_DIRECTIVE:
        if (this.detectForLoop()) {
          return this.parseForLoop(true);
        }

        if (this.detectIfBlock()) {
          return this.parseIfBlock(true);
        }

        return {
          type: NodeType.WHITESPACE_DIRECTIVE,
          front: this.peek(-2)?.type === TokenType.BLOCK_START,
        };

      case TokenType.BLOCK_START:
        if (this.detectForLoop()) {
          return this.parseForLoop();
        }

        if (this.detectIfBlock()) {
          return this.parseIfBlock();
        }

        return { type: NodeType.BLOCK_START };

      case TokenType.BLOCK_END:
        return { type: NodeType.BLOCK_END };

      case TokenType.NUMBER:
        return { type: NodeType.NUMBER, value: Number(token.text) };

      case TokenType.STRING:
        return { type: NodeType.STRING, value: token.text };

      case TokenType.TEXT:
        return { type: NodeType.TEXT, value: token.text };

      case TokenType.IDENTIFIER:
        return this.parseIdentifier(token);

      default:
        throw new Error(`[Mutor.js] unexpected token on line ${token?.line}`);
    }
  }

  /**
   * Parses property access expressions.
   * @example
   * a.b, a[1 + 1], ...
   */
  private parseMemberExpression() {
    let left = this.parsePrimaryExpression();

    while (
      this.peek()?.type === TokenType.DOT ||
      this.peek()?.type === TokenType.LEFT_SQUARE_PAREN
    ) {
      const operator = <Token>this.advance();
      const shouldCompute = operator.type === TokenType.LEFT_SQUARE_PAREN;
      let right: Expression;

      if (shouldCompute) {
        // Property access using `[...]` is parsed here
        right = this.parseExpression();
        this.expect(TokenType.RIGHT_SQUARE_PAREN);
      } else {
        right = this.parsePrimaryExpression();
      }

      const callable = this.detectFunctionCall();
      let args: Expression[] | undefined;

      if (callable) {
        args = this.parseFunctionParams();
      }

      left = {
        type: NodeType.OBJECT,
        left,
        right,
        args,
        callable,
        shouldCompute,
      };
    }

    // WHY? Well if the NodeType is not one of these,
    // calling expectOperatorOrBlockEnd would lead to an error.
    // Just remove it see. Make sure to put it back!!!
    if (
      left.type === NodeType.OBJECT ||
      left.type === NodeType.NUMBER ||
      left.type === NodeType.STRING ||
      left.type === NodeType.IDENTIFIER
    ) {
      this.expectOperatorOrBlockEnd();
    }

    return left;
  }

  /**
   * Parses multiplicative expressions.
   * @example
   * 1 * 1, 12 / 3, ...
   */
  private parseMultiplicativeExpression() {
    let left: Expression = this.parseMemberExpression();

    while (
      this.peek()?.type === TokenType.SLASH ||
      this.peek()?.type === TokenType.STAR
    ) {
      const operator = <Token>this.advance();
      const right = this.parseMemberExpression();

      left = { type: NodeType.BINARY, left, right, operator };
      this.expectOperatorOrBlockEnd();
    }

    return left;
  }

  /**
   * Parses additive expressions.
   * @example
   * 1 + 1, 12 - 3, ...
   */
  private parseAdditiveExpression() {
    let left = this.parseMultiplicativeExpression();

    while (
      this.peek()?.type === TokenType.PLUS ||
      this.peek()?.type === TokenType.MINUS
    ) {
      const operator = <Token>this.advance();
      const right = this.parseMultiplicativeExpression();

      left = { type: NodeType.BINARY, left, right, operator };
      this.expectOperatorOrBlockEnd();
    }

    return left;
  }

  private parseComparisonExpression() {
    let left = this.parseAdditiveExpression();

    while (
      this.peek()?.type === TokenType.OR ||
      this.peek()?.type === TokenType.AND ||
      this.peek()?.type === TokenType.EQUAL_EQUAL ||
      this.peek()?.type === TokenType.LESS ||
      this.peek()?.type === TokenType.LESS_EQUAL ||
      this.peek()?.type === TokenType.GREATER ||
      this.peek()?.type === TokenType.GREATER_EQUAL ||
      this.peek()?.type === TokenType.BANG_EQUAL
    ) {
      const operator = <Token>this.advance();
      const right = this.parseAdditiveExpression();

      left = {
        type: NodeType.COMPARISON,
        operator,
        left,
        right,
      };
      this.expectOperatorOrBlockEnd();
    }

    return left;
  }

  /**
   * Parses a ternary expression
   * @example
   * a > b ? "YES" : "NO"
   */
  private parseTernaryExpression(): TernaryExpression | Expression {
    const condition = this.parseComparisonExpression();

    if (this.peek()?.type !== TokenType.TERNARY) {
      return condition;
    }

    this.advance();

    const left = this.parseExpression();
    this.expect(TokenType.COLON);
    const right = this.parseExpression();

    this.expectOperatorOrBlockEnd();

    return {
      type: NodeType.TERNARY,
      condition,
      left,
      right,
    };
  }

  /**
   * Parses any expression.
   * This is the top-most level of the parsers.
   */
  private parseExpression() {
    return this.parseTernaryExpression();
  }

  /**
   * Parses a stream of tokens, and outputs a stream of expression nodes.
   */
  parse(nodes = this.nodes, stoppers?: TokenType[]) {
    this.currentNodesArr = nodes;

    while (
      !this.isAtEnd() &&
      !stoppers?.includes(<TokenType>this.peek()?.type)
    ) {
      const expr = this.parseExpression();

      if (
        expr.type !== NodeType.BLOCK_END &&
        expr.type !== NodeType.BLOCK_START
      ) {
        if (this.trimNextExpr) {
          nodes.push({ type: NodeType.WHITESPACE_DIRECTIVE, front: false });
          this.trimNextExpr = true;
        }

        nodes.push(expr);
      }
    }

    this.currentNodesArr = this.nodes;
    return nodes;
  }
}
