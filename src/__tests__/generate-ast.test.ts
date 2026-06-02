import generateAst from "../core/generate-ast";
import tokenize from "../core/tokenize";
import { ExprType } from "../types/enums";

function parse(str: string) {
  const tokens = tokenize(str);
  return generateAst(tokens, { allowFnCalls: true });
}

describe("AST Generator", () => {
  test("parses standard operator precedence", () => {
    const ast: any = parse("1 + 2 * 3");

    expect(ast.type).toBe(ExprType.BINARY);
    expect(ast.operator).toBe("+");
    expect(ast.left.type).toBe(ExprType.NUMBER);
    expect(ast.left.value).toBe("1");

    expect(ast.right.type).toBe(ExprType.BINARY);
    expect(ast.right.operator).toBe("*");
    expect(ast.right.left.value).toBe("2");
    expect(ast.right.right.value).toBe("3");
  });

  test("handles parentheses correctly", () => {
    const ast: any = parse("(1 + 2) * 3");

    expect(ast.type).toBe(ExprType.BINARY);

    expect(ast.left.type).toBe(ExprType.GROUP);
    expect(ast.operator).toBe("*");
    expect(ast.right.value).toBe("3");
  });

  test("handles property access and arrays", () => {
    const ast: any = parse("user.name[0]");

    expect(ast.type).toBe(ExprType.PROP_ACCESS);
    expect(ast.right.type).toBe(ExprType.NUMBER);
    expect(ast.right.value).toBe("0");

    expect(ast.left.type).toBe(ExprType.PROP_ACCESS);
    expect(ast.left.right.value).toBe("name");
  });

  test("handles function calls", () => {
    const ast: any = parse("Math::max(1, 2)");

    expect(ast.type).toBe(ExprType.CALL);
    expect(ast.args).toHaveLength(2);
  });

  test("handles optional loop bindings", () => {
    const ofAst: any = parse("for item, index of items");
    expect(ofAst.variable).toBe("item");
    expect(ofAst.secondaryVariable).toBe("index");

    const inAst: any = parse("for key, value in object");
    expect(inAst.variable).toBe("key");
    expect(inAst.secondaryVariable).toBe("value");
  });

  test("handles switch expressions", () => {
    expect(parse("switch role").type).toBe(ExprType.SWITCH);
    expect(parse("case 'admin'").type).toBe(ExprType.CASE);
    expect(parse("default").type).toBe(ExprType.DEFAULT);
    expect(parse("break").type).toBe(ExprType.BREAK);
    expect(parse("continue").type).toBe(ExprType.CONTINUE);
  });

  test("throws on invalid syntax", () => {
    expect(() => parse("1 +")).toThrow("Unexpected end of expression.");
    expect(() => parse("(1 + 2")).toThrow(
      "Unexpected end of expression. Expected ')'.",
    );
    expect(() => parse("1 2")).toThrow("Expected an operator");
  });

  test("handles deeply nested expressions", () => {
    const deepStr = `${"(".repeat(100)}42${")".repeat(100)}`;
    const ast: any = parse(deepStr);
    expect(ast.type).toBe(ExprType.GROUP);
  });
});
