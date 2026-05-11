import type { ExitCode } from "../types/types";

export const ExitCodes = {
  Success: 0,
  RuntimeError: 1,
  ArgumentError: 2,
} as const;

export class CliError extends Error {
  constructor(
    message: string,
    public readonly exitCode: ExitCode = ExitCodes.RuntimeError,
  ) {
    super(message);
    this.name = "CliError";
  }
}

export class ArgumentError extends CliError {
  constructor(message: string) {
    super(message, ExitCodes.ArgumentError);
    this.name = "ArgumentError";
  }
}

export class FileReadError extends CliError {
  constructor(filePath: string, cause: unknown) {
    const reason = cause instanceof Error ? cause.message : String(cause);
    super(
      `could not read file '${filePath}': ${reason}`,
      ExitCodes.RuntimeError,
    );
    this.name = "FileReadError";
  }
}

export class FileWriteError extends CliError {
  constructor(filePath: string, cause: unknown) {
    const reason = cause instanceof Error ? cause.message : String(cause);
    super(
      `could not write file '${filePath}': ${reason}`,
      ExitCodes.RuntimeError,
    );
    this.name = "FileWriteError";
  }
}

export class JsonParseError extends CliError {
  constructor(filePath: string, cause: unknown) {
    const reason = cause instanceof Error ? cause.message : String(cause);
    super(
      `failed to parse JSON in '${filePath}': ${reason}`,
      ExitCodes.RuntimeError,
    );
    this.name = "JsonParseError";
  }
}
