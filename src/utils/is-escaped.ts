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
