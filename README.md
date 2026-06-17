# Mutor.js

Mutor.js is a fast, synchronous templating engine for Node.js and the browser.

It provides interpolation, conditionals, loops, includes, registered components, file rendering, directory builds, and layout composition through top-of-file directives.

```ts
import Mutor from "mutorjs";

const mutor = new Mutor();

const html = mutor.render("Hello, {{ user.name }}.", {
  user: { name: "Ada" },
});

console.log(html); // Hello, Ada.
```

## Install

```sh
npm install mutorjs
```

```sh
yarn add mutorjs
```

```sh
pnpm add mutorjs
```

## What changed in v3

- Sync-only runtime and API surface
- Official layout support via `{{# layout ... }}` and `{{# use ... }}`
- File-based layout loading for the server runtime
- Improved file path resolution for `renderFile(...)` and includes
- Stronger directory build guards
- Expanded regression coverage for client and server behavior

## Why Mutor

- Small template language with familiar JavaScript-like expressions
- Synchronous API designed for predictable rendering flows
- HTML escaping enabled by default
- Includes and reusable components
- Layout composition with explicit top-of-file directives
- Server-side file rendering, directory builds, and cache support
- Function calls from context values are disabled by default
- Dangerous properties such as `constructor`, `prototype`, and `__proto__` are blocked

## Quick start

```ts
import Mutor from "mutorjs";

const mutor = new Mutor();

const template = `
{{ if user.admin }}
  <strong>{{ user.name }}</strong>
{{ else }}
  <span>{{ user.name }}</span>
{{ endif }}
`;

const html = mutor.render(template, {
  user: { name: "Grace", admin: true },
});
```

By default, interpolated values are escaped before they are written:

```ts
mutor.render("{{ value }}", {
  value: "<script>alert('nope')</script>",
});
// &lt;script&gt;alert(&#39;nope&#39;)&lt;/script&gt;
```

Disable escaping only when you know the output is already safe:

```ts
const mutor = new Mutor({ autoEscape: false });
```

## Template syntax

Mutor expressions live inside `{{ ... }}`.

```html
<h1>{{ title }}</h1>
```

### Comments

Comments are removed from the rendered output. Mutor uses a fixed `#` comment marker for consistency.

```html
{{# This will not render }}
```

### Whitespace control

Use `~` next to a tag to trim whitespace on that side.

```html
Hello {{~ name ~}} !
```

### Escaped tags

Prefix an opening tag with the escape delimiter when you want the tag to appear as text.

```html
\{{ name }}
```

That renders:

```html
{{ name }}
```

## Values and expressions

Mutor supports:

- strings
- numbers
- booleans
- `null`
- `undefined`
- property access with `.` and `[]`
- optional chaining with `?.`
- arithmetic and comparison operators
- `&&`, `||`, and `??`
- unary operators
- ternaries
- grouped expressions

Examples:

```html
{{ user.name }}
{{ user?.profile?.name }}
{{ user["name"] }}
{{ count + 1 }}
{{ score >= 80 }}
{{ admin && active }}
{{ name ?? "Anonymous" }}
{{ admin ? "Admin" : "Member" }}
```

Mutor does not allow JavaScript object literals, array literals, function literals, arrow functions, or constructors inside templates.

## Conditionals

```html
{{ if user.admin }}
  <strong>{{ user.name }}</strong>
{{ else if user.active }}
  <span>{{ user.name }}</span>
{{ else }}
  <em>Inactive user</em>
{{ endif }}
```

## Loops

Use `of` for arrays and iterable values:

```html
{{ for item of items }}
  <li>{{ item }}</li>
{{ endfor }}
```

You can add an optional second binding for the index:

```html
{{ for item, index of items }}
  <li>{{ index }}: {{ item }}</li>
{{ endfor }}
```

Use `in` for object keys:

```html
{{ for key in user }}
  <p>{{ key }}</p>
{{ endfor }}
```

