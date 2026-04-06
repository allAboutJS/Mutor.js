import { Lexer } from "./lexer";
import { Parser } from "./parser";
import {
  type BinaryExpression,
  type Expression,
  type MemberExpression,
  NodeType,
  type PrimaryExpression,
  type Token,
  TokenType,
} from "./types";
import { coerceToNumber, coerceToString } from "./utils";

export class Executor {
  private nodes: Expression[];
  private results: (string | number)[];
  private ctx: Record<string, any>;

  constructor(nodes: Expression[], ctx: Record<string, any>) {
    this.nodes = nodes;
    this.results = [];
    this.ctx = ctx;
  }

  private execBinaryOp(left: number, right: number, operator: Token) {
    switch (operator.type) {
      case TokenType.PLUS:
        return left + right;

      case TokenType.MINUS:
        return left - right;

      case TokenType.SLASH:
        return left / right;

      case TokenType.STAR:
        return left * right;

      default:
        throw new Error(`[Mutor.js] unknown operator on ${operator.line}`);
    }
  }

  private evalBinary(node: BinaryExpression) {
    const left = this.eval(node.left);
    const right = this.eval(node.right);
    const operator = node.operator;

    const leftNum = coerceToNumber(left);
    const rightNum = coerceToNumber(right);

    if (Number.isNaN(leftNum) || Number.isNaN(rightNum)) {
      return coerceToString(left).concat(coerceToString(right));
    }

    return this.execBinaryOp(
      coerceToNumber(left),
      coerceToNumber(right),
      operator,
    );
  }

  private evalPropertyAccess(node: MemberExpression | PrimaryExpression) {
    const { left, right } = <MemberExpression>node;
  }

  private eval(node: Expression): string | number {
    switch (node.type) {
      case NodeType.STRING:
      case NodeType.NUMBER:
      case NodeType.TEXT: {
        const { value } = node;
        return <number | string>value;
      }

      case NodeType.IDENTIFIER:
        return <string>node.name;

      case NodeType.BINARY:
        return this.evalBinary(<BinaryExpression>node);

      case NodeType.OBJECT:
        return this.evalPropertyAccess(node);

      default:
        return "null";
    }
  }

  execute() {
    for (let i = 0; i < this.nodes.length; i++) {
      this.results.push(this.eval(this.nodes[i]));
    }

    return this.results.join("");
  }
}

const lexer = new Lexer(`{{ user.fname + user.lname }}`);
let tm = performance.now();
const tokens = lexer.scanTokens();
console.log(
  "lexing done in:",
  (performance.now() - tm).toFixed(2),
  "milliseconds",
);

const parser = new Parser(tokens);
tm = performance.now();
const nodes = parser.parse();
console.log(
  "parsing done in:",
  (performance.now() - tm).toFixed(2),
  "milliseconds",
);

const executor = new Executor(nodes, {
  user: {
    fname: "Victor",
    lname: "Onah",
    schools: ["Bliss International School"],
  },
});

tm = performance.now();
executor.execute();
console.log(
  "Executed in ",
  (performance.now() - tm).toFixed(2),
  "milliseconds",
);

tm = performance.now();
const math = 10000 * 999999999;
console.log(
  "Math done in ",
  (performance.now() - tm).toFixed(5),
  "milliseconds",
);
