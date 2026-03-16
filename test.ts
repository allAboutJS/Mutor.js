import { performance } from "node:perf_hooks";
import { Lexer, Parser } from "./src";
import { Executor } from "./src/core/executor";

const ITERATIONS = 1000;
const NUM_HOBBIES = 100;
const NUM_PROJECTS = 20;
const NUM_TASKS = 50;

// Generate large arrays for stress testing
const context = {
	user: {
		profile: {
			firstName: "Ugochukwu",
			lastName: "Onah",
			username: "ugo_dev",
			age: 16,
			location: { country: "Nigeria", city: "Abuja" },
		},
		hobbies: Array.from({ length: NUM_HOBBIES }, (_, i) => `Hobby ${i + 1}`),
		projects: Array.from({ length: NUM_PROJECTS }, (_, i) => ({
			name: `Project ${i + 1}`,
			tasks: Array.from({ length: NUM_TASKS }, (_, j) => `Task ${j + 1}`),
		})),
	},
};

const template = `
User Stress Test
----------------

Hobbies List:
{{ for hobby of user.hobbies }}
- {{ hobby }}
{{ end }}

Projects and Tasks:
{{ for project of user.projects }}
Project: {{ project.name }}
  Tasks:
  {{ for task of project.tasks }}
  * {{ task }}
  {{ end }}
{{ end }}
`;

const lexer = new Lexer(template);

const lexTimes: number[] = [];
const parseTimes: number[] = [];
const execTimes: number[] = [];
const totalTimes: number[] = [];

for (let i = 0; i < ITERATIONS; i++) {
	const totalStart = performance.now();

	const t0 = performance.now();
	const tokens = lexer.scanTokens();
	const t1 = performance.now();

	const parser = new Parser(tokens);
	const ast = parser.parse();
	const t2 = performance.now();

	const executor = new Executor(ast, context);
	executor.execute();
	const t3 = performance.now();

	const totalEnd = performance.now();

	lexTimes.push(t1 - t0);
	parseTimes.push(t2 - t1);
	execTimes.push(t3 - t2);
	totalTimes.push(totalEnd - totalStart);
}

function stats(times: number[]) {
	const sum = times.reduce((a, b) => a + b, 0);
	const avg = sum / times.length;
	const min = Math.min(...times);
	const max = Math.max(...times);

	return {
		avg: avg.toFixed(4),
		min: min.toFixed(4),
		max: max.toFixed(4),
	};
}

console.log("Lexing:", stats(lexTimes));
console.log("Parsing:", stats(parseTimes));
console.log("Execution:", stats(execTimes));
console.log("Total:", stats(totalTimes));
