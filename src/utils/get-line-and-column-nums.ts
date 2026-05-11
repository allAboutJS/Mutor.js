/**
 * Counts the number of lines that comes before a given index, effectively returning the line and column numbers of the character at that index.
 * @param str The source string.
 * @param idx The index to find its line number.
 */
export default function getLineAndColumnNumbers(str: string, idx: number) {
  const lines = str.slice(0, idx).split("\n");
  const line = lines.length;
  // The index where the current line starts
  const lineIndex = str.lastIndexOf("\n", idx - 1) + 1;

  return [line, lineIndex];
}
