import fs from "node:fs/promises";
import path from "node:path";
import { Lexer } from "./src/lexer";
import { Parser } from "./src/parser";

let dt: number;

const txt = await fs.readFile(
	path.resolve(process.cwd(), "./test.txt"),
	"utf-8",
);
const lexer = new Lexer(txt);

dt = Date.now();
const tokens = lexer.scanTokens();
console.log("Lexing done in", Date.now() - dt, "ms");

const parser = new Parser(tokens);

dt = Date.now();
const ast = parser.parse();
console.log("Parsing done in", Date.now() - dt, "ms");

await fs.writeFile(
	path.resolve(process.cwd(), "./test.json"),
	JSON.stringify(ast, null, 4),
	"utf-8",
);
