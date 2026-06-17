import { TokenType } from "../types/enums";

/**
 * Returns the human-readable name of a token type.
 *
 * @param type - The token type to get the name for.
 * @returns The human-readable name of the token type.
 */
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
