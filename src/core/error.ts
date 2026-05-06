import constructPointer from "../utils/construct-pointer";

export default class MutorError extends Error {
  name = "MutorError";

  constructor(
    message: string,
    line: number,
    lineText: string,
    column: number,
    file: string,
  ) {
    super(message);
    console.log(`Error in "${file}:${line}:${column}"`);
    if (line > 1) console.log(line - 1, "|", "...");
    console.log(line, "|", lineText);
    console.log(constructPointer(column, 4));
  }
}
