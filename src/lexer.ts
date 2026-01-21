import { OPERATORS } from "./constants";
import { TOKEN_TYPE } from "./types";

enum MODE {
	CODE,
	TEXT,
}

export function lex(raw: string) {
	const tokens = [];
	let mode = MODE.TEXT,
		line = 1,
		column = 1,
		strBuffer = "";

	for (let i = 0; i < raw.length; i++) {
		const char = raw[i];

		if (mode === MODE.CODE) {
			column++;
		}

		// Enter code mode if `{{` is encountered
		if (char === "{" && raw[i + 1] === "{" && mode === MODE.TEXT) {
			// Push accumulated text on to the tokens array
			if (strBuffer.length) {
				tokens.push({ type: TOKEN_TYPE.TEXT, value: strBuffer });
				column += strBuffer.length; // Adjust the column count
				strBuffer = "";
			}

			// Enter code mode 😡
			mode = MODE.CODE;
			// Skip the second '{'
			i++;
			tokens.push({ type: TOKEN_TYPE.CODE_START, line, column });
			column++;
			continue;
		}

		// Exit code mode if `}}` is encountered
		if (char === "}" && raw[i + 1] === "}" && mode === MODE.CODE) {
			// Enter text mode 😁
			mode = MODE.TEXT;
			// Skip the second `}`
			i++;
			tokens.push({ type: TOKEN_TYPE.CODE_END, line, column });
			column++;
			continue;
		}

		// Accumulate text outside of code block
		if (mode === MODE.TEXT) {
			// Accumulate on new line
			if (char === "\n") {
				tokens.push({ type: TOKEN_TYPE.TEXT, value: strBuffer });
				strBuffer = "";
				line++;
				column = 1;
			} else {
				strBuffer += char;
			}

			continue;
		}

		// ******* This region is definitely code mode ********
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
			case char === "\n":
				{
					const isNewline = char === "\n";
					let cursor = i + 1;

					// Collapse all other new lines
					// or new lines with empty spaces
					if (isNewline) {
						// Update line and column count
						line++;

						// Set to zero initially.
						// This will be updated accordingly in the while loop
						column = 0;

						// Ignore other new lines and
						// empty spaces on new line
						while (
							cursor < raw.length &&
							(raw[cursor] === "\n" || raw[cursor] === " ")
						) {
							cursor++;

							// Update line and column count
							if (raw[cursor] === "\n") {
								line++;
								column = 1;
							} else {
								column++;
							}
						}
					} else {
						while (
							cursor < raw.length &&
							// Ignore other spaces or space before a newline
							(raw[cursor] === " " || raw[cursor + 1] === "\n")
						) {
							cursor++;

							// Update line and column count
							if (raw[cursor] === "\n") {
								line++;
								column = 1;
							} else {
								column++;
							}
						}
					}

					// Reduce the excess count
					cursor--;

					tokens.push({
						type: TOKEN_TYPE.WHITESPACE,
						value: char,
						line,
						column,
					});

					if (isNewline && raw[cursor - 1] === " ") {
						tokens.push({
							type: TOKEN_TYPE.WHITESPACE,
							value: " ",
							line,
							column,
						});
					}

					i = cursor;
				}
				break;

			// Handle all other forms of whitespace
			// TODO: Find a better way to handle this
			case /\p{White_Space}/u.test(char):
				tokens.push({
					type: TOKEN_TYPE.WHITESPACE,
					value: char,
					line,
					column,
				});
				break;

			default:
				tokens.push({
					type: TOKEN_TYPE.STRING_LITERAL,
					value: char,
					line,
					column,
				});
				break;
		}
	}

	// Push any accumulated text on to the tokens array
	if (strBuffer.length) {
		tokens.push({ type: TOKEN_TYPE.TEXT, value: strBuffer });
		strBuffer = "";
	}

	return tokens;
}

console.log(
	lex(`Hi my name is {{name}} victor.
I am {{ 

   
age
   ==     12}} years old.`),
);
