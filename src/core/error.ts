import constructPointer from "../utils/construct-pointer";

export class MutorError extends Error {
  public name = "MutorError";
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, MutorError.prototype);
  }
}

export class MutorCompilerError extends MutorError {
  public name = "MutorCompilerError";

  constructor(
    message: string,
    line: number,
    lineText: string,
    column: number, // 0-indexed column from snapshot
    file: string,
  ) {
    // Dynamic gutter width for alignment
    const gutterWidth = line.toString().length + 2;
    let report = `${message}\n\n`;

    report += `at ${file}:${line}:${column + 1}\n`;

    // Line snippet with gutter
    if (line > 1) {
      report += `${(line - 1).toString().padStart(gutterWidth - 2)} | ...\n`;
    }

    report += `${line} | ${lineText}\n`;
    // Visual Pointer
    report += constructPointer(column, gutterWidth + 2);

    super(report);
    Object.setPrototypeOf(this, MutorCompilerError.prototype);
  }
}

export class MutorRuntimeError extends MutorCompilerError {}
