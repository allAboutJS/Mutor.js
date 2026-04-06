import MutorError from "./error";
import { config, delimiters } from "./utils/defaults";
import getLineAndColumnNumbers from "./utils/get-line-and-column-nums";
import getLineSnapshot from "./utils/get-line-snapshot";

/**
 * Compiles a given template to native JS function which can be invoked with the required arguments.
 * @param src The template string.
 * @param meta Information about the template.
 * @returns A JS function which can be invoked with a context, and namespaces.
 */
export default function compile(
  src: string,
  meta = { path: "partial://anonymous" },
) {
  let cursor = 0,
    body = 'var acc="";';

  while (cursor < src.length) {
    const templateOpenTagIdx = src.indexOf(delimiters.openingTag, cursor);
    if (templateOpenTagIdx === -1) {
      // No template block found
      body += `acc+=\`${src.slice(cursor)}\`;`;
      break;
    }

    const isEscapedOpenTag =
      src.slice(
        templateOpenTagIdx - delimiters.openingTagEscape.length,
        templateOpenTagIdx,
      ) === delimiters.openingTagEscape;

    if (isEscapedOpenTag) {
      body += `acc+=\`${src.slice(
        cursor,
        config.keepOpeningTagEscapeDelimiter
          ? templateOpenTagIdx + delimiters.openingTagEscape.length + 1
          : templateOpenTagIdx - delimiters.openingTag.length + 1,
      )}\`;`;

      if (!config.keepOpeningTagEscapeDelimiter) {
        body += `acc+=\`${delimiters.openingTag}\`;`;
      }

      cursor = templateOpenTagIdx + delimiters.openingTag.length;
      continue;
    }

    body += `acc+=\`${src.slice(cursor, templateOpenTagIdx)}\`;`;
    const templateEndTagIdx = src.indexOf(delimiters.closingTag, cursor);

    if (templateEndTagIdx === -1) {
      // No template end tag found
      const { line, lineIndex } = getLineAndColumnNumbers(
        src,
        templateOpenTagIdx,
      );
      const { line: lineText, pos } = getLineSnapshot(
        src,
        lineIndex,
        templateOpenTagIdx,
      );

      throw new MutorError(
        "No closing tag found for this opening tag.",
        line,
        lineText,
        pos,
        meta.path,
      );
    }

    const template = src.slice(
      templateOpenTagIdx,
      templateEndTagIdx + delimiters.closingTag.length,
    );

    cursor = templateEndTagIdx + 2;
    console.log(template);
  }

  return body;
}

console.log(
  compile(`
This template is no close
This is not close t <% This sure -Sharp %>
Ok na`),
);
