import { performance } from "node:perf_hooks";
import { Lexer, Parser } from "./src";
import { Executor } from "./src/core/executor";

const ITERATIONS = 1000;

const context = {
	user: {
		profile: {
			firstName: "Ugochukwu",
			lastName: "Onah",
			username: "ugo_dev",
			age: 16,
			location: {
				country: "Nigeria",
				city: "Abuja",
			},
		},

		financial: {
			balance: 2450000,
			salary: 350000,
		},

		profession: {
			primarySkill: "Full Stack Development",
			yearsExperience: 3,
			favoriteLanguages: ["JavaScript", "Rust", "TypeScript"],
		},

		account: {
			created: "2023-04-10",
			active: true,
			storageUsed: 850,
			storageLimit: 1000,
		},

		usage: {
			dailyRequests: 12450,
		},
	},
};

const template = `
  User Report
  -----------

  Full Name: {{ user.profile.firstName + " " + user.profile.lastName }}
  Username: {{ user.profile.username }}

  Age: {{ user.profile.age }}
  Status: {{ user.profile.age >= 18 ? "Adult" : "Minor" }}

  Country: {{ user.profile.location.country }}
  City: {{ user.profile.location.city }}

  Account Balance: ₦{{ user.financial.balance.toLocaleString() }}
  Monthly Salary: ₦{{ user.financial.salary.toLocaleString() }}

  Estimated Yearly Income:
  ₦{{ (user.financial.salary * 12).toLocaleString() }}

  Tax Estimate (15%):
  ₦{{ (user.financial.salary * 12 * 0.15).toLocaleString() }}

  Net Income After Tax:
  ₦{{ (user.financial.salary * 12 * 0.85).toLocaleString() }}

  Is High Earner:
  {{ user.financial.salary >= 500000 ? "Yes" : "No" }}

  Primary Skill:
  {{ user.profession.primarySkill }}

  Years of Experience:
  {{ user.profession.yearsExperience }}

  Experience Level:
  {{ user.profession.yearsExperience >= 5 ? "Senior" : "Junior" }}

  Favorite Language:
  {{ user.profession.favoriteLanguages[0] }}

  Second Favorite Language:
  {{ user.profession.favoriteLanguages[1] }}

  Account Created:
  {{ user.account.created }}

  Account Status:
  {{ user.account.active ? "Active" : "Inactive" }}

  Storage Used:
  {{ (user.account.storageUsed / 1000).toLocaleString() }} GB

  Storage Plan Limit:
  {{ user.account.storageLimit.toLocaleString() }} GB

  Storage Status:
  {{ user.account.storageUsed >= user.account.storageLimit ? "Limit Reached" : "Within Limit" }}

  Daily API Requests:
  {{ user.usage.dailyRequests.toLocaleString() }}

  Monthly API Requests:
  {{ (user.usage.dailyRequests * 30).toLocaleString() }}

  Estimated Yearly API Requests:
  {{ (user.usage.dailyRequests * 365).toLocaleString() }}

  System Greeting:
  Hello {{ user.profile.firstName }}, welcome back.
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
