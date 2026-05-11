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
15. [Cache System](#15-cache-system)
16. [Configuration Reference](#16-configuration-reference)
17. [Delimiter Customization](#17-delimiter-customization)
18. [Whitespace Control](#18-whitespace-control)
19. [Escaping Rules](#19-escaping-rules)
20. [Error Handling](#20-error-handling)
21. [CLI](#21-cli)
22. [Performance](#22-performance)
23. [Environment Support](#23-environment-support)
24. [Browser Usage](#24-browser-usage)
25. [Server Usage](#25-server-usage)
26. [Advanced Examples](#26-advanced-examples)
27. [Best Practices](#27-best-practices)
28. [Security Best Practices](#28-security-best-practices)
29. [Real-World Use Cases](#29-real-world-use-cases)
30. [Design Tradeoffs](#30-design-tradeoffs)
31. [Future Roadmap](#31-future-roadmap)
32. [FAQ](#32-faq)
33. [API Reference](#33-api-reference)

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

Most template engines treat security as a configuration layer — a set of filters you can optionally enable. In Mutor.js, security is woven into the compilation pipeline itself. The semantic analysis phase validates all property access, identifies potentially unsafe patterns, and either rewrites them into guarded forms or rejects them outright. By the time a compiled function reaches runtime, the security decisions have already been made.

This means you cannot accidentally bypass security by misconfiguring a flag. The dangerous paths do not exist in the compiled output.

### Context Is an Isolated Scope

Templates execute inside a restricted scope. The context object you provide is the entire world available to the template. There is no access to the global object, no access to `process`, no access to `require`, no access to `window`. The sandbox is enforced at code generation time: the generated function receives only what you pass in.

### Zero Dependencies

Mutor.js has no runtime dependencies. It is self-contained TypeScript. This is a deliberate architectural constraint. Every dependency you introduce to a security-critical system is a potential attack surface. Mutor.js owns its entire stack — tokenizer, parser, AST, code generator, runtime, cache — and each of those components is auditable without pulling in third-party code.

---

## 5. Syntax Guide

Mutor.js uses a structured tag syntax. It is not raw JavaScript embedded in HTML. The template language is a defined, bounded DSL that the compiler can reason about completely.

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

Mutor.js provides structured control flow via `if`, `else if`, `else`, `for`, and `end` tags. These are not arbitrary JavaScript — they are a fixed set of recognized logic directives that the parser handles explicitly.

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

> **Note:** There is no `break` or `continue` directive in the current version. Complex filtering logic belongs in the context object, not the template.

---

## 7. Expression System

Mutor.js expressions are a defined subset of JavaScript expressions, parsed by Mutor.js's own expression parser — meaning the engine controls exactly what is and is not expressible.

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

### Operator Precedence

Mutor.js follows standard JavaScript operator precedence:

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

When in doubt, use explicit parentheses:

```html
{{ (a + b) * c }}
{{ user.age >= 18 ? "adult" : "minor" }}
```

### Strings

String literals support single quotes, double quotes, and backticks. Backtick strings are treated as static strings — template interpolation (`${...}`) inside strings does not evaluate expressions. The backtick form exists to allow strings containing both single and double quotes conveniently.

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

When enabled, calls like `item.name.toUpperCase()` or `Math::floor(price)` are permitted. Namespace function calls (`Math::floor`, etc.) are permitted regardless of `allowFnCalls` because they are routed through the controlled namespace system.

> **Warning:** Enabling `allowFnCalls` expands the trusted surface area of your templates. Ensure the context objects you pass contain only functions you intend to expose. Do not pass raw service objects or request objects as top-level context when `allowFnCalls` is enabled.

---

## 8. Includes

Includes allow a template to embed another template file at a specific location in its output. The included template is compiled and cached independently, sharing the same cache as the parent instance.

### Syntax

```html
{{ Mutor::include("./partials/header.html") }}
{{ Mutor::include("./partials/nav.html", navLinks) }}
```

When no context argument is provided, the include inherits the current rendering context automatically. For direct access to the current context, use `Mutor::$$context`:

```html
{{ Mutor::include("./partials/footer.html", Mutor::$$context) }}
```

### Include Resolution

Include paths are resolved relative to the file being rendered when using `renderFile`. In a browser environment, include paths are treated as names of components registered with `mutor.registerComponent`. Attempting to include a non-registered component, or a file that does not exist, throws an error.

### Circular Include Detection

Mutor.js tracks the include chain across all recursive resolutions. If a template attempts to include a file already in the current include stack, the engine throws rather than entering infinite recursion:

```
MutorError: Circular include detected: ./partials/a.html → ./partials/b.html → ./partials/a.html
```

---

## 9. Components

Components are named templates registered on a Mutor instance. They are the browser-compatible alternative to file-based includes, and are also useful on the server when you want to manage templates programmatically.

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

Compiles a template string into an executable function. The resulting function accepts a context object and returns the rendered string.

```js
const fn = mutor.compile(`<title>{{ page.title }}</title>`);
const output = fn({ page: { title: "Home" } });
```

Calling `compile` with the same template string twice returns the cached compiled function.

### `render(template: string, context: object): string`

Convenience wrapper around `compile`. Compiles the template if not already cached, then immediately invokes it with the provided context.

```js
const output = mutor.render(`<p>{{ msg }}</p>`, { msg: "Hello" });
```

### `renderFile(path: string, context: object): Promise<string>`

Server-only. Reads the template file from disk, compiles it, and renders it with the given context. The compiled result is cached by resolved file path — repeated calls with the same path do not re-read the file or re-compile.

```js
const html = await mutor.renderFile("./views/home.html", context);
```

> This method is not available when importing from `mutorjs` (the universal entry point). Import from `mutorjs/server` to access it.

### `registerComponent(name: string, template: string): void`

Registers a named template string as a component on the current Mutor instance. Compilation is deferred to first render.

### `renderComponent(name: string, context: object): string`

Renders a previously registered component by name. Throws `MutorComponentError` if the component has not been registered.

### Instance Isolation

Each `Mutor` instance maintains its own compilation cache and component registry. Two instances do not share state. This is important in multi-tenant or per-request environments where isolation between rendering contexts is required.

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

**Layer 1 — Compile-time analysis**

Every property access in the template is analyzed during compilation. Static accesses (`obj.prop`, `obj["key"]`) are validated against the forbidden property list. Dynamic accesses (`obj[expression]`) are rewritten into calls to a runtime guard helper. Access to `__proto__`, `constructor`, or `prototype` is unconditionally rejected — there is no configuration override.

**Layer 2 — Code generation sandboxing**

The generated function runs inside a closed scope. It receives only the context object as its argument. It has no reference to any global, no `this` binding to the environment, and no access to `require` or `import`.

**Layer 3 — Runtime context validation**

Before the compiled function executes, Mutor.js validates the context object. Prototype chains are checked, and objects with polluted prototypes or non-standard getters and setters on built-in prototype properties are rejected. This prevents an attacker from crafting a context object that passes compile-time checks but exploits runtime behavior.

### Output Escaping

All interpolated values are HTML-escaped by default:

| Character | Escaped As |
|---|---|
| `&` | `&amp;` |
| `<` | `&lt;` |
| `>` | `&gt;` |
| `"` | `&quot;` |
| `'` | `&#39;` |

Auto-escaping is controlled by the `autoEscape` configuration option. Setting `autoEscape: false` disables this behavior globally.

> **Warning:** Do not disable `autoEscape` unless you have a specific, justified reason and you understand the full implications. Disabled auto-escaping in combination with user-controlled context data is an XSS vector.

---

## 12. Sandbox System

The sandbox ensures compiled templates cannot access anything outside the explicitly provided context.

### What the Sandbox Prevents

- Access to JavaScript globals (`window`, `process`, `global`, `require`, `globalThis`)
- Access to `this` in a way that reaches the outer environment
- Access to prototype chain escape vectors (`__proto__`, `constructor`, `prototype`)

### Function Call Sandboxing

When `allowFnCalls: false` (the default), the compiler rejects any expression that involves a function invocation on a non-namespace identifier. `user.name.toUpperCase()` would be rejected. `Math::floor(price)` is permitted because it routes through the namespace system.

When `allowFnCalls: true`, method calls on context properties are permitted. The sandbox still prevents access to globals; it only allows invocation of functions that exist on the context object you explicitly pass in.

### Forbidden Property List

The default forbidden properties are `__proto__`, `constructor`, and `prototype`. These are always enforced and cannot be removed. You can extend the list for your specific threat model:

```js
const mutor = new Mutor({
  forbiddenProps: new Set(["__proto__", "constructor", "prototype", "valueOf", "toString"]),
});
```

> **Note:** If you add a property to both `allowedProps` and `forbiddenProps`, `allowedProps` takes precedence and the property will not be blocked.

---

## 13. Property Access Validation

### Static Property Access

```js
user.name       // static — property name known at compile time
user["email"]   // static — property name known at compile time
```

For static access, the compiler checks the property name against the forbidden list at compile time. If the name is forbidden, compilation fails immediately with a clear error.

### Dynamic Property Access

```js
obj[someVariable]   // dynamic — property name not known until runtime
```

Dynamic access cannot be fully validated at compile time. Mutor.js handles this by rewriting all dynamic property accesses through a runtime guard that validates the resolved property name against the forbidden list before performing the access. Even if an attacker sets `someVariable = "__proto__"` at runtime, the guard catches it.

---

## 14. Namespace System

The namespace system provides controlled access to JavaScript built-in utilities inside templates without exposing the full global scope.

### Syntax

```html
{{ Namespace::identifier }}
{{ Namespace::method(args) }}
```

The `::` operator is Mutor.js-specific. It does not exist in standard JavaScript. It is parsed by Mutor.js and translated into safe, controlled lookups at code generation time.

### Available Namespaces

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

### Examples

```html
<p>Price: {{ Math::floor(product.price) }} USD</p>
<p>Keys: {{ Object::keys(record).length }}</p>
<p>Data: {{ JSON::stringify(debug.payload) }}</p>
<p>Valid: {{ Array::isArray(items) ? "yes" : "no" }}</p>
```

### The `Mutor` Namespace

The `Mutor` namespace is reserved for engine directives:

- `Mutor::include(path)` — includes a template file, inheriting the current context
- `Mutor::include(path, context)` — includes a template file with an explicit context
- `Mutor::$$context` — a reference to the current rendering context object

---

## 15. Cache System

Every `Mutor` instance maintains an internal LRU (Least Recently Used) cache of compiled template functions.

### Cache Behavior

- Templates are cached by their source string (for `compile` and `render`) or by their resolved absolute file path (for `renderFile`).
- Cache lookups are O(1).
- When a template is accessed, it is promoted to the most-recently-used position.
- When the cache reaches its configured `maxSize`, the least-recently-used entry is evicted.

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
| `active` | `boolean` | `true` | Whether caching is enabled. Set to `false` to recompile on every render (useful for development). |
| `maxSize` | `number` | `52428800` (50MB) | Maximum cache memory in bytes. When exceeded, LRU eviction runs. |

### Disabling the Cache

```js
const mutor = new Mutor({
  cache: { active: false }
});
```

With the cache disabled, every `render` or `renderFile` call runs the full compiler pipeline. This is useful in development for picking up template changes without restarting the process, but is not appropriate for production.

### Manual Cache Control

```js
// Clear the entire cache
mutor.reset();

// Get cache diagnostics (memory usage, entry count)
const diagnostics = mutor.getDiagnostics();
```

> **Note:** `reset()` is synchronous and removes all compiled functions from the instance cache. The next render of any template will trigger recompilation.

### Instance Isolation

Each instance has an independent cache with its own size limit. If you need strict per-tenant or per-request memory isolation, use separate `Mutor` instances.

---

## 16. Configuration Reference

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
    commentTag?: string;           // Default: "#"
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

A `Set<string>` of property names that are explicitly permitted regardless of other validation rules.

### `forbiddenProps`

A `Set<string>` of additional property names to block. The built-in forbidden set (`__proto__`, `constructor`, `prototype`) is always enforced and merged with any values you provide here.

### `build.include` and `build.exclude`

Used by the server-side file scanner when pre-compiling a directory of templates. `include` is a set of file extensions to process. `exclude` is a set of directory names to skip.

---

## 17. Delimiter Customization

All delimiter-related strings are fully configurable.

### Changing Delimiters

```js
const mutor = new Mutor({
  delimiters: {
    openingTag: "<%",
    closingTag: "%>",
    openingTagEscape: "\\",
    whitespaceTrim: "-",
    commandTag: "#",
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

If you change delimiters at runtime by creating a new `Mutor` instance with different configuration, the new instance has a separate cache. Templates compiled under one delimiter configuration are not compatible with a differently configured instance — the instance and its configuration are inseparable.

---

## 18. Whitespace Control

Mutor.js provides precise whitespace control via the `~` directive (or your configured `whitespaceTrim` character).

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

The `~` on the opening tag trims whitespace to the left of that tag; `~` on the closing tag trims whitespace to the right. Trim directives work on interpolation tags as well as logic tags.

---

## 19. Escaping Rules

### Auto-Escape (Default)

When `autoEscape: true`, every dynamic value is HTML-escaped before insertion. A function call that returns a value like `<script>alert(1)</script>` renders as:

```
&lt;script&gt;alert(1)&lt;/script&gt;
```

### Disabling Auto-Escape

```js
const mutor = new Mutor({ autoEscape: false });
```

With auto-escaping disabled, values are interpolated verbatim. This is appropriate only when generating non-HTML output (e.g., plain text) or when context data has been sanitized elsewhere.

### Escaping the Delimiter

To output the literal opening delimiter without triggering parsing:

```html
\{{ this is not a template tag }}
```

The `keepOpeningTagEscapeDelimiter` option controls whether the backslash itself appears in output:

| `keepOpeningTagEscapeDelimiter` | Template | Output |
|---|---|---|
| `false` (default) | `\{{ expr }}` | `{{ expr }}` |
| `true` | `\{{ expr }}` | `\{{ expr }}` |

---

## 20. Error Handling

Mutor.js produces typed errors with detailed source location information.

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
  code: string;       // Machine-readable error code
  source?: string;    // Original template content (truncated)
  location?: {
    line: number;
    column: number;
    offset: number;
  };
}
```

### Error Messages

Because every token is position-tracked, errors reference exact source locations:

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
    // Log and reject the template — do not attempt to render
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

## 21. CLI

Mutor.js ships a command-line interface for compiling and rendering templates outside of JavaScript code.

### Installation

Install the package globally to use the `mutor` command directly:

```bash
npm install -g mutorjs
```

Or use it locally via `npx`:

```bash
npx mutor <command> <input> [options]
```

### Commands

#### `compile <template>`

Compiles a single template file to its intermediate compiled form.

```bash
mutor compile ./views/index.html --out ./dist/index.html
```

If `--out` is omitted, the compiled output is printed to stdout.

#### `build <dir>`

Renders all templates in a directory using a JSON data source.

```bash
mutor build ./views --data ./data.json --out ./dist
```

Both `--data` and `--out` are required for `build`.

#### `render <template>`

Compiles and immediately renders a single template using a JSON data source.

```bash
mutor render ./views/email.html --data ./context.json --out ./dist/email.html
```

If `--out` is omitted, the rendered output is printed to stdout.

### Options

| Option | Description |
|---|---|
| `--out <path>` | Output file or directory. Defaults to stdout for `compile` and `render`. |
| `--data <path>` | JSON file to use as the render context. Required for `build` and `render`. |
| `--config <path>` | JSON config file passed to the Mutor instance. |
| `--version` | Print the installed version and exit. |
| `--help` | Print usage information and exit. |

### Exit Codes

| Code | Meaning |
|---|---|
| `0` | Success |
| `1` | Runtime error (I/O failure, render failure, etc.) |
| `2` | Argument error (unknown flag, missing required value, wrong file type) |

### Configuration via `--config`

You can pass any `MutorConfig`-compatible JSON file to `--config`:

```json
{
  "autoEscape": true,
  "allowFnCalls": false,
  "cache": {
    "active": true,
    "maxSize": 52428800
  }
}
```

```bash
mutor build ./views --data ./data.json --out ./dist --config ./mutor.config.json
```

### Examples

```bash
# Compile a template and print to stdout
mutor compile ./views/home.html

# Compile a template to a file
mutor compile ./views/home.html --out ./dist/home.html

# Render a template with data, write to file
mutor render ./views/email.html --data ./payload.json --out ./out/email.html

# Build an entire views directory
mutor build ./views --data ./site.json --out ./dist

# Build with a custom config
mutor build ./views --data ./site.json --out ./dist --config ./mutor.config.json
```

---

## 22. Performance

### Compilation vs. Execution

Mutor.js makes a deliberate tradeoff: spend more time at compile time so that runtime is as fast as possible.

**Compilation cost** — The full pipeline (tokenize → parse → analyze → validate → generate → compile) is more work than engines like EJS or Eta perform. Mutor.js runs semantic analysis and security validation steps that those engines skip. This cost is paid once per unique template per process lifetime.

**Execution cost** — The compiled output is a native JavaScript function. Executing it is as fast as executing any other JavaScript function of equivalent complexity. There is no interpreter, no AST walker, no regex match — only a function call.

The compilation cost is amortized across all renders of that template. For a server process that handles thousands of requests, a single template might be compiled once and executed hundreds of thousands of times. The per-request cost is execution only.

### Benchmarks

The following benchmarks are indicative, based on internal measurements on a modern machine with Node.js 20:

**Full pipeline (compile + execute):**

| Engine | Relative Performance |
|---|---|
| Eta | 1× (baseline) |
| **Mutor.js** | **~0.8–0.9×** |
| EJS | ~0.4× |
| Nunjucks | ~0.15× |
| Handlebars | ~0.12× |

**Raw execution (cache-warm, pre-compiled):**

| Engine | Relative Performance |
|---|---|
| **Mutor.js** | **1× (top tier)** |
| Eta | ~0.8–0.9× |
| EJS | ~0.3× |
| Nunjucks | ~0.08× |
| Handlebars | ~0.06× |

Mutor.js is slightly behind Eta on first-compile benchmarks, which is expected — Eta does minimal validation. On the execution-only path (cache warm), Mutor.js leads. That is the path that matters under production load.

> **Note:** These benchmarks do not account for real-world I/O or middleware overhead. Profile your specific use case.

---

## 23. Environment Support

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

## 24. Browser Usage

In browser environments, import from the universal entry point:

```js
import Mutor from "mutorjs";
```

The universal entry point excludes all file-system APIs. The following methods are available: `compile`, `render`, `registerComponent`, `renderComponent`. The `renderFile` method is not available and will throw a `MutorError` if called.

### Managing Templates in the Browser

Since file-system access is unavailable, templates must be loaded manually and registered as components:

```js
const templateString = await fetch("/templates/card.html").then(r => r.text());

mutor.registerComponent("card", templateString);

const html = mutor.renderComponent("card", { card: data });
document.getElementById("app").innerHTML = html;
```

---

## 25. Server Usage

Import from the server entry point:

```js
import Mutor from "mutorjs/server";
```

The server entry point includes all functionality from the universal entry point plus `renderFile` and pre-compilation scanning via the `build` configuration.

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

In production, pre-compile all templates during application startup to eliminate compilation latency on first request:

```js
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

## 26. Advanced Examples

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
    maxSize: 100 * 1024 * 1024,
  },
});
```

---

## 27. Best Practices

**Keep templates thin.** Templates should handle layout and presentation. Business logic, data transformations, filtering, and sorting belong in the context preparation layer, not the template.

**Pre-warm the cache in production.** Use the startup cache warming pattern to eliminate first-request compilation latency. Templates should be compiled before traffic arrives.

**Use a single shared `Mutor` instance per process.** Cache efficiency is maximized when all requests share the same compiled template cache. Use separate instances only when you need genuine isolation (e.g., per-tenant configuration differences).

**Pass minimal context.** Only expose in the context what the template actually needs. Avoid passing entire service objects, database clients, or request objects as context.

**Validate context data before passing it in.** Mutor.js validates the context's prototype chain but does not validate the semantic meaning of your data. Validate user input before it enters the render context.

**Use `for...of` for arrays, `for...in` for objects.** This mirrors JavaScript semantics and makes templates readable to any JavaScript developer.

**Name includes and components descriptively.** Component names and include paths are the template's interface contract. `renderComponent("card")` is readable; `renderComponent("c1")` is not.

**Test your templates.** Templates are code. Render them with fixture contexts in your test suite to catch regressions in output structure.

---

## 28. Security Best Practices

**Never disable `autoEscape` when rendering user-controlled data.** If you must render raw HTML from a trusted source, consider using a separate Mutor instance with `autoEscape: false` specifically for that purpose, so the risk is isolated.

**Never pass `req`, `res`, database clients, or service objects as context.** These objects have methods and properties that, with `allowFnCalls: true`, could be invoked from a template. Prepare a clean, minimal context object explicitly.

**Enable `allowFnCalls` only when necessary and with a clear scope.** If you need method calls on specific types (e.g., string formatting), consider the planned custom namespace feature instead.

**Extend `forbiddenProps` conservatively.** Add property names you know are dangerous in your specific context. `valueOf` and `toString` are candidates in many applications.

**Treat `MutorSecurityError` as a hard stop.** If a security error is thrown during compilation, do not attempt to render the template. Log it, alert on it, and investigate.

**Do not use `cache: { active: false }` in production.** Beyond the performance cost, a disabled cache means every render triggers recompilation — and recompilation triggers full security analysis on every request, which while correct, is unnecessary overhead.

**Audit templates that come from external sources.** If your application allows user-defined templates to be compiled, review them with the same scrutiny as user-provided code. Mutor.js's sandbox is strong, but defense in depth applies here too.

---

## 29. Real-World Use Cases

### Server-Side HTML Rendering (Node.js)

The primary use case. A web application that serves HTML pages from templates. Mutor.js compiles the view templates at startup, and each request invokes the compiled functions with a prepared context.

### Email Template Rendering

Email templates have similar requirements to HTML templates: variable interpolation, conditional sections (e.g., showing a section only if a promo code is attached), iteration over lists (e.g., order items). Mutor.js's auto-escaping is important for preventing XSS in email clients that render HTML, and the predictable output makes it easy to test email rendering in CI.

### Static Site Generation

A static site generator can use Mutor.js to compile page templates and render them with content sourced from a CMS, markdown files, or a database. The CLI's `build` command makes this straightforward for file-based workflows. The compilation cache ensures that re-builds are fast: only changed templates need recompilation.

### Configuration File Generation

Mutor.js can render structured text formats like JSON, YAML, or NGINX configuration files, not just HTML. Disable `autoEscape` for non-HTML output and use the template language to generate configuration files with environment-specific values.

### Report Generation

Server-side report generation that produces HTML output for PDF conversion. Mutor.js's deterministic, secure rendering is well-suited for environments where the template must process potentially large and complex data structures into formatted output.

---

## 30. Design Tradeoffs

### Compilation Cost for Execution Speed

Mutor.js is slower to compile than Eta because it does substantially more work during compilation. This is acceptable because the compiled output executes faster, and compilation happens once per template per process lifetime.

**Impact:** Mutor.js is not ideal for environments where templates change on every request and caching is disabled. It excels in environments with a stable set of templates and many requests.

### Bounded Template Language for Security

Mutor.js does not allow arbitrary JavaScript in templates. You cannot write a `while` loop, a `try/catch`, a variable declaration, or an IIFE. This is a hard constraint from the security architecture.

**Impact:** Complex logic must live in the context object, not the template. This is the correct design for large applications — templates should be thin views, not business logic containers — but it requires a different authoring mindset.

### Zero Dependencies for Auditability

Mutor.js has no third-party dependencies. Every dependency in a security-critical system is a potential attack surface. Mutor.js owns its entire stack, which makes it fully auditable and immune to supply chain attacks through compromised dependencies.

**Impact:** Mutor.js does not benefit from improvements in third-party parsing libraries or utility packages. Every capability must be built and maintained internally.

---

## 31. Future Roadmap

The following features are planned or under active development and are not available in the current stable release.

### Template Source Maps *(Planned)*

Source map generation so that runtime errors in compiled functions can be mapped back to their originating template locations — the natural next step from the position tracking already in the tokenizer.

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

Support for templates that include asynchronous expressions — for example, inline data fetching or async namespace methods. Architecturally complex and not yet committed.

### Template Language Server Protocol Support *(Future)*

An LSP implementation for Mutor.js template syntax, enabling editor tooling: syntax highlighting, error diagnostics, completion, and hover docs.

### Compiler Plugin API *(Future)*

An API for hooking into the compilation pipeline at defined extension points (post-parse, post-analyze, post-generate), enabling custom AST transformations, custom security policies, and code generation optimizations without forking the core.

---

## 32. FAQ

**Q: Is Mutor.js production-ready?**

Yes. The core engine — rendering, compilation, caching, security, components, includes — is stable and production-ready. The CLI is also available as of the current release.

**Q: Can I use Mutor.js with Express/Fastify/Koa?**

Yes. Mutor.js is a rendering function, not a framework. Any server framework that lets you produce a string response can use it. See §25 Server Usage for an Express example.

**Q: Why is function calling disabled by default?**

Templates that invoke arbitrary functions on context objects are harder to reason about and audit than templates that only read data. Disabling function calls by default makes the common case — read-only data rendering — safe without configuration, and forces an explicit opt-in for the more powerful (and potentially more risky) capability.

**Q: Can I extend the namespace system with my own namespaces?**

Not in the current version. This is planned as a future feature. For now, all logic that requires custom functions should be called in the context preparation layer and the result passed into the context.

**Q: Why is template interpolation inside backtick strings not supported?**

Backtick strings in Mutor.js are static strings, not JavaScript template literals. Supporting `${...}` inside strings would require a nested expression parser inside the string tokenizer, significantly increasing complexity. The use case is better handled outside the string: `prefix + value + suffix` as a concatenation expression.

**Q: How does Mutor.js handle `null` and `undefined` in interpolation?**

By default, `null` and `undefined` values render as empty strings. This prevents `undefined` from appearing literally in output. Use the nullish coalescing operator (`??`) to provide explicit defaults when you need them.

**Q: Can two Mutor instances share a cache?**

No. Each instance has an isolated cache. If you want cache sharing, use a single instance.

**Q: Is there a way to render without escaping for a specific tag?**

In the current version, auto-escaping is a global configuration setting, not per-tag. To render a raw value, either use `autoEscape: false` on the instance, sanitize the value before it enters the context, or use a separate instance configured without auto-escaping.

---

## 33. API Reference

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

*Server entry point only (`mutorjs/server`).*

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

### `mutor.addConfig(config: Partial<MutorConfig>): void`

Merges additional configuration into the instance after construction. Useful when configuration is loaded asynchronously (e.g., from a file) after the instance is created.

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
