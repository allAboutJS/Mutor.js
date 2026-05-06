import { TokenType } from "../types/enums";

export function getTokenTypeWords(type: TokenType) {
  switch (type) {
    case TokenType.IDENT:
      return "identifier";

    case TokenType.KEYWORD:
      return "keyword";

    case TokenType.NUMBER:
      return "number";

    case TokenType.OPERATOR:
      return "operator";

    case TokenType.STRING:
      return "string";
  }
}
