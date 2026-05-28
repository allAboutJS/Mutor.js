import Mutor from "../index";

describe("Mutor Parser Logic Flaws", () => {
  const engine = new Mutor({});

  test("BUG 1: Unary precedence inversion", () => {
    // Expression: !a && b
    // Correct Evaluation: (!true) && false => false
    // Current Mutor Evaluation: !(true && false) => !(false) => true
    // Why it breaks: parseTernaryExpr swallows the && into the unary operator's tree.
    const template = "{{ !a && b }}";
    const context = { a: true, b: false };

    const result = engine.render(template, context);

    // This assertion will fail. The engine will output "true" instead of "false".
    expect(result.trim()).toBe("false");
  });

  test("BUG 2: Bitwise shift operators ignored", () => {
    // Expression: 16 >> 2
    // Correct Evaluation: 4
    // Why it breaks: parseBitwiseExpr loops over `comparisonOperators` instead of
    // `bitwiseOperators`. The parser halts at `>>` and throws an "Unexpected token"
    // or "Expected an operator" error at the end of the AST generation.
    const template = "{{ 16 >> 2 }}";

    // This assertion will fail because engine.render will throw a parsing error.
    expect(() => engine.render(template, {})).not.toThrow();

    // If it didn't throw, this would ensure it calculated correctly.
    const result = engine.render(template, {});
    expect(result.trim()).toBe("4");
  });

  test("BUG 6: Missing Bitwise AND, OR, XOR operators", () => {
    // Expression: 5 & 1
    // Correct Evaluation: 1
    // Why it breaks: While "&" is in the main operators Set, it is completely missing
    // from the `bitwiseOperators` Set in constants.ts. The parser doesn't know how to
    // handle it as a binary expression and will throw a parsing error.
    const template = "{{ 5 & 1 }}";

    // This assertion will fail because engine.render will throw a parsing error.
    expect(() => engine.render(template, {})).not.toThrow();

    // If it didn't throw, this would ensure it calculated correctly.
    const result = engine.render(template, {});
    expect(result.trim()).toBe("1");
  });
});
