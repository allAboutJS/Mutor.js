import { readFileSync, statSync, writeFileSync } from "node:fs";
import {
  handleBuildCommand,
  handleRenderCommand,
  parseArgs,
  safeParseJsonFile,
  safeReadFile,
  safeWriteFile,
} from "../bin/cli";
import {
  ArgumentError,
  FileReadError,
  FileWriteError,
  JsonParseError,
} from "../bin/cli-errors";
import type { CommandStruct } from "../types/types";

// Module mocks

jest.mock("node:fs", () => ({
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  statSync: jest.fn(),
  rmSync: jest.fn(),
}));

jest.mock("../utils/to-absolute-path", () => ({
  __esModule: true,
  default: (p: string) => `/abs/${p}`,
}));

const mockReadFileSync = readFileSync as jest.MockedFunction<
  typeof readFileSync
>;
const mockWriteFileSync = writeFileSync as jest.MockedFunction<
  typeof writeFileSync
>;
const mockStatSync = statSync as jest.MockedFunction<typeof statSync>;

/** Minimal Mutor stub — override methods per test as needed. */
function makeMutor() {
  return {
    addConfig: jest.fn(),
    compile: jest.fn().mockReturnValue({ toString: () => "<compiled>" }),
    buildDir: jest.fn().mockResolvedValue(undefined),
    render: jest.fn().mockReturnValue("<rendered>"),
  };
}

// Helpers to make statSync report a file or a directory
const asFile = () =>
  ({ isFile: () => true, isDirectory: () => false }) as ReturnType<
    typeof statSync
  >;

const asDir = () =>
  ({ isFile: () => false, isDirectory: () => true }) as ReturnType<
    typeof statSync
  >;

describe("parseArgs", () => {
  it("parses a minimal compile command", () => {
    const result = parseArgs(["compile", "template.html"]);
    expect(result).toEqual({
      command: "compile",
      commandData: "template.html",
    });
  });

  it("parses options correctly", () => {
    const result = parseArgs([
      "build",
      "./src",
      "--data",
      "data.json",
      "--out",
      "./dist",
      "--config",
      "mutor.json",
    ]);
    expect(result).toMatchObject({
      command: "build",
      commandData: "./src",
      "--data": "data.json",
      "--out": "./dist",
      "--config": "mutor.json",
    });
  });

  it("prints version and exits 0 on --version", () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    const exitSpy = jest.spyOn(process, "exit").mockImplementation((() => {
      throw new Error("exit");
    }) as any);
    expect(() => parseArgs(["--version"])).toThrow("exit");
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringMatching(/\d+\.\d+\.\d+/),
    );
    expect(exitSpy).toHaveBeenCalledWith(0);
    consoleSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it("prints usage and exits 0 on --help", () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    const exitSpy = jest.spyOn(process, "exit").mockImplementation((() => {
      throw new Error("exit");
    }) as any);
    expect(() => parseArgs(["--help"])).toThrow("exit");
    expect(consoleSpy).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(0);
    consoleSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it("throws ArgumentError (exit 2) for an unknown command", () => {
    expect(() => parseArgs(["frobnicate", "input"])).toThrow(ArgumentError);
  });

  it("throws ArgumentError when input path is missing", () => {
    expect(() => parseArgs(["compile"])).toThrow(ArgumentError);
  });

  it("throws ArgumentError when input looks like a flag", () => {
    expect(() => parseArgs(["compile", "--out"])).toThrow(ArgumentError);
  });

  it("throws ArgumentError for an unknown option", () => {
    expect(() => parseArgs(["compile", "tpl.html", "--unknown"])).toThrow(
      ArgumentError,
    );
  });

  it("throws ArgumentError when an option has no value", () => {
    expect(() => parseArgs(["compile", "tpl.html", "--out"])).toThrow(
      ArgumentError,
    );
  });

  it("throws ArgumentError when an option value looks like another flag", () => {
    expect(() =>
      parseArgs(["compile", "tpl.html", "--out", "--config"]),
    ).toThrow(ArgumentError);
  });
});

describe("safeReadFile", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns file contents on success", () => {
    mockReadFileSync.mockReturnValue("hello");
    expect(safeReadFile("/some/file")).toBe("hello");
  });

  it("throws FileReadError when fs throws", () => {
    mockReadFileSync.mockImplementation(() => {
      throw new Error("ENOENT");
    });
    expect(() => safeReadFile("/missing")).toThrow(FileReadError);
  });

  it("FileReadError message contains the file path", () => {
    mockReadFileSync.mockImplementation(() => {
      throw new Error("ENOENT");
    });
    expect(() => safeReadFile("/missing/file.txt")).toThrow(
      /missing\/file\.txt/,
    );
  });
});

describe("safeWriteFile", () => {
  beforeEach(() => jest.clearAllMocks());

  it("calls writeFileSync with correct arguments", () => {
    mockWriteFileSync.mockReturnValue(undefined);
    safeWriteFile("/out/file.txt", "content");
    expect(mockWriteFileSync).toHaveBeenCalledWith(
      "/out/file.txt",
      "content",
      "utf-8",
    );
  });

  it("throws FileWriteError when fs throws", () => {
    mockWriteFileSync.mockImplementation(() => {
      throw new Error("EACCES");
    });
    expect(() => safeWriteFile("/protected/file", "x")).toThrow(FileWriteError);
  });
});

