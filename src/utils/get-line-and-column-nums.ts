/**
 * Counts the number of lines that comes before a given index, effectively returning the line and column numbers of the character at that index.
 * @param str The source string.
 * @param idx The index to find its line number.
 */
export default function getLineAndColumnNumbers(str: string, idx: number) {
  let line = 1,
    lineIndex = 0;

  while (lineIndex < str.length) {
    const prevNewlineIdx = lineIndex;
    lineIndex = str.indexOf("\n", lineIndex);
    if (lineIndex > idx || lineIndex === -1) {
      lineIndex = prevNewlineIdx;
      break;
    }

    line++;
    lineIndex++;
  }

  return { line, lineIndex };
}
