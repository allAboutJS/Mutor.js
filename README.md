# Mutor.js

Mutor.js is a small, fast templating engine for people who want templates to be expressive without turning them into a second application runtime.

It gives you interpolation, conditionals, loops, partials, file rendering, async values, escaping, and a guarded expression system. It does not ship layout inheritance on purpose. In Mutor, complex pages are built from partials/components and the right context.

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

## Why Mutor

- Small template language with familiar JavaScript-like expressions.
- HTML escaping is on by default.
- Dangerous properties such as `constructor`, `prototype`, and `__proto__` are blocked.
- Function calls are restricted by default.
- Partials/components are first-class.
- Server rendering supports file includes and directory builds.
- Async values work through `Mutor::await`.
- Cache entries can be inspected, reset, or invalidated.

## Quick Start

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

By default, strings are escaped before they are written:

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

## Template Syntax

Mutor expressions live inside `{{ ... }}`.

```html
<h1>{{ title }}</h1>
```

### Comments

Comments are removed from the rendered output.

```html
{{# This will not render }}
```

### Whitespace Control

Use `~` next to a tag to trim whitespace on that side.

```html
Hello {{~ name ~}} !
```

With `name = "Ada"`, that renders:

```html
HelloAda!
```

### Escaped Tags

Prefix an opening tag with the escape delimiter when you want the tag to appear as text.

```html
\{{ name }}
```

That renders:

```html
{{ name }}
```

If `preserveEscapeDelimiter` is enabled, the escape delimiter is kept too.

## Values And Literals

Mutor supports simple literals:

```html
{{ "hello" }}
{{ 'hello' }}
{{ `hello` }}
{{ 42 }}
{{ 3.14 }}
{{ 1e-3 }}
{{ true }}
{{ false }}
{{ null }}
{{ undefined }}
```

Mutor does not allow JavaScript object literals, array literals, function literals, arrow functions, or constructors inside templates:

```html
{{ { name: "Ada" } }}      <!-- not allowed -->
{{ [1, 2, 3] }}            <!-- not allowed -->
{{ function() {} }}        <!-- not allowed -->
{{ () => {} }}             <!-- not allowed -->
{{ new User() }}           <!-- not allowed -->
```

When you need an array or object value in a template expression, pass it in the context or create it from JSON:

```html
{{ JSON::parse("[1,2,3]")[0] }}
{{ JSON::parse('{"name":"Ada"}').name }}
```

Passing values through context is usually cleaner:

```ts
mutor.render("{{ user.name }}", {
  user: { name: "Ada" },
});
```

## Expressions

Mutor expressions are intentionally familiar:

```html
{{ user.name }}
{{ user?.profile?.name }}
{{ user["name"] }}
{{ count + 1 }}
{{ price * quantity }}
{{ score >= 80 }}
{{ admin && active }}
{{ name ?? "Anonymous" }}
{{ admin ? "Admin" : "Member" }}
```

Supported expression pieces include:

- property access with `.` and `[]`
- optional chaining with `?.`
- arithmetic operators such as `+`, `-`, `*`, `/`, `%`, `**`
- comparison operators such as `>`, `<`, `>=`, `<=`
- equality operators `==` and `!=`
- logical operators `&&`, `||`, `??`
- bitwise operators `&`, `|`, `^`, `>>`, `<<`
- unary operators `!`, `+`, `-`
- ternaries with `condition ? yes : no`
- grouping with parentheses

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

You can add an optional second binding for the value:

```html
{{ for key, value in user }}
  <p>{{ key }} = {{ value }}</p>
{{ endfor }}
```

`break` and `continue` are available inside loops:

```html
{{ for item of items }}
  {{ if item.hidden }}{{ continue }}{{ endif }}
  {{ item.name }}
  {{ if item.last }}{{ break }}{{ endif }}
{{ endfor }}
```

## Partials And Composition

Mutor does not have layouts. That is a design choice.

Instead, build pages from partials/components and pass the context they need. This keeps the core smaller and makes composition explicit.

```ts
import Mutor from "mutorjs";

const mutor = new Mutor({ autoEscape: false });

mutor.registerComponent(
  "shell",
  `
<!doctype html>
<html>
  <head><title>{{ title }}</title></head>
  <body>
    {{ Mutor::include("nav") }}
    <main>{{ content }}</main>
  </body>
</html>
`,
);

mutor.registerComponent(
  "nav",
  `
<nav>
  {{ for item of nav }}
    <a href="{{ item.href }}">{{ item.label }}</a>
  {{ endfor }}
</nav>
`,
);

const page = mutor.render('{{ Mutor::include("shell") }}', {
  title: "Dashboard",
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

Pass a different context when the partial should render against a smaller or different value:

```html
{{ Mutor::include("profile-card", user) }}
```

Inside any template or partial, the current context is available as `Mutor::$$context`:

```html
<pre>{{ JSON::stringify(Mutor::$$context, 2) }}</pre>
```

That is useful for generic components that render the value they were given:

```ts
mutor.registerComponent("badge", `<span>{{ Mutor::$$context }}</span>`);

