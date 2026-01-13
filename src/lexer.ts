import { KEYWORDS, OPERATORS, SPECIAL_ESCAPES } from "./constants.ts";
import { PARENTHESES, QUOTE, TOKEN_TYPE, type Token } from "./types.ts";

export const lex = (raw: string) => {
	const tokens: Token[] = [];
	let isCodeBlock = false,
		currentColumn = 0,
		currentLine = 0,
		textBuffer = "";

	for (let i = 0; i < raw.length; i++) {
		const char = raw[i];
		const next = raw[i + 1];

		currentColumn++;

		if (char === "\n") {
			currentLine++;
			currentColumn = 0;
		}

		if (!isCodeBlock) {
			if (char === PARENTHESES.CURLY_OPEN && next === PARENTHESES.CURLY_OPEN) {
				let lookahead = i;

				while (
					lookahead < raw.length &&
					!(raw[lookahead] === "}" && raw[lookahead + 1] === "}")
				) {
					lookahead++;
				}

				if (lookahead < raw.length) {
					if (textBuffer) {
						tokens.push({ type: TOKEN_TYPE.TEXT, value: textBuffer });
						textBuffer = "";
					}

					isCodeBlock = true;
					i++;
					continue;
				}
			}

			textBuffer += char;
			continue;
		}

		if (/\p{White_Space}/u.test(char)) continue;

		if (char === PARENTHESES.CURLY_CLOSE && next === PARENTHESES.CURLY_CLOSE) {
			isCodeBlock = false;
			i++;
			continue;
		}

		switch (true) {
			case OPERATORS[char + next] !== undefined:
				tokens.push({ type: TOKEN_TYPE.OPERATOR, value: char + next });
				i++;
				break;

			case char === QUOTE.BACKTICK:
			case char === QUOTE.DOUBLE:
			case char === QUOTE.SINGLE: {
				let cursor = i + 1;
				let strBuffer = "";

				while (cursor < raw.length && raw[cursor] !== char) {
					if (raw[cursor] === "\\") {
						const escaped = raw[cursor + 1];
						strBuffer += SPECIAL_ESCAPES[escaped] || escaped;
						cursor += 2;
					} else {
						strBuffer += raw[cursor++];
					}
				}

				if (cursor >= raw.length) {
					throw new Error(
						`[Mutor.js] Unclosed string literal at ${currentLine + 1}:${currentColumn}`,
					);
				}

				tokens.push({
					type: TOKEN_TYPE.STRING_LITERAL,
					value: strBuffer,
					isInterpolated: char === QUOTE.BACKTICK,
				});
				i = cursor;
				break;
			}

			case /[a-zA-Z_$]/.test(char): {
				let cursor = i;
				let identBuffer = "";

				while (cursor < raw.length && /[a-zA-Z0-9_$]/.test(raw[cursor])) {
					identBuffer += raw[cursor++];
				}

				const type = KEYWORDS.has(identBuffer)
					? TOKEN_TYPE.KEYWORD
					: TOKEN_TYPE.VARIABLE;

				tokens.push({ type, value: identBuffer });
				i = cursor - 1;
				break;
			}

			case /[0-9]/.test(char): {
				let cursor = i;
				let numBuffer = "";
				let hasDec = false;
				let hasExp = false;

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

					numBuffer += c;
					cursor++;
				}

				tokens.push({ type: TOKEN_TYPE.NUMBER_LITERAL, value: numBuffer });
				i = cursor - 1;
				break;
			}

			case "()[]{}".includes(char):
				tokens.push({ type: TOKEN_TYPE.PARENTHESES, value: char });
				break;

			case char === ".":
				tokens.push({ type: TOKEN_TYPE.DOT, value: char });
				break;

			case char === ":":
				tokens.push({ type: TOKEN_TYPE.COLON, value: char });
				break;

			case char === ",":
				tokens.push({ type: TOKEN_TYPE.COMMA, value: char });
				break;

			case "+-*/%><=!&|?".includes(char):
				tokens.push({ type: TOKEN_TYPE.OPERATOR, value: char });
				break;

			default:
				throw new Error(
					`[Mutor.js] Unexpected character "${char}" at ${currentLine + 1}:${currentColumn}`,
				);
		}
	}

	if (textBuffer) tokens.push({ type: TOKEN_TYPE.TEXT, value: textBuffer });

	return tokens;
};
