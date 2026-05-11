# Contributing to Mutor.js

Thank you for your interest in contributing. Mutor.js is an engineering-first project — contributions are expected to meet the same standard as the existing codebase: precise, well-tested, and justified. This document tells you everything you need to get started.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Repository Structure](#repository-structure)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Code Style](#code-style)
- [Architectural Constraints](#architectural-constraints)
- [What Makes a Good Contribution](#what-makes-a-good-contribution)
- [Submitting a Pull Request](#submitting-a-pull-request)
- [Reporting Bugs](#reporting-bugs)
- [Requesting Features](#requesting-features)
- [Security Vulnerabilities](#security-vulnerabilities)

---

## Project Overview

Mutor.js is a secure, compiler-oriented template engine written in TypeScript. It processes templates through a full compiler pipeline — tokenization, AST construction, semantic analysis, security validation, code generation — and caches the compiled output as a native JavaScript function.

The two properties that must never be compromised are **security** and **correctness**. Performance is important. Everything else is secondary.

---

## Repository Structure

```
src/
  __tests__/
    benchmarks.ts         Performance benchmarks
    inclusion.test.ts     Include and component tests
    rendering.test.ts     End-to-end rendering tests
    whitespace.test.ts    Whitespace control tests
  bin/
    cli.ts                CLI entry point
    cli-errors.ts         CLI-specific error classes
    cli.test.ts           CLI unit tests
  core/
    build.ts              Directory pre-compilation (server)
    compile.ts            Code generator + JS compiler
    constants.ts          Shared constants
    error.ts              Error class definitions
    generate-ast.ts       AST node construction
    mutor.ts              Universal Mutor class
    mutor.server.ts       Server-extended Mutor class
    parse.ts              Recursive-descent parser
    tokenize.ts           Tokenizer / lexer
  types/
    enums.ts              Shared enumerations
    types.ts              Shared TypeScript types
  utils/
    index.ts              Utility helpers
  index.ts                Universal entry point
  server.ts               Server entry point
```

Each compiler phase lives in its own module with a defined input and output contract. The phases are independently testable. Do not collapse phases or move logic across phase boundaries without a clear architectural justification.

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- TypeScript familiarity

### Setup

```bash
git clone https://github.com/allAboutJS/Mutor.js.git
cd Mutor.js
npm install
```

### Build

```bash
npm run build
```

The build produces both ESM and CJS outputs for the universal and server entry points, plus the CLI binary, via `tsup`.

### Run Tests

```bash
npm test
```

---

## Development Workflow

1. **Fork** the repository and create a branch from `main`.
2. **Make your changes** in the relevant module(s).
3. **Write or update tests** — see the Testing section below.
4. **Run the full test suite** and confirm everything passes.
5. **Run the build** and confirm it compiles cleanly.
6. **Open a pull request** against `main` with a clear description of what you changed and why.

Branch names should be descriptive: `fix/unclosed-block-error-location`, `feat/register-namespace-api`, `chore/update-tsup-config`.

---

## Testing

The test suite is the primary specification of Mutor.js's behavior. If behavior is not tested, it is not guaranteed.

### Test Structure

| File | Covers |
|---|---|
| `__tests__/rendering.test.ts` | Full pipeline: compile, render, renderFile, components |
| `__tests__/inclusion.test.ts` | Include resolution, circular detection, context propagation |
| `__tests__/whitespace.test.ts` | Whitespace trim directives, output precision |
| `__tests__/benchmarks.ts` | Performance baselines — not part of CI pass/fail |
| `bin/cli.test.ts` | CLI argument parsing, command handlers, error handling |

### Expectations for Contributions

- **Bug fixes** must include a test that fails before the fix and passes after.
- **New features** must include tests covering the happy path, relevant edge cases, and failure modes.
- **Security-relevant changes** must include tests that specifically attempt the threat being addressed and assert it is blocked.
- Tests should be narrow: test one thing per `it()` block, with a description that reads as a specification statement.

### Running a Specific Test File

```bash
npx vitest run src/__tests__/rendering.test.ts
```

---

## Code Style

- **TypeScript strict mode** — all code must compile cleanly under `strict: true`. No `any` without explicit justification in a comment.
- **No runtime dependencies** — do not introduce `npm install <anything>` as a runtime dependency. Dev dependencies for tooling are fine.
- **Explicit over implicit** — prefer explicit types on function signatures. Let inference work inside function bodies, not on public-facing boundaries.
- **Error messages are user-facing** — write them as complete sentences. Include the relevant context (line, column, template name, property name) wherever the information is available.
- **Comments explain why, not what** — code should be readable enough that the what is obvious. Comments should explain decisions, constraints, and non-obvious reasoning.

There is no linter configuration committed yet. Match the style of the file you are editing.

---

## Architectural Constraints

These are non-negotiable. PRs that violate them will not be merged regardless of other merit.

**1. Zero runtime dependencies.**
Every capability must be implemented within the project. The compiler, parser, tokenizer, cache, and runtime are all self-contained. This is a security and auditability constraint, not a preference.

**2. No `eval` on user input.**
The `Function` constructor is used only on code generated by Mutor.js's own code generator, never on user-provided strings directly. Do not introduce any path where a user-supplied string is executed without passing through the full compiler pipeline.

**3. No global state.**
`Mutor` instances are isolated. There must be no module-level mutable state shared across instances. Each instance owns its own cache, component registry, and configuration.

**4. TypeScript strict mode.**
All code must compile under `strict: true`. This is enforced at build time.

**5. Security decisions happen at compile time.**
The security architecture is layered: compile-time analysis, code generation sandboxing, runtime context validation. Do not move security checks later in the pipeline than they currently live. Adding a runtime check is acceptable in addition to a compile-time check, not as a replacement for one.

**6. The template language is bounded.**
The expression and logic systems are deliberately constrained. Do not add new syntax or operators without a compelling case and full implementation across all pipeline phases — tokenizer, parser, AST, semantic analyzer, security validator, code generator, and tests.

---

## What Makes a Good Contribution

**It solves a real problem.** Features that add surface area without addressing a genuine use case will not be merged.

**It fits the design.** If your contribution requires compromising the security model, introducing a runtime dependency, or adding global state, it conflicts with the project's core constraints. Reconsider the approach before opening a PR.

**It includes tests.** No exceptions. A feature without tests is a bug waiting to be introduced.

**It does not regress performance.** The benchmark suite exists for this reason. If your change meaningfully slows compilation or execution, the PR description must justify the tradeoff. Unintentional regressions will be sent back for investigation.

**It is appropriately scoped.** A PR that fixes a bug should fix the bug. A PR that adds a feature should add the feature. Large mixed-scope PRs are harder to review and slower to merge.

---

## Submitting a Pull Request

### PR Description

Your PR description should answer:

- **What** does this change?
- **Why** is the change needed? (link to an issue if one exists)
- **How** was it tested?
- **Are there any tradeoffs or known limitations?**

### Checklist

Before marking a PR as ready for review:

- [ ] All existing tests pass (`npm test`)
- [ ] New tests are included for the changed behavior
- [ ] The build passes (`npm run build`)
- [ ] TypeScript compiles cleanly under `strict: true`
- [ ] No runtime dependencies were added
- [ ] The PR description explains the what, why, and how

### Review Process

PRs are reviewed by the maintainer. Expect feedback on correctness, test coverage, and architectural fit. Responding to review comments promptly keeps things moving. If a PR is abandoned for more than 30 days with outstanding review comments, it may be closed.

---

## Reporting Bugs

Open a GitHub issue with:

- A minimal, reproducible template and context that demonstrates the bug
- The output you received
- The output you expected
- Your Node.js version and Mutor.js version

The more minimal the reproduction, the faster the investigation.

---

## Requesting Features

Open a GitHub issue describing:

- The use case you are trying to address
- What you would like to be able to do that you currently cannot
- Any constraints or preferences on how it should work

Feature requests are evaluated against the project's design constraints. A feature that is useful but requires a runtime dependency, global state, or a compromise to the security model is unlikely to be accepted in that form — but there may be an alternative approach worth discussing.

---

## Security Vulnerabilities

**Do not open a public GitHub issue for security vulnerabilities.**

If you discover a security issue in Mutor.js — a bypass of the sandbox, a way to escape the context scope, a prototype pollution vector, or anything else that could allow a template to access data or execute code it should not — please report it privately.

Contact the maintainer via GitHub's private vulnerability reporting feature (Security → Report a vulnerability in the repository) or by reaching out to **Onah Victor** directly.

Please include:

- A description of the vulnerability
- A minimal reproduction demonstrating the issue
- Your assessment of the impact and exploitability

All reports will be acknowledged and investigated. Credit will be given in the fix unless you prefer to remain anonymous.

---

*Mutor.js — engineered for correctness, security, and speed.*
*Built by Onah Victor.*
