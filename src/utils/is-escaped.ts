/**
 * Determines whether a character at a given index in a string is escaped.
 *
 * @param src - The string to check.
 * @param index - The index of the character to check.
 * @param escapeToken - The escape token to use for determining escaped characters.
 * @returns `true` if the character is escaped, `false` otherwise.
 */
export default function isEscaped(
  src: string,
  index: number,
  escapeToken: string,
) {
  let j = index;
  let count = 0;
  const escapeLength = escapeToken.length;

  while (j > 0 && src.slice(j - escapeToken.length, j) === escapeToken) {
    count++;
    j -= escapeLength;
  }

  return (count & 1) === 1;
}