describe("safeParseJsonFile", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns parsed JSON on valid input", () => {
    mockReadFileSync.mockReturnValue('{"key":"value"}');
    expect(safeParseJsonFile("/data.json")).toEqual({ key: "value" });
  });

  it("throws JsonParseError on malformed JSON", () => {
    mockReadFileSync.mockReturnValue("not json {{");
    expect(() => safeParseJsonFile("/bad.json")).toThrow(JsonParseError);
  });

  it("JsonParseError message contains the file path", () => {
    mockReadFileSync.mockReturnValue("{bad}");
    expect(() => safeParseJsonFile("/config/bad.json")).toThrow(
      /config\/bad\.json/,
    );
  });
});

describe("handleBuildCommand", () => {
  beforeEach(() => jest.clearAllMocks());

  const validArgs: CommandStruct = {
    command: "build",
    commandData: "src/",
    "--data": "data.json",
    "--out": "dist/",
  };

  it("calls mutor.buildDir with correct resolved paths and parsed context", async () => {
    // commandData → dir, --data → file
    mockStatSync
      .mockReturnValueOnce(asDir()) // inputPath
      .mockReturnValueOnce(asFile()); // dataPath
    mockReadFileSync.mockReturnValue('{"key":"val"}');

    const mutor = makeMutor();
    await handleBuildCommand(mutor as never, validArgs);

    expect(mutor.buildDir).toHaveBeenCalledWith("/abs/src/", "/abs/dist/", {
      key: "val",
    });
  });

  it("throws ArgumentError when --data is missing", async () => {
    await expect(
      handleBuildCommand(makeMutor() as never, {
        command: "build",
        commandData: "src/",
        "--out": "dist/",
      }),
    ).rejects.toThrow(ArgumentError);
  });

  it("throws ArgumentError when --out is missing", async () => {
    await expect(
      handleBuildCommand(makeMutor() as never, {
        command: "build",
        commandData: "src/",
        "--data": "data.json",
      }),
    ).rejects.toThrow(ArgumentError);
  });

  it("throws ArgumentError when --data is not a .json file", async () => {
    mockStatSync.mockReturnValueOnce(asDir()).mockReturnValueOnce(asFile());

    await expect(
      handleBuildCommand(makeMutor() as never, {
        ...validArgs,
        "--data": "data.csv",
      }),
    ).rejects.toThrow(ArgumentError);
  });

  it("throws ArgumentError when input path is not a directory", async () => {
    mockStatSync.mockReturnValueOnce(asFile()); // inputPath reported as file

    await expect(
      handleBuildCommand(makeMutor() as never, validArgs),
    ).rejects.toThrow(ArgumentError);
  });
});

describe("handleRenderCommand", () => {
  beforeEach(() => jest.clearAllMocks());

  const validArgs: CommandStruct = {
    command: "render",
    commandData: "tpl.html",
    "--data": "data.json",
    "--out": "out.html",
  };

  it("calls mutor.render and writes output to --out", async () => {
    mockStatSync.mockReturnValue(asFile());
    // handleRenderCommand reads --data first, then the template file.
    mockReadFileSync
      .mockReturnValueOnce('{"x":1}') // data file  (safeParseJsonFile)
      .mockReturnValueOnce("<template>"); // template file (safeReadFile)
    mockWriteFileSync.mockReturnValue(undefined);

    const mutor = makeMutor();
    await handleRenderCommand(mutor as never, validArgs);

    expect(mutor.render).toHaveBeenCalledWith("<template>", { x: 1 });
    expect(mockWriteFileSync).toHaveBeenCalledWith(
      "/abs/out.html",
      "<rendered>",
      "utf-8",
    );
  });

  it("prints to stdout when --out is absent", async () => {
    mockStatSync.mockReturnValue(asFile());
    mockReadFileSync
      .mockReturnValueOnce("{}") // data file
      .mockReturnValueOnce("<template>"); // template file

    const mutor = makeMutor();
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    await handleRenderCommand(mutor as never, {
      command: "render",
      commandData: "tpl.html",
      "--data": "data.json",
    });

    expect(consoleSpy).toHaveBeenCalledWith("<rendered>");
    consoleSpy.mockRestore();
  });

  it("throws ArgumentError when --data is missing", async () => {
    await expect(
      handleRenderCommand(makeMutor() as never, {
        command: "render",
        commandData: "tpl.html",
      }),
    ).rejects.toThrow(ArgumentError);
  });

  it("throws ArgumentError when --data is not a .json file", async () => {
    mockStatSync.mockReturnValue(asFile());

    await expect(
      handleRenderCommand(makeMutor() as never, {
        ...validArgs,
        "--data": "data.xml",
      }),
    ).rejects.toThrow(ArgumentError);
  });
});