Or bind both key and value:

```html
{{ for key, value in user }}
  <p>{{ key }} = {{ value }}</p>
{{ endfor }}
```

`break` and `continue` are available inside loops.

```html
{{ for item of items }}
  {{ if item == 2 }}{{ continue }}{{ endif }}
  {{ item }}
  {{ if item == 3 }}{{ break }}{{ endif }}
{{ endfor }}
```

With `items = [1, 2, 3, 4]`, that renders:

```txt
13
```

## Includes and components

Mutor can render registered components and nested partials through `Mutor::include(...)`.

```ts
import Mutor from "mutorjs";

const mutor = new Mutor();

mutor.registerComponent("nav", `
<nav>
  {{ for item of nav }}
    <a href="{{ item.href }}">{{ item.label }}</a>
  {{ endfor }}
</nav>
`);

mutor.registerComponent("shell", `
<!doctype html>
<html>
  <body>
    {{ Mutor::include("nav") }}
    <main>{{ content }}</main>
  </body>
</html>
`);

const page = mutor.render('{{ Mutor::include("shell") }}', {
  content: "<h1>Welcome</h1>",
  nav: [
    { href: "/", label: "Home" },
    { href: "/settings", label: "Settings" },
  ],
});
```

If no context is passed to an include, it inherits the parent context:

```html
{{ Mutor::include("profile-card") }}
```

Pass a different context when the include should render against a different value:

```html
{{ Mutor::include("profile-card", user) }}
```

The current context is always available as `Mutor::$$context`:

```html
<pre>{{ JSON::stringify(Mutor::$$context, 2) }}</pre>
```

## Layouts

Mutor v3 supports layouts through top-of-file directives.

This is intentional metadata-style syntax, similar in spirit to directives like `"use strict"` or `"use client"`: layouts must be declared at the top of the template.

### Register a layout in memory

