export const keywords = new Set([
  "for",
  "if",
  "else",
  "true",
  "false",
  "null",
  "undefined",
  "end",
  "in",
  "of",
]);

export const operators = new Set([
  "::", // Namespace access
  "||", // Or
  "??", // Nullish coalesce
  "&&", // And
  "**", // Power
  "^", // Bitwise XOr
  "|", // Bitwise Or
  "&", // Bitwise And
  "!", // Not
  "-", // Minus
  "%", // Modulus
  "+", // Plus
  "*", // Times
  "/", // Divide
  ">", // Greater than
  "<", // Less than
  ">=", // Greater or equal
  "<=", // Less or equal
  "==", // Strict equal
  "!=", // Strict not equal
  ">>", // Bitwise right shift
  "<<", // Bitwise left shift
  ".", // Property acess
  "?.", // Optional property access
  "(", // Open parentheses
  ")", // Close parentheses
  "[", // Square open parentheses
  "]", // Square close parentheses
  ",", // Comma
  ":", // Column
  "?", // Ternary operator
]);

export const logicalOperators = new Set(["&&", "||", "??"]);

export const equalityOperators = new Set(["==", "!="]);

export const comparisonOperators = new Set([">", "<", ">=", "<="]);

export const bitwiseOperators = new Set([">>", "<<"]);

export const additiveOperators = new Set(["+", "-"]);

export const multiplicativeOperators = new Set(["*", "/", "%"]);

export const propertyAccessOperators = new Set([".", "?.", "[", "::"]);

export const unaryOperators = new Set(["-", "+", "!"]);
