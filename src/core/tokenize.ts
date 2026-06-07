import { TokenType } from "../types/enums";
import type { Token } from "../types/types";
import { keywords, operators } from "./constants";

const IDENT_START_PATTERN = /[a-zA-Z$_]/;
const IDENT_PATTERN = /[a-zA-Z$_0-9]/;
const NUMBER_START_PATTERN = /[0-9]/;
const DIGIT_PATTERN = /[0-9]/;
const HEX_DIGIT_PATTERN = /[0-9a-fA-F]/;
const VALIDATION_PATTERN = /[a-zA-Z$_0-9\s\t\r\n'"`]/;

export default function tokenize(expr: string) {
  let cursor = 0,
    char = "";
  const tokens: Token[] = [];

  function accumulateKeywordOrIdentifier() {
    let buffer = "";
    if (IDENT_START_PATTERN.test(char)) {
      let j = cursor;
      while (IDENT_PATTERN.test(expr[j]) && j < expr.length) {
        buffer += expr[j];
        j++;
      }

      tokens.push({
        type: keywords.has(buffer) ? TokenType.KEYWORD : TokenType.IDENT,
        value: buffer,
        pos: cursor,
      });

      cursor = j;
      char = expr[cursor];
    }
  }

  function accumulateStr() {
    if (char !== '"' && char !== "'" && char !== "`") {
      return false;
    }

    const quote = char;
    const start = cursor;

    let j = cursor + 1;
    let buffer = "";

    while (j < expr.length) {
      const current = expr[j];

      // Escape sequence
      if (current === "\\") {
        // Ensure next char exists
        if (j + 1 >= expr.length) {
          throw {
            pos: j,
            message: "Unexpected end of string after escape character.",
          };
        }

        // Preserve escape exactly as written
        buffer += current;
        buffer += expr[j + 1];

        j += 2;
        continue;
      }

      // Closing quote
      if (current === quote) {
        break;
      }

      buffer += current;
      j++;
    }

    // Missing closing quote
    if (j >= expr.length || expr[j] !== quote) {
      throw {
        pos: start,
        message: `String literal missing closing ${quote}.`,
      };
    }

    tokens.push({
      type: TokenType.STRING,
      value: buffer,
      pos: start,
    });

    cursor = j;
  }

  function accumulateNumber() {
    if (NUMBER_START_PATTERN.test(char)) {
      let j = cursor;

      if (expr[j] === "0" && (expr[j + 1] === "x" || expr[j + 1] === "X")) {
        j += 2;

        const hexStart = j;
        while (j < expr.length && HEX_DIGIT_PATTERN.test(expr[j])) {
          j++;
        }

        if (j === hexStart) {
          throw { pos: cursor, message: "Found invalid number literal." };
        }
      } else {
        while (j < expr.length && DIGIT_PATTERN.test(expr[j])) {
          j++;
        }

        if (expr[j] === ".") {
          j++;

          while (j < expr.length && DIGIT_PATTERN.test(expr[j])) {
            j++;
          }
        }

        if (expr[j] === "e" || expr[j] === "E") {
          const exponentStart = j;
          j++;

          if (expr[j] === "+" || expr[j] === "-") {
            j++;
          }

          const exponentDigitStart = j;
          while (j < expr.length && DIGIT_PATTERN.test(expr[j])) {
            j++;
          }

          if (j === exponentDigitStart) {
            throw {
              pos: exponentStart,
              message: "Found invalid number literal.",
            };
          }
        }
      }

      const buffer = expr.slice(cursor, j);
      const numVal = Number(buffer);
      const isNan = Number.isNaN(numVal);

      if (isNan) {
        throw { pos: cursor, message: "Found invalid number literal." };
      }

      tokens.push({ type: TokenType.NUMBER, value: `${numVal}`, pos: cursor });
      cursor = j - 1;
      char = expr[cursor];
    }
  }

  function accumulateOperator() {
    const op = `${char}${expr[cursor + 1]}`;
    if (operators.has(op)) {
      tokens.push({ type: TokenType.OPERATOR, value: op, pos: cursor });
      cursor++;
      return;
    }

    if (operators.has(char)) {
      tokens.push({ type: TokenType.OPERATOR, value: char, pos: cursor });
      return;
    }
  }

  while (cursor < expr.length) {
    char = expr[cursor];

    accumulateNumber();
    accumulateKeywordOrIdentifier();
    accumulateStr();
    accumulateOperator();

    if (
      !VALIDATION_PATTERN.test(char) &&
      !operators.has(char) &&
      !operators.has(expr[cursor - 1] + char)
    ) {
      throw {
        message: `Unexpected token '${char}' in expression.`,
        pos: cursor,
      };
    }

    cursor++;
  }

  return tokens.length
    ? tokens
    : [{ type: TokenType.STRING, value: "", pos: 0 }];
}
