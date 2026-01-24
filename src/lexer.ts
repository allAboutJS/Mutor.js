import { OPERATORS, SPECIAL_ESCAPES } from "./constants";
import { MODE, TOKEN_TYPE } from "./types";

/** Creates a stream of tokens from input text. */
export function lex(raw: string) {
	const tokens = [];
	let mode = MODE.TEXT,
		line = 1,
		column = 1,
		textBuffer = "";

	for (let i = 0; i < raw.length; i++) {
		const char = raw[i];

		// Entered "CODE MODE" if `{{` is encountered
		if (char === "{" && raw[i + 1] === "{" && mode === MODE.TEXT) {
			// Push accumulated text on to the tokens array
			if (textBuffer.length) {
				tokens.push({ type: TOKEN_TYPE.TEXT, value: textBuffer });
				textBuffer = "";
			}

			mode = MODE.CODE;
			// Skip the second '{'
			i++;
			tokens.push({ type: TOKEN_TYPE.CODE_START, line, column });
			column += 2;
			continue;
		}

		// Exit "CODE MODE" if `}}` is encountered
		if (char === "}" && raw[i + 1] === "}" && mode === MODE.CODE) {
			mode = MODE.TEXT;
			// Skip the second `}`
			i++;
			tokens.push({ type: TOKEN_TYPE.CODE_END, line, column });
			column += 2;
			continue;
		}

		// Accumulate text outside of code block
		if (mode === MODE.TEXT) {
			if (char === "\n") {
				line++;
				column = 1;
			} else {
				column++;
			}

			textBuffer += char;
			continue;
		}

		// ******* This region is definitely "CODE MODE" ********
		// Here we identify keywords, numbers, strings etc

		switch (true) {
			// Handle operators
			case OPERATORS[char + raw[i + 1]] !== undefined:
				tokens.push({
					type: TOKEN_TYPE.OPERATOR,
					value: char + raw[i + 1],
					line,
					column,
				});

				i++;
				column++;
				break;

			// Handle and collapse whitespace and new lines
			case char === " ":
			case char === "\n": {
				const isNewline = char === "\n";
				const prevLine = line;
				const prevColumn = column;
				let cursor = i + 1;

				if (isNewline) {
					line++;
					column = 1;

					while (/\p{White_Space}/u.test(raw[cursor]) && cursor < raw.length) {
						// Update line and column count
						if (raw[cursor] === "\n") {
							line++;
							column = 1;
						}

						cursor++;
					}

					// Push the first new line
					tokens.push({
						type: TOKEN_TYPE.WHITESPACE,
						line: prevLine,
						column: prevColumn,
						value: char,
					});
					column += cursor - i;
					i = cursor - 1;
				} else {
					while (/\p{White_Space}/u.test(raw[cursor]) && cursor < raw.length) {
						if (raw[cursor] === "\n") break;

						cursor++;
					}

					// Push the first space
					tokens.push({
						type: TOKEN_TYPE.WHITESPACE,
						line: prevLine,
						column: prevColumn,
						value: char,
					});
					column += cursor - i;
					i = cursor - 1;
				}
				break;
			}

			// Handle all other forms of whitespace
			case /\p{White_Space}/u.test(char):
				tokens.push({
					type: TOKEN_TYPE.WHITESPACE,
					value: char,
					line,
					column,
				});
				break;

			// Handle identifiers
			case /[_a-zA-Z$]/.test(char): {
				let cursor = i + 1,
					buffer = char;

				// Accumulate the identifier
				while (/[_a-zA-Z$0-9]/.test(raw[cursor]) && cursor < raw.length) {
					buffer += raw[cursor];
					cursor++;
				}

				tokens.push({
					type: TOKEN_TYPE.IDENTIFIER,
					value: buffer,
					line,
					column,
				});
				column += cursor - i;
				i = cursor - 1;
				break;
			}

			// Handle quoted strings
			case char === '"':
			case char === "'": {
				let cursor = i + 1;
				let strBuffer = "";

				while (
					cursor < raw.length &&
					raw[cursor] !== char &&
					raw[cursor] !== "\n"
				) {
					if (raw[cursor] === "\\") {
						const escaped = raw[cursor + 1];
						strBuffer += SPECIAL_ESCAPES[escaped] || escaped;
						cursor += 2;
					} else {
						strBuffer += raw[cursor++];
					}
				}

				if (cursor >= raw.length || raw[cursor] === "\n") {
					throw new Error(
						`[Mutor.js] Unclosed string literal at ${line}:${column}`,
					);
				}

				tokens.push({
					type: TOKEN_TYPE.STRING_LITERAL,
					value: strBuffer,
					line,
					column,
				});
				column += cursor - i;
				i = cursor;
				break;
			}

			// Handle numbers
			case /[0-9]/.test(char): {
				let cursor = i;
				let buffer = "";
				let hasDec = false;
				let hasExp = false;

				// Accumulate the number
				while (cursor < raw.length && /[0-9e._]/.test(raw[cursor])) {
					const c = raw[cursor],
						n = raw[cursor + 1],
						p = raw[cursor - 1];

					if (c === "e" && (hasExp || !/[0-9]/.test(n))) break;
					if (c === "_" && (!/[0-9]/.test(p) || !/[0-9]/.test(n))) break;
					if (c === "." && (hasDec || hasExp || n === "." || !/[0-9]/.test(n)))
						break;

					if (c === ".") hasDec = true;
					if (c === "e") hasExp = true;

					buffer += c;
					cursor++;
				}

				tokens.push({
					type: TOKEN_TYPE.NUMERIC_LITERAL,
					value: buffer,
					line,
					column,
				});
				column += cursor - i;
				i = cursor - 1;
				break;
			}

			// Handle parentheses
			case "()[]".includes(char):
				tokens.push({
					type: TOKEN_TYPE.PARENTHESES,
					value: char,
					line,
					column,
				});
				column++;
				break;

			// Handle dot notation property access
			case char === ".":
				tokens.push({ type: TOKEN_TYPE.DOT, value: char, line, column });
				column++;
				break;

			// Handle colon for ternary operation
			case char === ":":
				tokens.push({ type: TOKEN_TYPE.COLON, value: char, line, column });
				column++;
				break;

			// Handle comma operator for separating function params
			case char === ",":
				tokens.push({ type: TOKEN_TYPE.COMMA, value: char, line, column });
				column++;
				break;

			// Handle arithmetic and logic operators
			case "+-*/%><=!&|?".includes(char):
				tokens.push({ type: TOKEN_TYPE.OPERATOR, value: char, line, column });
				column++;
				break;

			default:
				throw new Error(
					`[Mutor.js] Unexpected character "${char}" at ${line}:${column}`,
				);
		}
	}

	// Push any accumulated text on to the tokens array
	if (textBuffer.length) {
		tokens.push({ type: TOKEN_TYPE.TEXT, value: textBuffer });
		textBuffer = "";
	}

	return tokens;
}
