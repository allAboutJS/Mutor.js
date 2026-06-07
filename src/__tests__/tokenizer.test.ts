import tokenize from "../core/tokenize";
import { TokenType } from "../types/enums";

describe("Tokenizer", () => {
  test("tokenizes strings correctly", () => {
    const tokens = tokenize("\"double quoted\" and 'single quoted'");
    expect(tokens.filter((t) => t.type === TokenType.STRING)).toHaveLength(2);
    expect(tokens[0].value).toBe("double quoted");
    expect(tokens[2].value).toBe("single quoted");
  });

  test("handles escaped quotes in strings", () => {
    const tokens = tokenize('"str \\" with escape"');
    expect(tokens[0].value).toBe('str \\" with escape');
  });

  test("throws on unclosed strings", () => {
    expect(() => tokenize('"unclosed string')).toThrow(
      "String literal missing closing",
    );
  });

  test("tokenizes numbers correctly", () => {
    const tokens = tokenize("42 3.14");
    expect(tokens.filter((t) => t.type === TokenType.NUMBER)).toHaveLength(2);
    expect(tokens[0].value).toBe("42");
    expect(tokens[1].value).toBe("3.14");
  });

  test("tokenizes exponent number literals", () => {
    const tokens = tokenize("1e3 1e-3 1e+3 1E-3 0x10 0X10");

    expect(tokens.map((t) => t.value)).toEqual([
      "1000",
      "0.001",
      "1000",
      "0.001",
      "16",
      "16",
    ]);
  });

  test("does not absorb arithmetic signs into number literals", () => {
    const tokens = tokenize("1+2 3-4");

    expect(tokens.map((t) => t.value)).toEqual(["1", "+", "2", "3", "-", "4"]);
  });

  test("throws on malformed exponent and hex literals", () => {
    expect(() => tokenize("1e-")).toThrow("Found invalid number literal.");
    expect(() => tokenize("0x")).toThrow("Found invalid number literal.");
  });

  test("tokenizes multi-character operators", () => {
    const tokens = tokenize("a == b && c !== d || e ?? f :: g ** h >> i << j");
    const operators = tokens
      .filter((t) => t.type === TokenType.OPERATOR)
      .map((t) => t.value);

    expect(operators).toEqual([
      "==",
      "&&",
      "!=",
      "||",
      "??",
      "::",
      "**",
      ">>",
      "<<",
    ]);
  });

  test("tokenizes keywords and identifiers", () => {
    const tokens = tokenize("if true then variable else false end");

    expect(tokens[0].type).toBe(TokenType.KEYWORD);
    expect(tokens[0].value).toBe("if");

    expect(tokens[1].type).toBe(TokenType.KEYWORD);
    expect(tokens[1].value).toBe("true");

    expect(tokens[2].type).toBe(TokenType.IDENT);
    expect(tokens[2].value).toBe("then");
  });

  test("ignores arbitrary whitespace", () => {
    const tokens = tokenize("  \t\n  a   +   b \n");
    expect(tokens).toHaveLength(3);
    expect(tokens[0].value).toBe("a");
    expect(tokens[1].value).toBe("+");
    expect(tokens[2].value).toBe("b");
  });
});