mutor.render('{{ Mutor::include("badge", "New") }}', {});
// <span>New</span>
```

## Server Rendering

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

### Build A Directory

`buildDir` renders matching template files and copies everything else.

```ts
await mutor.buildDir("./site", "./dist", {
  title: "Mutor Site",
});
```

By default, `.html` and `.txt` files are rendered. `node_modules` and `.git` are skipped.

### Compile A Directory

`compileDir` precompiles matching files into the cache.

```ts
await mutor.compileDir("./views");
```

After that, `renderFile` can use cached compiled templates.

## Async Templates

Use `Mutor::await` when a value may be a promise.

```html
Hello, {{ (Mutor::await(userPromise)).name }}
```

Use the async render methods for templates that use `Mutor::await`:

```ts
const html = await mutor.renderAsync(
  "Hello, {{ Mutor::await(namePromise) }}",
  {
    namePromise: Promise.resolve("Ada"),
  },
);
```

Server and component APIs also have async forms:

```ts
await mutor.renderFileAsync("./page.html", context);
await mutor.renderAsyncComponent("card", context);
```

Good to know: `Mutor::await` makes the compiled template async. Prefer the async APIs for templates that use it.

## Namespaces

Namespaces are trusted helper groups available from templates. Namespace calls are allowed even when normal function calls are disabled.

```html
{{ Math::max(10, 20) }}
{{ Array::range(1, 3) }}
{{ Object::keys(user) }}
{{ JSON::stringify(user) }}
{{ String::capitalize(name) }}
{{ Date::iso() }}
{{ URL::encode(query) }}
```

Useful built-ins include:

| Namespace | Examples |
| --- | --- |
| `JSON` | `stringify`, `parse` |
| `Object` | `keys`, `values`, `entries`, `hasOwn`, `fromEntries`, `pick`, `omit` |
| `Array` | `isArray`, `from`, `of`, `unique`, `compact`, `chunk`, `range` |
| `Number` | `isFinite`, `isNaN`, `isInteger`, `parseInt`, `parseFloat`, `clamp`, `toFixed`, `random` |
| `String` | `fromCharCode`, `capitalize` |
| `Math` | `abs`, `floor`, `ceil`, `round`, `sqrt`, `pow`, `max`, `min`, `PI` |
| `Date` | `now`, `parse`, `new`, `iso`, `timestamp` |
| `Boolean` | `valueOf` |
| `URL` | `encode`, `decode` |
| `Mutor` | `include`, `await`, `$$context` |

## Security Model

Mutor is designed to keep templates useful without handing them the whole JavaScript runtime.

By default:

- HTML strings are escaped.
- Function calls from context values are disabled.
- Namespace calls are allowed.
- Dangerous property names are blocked.
- Computed property access is validated.
- Template expressions are parsed by Mutor, not executed as arbitrary JavaScript source.

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

With `allowFnCalls: false`, this is blocked:

```html
{{ user.deleteAccount() }}
```

Mutor is a template engine, not a complete sandbox for hostile code. If users can write templates, keep the default restrictions unless you have a reason to loosen them.

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
    commentTag: "#",
  },
  build: {
    include: new Set([".html", ".txt"]),
    exclude: new Set(["node_modules", ".git"]),
  },
  onIncludeFail: "throw",
});
```

### `autoEscape`

Escapes HTML-sensitive characters in strings. Enabled by default.

### `allowFnCalls`

Allows templates to call functions from context values. Disabled by default.

Namespace calls such as `Math::max(1, 2)` are still allowed.

### `delimiters`

Customize tags and control markers.

```ts
const mutor = new Mutor({
  delimiters: {
    openingTag: "{%",
    closingTag: "%}",
  },
});
```

### `preserveEscapeDelimiter`

Controls whether escaped opening tags keep their escape marker.

### `rootDir`

Used by the server renderer for `@/` includes.

### `cache`

Controls compiled template caching.

```ts
const mutor = new Mutor({
  cache: {
    active: true,
    maxSize: 10 * 1024 * 1024,
  },
});
```

### `build`

Controls which files `buildDir` and `compileDir` process.

```ts
const mutor = new Mutor({
  build: {
    include: new Set([".html", ".md"]),
    exclude: new Set(["node_modules", ".git", "drafts"]),
  },
});
```

### `onIncludeFail`

Controls what happens when an include fails.

```ts
const mutor = new Mutor({
  onIncludeFail: "throw", // "throw" | "ignore" | "ignoreLog"
});
```

### `onIncludeError`

Return fallback content for failed includes.

