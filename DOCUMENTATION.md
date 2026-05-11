# Mutor.js — Official Documentation

> **Version:** Current Stable  
> **Author:** Onah Victor  
> **Repository:** [github.com/allAboutJS/Mutor.js](https://github.com/allAboutJS/Mutor.js)  
> **Language:** TypeScript (zero runtime dependencies)  
> **License:** See repository

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Installation](#2-installation)
3. [Quick Start](#3-quick-start)
4. [Core Concepts](#4-core-concepts)
5. [Syntax Guide](#5-syntax-guide)
6. [Logic System](#6-logic-system)
7. [Expression System](#7-expression-system)
8. [Includes](#8-includes)
9. [Components](#9-components)
10. [Rendering APIs](#10-rendering-apis)
11. [Security Architecture](#11-security-architecture)
12. [Sandbox System](#12-sandbox-system)
13. [Property Access Validation](#13-property-access-validation)
14. [Namespace System](#14-namespace-system)
15. [Compilation Pipeline](#15-compilation-pipeline)
16. [AST Overview](#16-ast-overview)
17. [Parser Architecture](#17-parser-architecture)
18. [Tokenization Overview](#18-tokenization-overview)
19. [Runtime Execution Flow](#19-runtime-execution-flow)
20. [Cache System](#20-cache-system)
21. [Memory Management](#21-memory-management)
22. [Configuration Reference](#22-configuration-reference)
23. [Delimiter Customization](#23-delimiter-customization)
24. [Whitespace Control](#24-whitespace-control)
25. [Escaping Rules](#25-escaping-rules)
26. [Error Handling](#26-error-handling)
27. [Performance Philosophy](#27-performance-philosophy)
28. [Benchmark Discussion](#28-benchmark-discussion)
29. [Environment Support](#29-environment-support)
30. [Browser Usage](#30-browser-usage)
31. [Server Usage](#31-server-usage)
32. [Internal Architecture](#32-internal-architecture)
33. [Compiler Internals](#33-compiler-internals)
34. [Semantic Analysis](#34-semantic-analysis)
35. [Future Roadmap](#35-future-roadmap)
36. [Contributor Philosophy](#36-contributor-philosophy)
37. [Design Tradeoffs](#37-design-tradeoffs)
38. [Advanced Examples](#38-advanced-examples)
39. [Best Practices](#39-best-practices)
40. [Security Best Practices](#40-security-best-practices)
41. [Real-World Use Cases](#41-real-world-use-cases)
42. [FAQ](#42-faq)
43. [API Reference](#43-api-reference)

---

## 1. Introduction

Mutor.js is a secure, compiler-oriented template engine written entirely in TypeScript. It is designed for environments where template output correctness, security, and execution speed all matter simultaneously — conditions under which most template engines require a tradeoff.

Mutor.js takes a different approach. Rather than performing string interpolation at runtime or relying on `eval`-based tricks, it processes templates through a full compiler pipeline: tokenization, AST construction, semantic analysis, security validation, code generation, and finally compilation into a native JavaScript function. That compiled function is then cached and reused for every subsequent render, making cold-path overhead a one-time cost.

**Mutor.js is not:**

- A frontend framework.
- A JSX alternative.
- An SSR framework or a React-like rendering system.

It is a template engine. It accepts a template string and a context object. It returns a rendered string. That output can be HTML, plain text, XML, or any other string-based format. What you build on top of Mutor.js — a static site generator, a server-side rendering layer, an email renderer — is your concern. Mutor.js concerns itself exclusively with doing that one job securely and fast.

**Mutor.js is:**

- A zero-dependency, TypeScript-native template engine.
- A compiler that produces JavaScript functions, not an interpreter.
- A security-first system with layered compile-time and runtime protection.
- A configurable engine that does not assume your use case.

The architecture draws explicitly from compiler engineering discipline. The tokenizer, parser, AST generator, semantic analyzer, and code generator are distinct, well-separated subsystems. Each phase has a defined responsibility and a defined failure mode. This is intentional: it makes the system auditable, testable at each phase boundary, and extensible without structural regression.

---

## 2. Installation

Mutor.js is distributed as an npm package. It requires Node.js 14+ or any ES6-compatible runtime.

```bash
npm install mutorjs
```

```bash
yarn add mutorjs
```

```bash
pnpm add mutorjs
```

Both CommonJS and ESM module formats are supported. The package ships pre-compiled TypeScript output with bundled type declarations.

### Subpath Exports

Mutor.js exposes two entry points:

| Import Path | Description |
|---|---|
| `mutorjs` | Universal entry point. Safe for both browser and Node.js environments. Does not include file-system APIs. |
| `mutorjs/server` | Server-only entry point. Includes `renderFile` and file-system-dependent functionality. Do not import this in browser bundles. |

```js
// Universal (browser + server)
import Mutor from "mutorjs";

// Server-only
import Mutor from "mutorjs/server";
```

---

## 3. Quick Start

### Basic Render

```js
import Mutor from "mutorjs";

const mutor = new Mutor();

const output = mutor.render(
  `<h1>{{ greeting }}, {{ user.name }}!</h1>`,
  { greeting: "Hello", user: { name: "Onah" } }
);

console.log(output);
// <h1>Hello, Onah!</h1>
```

### Compile Once, Execute Many Times

```js
import Mutor from "mutorjs";

const mutor = new Mutor();

const fn = mutor.compile(`<p>{{ item.title }}</p>`);

const items = [
  { title: "Alpha" },
  { title: "Beta" },
  { title: "Gamma" },
];

const rendered = items.map(item => fn({ item }));
```

### File Rendering (Server Only)

```js
import Mutor from "mutorjs/server";

const mutor = new Mutor();

const html = await mutor.renderFile("./views/index.html", {
  title: "Dashboard",
  user: req.user,
});

res.send(html);
```

### Component Rendering

```js
import Mutor from "mutorjs";

const mutor = new Mutor();

mutor.registerComponent("card", `
  <div class="card">
    <h2>{{ card.title }}</h2>
    <p>{{ card.body }}</p>
  </div>
`);

const output = mutor.renderComponent("card", {
  card: { title: "Notice", body: "This is a component." }
});
```

---

## 4. Core Concepts

### Templates Are Compiled, Not Interpreted

Every template processed by Mutor.js is compiled into a JavaScript function. This happens once per unique template string. On subsequent calls with the same template, the compiled function is retrieved from cache and invoked directly. There is no parsing, no AST traversal, no validation on the hot path — only a function call.

This distinction matters at scale. A template engine that interprets its AST on every render pays a traversal cost proportional to the template's complexity on every single request. Mutor.js pays that cost exactly once.

### Security Is Architectural, Not Bolt-On

Most template engines treat security as a configuration layer — a set of filters you can optionally enable. In Mutor.js, security is woven into the compilation pipeline itself. The semantic analysis phase validates all property access, identifies potentially unsafe patterns, and either rewrites them into guarded forms or rejects them outright. By the time a compiled function reaches runtime, the security decisions have already been made. The runtime enforces a second layer of validation on the context object itself.

This means you cannot accidentally bypass security by misconfiguring a flag. The dangerous paths do not exist in the compiled output.

### Context Is an Isolated Scope

Templates execute inside a restricted scope. The context object you provide is the entire world available to the template. There is no access to the global object, no access to `process`, no access to `require`, no access to `window`. The sandbox is enforced at code generation time: the generated function receives only what you pass in.

### Zero Dependencies

Mutor.js has no runtime dependencies. It is self-contained TypeScript. This is a deliberate architectural constraint. Every dependency you introduce to a security-critical system is a potential attack surface. Mutor.js owns its entire stack — tokenizer, parser, AST, code generator, runtime, cache — and each of those components is auditable without pulling in third-party code.

---

## 5. Syntax Guide

Mutor.js uses a structured tag syntax. It is not raw JavaScript embedded in HTML. This distinction is important: the template language is a defined, bounded DSL that the compiler can reason about completely.

### Interpolation

The primary mechanism for outputting values is the interpolation block:

```html
{{ expression }}
```

The result of the expression is HTML-escaped by default and inserted into the output at that position.

```html
<p>{{ user.name }}</p>
<p>{{ product.price * 1.1 }}</p>
<p>{{ user.bio ?? "No bio provided." }}</p>
```

### Whitespace Trimming

By default, Mutor.js preserves whitespace around tags exactly as written. The `~` directive instructs the engine to strip whitespace (including newlines) from the relevant side of the tag.

```html
{{~ expression }}   <!-- trim left whitespace -->
{{ expression ~}}   <!-- trim right whitespace -->
{{~ expression ~}}  <!-- trim both sides -->
```

This is particularly useful when working with `for` loops and `if` blocks to prevent unwanted blank lines in output.

### Comments

Comments use the `#` prefix inside the opening delimiter:

```html
{{# This is a comment. It produces no output. }}
```

Comments are multiline by default:

```html
{{#
  This is a block comment.
  It spans multiple lines.
  None of this appears in output.
}}
```

Whitespace trimming applies to comment tags as well:

```html
{{~# This comment trims left whitespace. }}
```

### Escaped Opening Tag

To output the literal opening delimiter (e.g., `{{`) without triggering template parsing, prefix it with a backslash:

```html
\{{ this is rendered literally as {{ }}
```

Whether the escape character itself is preserved in the output is controlled by `keepOpeningTagEscapeDelimiter` in configuration.

### Tag Summary

| Syntax | Purpose |
|---|---|
| `{{ expr }}` | Interpolation (auto-escaped) |
| `{{~ expr }}` | Interpolation, trim left |
| `{{ expr ~}}` | Interpolation, trim right |
| `{{~ expr ~}}` | Interpolation, trim both |
| `{{# ... }}` | Comment (no output) |
| `\{{` | Escaped literal delimiter |
| `{{ if ... }}` | Conditional block open |
| `{{ else if ... }}` | Conditional branch |
| `{{ else }}` | Default branch |
| `{{ for x of ... }}` | Iteration (value) |
| `{{ for x in ... }}` | Iteration (key) |
| `{{ end }}` | Closes any open block |

---

## 6. Logic System

Mutor.js provides structured control flow via `if`, `else if`, `else`, `for`, and `end` tags. These are not arbitrary JavaScript — they are a fixed set of recognized logic directives that the parser handles explicitly. This bounded set is by design: it allows the compiler to reason about control flow completely rather than treating it as opaque JavaScript.

### Conditionals

```html
{{ if condition }}
  ...
{{ end }}
```

```html
{{ if user.role == "admin" }}
  <a href="/admin">Admin Panel</a>
{{ else if user.role == "moderator" }}
  <a href="/moderate">Moderation Queue</a>
{{ else }}
  <a href="/dashboard">Dashboard</a>
{{ end }}
```

Conditions are arbitrary expressions. Any expression that evaluates to a truthy or falsy value is valid. Comparison operators, boolean operators, nullish coalescing, optional chaining, and ternaries are all valid inside condition expressions.

```html
{{ if items.length > 0 && user.isActive }}
  ...
{{ end }}
```

### Iteration

Mutor.js supports two forms of `for` iteration, mirroring JavaScript's `for...of` and `for...in` semantics:

**`for...of` — iterate over values:**

```html
{{ for item of items }}
  <li>{{ item.name }}</li>
{{ end }}
```

**`for...in` — iterate over keys:**

```html
{{ for key in record }}
  <dt>{{ key }}</dt>
{{ end }}
```

**Nested loops:**

```html
{{ for category of categories }}
  <section>
    <h2>{{ category.name }}</h2>
    {{ for product of category.products }}
      <p>{{ product.title }} — {{ product.price }}</p>
    {{ end }}
  </section>
{{ end }}
```

### Block Termination

Every `if` block and every `for` block must be closed with `{{ end }}`. Unclosed blocks are a compile-time error. The compiler tracks block depth and reports the location (line and column) of the unclosed block.

> **Note:** There is no `break` or `continue` directive in the current version. Template logic is intentionally constrained. Complex filtering logic belongs in the context object, not the template.

---

## 7. Expression System

Mutor.js expressions are a defined subset of JavaScript expressions. They are parsed by Mutor.js's own expression parser — not by a JavaScript engine — which means the engine controls exactly what is and is not expressible.

### Supported Expression Constructs

| Category | Examples |
|---|---|
| Arithmetic | `a + b`, `price * 1.2`, `total / count`, `n % 2`, `2 ** 8` |
| Comparison | `a == b`, `a != b`, `a > b`, `a >= b`, `a < b`, `a <= b` |
| Boolean | `a && b`, `a \|\| b`, `!flag` |
| Ternary | `condition ? valueA : valueB` |
| Nullish Coalescing | `value ?? "default"` |
| Optional Chaining | `user?.address?.city` |
| Property Access | `obj.prop`, `obj["key"]` |
| Array Access | `arr[0]`, `arr[index]` |
| Namespace Access | `Math::floor(n)`, `JSON::stringify(data)` |
| Bitwise | `a & b`, `a \| b`, `a ^ b`, `a >> b`, `a << b` |
| Function Calls | `fn(args)` — only when `allowFnCalls: true` |
| String Literals | `'single'`, `"double"`, `` `backtick` `` |

### Strings

String literals support single quotes, double quotes, and backticks. Backtick strings are treated as static strings — template interpolation (`${...}`) inside strings is not supported. The backtick form exists to allow strings containing both single and double quotes conveniently.

```html
{{ "Hello, world" }}
{{ 'It\'s fine' }}
{{ `This has "quotes" and 'apostrophes'` }}
```

### Function Calls

Function calls are disabled by default. This prevents templates from invoking arbitrary functions that may exist on context objects, which is the correct default for most use cases.

To enable function calls:

```js
const mutor = new Mutor({ allowFnCalls: true });
```

When enabled, calls like `item.name.toUpperCase()` or `Math::floor(price)` are permitted. Namespace function calls (`Math::floor`, etc.) are permitted regardless of `allowFnCalls` because they are routed through the controlled namespace system rather than arbitrary prototype dispatch.

> **Warning:** Enabling `allowFnCalls` expands the trusted surface area of your templates. Ensure the context objects you pass contain only functions you intend to expose. Do not pass raw service objects or request objects as top-level context when `allowFnCalls` is enabled.

### Operator Precedence

Mutor.js's expression parser respects standard JavaScript operator precedence. When in doubt, use explicit parentheses:

```html
{{ (a + b) * c }}
{{ user.age >= 18 ? "adult" : "minor" }}
```

---

## 8. Includes

Includes allow a template to embed another template file at a specific location in its output. The included template is compiled and cached independently, sharing the same cache as the parent instance.

### Syntax

```html
Mutor::include(path)
Mutor::include(path, context)
```

Include is expressed using the namespace operator against the special `Mutor` namespace, which is reserved for engine directives.

```html
{{ Mutor::include("./partials/header.html") }}
{{ Mutor::include("./partials/nav.html", { links: navLinks }) }}
```

When no context argument is provided, the include inherits the current rendering context automatically via `Mutor::$$context`:

```html
{{ Mutor::include("./partials/footer.html", Mutor::$$context) }}
```

### Include Resolution

Include paths are resolved relative to the file being rendered when using `renderFile`. When using `render` with a string template, the include path must be absolute or the base path must be configured.

### Circular Include Detection

Mutor.js tracks the include chain across all recursive include resolutions. If a template attempts to include a file that is already in the current include stack, the engine throws a compile-time error rather than entering infinite recursion.

```
MutorError: Circular include detected: ./partials/a.html → ./partials/b.html → ./partials/a.html
```

### Context Propagation in Includes

By default, an include call with no context argument receives an empty context. This is intentional — it forces explicit context passing and prevents implicit data leakage through deeply nested includes. Use `Mutor::$$context` to forward the current context explicitly.

> **Note:** `renderFile` is not available in browser environments. Includes inside components in a browser context must reference component names rather than file paths.

---

## 9. Components

Components are named templates registered on a Mutor instance. They are the browser-compatible alternative to file-based includes. They are also useful on the server when you want to manage templates programmatically rather than through the file system.

### Registering a Component

```js
mutor.registerComponent("alert", `
  <div class="alert alert--{{ alert.type }}">
    <strong>{{ alert.title }}</strong>
    <p>{{ alert.message }}</p>
  </div>
`);
```

### Rendering a Component

```js
const html = mutor.renderComponent("alert", {
  alert: {
    type: "error",
    title: "Validation Failed",
    message: "Email address is required.",
  }
});
```

### Components vs. Includes

| Feature | Components | Includes |
|---|---|---|
| Template source | In-memory string | File system |
| Browser-compatible | Yes | No |
| Circular detection | Yes | Yes |
| Cache | Same instance cache | Same instance cache |
| Context handling | Explicit argument | Explicit or `$$context` |

Components are compiled and cached on first `renderComponent` call. Subsequent calls hit the cache directly.

---

## 10. Rendering APIs

### `compile(template: string): (context: object) => string`

Compiles a template string into an executable function. The template is processed through the full compiler pipeline (tokenize → parse → analyze → generate → compile). The resulting function accepts a context object and returns the rendered string.

```js
const fn = mutor.compile(`<title>{{ page.title }}</title>`);
const output = fn({ page: { title: "Home" } });
```

Calling `compile` with the same template string twice returns the cached compiled function — the pipeline does not re-execute.

### `render(template: string, context: object): string`

Convenience wrapper around `compile`. Compiles the template if not already cached, then immediately invokes it with the provided context.

```js
const output = mutor.render(`<p>{{ msg }}</p>`, { msg: "Hello" });
```

### `renderFile(path: string, context: object): Promise<string>`

Server-only. Reads the template file from disk, compiles it, and renders it with the given context. The compiled result is cached by resolved file path, so repeated calls to `renderFile` with the same path do not re-read the file or re-compile.

```js
const html = await mutor.renderFile("./views/home.html", context);
```

> This method is not available when importing from `mutorjs` (the universal entry point). Import from `mutorjs/server` to access it.

### `registerComponent(name: string, template: string): void`

Registers a named template string as a component on the current Mutor instance. The template is not compiled at registration time — compilation is deferred to first render.

### `renderComponent(name: string, context: object): string`

Renders a previously registered component by name with the given context. Throws if the component name has not been registered.

### Instance Isolation

Each `Mutor` instance maintains its own compilation cache and its own component registry. Two instances do not share state. This is important in multi-tenant or per-request environments where isolation between rendering contexts is required.

---

## 11. Security Architecture

Security in Mutor.js is not an optional layer. It is the reason the compilation pipeline exists in the form it does.

### Threat Model

Mutor.js is designed for environments where the template may reference user-controlled data, and in some configurations, where the template itself may originate from less-trusted sources. The primary threats are:

- **Cross-site scripting (XSS):** Injecting HTML or JavaScript through interpolated values.
- **Prototype pollution access:** Using `__proto__`, `constructor`, or `prototype` to escape the context object and reach dangerous properties.
- **Unintended function invocation:** Calling methods on context objects that were not intended to be exposed to templates.
- **Global scope leakage:** Accessing `process`, `window`, `global`, `require`, or other environmental globals.
- **Computed property injection:** Using dynamic property names to bypass static property validation.

### Defense Layers

Mutor.js employs defense in depth across three distinct phases:

**Layer 1 — Compile-time AST analysis**

Every property access expression in the template is analyzed during semantic analysis. The analyzer:

- Identifies static property accesses (`obj.prop`, `obj["key"]`) and validates the property name against the forbidden list.
- Identifies dynamic property accesses (`obj[expression]`) and rewrites them into calls to an internal guard helper that performs runtime validation.
- Rejects any access to `__proto__`, `constructor`, or `prototype` unconditionally, with no configuration override.

**Layer 2 — Code generation sandboxing**

The code generator produces a function that runs inside a closed scope. The generated function receives only the context object as its argument. It has no reference to any global, no `this` binding to the environment, and no access to `require` or `import`.

**Layer 3 — Runtime context validation**

Before the compiled function executes user data, Mutor.js validates the context object:

- Prototype chains of the context object are checked.
- Objects with polluted prototypes are rejected.
- Objects with non-standard getters/setters on built-in prototype properties are rejected.

This prevents an attacker from crafting a context object that passes compile-time checks but exploits runtime behavior.

### Output Escaping

All interpolated values are HTML-escaped by default. The escaping applies to the following characters:

| Character | Escaped As |
|---|---|
| `&` | `&amp;` |
| `<` | `&lt;` |
| `>` | `&gt;` |
| `"` | `&quot;` |
| `'` | `&#39;` |

Auto-escaping is controlled by the `autoEscape` configuration option. Setting `autoEscape: false` disables this behavior globally. If you disable auto-escaping, you are responsible for ensuring that any user-controlled data is sanitized before being passed into the context.

> **Warning:** Do not disable `autoEscape` unless you have a specific, justified reason and you understand the full implications. Disabled auto-escaping in combination with user-controlled context data is an XSS vector.

---

## 12. Sandbox System

The sandbox is the code generation constraint that ensures compiled templates cannot access anything outside the explicitly provided context.

### What the Sandbox Does

The compiled function generated for every template looks approximately like this in structure:

```js
function __mutorTemplate(__ctx) {
  // All property access goes through __ctx
  // No references to globals
  // No references to this, window, process, global, require
  // Output is assembled and returned
  let __out = "";
  __out += "<h1>";
  __out += __escape(__ctx.title);
  __out += "</h1>";
  return __out;
}
```

The function signature accepts exactly one argument — the context. The function body is generated from the validated AST. Because the AST was analyzed before code generation, every expression that appears in the function body has already been validated. Expressions that reference globals were rejected during semantic analysis and never reached code generation.

### Function Call Sandboxing

When `allowFnCalls: false` (the default), the compiler rejects any expression that involves a function invocation on a non-namespace identifier. The expression `user.name.toUpperCase()` would be rejected. The expression `Math::floor(price)` is permitted because it routes through the namespace system, which is controlled.

When `allowFnCalls: true`, method calls on context properties are permitted. The sandbox still prevents access to globals; it only allows invocation of functions that exist on the context object you explicitly pass in.

### Forbidden Property List

The default forbidden property list is:

```
__proto__
constructor
prototype
```

This list is not exhaustive of all potentially dangerous properties. It covers the most critical prototype chain escape vectors. The `allowedProps` and `forbiddenProps` configuration options allow you to extend this list for your specific threat model:

```js
const mutor = new Mutor({
  forbiddenProps: new Set(["__proto__", "constructor", "prototype", "valueOf", "toString"]),
});
```

> **Note:** `__proto__`, `constructor`, and `prototype` are always forbidden regardless of what you configure. They cannot be removed from the forbidden list.

---

## 13. Property Access Validation

Property access validation is the mechanism that guards every attempt in a template to read a property from an object.

### Static Property Access

```js
user.name       // static — property name "name" known at compile time
user["email"]   // static — property name "email" known at compile time
```

For static property access, the compiler checks the property name against the forbidden list at compile time. If the name is forbidden, compilation fails immediately with a clear error message.

### Dynamic Property Access

```js
obj[someVariable]   // dynamic — property name not known at compile time
obj[fn()]           // dynamic — computed from a function call
obj["f" + "oo"]     // dynamic — computed from an expression
```

Dynamic property access cannot be fully validated at compile time because the property name is not known until runtime. Mutor.js handles this by rewriting all dynamic property accesses into calls to an internal guard function:

```js
// What you write:
obj[dynamicKey]

// What gets compiled into:
__guard(obj, dynamicKey)
```

The `__guard` helper validates the resolved property name at runtime against the forbidden list before performing the access. If the resolved name is forbidden, an error is thrown.

This means that even if an attacker manages to set `dynamicKey = "__proto__"` at runtime, the guard will catch it.

### Prototype Chain Validation

The context object itself is validated before use. Mutor.js inspects the prototype chain of the context object to ensure it has not been polluted. A context object whose prototype has unexpected properties (those that appear on `Object.prototype` or `Function.prototype` but were not originally there) will cause the engine to throw rather than silently expose dangerous data.

---

## 14. Namespace System

The namespace system provides controlled access to JavaScript built-in utilities inside templates without exposing the full global scope.

### Syntax

```
Namespace::identifier
Namespace::method(args)
```

The `::` operator is Mutor.js-specific. It does not exist in standard JavaScript. It is parsed exclusively by Mutor.js and translated into safe, controlled property lookups at code generation time.

### Available Namespaces

The following namespaces are available by default:

| Namespace | Accessible Members |
|---|---|
| `Math` | All `Math` static methods and properties (`floor`, `ceil`, `round`, `max`, `min`, `abs`, `sqrt`, `pow`, `PI`, etc.) |
| `JSON` | `stringify`, `parse` |
| `Object` | `keys`, `values`, `entries`, `assign`, `fromEntries` |
| `Array` | `isArray`, `from` |
| `String` | `fromCharCode` |
| `Number` | `isInteger`, `isFinite`, `isNaN`, `parseInt`, `parseFloat` |
| `Date` | `now`, `getFullYear` (static forms) |
| `Mutor` | `include`, `$$context` (engine directives) |

### Why Namespaces Instead of Direct Global Access

Direct global access would mean that a template could write `process.env.DATABASE_URL` and potentially read sensitive server-side environment variables. The namespace system is a controlled whitelist: only the namespaces explicitly defined by Mutor.js are accessible, and only the members of those namespaces that Mutor.js explicitly exposes are reachable.

This is why `Math::floor(n)` works but `window::location` does not — `window` is not a registered namespace.

### Examples

```html
<p>Price: {{ Math::floor(product.price) }} USD</p>
<p>Keys: {{ Object::keys(record).length }}</p>
<p>Data: {{ JSON::stringify(debug.payload) }}</p>
<p>Valid: {{ Array::isArray(items) ? "yes" : "no" }}</p>
```

### The `Mutor` Namespace

The `Mutor` namespace is reserved for engine directives:

- `Mutor::include(path)` — includes a template file
- `Mutor::include(path, context)` — includes a template file with an explicit context
- `Mutor::$$context` — a reference to the current rendering context object

These are not JavaScript function calls — they are parsed as engine directives and compiled differently from namespace method calls.

---

## 15. Compilation Pipeline

The compilation pipeline is the core of Mutor.js. Understanding it is essential for understanding both the performance characteristics and the security guarantees.

### Pipeline Stages

```
Input Template String
        │
        ▼
  1. Scanner / Extractor
        │  Identifies template tag boundaries
        ▼
  2. Tokenizer
        │  Produces a flat token stream
        ▼
  3. Parser
        │  Consumes tokens, produces parse tree
        ▼
  4. AST Generator
        │  Constructs typed AST nodes
        ▼
  5. Semantic Analyzer
        │  Type-checks, validates access, resolves namespaces
        ▼
  6. Security Validator
        │  Audits property access, rewrites dynamic access
        ▼
  7. Code Generator
        │  Emits JavaScript source from the validated AST
        ▼
  8. Compiler
        │  Creates the executable function via Function constructor
        ▼
  9. Cache Storage
        │  Stores the compiled function by cache key
        ▼
 10. Runtime Execution
        │  Calls compiled function with context
        ▼
      Output String
```

### Stage Details

**Stage 1 — Scanner/Extractor**

The scanner does a linear pass over the template string, identifying the positions of opening and closing delimiters. It produces a list of segments: some are raw text (to be emitted verbatim) and some are tag content (to be parsed). The scanner respects the configured delimiters and handles escaped delimiters.

**Stage 2 — Tokenizer**

The tokenizer processes the content of each tag (the text between delimiters) and produces a stream of typed tokens: identifiers, operators, literals, keywords (`if`, `else`, `for`, `end`), and punctuation. The tokenizer is position-tracking: each token carries its source position (line, column) for error reporting.

**Stage 3 — Parser**

The parser consumes the token stream and builds a parse tree. It handles operator precedence, associativity, and the structured logic constructs (`if`/`else`/`for`/`end`). Parse errors are thrown with precise source locations.

**Stage 4 — AST Generator**

The AST generator transforms the parse tree into a canonical, typed AST. Each node in the AST has a defined node type (`BinaryExpression`, `MemberExpression`, `CallExpression`, `ConditionalBlock`, `IterationBlock`, `TextNode`, etc.) and carries metadata including source position.

**Stage 5 — Semantic Analyzer**

The semantic analyzer walks the AST and performs:

- Identifier resolution (is this identifier in the context? in a namespace?)
- Property access classification (static vs. dynamic)
- Type inference where possible (is this likely a string? a number? an object?)
- Validation of namespace usage (is `Foo::bar` a valid namespace/member combination?)

**Stage 6 — Security Validator**

The security validator is a second pass over the analyzed AST that specifically audits:

- All `MemberExpression` nodes for forbidden property names
- All computed `MemberExpression` nodes, rewriting them to guarded access
- All `CallExpression` nodes, checking against the `allowFnCalls` policy
- Prototype pollution risks in deep access chains

**Stage 7 — Code Generator**

The code generator performs a depth-first traversal of the validated AST and emits a JavaScript source string. The emitted source declares the output accumulator, appends text nodes and expression results to it, wraps conditional blocks in `if`/`else` constructs, wraps iteration blocks in `for...of` or `for...in` constructs, and applies the escape function to interpolated values.

**Stage 8 — Compilation**

The emitted JavaScript source is wrapped into a function body and compiled into an executable function using the `Function` constructor. The `Function` constructor is used here deliberately — not as a shortcut, but because the input at this point is code that has been generated by Mutor.js itself from a validated AST, not user input. The generated code is deterministic and has passed all security validation passes.

**Stage 9 — Cache Storage**

The compiled function is stored in the instance's LRU cache, keyed by the original template string (or resolved file path, for `renderFile`). The stored size is tracked for memory management purposes.

**Stage 10 — Runtime Execution**

The compiled function is invoked with the context object. The runtime context validation (prototype chain checks, pollution checks) executes as part of this step before the function body processes the context.

---

## 16. AST Overview

The Mutor.js AST is a hierarchical tree of typed nodes that represents the complete semantic structure of a template. Every construct in the template language corresponds to one or more AST node types.

### Root Node

```
TemplateRoot
  ├── children: ASTNode[]
```

The root node contains a flat list of top-level nodes. Each node is either a `TextNode`, an `InterpolationNode`, a `ConditionalBlock`, or an `IterationBlock`.

### Node Types

**`TextNode`**

Represents a literal text segment — any content outside of delimiters.

```
TextNode
  ├── value: string
  ├── trimLeft: boolean
  └── trimRight: boolean
```

**`InterpolationNode`**

Represents a `{{ expression }}` block.

```
InterpolationNode
  ├── expression: ExpressionNode
  ├── escaped: boolean
  ├── trimLeft: boolean
  └── trimRight: boolean
```

**`ConditionalBlock`**

Represents an `if / else if / else / end` structure.

```
ConditionalBlock
  ├── branches: ConditionalBranch[]
  │     ├── condition: ExpressionNode | null  (null for else)
  │     └── body: ASTNode[]
  └── source: SourceLocation
```

**`IterationBlock`**

Represents a `for / end` structure.

```
IterationBlock
  ├── iteratorName: string
  ├── iterableExpression: ExpressionNode
  ├── form: "of" | "in"
  ├── body: ASTNode[]
  └── source: SourceLocation
```

**`MemberExpression`**

Represents property access.

```
MemberExpression
  ├── object: ExpressionNode
  ├── property: ExpressionNode
  ├── computed: boolean       (true for obj[expr], false for obj.prop)
  ├── optional: boolean       (true for obj?.prop)
  └── guarded: boolean        (true after security rewriting for computed access)
```

**`CallExpression`**

Represents a function or namespace call.

```
CallExpression
  ├── callee: ExpressionNode
  ├── arguments: ExpressionNode[]
  └── isNamespace: boolean
```

**`BinaryExpression`**

```
BinaryExpression
  ├── left: ExpressionNode
  ├── operator: string
  └── right: ExpressionNode
```

**`Literal`**

```
Literal
  ├── value: string | number | boolean | null
  └── raw: string
```

---

## 17. Parser Architecture

The parser is a hand-written recursive-descent parser. It does not use a parser generator or an external parsing library.

### Design Rationale

Recursive descent parsers are the right choice for Mutor.js for several reasons:

1. **Auditability.** The parser is plain TypeScript code. Every production rule is a function. There is nothing to reverse-engineer about how a given construct gets parsed — you read the function.

2. **Error precision.** Hand-written parsers produce the most precise error messages because you control exactly what gets reported at every parse failure point.

3. **No dependencies.** A parser generator would be a dev dependency at minimum and would add build complexity. Mutor.js has zero dependencies.

4. **Performance.** Recursive descent over a token stream of a template-sized input (typically a few hundred to a few thousand tokens) is extremely fast in V8 and SpiderMonkey. Parser performance is not the bottleneck.

### Expression Parsing

Expressions are parsed using a Pratt parser (top-down operator precedence) integrated into the recursive descent structure. This handles operator precedence cleanly without requiring precedence-climbing hacks or separate grammar levels for each precedence tier.

Operator precedence in Mutor.js's expression parser follows JavaScript precedence conventions:

| Precedence (high → low) | Operators |
|---|---|
| Unary | `!`, unary `-` |
| Exponentiation | `**` |
| Multiplicative | `*`, `/`, `%` |
| Additive | `+`, `-` |
| Shift | `<<`, `>>` |
| Relational | `<`, `>`, `<=`, `>=` |
| Equality | `==`, `!=` |
| Bitwise AND | `&` |
| Bitwise XOR | `^` |
| Bitwise OR | `\|` |
| Logical AND | `&&` |
| Logical OR | `\|\|` |
| Nullish Coalescing | `??` |
| Conditional (Ternary) | `? :` |

### Logic Tag Parsing

`if`, `else if`, `else`, `for`, and `end` tags are recognized in the parser's main dispatch loop before expression parsing begins. This is a simple keyword check on the first token of each tag's content. If the first token is a recognized keyword, the parser dispatches to the appropriate production rule. If not, it falls through to expression parsing.

---

## 18. Tokenization Overview

The tokenizer (lexer) is responsible for breaking the raw template content — specifically the content inside delimiters — into a sequence of typed tokens.

### Token Types

| Token Type | Examples |
|---|---|
| `Identifier` | `user`, `items`, `total`, `Math` |
| `Keyword` | `if`, `else`, `for`, `in`, `of`, `end` |
| `Operator` | `+`, `-`, `*`, `/`, `==`, `!=`, `&&`, `\|\|`, `??`, `?.`, `::`, etc. |
| `NumberLiteral` | `42`, `3.14`, `0`, `1e10` |
| `StringLiteral` | `"hello"`, `'world'`, `` `template` `` |
| `BooleanLiteral` | `true`, `false` |
| `NullLiteral` | `null` |
| `Punctuation` | `(`, `)`, `[`, `]`, `,` |
| `EOF` | End of tag content |

### Position Tracking

Every token carries a `SourceLocation` object:

```ts
interface SourceLocation {
  line: number;
  column: number;
  offset: number; // byte offset from start of original template
}
```

Position tracking is what enables Mutor.js to produce error messages that reference exact line and column numbers in the original template, even for errors detected at semantic analysis or code generation time.

### Handling `::` and `?.`

The `::` namespace operator and the `?.` optional chaining operator are multi-character tokens that require look-ahead during tokenization. The tokenizer peeks at the next character when it encounters `:` or `?` to determine whether to emit a single-character token or a two-character compound token.

---

## 19. Runtime Execution Flow

Once a template has been compiled and cached, the runtime execution path is minimal.

### Execution Steps

1. **Cache lookup.** The template string (or resolved file path) is used as the cache key. If a compiled function exists in the LRU cache, it is retrieved. The cache is accessed in O(1) time.

2. **Context validation.** The context object is passed through the runtime validator:
   - The prototype chain of the context is checked.
   - Each top-level property of the context is checked for unsafe getters/setters.
   - If validation fails, an error is thrown before the template function is invoked.

3. **Function invocation.** The compiled function is called with the validated context object as its sole argument.

4. **Output assembly.** Inside the compiled function, text nodes are concatenated, expression results are escaped (if `autoEscape` is enabled) and concatenated, and control flow is handled by the native JavaScript `if`/`for` constructs in the generated code.

5. **Return.** The accumulated output string is returned.

### Hot Path

On the hot path (repeated renders with the same template), steps 1–2 are the only overhead beyond the actual function execution. Step 1 is a hash map lookup. Step 2 is a shallow object inspection. These are both effectively constant-time operations.

The compiled function itself executes at native JavaScript speed — it is a compiled V8 function, not an interpreter loop.

---

## 20. Cache System

Every `Mutor` instance maintains an internal LRU (Least Recently Used) cache of compiled template functions.

### Cache Behavior

- Templates are cached by their source string (for `compile` and `render`) or by their resolved absolute file path (for `renderFile`).
- Cache lookups are O(1).
- When a template is accessed, it is promoted to the most-recently-used position in the LRU queue.
- When the cache reaches its configured `maxSize`, the least-recently-used entry is evicted to make room.

### Cache Configuration

```js
const mutor = new Mutor({
  cache: {
    active: true,
    maxSize: 50 * 1024 * 1024, // 50MB
  }
});
```

| Option | Type | Default | Description |
|---|---|---|---|
| `active` | `boolean` | `true` | Whether the cache is enabled. Set to `false` to recompile on every render (useful for development). |
| `maxSize` | `number` | `52428800` (50MB) | Maximum cache memory in bytes. When exceeded, LRU eviction runs. |

### Disabling the Cache

```js
const mutor = new Mutor({
  cache: { active: false }
});
```

With the cache disabled, every `render` or `renderFile` call runs the full compiler pipeline. This is useful in development for picking up template changes without restarting the process, but is not appropriate for production.

### Cache Size Estimation

Cache size is estimated based on the approximate memory footprint of the stored compiled function, including its source string and the function object itself. This is an estimate — JavaScript runtimes do not expose precise per-object memory measurements. The estimate errs on the side of caution.

---

## 21. Memory Management

Mutor.js exposes explicit memory management via the cache size limit and provides tools to inspect and clear cache state.

### LRU Eviction

The LRU cache eviction policy ensures that memory usage stays within the configured bound. When the cache is full:

1. The compiled function with the oldest last-access timestamp is identified.
2. It is removed from the cache.
3. The new entry is inserted.

This policy works well for workloads with temporal locality — templates that are used frequently stay in cache, while rarely-used templates are naturally evicted.

### Manual Cache Control

A `Mutor` instance exposes methods to inspect and clear the cache:

```js
// Clear the entire cache
mutor.clearCache();

// Get current cache size (bytes, estimated)
const usedBytes = mutor.getCacheSize();

// Get number of cached entries
const entryCount = mutor.getCacheEntryCount();
```

> **Note:** `clearCache()` is a synchronous operation and removes all compiled functions from the instance cache. The next render of any template will trigger recompilation.

### Instance Isolation for Memory Isolation

In environments where strict per-request or per-tenant memory isolation is required, create separate `Mutor` instances. Each instance has an independent cache with its own size limit. Requests that should not share compiled template state should use separate instances.

---

## 22. Configuration Reference

The full configuration object with all defaults:

```ts
interface MutorConfig {
  build?: {
    include?: Set<string>;   // File extensions to scan (server only)
    exclude?: Set<string>;   // Directories to exclude from scanning
  };
  autoEscape?: boolean;            // Default: true
  allowedProps?: Set<string>;      // Explicitly whitelisted property names
  forbiddenProps?: Set<string>;    // Additional forbidden property names
  allowFnCalls?: boolean;          // Default: false
  delimiters?: {
    openingTag?: string;           // Default: "{{"
    closingTag?: string;           // Default: "}}"
    openingTagEscape?: string;     // Default: "\\"
    whitespaceTrim?: string;       // Default: "~"
  };
  keepOpeningTagEscapeDelimiter?: boolean; // Default: false
  cache?: {
    active?: boolean;              // Default: true
    maxSize?: number;              // Default: 50 * 1024 * 1024 (50MB)
  };
}
```

### Default Configuration

```js
const defaultConfig = {
  build: {
    include: new Set([".html", ".txt"]),
    exclude: new Set(["node_modules", ".git"]),
  },
  autoEscape: true,
  allowedProps: new Set(),
  forbiddenProps: new Set(["__proto__", "constructor", "prototype"]),
  allowFnCalls: false,
  delimiters: {
    openingTag: "{{",
    closingTag: "}}",
    openingTagEscape: "\\",
    whitespaceTrim: "~",
  },
  keepOpeningTagEscapeDelimiter: false,
  cache: {
    active: true,
    maxSize: 50 * 1024 * 1024,
  },
};
```

### `allowedProps`

A `Set<string>` of property names that are explicitly permitted regardless of other validation rules. This is useful if you have property names that pattern-match against heuristic dynamic access checks but are actually safe.

### `forbiddenProps`

A `Set<string>` of additional property names to block. The built-in forbidden set (`__proto__`, `constructor`, `prototype`) is always enforced and is merged with any values you provide here.

### `build.include` and `build.exclude`

Used by the server-side file scanner when pre-compiling a directory of templates. `include` is a set of file extensions to process. `exclude` is a set of directory names to skip.

---

## 23. Delimiter Customization

All four delimiter-related strings are fully configurable.

### Changing Delimiters

```js
const mutor = new Mutor({
  delimiters: {
    openingTag: "<%",
    closingTag: "%>",
    openingTagEscape: "\\",
    whitespaceTrim: "-",
  }
});
```

With this configuration, templates use `<%` and `%>`:

```html
<p><% user.name %></p>
<%- if user.isAdmin -%>
  <a href="/admin">Admin</a>
<%- end -%>
```

### Constraints on Delimiter Choice

- Opening and closing delimiters must be distinct strings.
- Delimiters should not be substrings of each other (e.g., `{` and `{{` would cause scanner ambiguity).
- The whitespace trim character must be a single character.
- The escape character must be a single character.

### Delimiter Change and Cache Invalidation

Delimiter configuration affects how the scanner identifies tag boundaries. If you change delimiters at runtime (by creating a new `Mutor` instance with different configuration), the new instance has a separate cache. Templates compiled under the old delimiter configuration are not compatible with a differently configured instance. This is by design — the instance and its configuration are inseparable.

---

## 24. Whitespace Control

Whitespace in template output is often a concern when mixing template logic with indented markup. Mutor.js provides precise whitespace control via the `~` directive (or your configured `whitespaceTrim` character).

### Mechanics

The whitespace trim directive attached to the opening tag (`{{~`) trims all whitespace — including newlines — to the left of the tag in the output. The directive attached to the closing tag (`~}}`) trims to the right.

"Whitespace" here means space characters, tab characters, and newline characters.

### Without Whitespace Trimming

```html
<ul>
  {{ for item of items }}
  <li>{{ item.name }}</li>
  {{ end }}
</ul>
```

Output:

```html
<ul>
  
  <li>Alpha</li>
  
  <li>Beta</li>
  
</ul>
```

The blank lines come from the newlines around the `for` and `end` tags.

### With Whitespace Trimming

```html
<ul>
  {{~ for item of items ~}}
  <li>{{ item.name }}</li>
  {{~ end ~}}
</ul>
```

Output:

```html
<ul>
  <li>Alpha</li>
  <li>Beta</li>
</ul>
```

### Trimming on Interpolation Tags

Trim directives work on interpolation tags as well, not only on logic tags:

```html
Name: {{~ user.firstName ~}} {{~ user.lastName ~}}
```

This produces `Name: FirstLast` — no spaces between names. You would not typically want to trim both sides of an interpolation tag in this way; this is an illustration of the mechanics.

---

## 25. Escaping Rules

### Auto-Escape (Default)

When `autoEscape: true`, every interpolated value is passed through the HTML escape function before being inserted into the output. The escape function converts the five HTML-significant characters (`&`, `<`, `>`, `"`, `'`) to their HTML entity equivalents.

This means a context value like `<script>alert(1)</script>` renders as:

```
&lt;script&gt;alert(1)&lt;/script&gt;
```

### Disabling Auto-Escape

```js
const mutor = new Mutor({ autoEscape: false });
```

With auto-escaping disabled, values are interpolated verbatim. This is appropriate only when you are generating non-HTML output (e.g., plain text) or when you are certain the context data has been sanitized elsewhere.

### Escaping the Delimiter

To output the literal opening delimiter in the rendered output without triggering parsing:

```html
\{{ this is not a template tag }}
```

The backslash (`\`) is consumed by the scanner, and the `{{` is emitted verbatim in the output. The `keepOpeningTagEscapeDelimiter` option controls whether the escape character itself appears in the output:

| `keepOpeningTagEscapeDelimiter` | Template | Output |
|---|---|---|
| `false` (default) | `\{{ expr }}` | `{{ expr }}` |
| `true` | `\{{ expr }}` | `\{{ expr }}` |

---

## 26. Error Handling

Mutor.js produces typed errors with detailed context information.

### Error Types

| Error Class | Thrown When |
|---|---|
| `MutorParseError` | The tokenizer or parser cannot process the input |
| `MutorSecurityError` | A forbidden property access or unsafe construct is detected |
| `MutorCompileError` | Code generation or compilation fails |
| `MutorRuntimeError` | A runtime context validation failure occurs |
| `MutorIncludeError` | An include file cannot be found or a circular include is detected |
| `MutorComponentError` | A component is rendered that has not been registered |

### Error Structure

All error types extend a base `MutorError` class:

```ts
class MutorError extends Error {
  code: string;           // Machine-readable error code
  source?: string;        // Original template content (truncated)
  location?: {
    line: number;
    column: number;
    offset: number;
  };
}
```

### Error Messages

Because every token is position-tracked, error messages reference exact source locations:

```
MutorSecurityError: Forbidden property access: "constructor"
  at line 4, column 12 in template "views/user-profile.html"

MutorParseError: Unclosed block: "if" block opened at line 7, column 3 was never closed.

MutorIncludeError: Circular include detected.
  Include chain: views/layout.html → views/partials/nav.html → views/layout.html
```

### Handling Errors

```js
import { MutorSecurityError, MutorParseError } from "mutorjs";

try {
  const output = mutor.render(template, context);
} catch (err) {
  if (err instanceof MutorSecurityError) {
    // Log and reject the template — do not render
    logger.error("Template security violation", { code: err.code, location: err.location });
    throw err;
  }
  if (err instanceof MutorParseError) {
    // Template has a syntax error — report to developer
    throw err;
  }
  throw err;
}
```

---

## 27. Performance Philosophy

Mutor.js makes a clear, deliberate performance tradeoff: spend more time at compile time so that runtime is as fast as possible.

### Compilation vs. Execution

**Compilation cost** — The full pipeline (tokenize → parse → analyze → validate → generate → compile) is more expensive than other engines. Mutor.js performs semantic analysis and security validation steps that engines like EJS and Eta skip. This cost is paid once per unique template.

**Execution cost** — The compiled output is a native JavaScript function. Executing it is as fast as executing any other JavaScript function of equivalent complexity. There is no interpreter, no AST walker, no regex match. The cost is proportional to the output complexity.

### Amortization

The compilation cost is amortized across all renders of that template. For a server process that starts, warms up, and handles thousands of requests, a single template might be compiled once and executed hundreds of thousands of times. The per-request cost is the execution cost only — which rivals native JavaScript.

### Output Assembly Strategy

The code generator uses string concatenation to assemble output inside the compiled function. This is deliberately simple. Modern JavaScript engines optimize string concatenation in tight loops extremely well — particularly when the number of concatenation operations per invocation is predictable. Array-based output assembly (building an array and joining at the end) is generally not faster in V8 for the sizes of output typical in template rendering.

### Benchmarks Are Execution-Focused

When comparing Mutor.js to other engines, it is important to separate compilation benchmarks from execution benchmarks. Mutor.js does not win compilation benchmarks — it is not designed to. It wins execution benchmarks, which are what matter in production under load.

---

## 28. Benchmark Discussion

The following benchmarks are indicative, based on internal measurements on a modern multi-core machine with Node.js 20. Numbers will vary with hardware, Node.js version, template complexity, and context size.

### Full Pipeline (Compile + Execute)

| Engine | Relative Performance |
|---|---|
| Eta | 1× (baseline) |
| **Mutor.js** | **~0.8–0.9×** (slightly behind Eta on first compile) |
| EJS | ~0.4× |
| Nunjucks | ~0.15× |
| Handlebars | ~0.12× |

Mutor.js is second overall in the full pipeline, behind Eta, which performs minimal validation during compilation. The gap narrows as template complexity increases because Mutor.js's code generation produces more optimized output for complex templates.

### Raw Execution (Pre-compiled, Cache-hit Path)

| Engine | Relative Performance |
|---|---|
| **Mutor.js** | **1× (top tier)** |
| Eta | ~0.8–0.9× |
| EJS | ~0.3× |
| Nunjucks | ~0.08× |
| Handlebars | ~0.06× |

On the execution-only path (cache warm), Mutor.js outperforms Eta by 1.2–5× depending on template structure, and outperforms EJS, Nunjucks, and Handlebars by significant margins.

### Why Mutor.js Beats Eta on Execution

Eta is fast at compilation because it does very little AST work — it essentially generates a concatenated function using string templates. This means its generated functions contain more overhead per expression. Mutor.js's deeper AST analysis and code generation phase produces tighter, more direct function bodies, which V8 can optimize more aggressively.

> **Note:** These benchmarks do not account for real-world I/O, middleware overhead, or complex template logic that may affect relative performance differently. Profile your specific use case.

---

## 29. Environment Support

| Environment | Supported | Notes |
|---|---|---|
| Node.js 14+ | ✅ | Full support including `renderFile` |
| Node.js 18+ (recommended) | ✅ | Best performance |
| Browser (modern) | ✅ | Use universal entry point; `renderFile` unavailable |
| Deno | ✅ (via npm compat) | `renderFile` available if Deno FS APIs are mapped |
| Bun | ✅ | Full support |
| ESM | ✅ | Native ESM build available |
| CommonJS | ✅ | CJS build available |
| TypeScript | ✅ | Type declarations shipped with package |
| Minimum requirement | ES6 | Requires `const`, arrow functions, template literals, `Set`, `Map` |

---

## 30. Browser Usage

In browser environments, import from the universal entry point:

```js
import Mutor from "mutorjs";
```

The universal entry point excludes all file-system APIs. The following methods are available:

- `compile(template)`
- `render(template, context)`
- `registerComponent(name, template)`
- `renderComponent(name, context)`

The `renderFile` method is not available and will throw a `MutorError` if called from the universal entry point.

### Managing Templates in the Browser

Since file-system access is unavailable, templates must be loaded manually and registered as components:

```js
// Load template via fetch, or inline it as a string
const templateString = await fetch("/templates/card.html").then(r => r.text());

mutor.registerComponent("card", templateString);

const html = mutor.renderComponent("card", { card: data });
document.getElementById("app").innerHTML = html;
```

### Bundle Size Considerations

Mutor.js has zero runtime dependencies and ships a self-contained compiled bundle. The universal browser bundle is sized for embedding without pulling in Node.js-specific code. Check the `dist/browser` output in the package for the pre-built browser bundle.

---

## 31. Server Usage

Import from the server entry point:

```js
import Mutor from "mutorjs/server";
```

The server entry point includes all functionality from the universal entry point plus:

- `renderFile(path, context)` — reads and renders a template file
- Pre-compilation scanning (`build` configuration)

### Express Integration

```js
import express from "express";
import Mutor from "mutorjs/server";

const app = express();
const mutor = new Mutor();

app.get("/", async (req, res) => {
  const html = await mutor.renderFile("./views/home.html", {
    user: req.user,
    page: { title: "Home" },
  });
  res.send(html);
});
```

### Pre-Warming the Cache

In production, you can pre-compile all templates during application startup to eliminate compilation latency on first request:

```js
import { glob } from "node:fs/promises"; // or your preferred file scanner
import Mutor from "mutorjs/server";

const mutor = new Mutor();

async function warmCache(viewsDir) {
  const files = await getHtmlFiles(viewsDir); // your file enumeration logic
  await Promise.all(files.map(f => mutor.renderFile(f, {})));
  console.log(`Warmed ${files.length} templates.`);
}

await warmCache("./views");
```

Calling `renderFile` with an empty context during startup compiles and caches every template. Subsequent production renders with real context data hit the cache.

---

## 32. Internal Architecture

### Module Organization

The `src/` directory is organized by responsibility:

```
src/
  core/
    tokenize.ts         Tokenizer (lexer)
    parse.ts            Recursive-descent parser
    generate-ast.ts     AST node construction
    compile.ts          Code generator + JS compiler
  security/
    validate.ts         Compile-time security analysis
    guard.ts            Runtime property guard helpers
    escape.ts           HTML escaping utilities
  runtime/
    context.ts          Runtime context validation
    execute.ts          Execution orchestration
  cache/
    lru.ts              LRU cache implementation
  include/
    resolver.ts         Include path resolution
    cycle-detector.ts   Circular include detection
  namespace/
    registry.ts         Namespace registry and dispatch
  error/
    types.ts            Error class definitions
  config/
    defaults.ts         Default configuration
    merge.ts            Configuration merging utilities
  server/
    index.ts            Server entry point
  index.ts              Universal entry point
```

### Separation of Concerns

The compiler phases (tokenize, parse, generate-ast, compile) are deliberately separated into individual modules. This is not just code organization — it means each phase can be tested independently, each phase has a typed input and output contract, and each phase can be replaced or augmented without affecting the others.

### Internal APIs

Internal modules (`security/`, `runtime/`, `cache/`, `namespace/`) are not exposed in the public API surface. They are implementation details. Users interact with Mutor.js exclusively through the `Mutor` class and the typed error classes.

---

## 33. Compiler Internals

### Code Generation Strategy

The code generator traverses the validated AST in a single depth-first pass and builds a JavaScript source string. The strategy is:

1. Declare the output accumulator: `let __out = "";`
2. For each node in the tree:
   - **TextNode:** append the literal text: `__out += "...";`
   - **InterpolationNode:** append the escaped expression result: `__out += __escape(__ctx.property);`
   - **ConditionalBlock:** emit `if (...) { ... } else if (...) { ... } else { ... }`
   - **IterationBlock:** emit `for (const x of __ctx.collection) { ... }` or `for...in`
3. Emit `return __out;`

The generated source is wrapped into a function body string:

```js
const fnSource = `
  "use strict";
  return function __mutorTemplate(__ctx, __escape, __guard, __ns) {
    let __out = "";
    ${generatedBody}
    return __out;
  }
`;
const fn = new Function("__escape", "__guard", "__ns", fnSource)(escapeImpl, guardImpl, namespaceImpl);
```

The four arguments injected at construction time (`__escape`, `__guard`, `__ns`) are the internal helpers. They are closed over by the compiled function and are not accessible from user template code.

### The `__guard` Helper

The guard helper is the runtime enforcement of property safety for dynamic accesses:

```ts
function __guard(obj: unknown, key: unknown): unknown {
  if (typeof key === "string" && forbiddenProps.has(key)) {
    throw new MutorSecurityError(`Forbidden property access: "${key}"`);
  }
  return (obj as Record<string, unknown>)[key as string];
}
```

The forbidden set is closed over from the instance configuration, so each compiled function uses the correct forbidden list for its originating `Mutor` instance.

### `"use strict"`

All generated function bodies run in strict mode. This eliminates a class of subtle bugs that can arise in sloppy mode JavaScript — specifically, accidental global variable creation and certain `this`-binding surprises.

---

## 34. Semantic Analysis

Semantic analysis is the phase between parsing and code generation where Mutor.js determines the meaning of the AST nodes in context, resolves references, and validates intent.

### What Semantic Analysis Does

**Identifier classification:** Every identifier in the AST is classified as one of:
- A context identifier (a top-level property of the provided context)
- A namespace root (e.g., `Math`, `JSON`)
- A loop variable (introduced by a `for` tag)
- An unknown identifier (which may produce a warning or error depending on configuration)

**Property access validation:** Every `MemberExpression` is inspected:
- Static accesses check the property name against the forbidden list
- Dynamic accesses are flagged for guard rewriting

**Call expression validation:** Every `CallExpression` is inspected:
- Non-namespace calls are checked against the `allowFnCalls` policy
- Namespace calls are validated against the namespace registry

**Loop variable scoping:** Variables introduced by `for` blocks are tracked in a scope stack. Inner blocks can reference outer loop variables. The scope stack is popped when the `end` tag is parsed.

### Semantic Error vs. Security Error

Semantic errors are issues with the structure of the template — referencing something that cannot be resolved, misusing a construct, etc. Security errors are violations of the security policy — accessing forbidden properties, calling functions when calls are disabled.

The distinction matters for error handling: semantic errors indicate a developer mistake in the template; security errors may indicate a template that was deliberately crafted to exploit the engine.

---

## 35. Future Roadmap

The following features are planned or under active development. They are not available in the current stable release.

### CLI Tool *(Planned)*

A command-line interface for compiling and pre-building template directories:

```bash
# Compile a single template
mutor compile ./views/index.html --out ./dist/index.html.js

# Pre-compile a full views directory
mutor build ./views --out ./dist/compiled --max-mem 50MB

# Watch mode for development
mutor watch ./views --out ./dist/compiled
```

The CLI will support:
- Single-file compilation
- Directory pre-compilation
- Watch mode with incremental recompilation
- Output format selection (CJS, ESM)
- Cache size configuration

### Template Source Maps *(Planned)*

Source map generation so that runtime errors in compiled functions can be mapped back to their originating template locations. This is the natural next step from the position tracking already in the tokenizer.

### Extended Namespace Registry *(Planned)*

An API to register custom namespaces:

```js
mutor.registerNamespace("Utils", {
  formatCurrency: (n) => `$${n.toFixed(2)}`,
  slugify: (s) => s.toLowerCase().replace(/\s+/g, "-"),
});
```

This would allow project-specific utilities to be exposed into templates via the controlled namespace mechanism rather than requiring `allowFnCalls: true`.

### Async Template Rendering *(Under Consideration)*

Support for templates that include asynchronous expressions — for example, inline data fetching or async namespace methods. This is architecturally complex because the compiled function would need to be `async` and the output assembly would need to handle `Promise` values. This is under consideration but not committed.

### Template Language Server Protocol Support *(Future)*

An LSP implementation for Mutor.js template syntax, enabling editor tooling: syntax highlighting, error diagnostics, completion, hover docs. This is a long-term ecosystem goal.

### Compiler Plugin API *(Future)*

An API for hooking into the compilation pipeline at defined extension points (post-parse, post-analyze, post-generate). This would enable use cases like custom AST transformations, custom security policies, and code generation optimizations without forking the core.

---

## 36. Contributor Philosophy

Mutor.js is an engineering-first project. Contributions are expected to meet the same standard as the existing codebase: precise, well-tested, and justified.

### What Makes a Good Contribution

- **It solves a real problem** rather than adding surface area for its own sake.
- **It fits the design philosophy.** Features that require Mutor.js to compromise its security model, introduce dependencies, or make the system non-deterministic will not be merged.
- **It includes tests.** The test suite is the specification. If behavior is not tested, it is not guaranteed.
- **It does not regress performance.** Benchmarks are part of the CI pipeline. Contributions that meaningfully slow compilation or execution will be asked to justify the tradeoff.

### Architectural Constraints

The following constraints are not negotiable:

1. **Zero runtime dependencies.** Every capability must be implemented within the project.
2. **No global state.** `Mutor` instances are isolated. There is no module-level mutable state.
3. **No `eval` on user input.** The `Function` constructor is used only on code generated by the Mutor.js code generator, never on user-provided strings.
4. **TypeScript strict mode.** All code must compile cleanly under `strict: true`.

### Testing Philosophy

Every compiler phase has unit tests against the phase's input/output contract. Integration tests exercise the full pipeline end-to-end with a wide variety of template structures. Security tests specifically attempt known exploit patterns and assert that they are blocked.

The test suite is the primary documentation of edge cases. When in doubt, read the tests.

---

## 37. Design Tradeoffs

Mutor.js makes several deliberate tradeoffs. Understanding them helps you decide when to use it and when not to.

### Tradeoff 1: Compilation Cost for Execution Speed

Mutor.js is slower to compile than Eta because it does substantially more work during compilation. This is acceptable because the compiled output executes faster, and compilation happens once per template per process lifetime.

**Impact:** Mutor.js is not ideal for environments where templates change on every request and caching is disabled. It excels in environments with a stable set of templates and many requests.

### Tradeoff 2: Bounded Template Language for Security

Mutor.js does not allow arbitrary JavaScript in templates. You cannot write a `while` loop, a `try/catch`, a variable declaration, or an IIFE. This is a hard constraint from the security architecture.

**Impact:** Complex logic must live in the context object, not the template. This is the correct design for large applications — templates should be thin views, not business logic containers — but it requires a different authoring mindset.

### Tradeoff 3: Structured Syntax for Auditability

Because Mutor.js's template language is a fixed DSL rather than raw JavaScript, templates are fully auditable by the compiler. Every construct is understood. There are no dark corners.

**Impact:** You cannot express constructs that are valid JavaScript but have no equivalent in Mutor.js's grammar. If you need them, they belong in the context.

### Tradeoff 4: Zero Dependencies for Auditability and Trust

Mutor.js has no third-party dependencies. This means you can audit the entire stack, and supply chain attacks through compromised dependencies are not a vector.

**Impact:** Mutor.js does not benefit from improvements in third-party parsing libraries or utility packages. Every capability must be built and maintained internally.

---

## 38. Advanced Examples

### Dashboard Template with Nested Data

```html
{{# Project dashboard template #}}
<main class="dashboard">
  <header>
    <h1>{{ org.name }} — Dashboard</h1>
    <p>Logged in as {{ user.displayName }}</p>
  </header>

  {{~ if projects.length > 0 ~}}
  <section class="projects">
    {{ for project of projects }}
    <article class="project-card">
      <h2>{{ project.name }}</h2>
      <p class="budget">
        Budget: {{ Math::floor(project.budget) }} / {{ Math::floor(project.budgetTotal) }} USD
      </p>
      {{ if project.status == "active" }}
        <span class="badge badge--active">Active</span>
      {{ else if project.status == "review" }}
        <span class="badge badge--review">In Review</span>
      {{ else }}
        <span class="badge badge--inactive">Inactive</span>
      {{ end }}
      <ul class="tags">
        {{ for tag of project.tags }}
        <li class="tag">{{ tag }}</li>
        {{ end }}
      </ul>
    </article>
    {{ end }}
  </section>
  {{~ else ~}}
  <p class="empty-state">No projects found.</p>
  {{~ end ~}}
</main>
```

### Component with Namespace Utilities

```js
mutor.registerComponent("data-table", `
  <table>
    <thead>
      <tr>
        {{ for col of table.columns }}
        <th>{{ col.label }}</th>
        {{ end }}
      </tr>
    </thead>
    <tbody>
      {{ for row of table.rows }}
      <tr>
        {{ for col of table.columns }}
        <td>{{ row[col.key] ?? "—" }}</td>
        {{ end }}
      </tr>
      {{ end }}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="{{ table.columns.length }}">
          {{ table.rows.length }} {{ table.rows.length == 1 ? "record" : "records" }}
        </td>
      </tr>
    </tfoot>
  </table>
`);
```

### Include with Explicit Context Forwarding

```html
{{# views/layout.html #}}
<!DOCTYPE html>
<html lang="en">
<head>
  <title>{{ page.title }} — {{ site.name }}</title>
  {{ Mutor::include("./partials/head-meta.html", Mutor::$$context) }}
</head>
<body>
  {{ Mutor::include("./partials/nav.html", { nav: nav, user: user }) }}
  <main>
    {{ Mutor::include(page.template, Mutor::$$context) }}
  </main>
  {{ Mutor::include("./partials/footer.html", { site: site }) }}
</body>
</html>
```

### Pre-compilation with Custom Forbidden Properties

```js
import Mutor from "mutorjs/server";

const mutor = new Mutor({
  forbiddenProps: new Set([
    "__proto__",
    "constructor",
    "prototype",
    "valueOf",
    "toString",
    "hasOwnProperty",
  ]),
  allowFnCalls: false,
  cache: {
    active: true,
    maxSize: 100 * 1024 * 1024, // 100MB for large view directory
  },
});
```

---

## 39. Best Practices

**Keep templates thin.** Templates should handle layout and presentation. Business logic, data transformations, filtering, and sorting belong in the context preparation layer, not the template.

**Pre-warm the cache in production.** Use the startup cache warming pattern to eliminate first-request compilation latency. Templates should be compiled before traffic arrives.

**Use a single shared `Mutor` instance per process.** Cache efficiency is maximized when all requests share the same compiled template cache. Use separate instances only when you need genuine isolation (e.g., per-tenant configuration differences).

**Pass minimal context.** Only expose in the context what the template actually needs. Avoid passing entire service objects, database clients, or request objects as context.

**Validate context data before passing it in.** Mutor.js validates the context's prototype chain but does not validate the semantic meaning of your data. Validate user input before it enters the render context.

**Use `for...of` for arrays, `for...in` for objects.** This mirrors JavaScript semantics and makes templates readable to any JavaScript developer.

**Name includes and components descriptively.** Component names and include paths are the template's interface contract. `renderComponent("card")` is readable; `renderComponent("c1")` is not.

**Test your templates.** Templates are code. Render them with fixture contexts in your test suite to catch regressions in output structure.

---

## 40. Security Best Practices

**Never disable `autoEscape` when rendering user-controlled data.** If you must render raw HTML from a trusted source, consider using a separate Mutor instance with `autoEscape: false` specifically for that purpose, so the risk is isolated.

**Never pass `req`, `res`, database clients, or service objects as context.** These objects have methods and properties that, with `allowFnCalls: true`, could be invoked from a template. Prepare a clean, minimal context object explicitly.

**Enable `allowFnCalls` only when necessary and with a clear scope.** If you need method calls on specific types (e.g., string formatting), consider the planned custom namespace feature instead.

**Extend `forbiddenProps` conservatively.** Add property names you know are dangerous in your specific context. `valueOf` and `toString` are candidates in many applications.

**Treat `MutorSecurityError` as a hard stop.** If a security error is thrown during compilation, do not attempt to render the template. Log it, alert on it, and investigate.

**Do not use `cache: { active: false }` in production.** Beyond the performance cost, a disabled cache means every render triggers recompilation — and recompilation triggers full security analysis on every request, which while correct, is unnecessary overhead.

**Audit templates that come from external sources.** If your application allows user-defined templates to be compiled, review them with the same scrutiny as user-provided code. Mutor.js's sandbox is strong, but defense in depth applies here too.

---

## 41. Real-World Use Cases

### Server-Side HTML Rendering (Node.js)

The primary use case. A web application that serves HTML pages from templates. Mutor.js compiles the view templates at startup, and each request invokes the compiled functions with a prepared context.

### Email Template Rendering

Email templates have similar requirements to HTML templates: variable interpolation, conditional sections (e.g., showing a section only if a promo code is attached), iteration over lists (e.g., order items). Mutor.js's auto-escaping is important for preventing XSS in email clients that render HTML, and the predictable output makes it easy to test email rendering in CI.

### Static Site Generation

A static site generator can use Mutor.js to compile page templates and render them with content sourced from a CMS, markdown files, or a database. The compilation cache ensures that re-builds are fast: only changed templates need recompilation.

### Configuration File Generation

Mutor.js can render structured text formats like JSON, YAML, or NGINX configuration files, not just HTML. Disable `autoEscape` for non-HTML output and use the template language to generate configuration files with environment-specific values.

### Report Generation

Server-side report generation that produces HTML output for PDF conversion. Mutor.js's deterministic, secure rendering is well-suited for environments where the template must process potentially large and complex data structures into formatted output.

---

## 42. FAQ

**Q: Is Mutor.js production-ready?**

The core engine — rendering, compilation, caching, security, components, includes — is stable and production-ready. The planned CLI tooling is not yet available.

**Q: Can I use Mutor.js with Express/Fastify/Koa?**

Yes. Mutor.js is a rendering function, not a framework. Any server framework that lets you produce a string response can use it. See the Server Usage section for an Express example.

**Q: Why is function calling disabled by default?**

Templates that invoke arbitrary functions on context objects are harder to reason about and audit than templates that only read data. Disabling function calls by default makes the common case — read-only data rendering — safe without configuration, and forces an explicit opt-in for the more powerful (and potentially more risky) function call capability.

**Q: Can I extend the namespace system with my own namespaces?**

Not in the current version. This is planned as a future feature. For now, all logic that requires custom functions should be called in the context preparation layer and the result passed into the context.

**Q: Why is template interpolation inside backtick strings not supported?**

Backtick strings in Mutor.js are static strings, not JavaScript template literals. Supporting `${...}` inside strings would require a nested expression parser inside the string tokenizer, significantly increasing complexity. The use case — computing a value inside a string — is better handled outside the string: `prefix + value + suffix` as a concatenation expression.

**Q: How does Mutor.js handle `null` and `undefined` in interpolation?**

By default, `null` and `undefined` values render as empty strings in interpolation contexts. This prevents `undefined` from appearing literally in output. Use the nullish coalescing operator (`??`) to provide explicit defaults when you need them.

**Q: Can two Mutor instances share a cache?**

No. Each instance has an isolated cache. If you want cache sharing, use a single instance.

**Q: Is there a way to render without escaping for a specific tag?**

In the current version, auto-escaping is a global configuration setting, not per-tag. To render a raw value, either use `autoEscape: false` on the instance, or sanitize the value before it enters the context, or use a separate instance configured without auto-escaping.

---

## 43. API Reference

### `new Mutor(config?: MutorConfig)`

Creates a new Mutor instance with the given configuration merged over the defaults.

```ts
const mutor = new Mutor({
  autoEscape: true,
  allowFnCalls: false,
  cache: { active: true, maxSize: 50 * 1024 * 1024 },
});
```

---

### `mutor.compile(template: string): CompiledTemplate`

```ts
type CompiledTemplate = (context: Record<string, unknown>) => string;
```

Compiles a template string and returns the compiled function. The compilation result is stored in the instance cache.

**Throws:**
- `MutorParseError` — if the template contains a syntax error
- `MutorSecurityError` — if the template contains a forbidden construct
- `MutorCompileError` — if code generation fails

---

### `mutor.render(template: string, context: Record<string, unknown>): string`

Compiles (or retrieves from cache) and immediately renders a template with the given context.

**Throws:** Same as `compile`, plus `MutorRuntimeError` for runtime context validation failures.

---

### `mutor.renderFile(path: string, context: Record<string, unknown>): Promise<string>`

*Server entry point only.*

Reads, compiles, and renders a template file. The resolved absolute path is used as the cache key.

**Throws:** Same as `render`, plus `MutorIncludeError` if the file cannot be read.

---

### `mutor.registerComponent(name: string, template: string): void`

Registers a named component template. Compilation is deferred to first render.

**Throws:** `MutorError` if `name` is empty or if `template` is not a string.

---

### `mutor.renderComponent(name: string, context: Record<string, unknown>): string`

Renders a registered component by name.

**Throws:** `MutorComponentError` if the component has not been registered. Same compile/runtime errors as `render` on first call.

---

### `mutor.clearCache(): void`

Removes all entries from the instance's compilation cache.

---

### `mutor.getCacheSize(): number`

Returns the estimated current memory usage of the cache in bytes.

---

### `mutor.getCacheEntryCount(): number`

Returns the number of compiled templates currently stored in the cache.

---

### Error Classes

```ts
import {
  MutorError,
  MutorParseError,
  MutorSecurityError,
  MutorCompileError,
  MutorRuntimeError,
  MutorIncludeError,
  MutorComponentError,
} from "mutorjs";
```

All error classes extend `MutorError extends Error` and carry:

| Property | Type | Description |
|---|---|---|
| `code` | `string` | Machine-readable error code |
| `message` | `string` | Human-readable description |
| `source` | `string \| undefined` | Originating template source (truncated) |
| `location` | `SourceLocation \| undefined` | `{ line, column, offset }` |

---

### `MutorConfig` Type Reference

```ts
interface MutorConfig {
  build?: {
    include?: Set<string>;
    exclude?: Set<string>;
  };
  autoEscape?: boolean;
  allowedProps?: Set<string>;
  forbiddenProps?: Set<string>;
  allowFnCalls?: boolean;
  delimiters?: {
    openingTag?: string;
    closingTag?: string;
    openingTagEscape?: string;
    whitespaceTrim?: string;
  };
  keepOpeningTagEscapeDelimiter?: boolean;
  cache?: {
    active?: boolean;
    maxSize?: number;
  };
}
```

---

*Mutor.js — engineered for correctness, security, and speed.*  
*Built by Onah Victor. Contributions welcome under the project's guidelines.*
