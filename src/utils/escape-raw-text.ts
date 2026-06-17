/** Escapes raw text by replacing backslashes,
 * backticks, and dollar signs with escaped versions. */
export default function escapeRawText(text: string) {
  return text.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$/g, "\\$");
}