```ts
const mutor = new Mutor({
  onIncludeFail: "ignore",
  onIncludeError(meta, err) {
    return `<!-- include failed: ${meta.path} -->`;
  },
});
```

### `debugRuntimeErrors`

Wraps runtime failures with template source context.

```ts
const mutor = new Mutor({
  debugRuntimeErrors: true,
  allowFnCalls: true,
});
```

This is helpful during development because errors point back to the template line and column.

## Cache

Mutor caches compiled templates by identifier or absolute file path.

For registered components:

```ts
mutor.registerComponent("card", "<article>{{ title }}</article>");
mutor.invalidateCacheEntry("card");
```

For server files:

```ts
mutor.renderFile("./views/page.html", context);
mutor.invalidateCacheEntry("./views/page.html");
```

The next render recompiles the template.

Inspect cache usage:

```ts
mutor.getDiagnostics();
```

Example result:

```ts
{
  bytesUsed: 1200,
  bytesMax: 52428800,
  readableUsed: "0.00 MB",
  readableMax: "50.00 MB",
  totalEntries: 2,
  percentFull: 0,
  avgTemplateSize: 600
}
```

Clear all cache entries and restore default config:

```ts
mutor.reset();
```

Good to know: Mutor does not watch files. If a template file changes while cache is active, call `invalidateCacheEntry`, call `reset`, or disable cache in development.

## API

### Core API

Import from `mutorjs`:

```ts
import Mutor from "mutorjs";
```

#### `render(template, context)`

Renders a template string.

```ts
mutor.render("Hello {{ name }}", { name: "Ada" });
```

#### `renderAsync(template, context)`

Renders a template string through a promise. Use this when the template uses `Mutor::await`.

```ts
await mutor.renderAsync("{{ Mutor::await(value) }}", {
  value: Promise.resolve("done"),
});
```

#### `compile(template)`

Compiles a template and returns a reusable function.

```ts
const renderGreeting = mutor.compile("Hello {{ name }}");

renderGreeting({ name: "Ada" });
renderGreeting({ name: "Grace" });
```

#### `registerComponent(identifier, template)`

Registers a reusable component/partial.

```ts
mutor.registerComponent("button", "<button>{{ label }}</button>");
```

#### `renderComponent(identifier, context)`

Renders a registered component.

```ts
mutor.renderComponent("button", { label: "Save" });
```

#### `renderAsyncComponent(identifier, context)`

Async component rendering.

```ts
await mutor.renderAsyncComponent("button", context);
```

#### `invalidateCacheEntry(identifier)`

Removes a cached component entry.

```ts
mutor.invalidateCacheEntry("button");
```

#### `addConfig(config)`

Updates the engine config.

```ts
mutor.addConfig({ autoEscape: false });
```

#### `restoreDefaultConfig()`

Restores the default config.

```ts
mutor.restoreDefaultConfig();
```

#### `getDiagnostics()`

Returns cache diagnostics.

```ts
mutor.getDiagnostics();
```

#### `reset()`

Restores default config and clears cached templates.

```ts
mutor.reset();
```

### Server API

Import from `mutorjs/server`:

```ts
import Mutor from "mutorjs/server";
```

#### `renderFile(path, context)`

Renders a template file.

```ts
mutor.renderFile("./views/home.html", context);
```

#### `renderFileAsync(path, context)`

Async file rendering.

```ts
await mutor.renderFileAsync("./views/home.html", context);
```

#### `buildDir(src, destination, context)`

Renders a directory into another directory.

```ts
await mutor.buildDir("./site", "./dist", context);
```

#### `compileDir(src)`

Precompiles matching files in a directory into the cache.

```ts
await mutor.compileDir("./views");
```

#### `invalidateCacheEntry(path)`

Removes a cached file entry. The server renderer resolves the path before removing it.

```ts
mutor.invalidateCacheEntry("./views/home.html");
```

## CLI

Mutor ships with a small CLI.

```sh
mutor <command> <input> [options]
```

### Render A File

```sh
mutor render ./views/home.html --data ./data.json --out ./dist/home.html
```

Without `--out`, the result is printed to stdout.

### Build A Directory

```sh
mutor build ./site --data ./data.json --out ./dist
```

### Compile A Template

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

## Good To Know

- Mutor has no layout inheritance. Compose pages from partials/components and context.
- Includes inherit their parent context when no context is passed.
- The current context is available as `Mutor::$$context`.
- Use async render methods when templates use `Mutor::await`.
- File cache does not watch the filesystem.
- Function calls from context values are disabled by default.
- Array/object/function/class literals are not part of the template language.
- Use `JSON::parse(...)` or pass data through context when you need arrays or objects.
- Auto-escaping only changes strings. Non-string values are returned as they are.
- Missing includes can throw, return empty output, log, or use `onIncludeError`, depending on config.

## License

ISC
