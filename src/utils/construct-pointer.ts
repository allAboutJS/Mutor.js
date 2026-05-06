/**
 * Creates a visual text-based pointer `^`.
 * @param pos The position in the text to be pointed at.
 * @param offset The offset to the left to compensate for line numbering.
 * @returns
 */
export default function constructPointer(pos: number, offset: number) {
  // pos is the index in the text, offset is the width of "Line | "
  return `${" ".repeat(pos + offset + 1)}^`;
}