```ts
import Mutor from "mutorjs";

const mutor = new Mutor();

mutor.registerLayout(`
{{# layout "shell" }}
<html>
  <body>
    {{ ::slot }}
  </body>
</html>
`);

mutor.registerComponent("page", `
{{# use "shell" }}
<h1>{{ title }}</h1>
`);

mutor.renderComponent("page", { title: "Dashboard" });
```

### Nested layouts

```ts
mutor.registerLayout(`
{{# layout "outer" }}
<outer>{{ ::slot }}</outer>
`);

mutor.registerLayout(`
{{# layout "inner" }}
{{# use "outer" }}
<inner>{{ ::slot }}</inner>
`);
```

### Layout rules

- `{{# layout "name" }}` declares a layout template
- `{{# use "name" }}` applies a layout
- `{{ ::slot }}` renders the child content inside the layout
- directives must appear at the top of the template
- missing layouts throw an error
- circular layout dependencies are rejected

## Server rendering

Use the server entry when templates live on disk.

```ts
import Mutor from "mutorjs/server";

const mutor = new Mutor({
  rootDir: "./views",
});

const html = mutor.renderFile("./pages/home.html", {
  title: "Home",
});
```

### File includes

Server includes resolve relative to the file currently being rendered:

```html
<!-- pages/home.html -->
{{ Mutor::include("../partials/header.html") }}

<h1>{{ title }}</h1>
```

Use the `@/` alias to resolve from `rootDir`:

```html
{{ Mutor::include("@/partials/header.html") }}
```

Includes are constrained to the configured `rootDir` when one is set.

### File-based layouts

You can register layouts from files or directories:

```ts
import Mutor from "mutorjs/server";

const mutor = new Mutor({ rootDir: "./views" });

mutor.addLayoutFromPath("./views/layouts/root.html");
await mutor.addLayoutsInDir("./views/layouts");
```

### Build a directory

`buildDir` renders matching template files and copies everything else.

```ts
await mutor.buildDir("./site", "./dist", {
  title: "Mutor Site",
});
```

By default, `.html` and `.txt` files are rendered. `node_modules` and `.git` are skipped.

Layout files are used during rendering and are not written to the output directory unless you pass the optional `keepLayoutFiles` flag.

The destination directory must not be the same as, or a child of, the source directory.

### Compile a directory

`compileDir` precompiles matching files into the cache.

```ts
await mutor.compileDir("./views");
```

When layout directives are found in matching files, those layouts are registered during compilation.

## Namespaces

Namespaces are trusted helper groups available from templates. Namespace calls are allowed even when normal function calls are disabled.

Mutor-specific namespace members also support a shorthand alias: `::prop` is equivalent to `Mutor::prop`.

Examples:

```html
{{ Math::abs(-5) }}
{{ Array::range(1, 3) }}
{{ Object::keys(user) }}
{{ JSON::stringify(user) }}
{{ String::capitalize(name) }}
{{ HTML::escape(value) }}
{{ HTML::safe(trustedHtml) }}
{{ Mutor::$$context }}
{{ ::$$context }}
```

Useful built-ins include:

| Namespace | Examples |
| --- | --- |
| `HTML` | `escape`, `safe` |
| `JSON` | `stringify`, `parse` |
| `Object` | `keys`, `values`, `entries`, `hasOwn`, `fromEntries`, `pick`, `omit` |
| `Array` | `isArray`, `from`, `of`, `unique`, `compact`, `chunk`, `range` |
| `Number` | `isFinite`, `isNaN`, `isInteger`, `parseInt`, `parseFloat`, `clamp`, `toFixed`, `random` |
| `String` | `fromCharCode`, `capitalize` |
| `Math` | `abs`, `floor`, `ceil`, `round`, `sqrt`, `pow`, `max`, `min`, `PI` |
| `Date` | `now`, `parse`, `new`, `iso`, `timestamp` |
| `Boolean` | `valueOf` |
| `URL` | `encode`, `decode` |
| `Mutor` | `include`, `$$context` |

For example, these are equivalent:

```html
{{ Mutor::include("card") }}
{{ ::include("card") }}
```

## Security model

Mutor is designed to keep templates constrained without exposing the full JavaScript runtime.

By default:

- interpolated values are escaped
- function calls from context values are disabled
- namespace calls are allowed
- dangerous property names are blocked
- computed property access is validated
- template expressions are parsed by Mutor rather than executed as arbitrary template source

Blocked properties include:

```txt
__proto__
constructor
prototype
__defineGetter__
__defineSetter__
__lookupGetter__
__lookupSetter__
caller
callee
arguments
```

You can allow or forbid additional properties:

```ts
const mutor = new Mutor({
  allowedProps: new Set(["constructor"]),
  forbiddenProps: new Set(["passwordHash"]),
});
```

Use `allowFnCalls` deliberately:

```ts
const mutor = new Mutor({
  allowFnCalls: true,
});
```

Mutor is a template engine, not a complete sandbox for hostile code.

Mutor also does not claim to be a complete HTML sanitization system. Default escaping is useful for ordinary templating, but context-sensitive output handling remains the caller's responsibility. Use `HTML::safe(...)` only for trusted values.

## Configuration

```ts
const mutor = new Mutor({
  autoEscape: true,
  allowFnCalls: false,
  preserveEscapeDelimiter: false,
  debugRuntimeErrors: false,
  rootDir: "./views",
  cache: {
    active: true,
    maxSize: 50 * 1024 * 1024,
  },
  delimiters: {
    openingTag: "{{",
    closingTag: "}}",
    openingTagEscape: "\\",
    whitespaceTrim: "~",
  },
  build: {
    include: new Set([".html", ".txt"]),
    exclude: new Set(["node_modules", ".git"]),
  },
  onIncludeFail: "throw",
});
```

### `autoEscape`
Escapes interpolated output. Enabled by default.

### `allowFnCalls`
Allows templates to call functions from context values. Disabled by default.

### `delimiters`
Customize tags and control markers. Comment syntax is fixed to `#` and is not configurable.

### `preserveEscapeDelimiter`
Controls whether escaped opening tags keep their escape marker.

### `rootDir`
Used by the server renderer for top-level file resolution and `@/` includes.

### `cache`
Controls compiled template caching.

### `build`
Controls which files `buildDir` and `compileDir` process.

### `onIncludeFail`
Controls what happens when an include fails.

### `onIncludeError`
Returns fallback content for failed includes.

### `debugRuntimeErrors`
Wraps runtime failures with template source context.

## Cache and diagnostics

Mutor caches compiled templates by identifier or absolute file path.

For registered components:

```ts
mutor.registerComponent("card", "<article>{{ title }}</article>");
mutor.invalidateTemplateCacheEntry("card");
```

For server files:

```ts
mutor.renderFile("./views/page.html", context);
mutor.invalidateTemplateCacheEntry("./views/page.html");
```

For layout files in the server runtime:

```ts
mutor.invalidateLayoutCacheEntry("./views/layouts/root.html");
```

Inspect cache usage:

```ts
mutor.getDiagnostics();
```

Reset cache and restore default config:

```ts
mutor.reset();
```

## API

### Core API

Import from `mutorjs`:

```ts
import Mutor from "mutorjs";
```

#### `render(template, context)`
Renders a template string.

#### `compile(template)`
Compiles a template and returns a reusable function.

#### `registerComponent(identifier, template)`
Registers a reusable component/partial.

#### `renderComponent(identifier, context)`
Renders a registered component.

#### `addLayout(template)`
Registers an in-memory layout.

#### `invalidateTemplateCacheEntry(identifier)`
Removes a cached component entry.

#### `addConfig(config)`
Updates the engine config.

#### `restoreDefaultConfig()`
Restores the default config.

#### `getDiagnostics()`
Returns cache diagnostics.

#### `reset()`
Restores default config and clears cached templates and layouts.

### Server API

Import from `mutorjs/server`:

```ts
import Mutor from "mutorjs/server";
```

#### `renderFile(path, context)`
Renders a template file.

#### `buildDir(src, destination, context, keepLayoutFiles?)`
Renders a directory into another directory.

#### `compileDir(src)`
Precompiles matching files in a directory into the cache.

#### `addLayoutFromPath(path)`
Registers a layout template from a file path.

#### `addLayoutsInDir(dir)`
Recursively registers layout templates found in a directory.

#### `invalidateTemplateCacheEntry(path)`
Removes a cached file entry.

#### `invalidateLayoutCacheEntry(path)`
Removes a cached server layout entry.

## CLI

Mutor ships with a small CLI.

```sh
mutor <command> <input> [options]
```

### Render a file

```sh
mutor render ./views/home.html --data ./data.json --out ./dist/home.html
```

Without `--out`, the result is printed to stdout.

### Build a directory

```sh
mutor build ./site --data ./data.json --out ./dist
```

### Compile a template

```sh
mutor compile ./views/home.html --out ./compiled.txt
```

### Options

| Option | Meaning |
| --- | --- |
| `--data <path>` | JSON data file used as render context |
| `--out <path>` | Output file or directory |
| `--config <path>` | JSON config file |
| `--version` | Print the installed version |
| `--help` | Show CLI help |

## Good to know

- Includes inherit their parent context when no context is passed
- The current context is available as `Mutor::$$context`
- Layout directives are top-of-file metadata by design
- File cache does not watch the filesystem
- Function calls from context values are disabled by default
- Array/object/function/class literals are not part of the template language
- Use `JSON::parse(...)` or pass data through context when you need arrays or objects
- `HTML::safe(...)` bypasses escaping and should only be used for trusted content
- Missing includes can throw, return empty output, log, or use `onIncludeError`, depending on config

## License

ISC
