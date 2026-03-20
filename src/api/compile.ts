import { Lexer, Parser } from "../core";

export default function compile(src: string) {
  return new Parser(new Lexer(src).tokenize()).parse();
}
