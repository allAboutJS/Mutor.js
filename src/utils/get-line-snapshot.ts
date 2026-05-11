/**
 * Extracts the snapshot of a line from a given text.
 * @param str The source string.
 * @param lineIdx The index of the newline character to snap.
 */
export default function getLineSnapshot(str: string, lineIdx: number) {
  const nextNewlineIdx = str.indexOf("\n", lineIdx);
  const line = str
    .slice(lineIdx, nextNewlineIdx === -1 ? undefined : nextNewlineIdx)
    .replaceAll("\t", " ");

  return line;
}
