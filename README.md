# Mutor.js

> **The Secure, AST-Powered Template Engine.**

Most template engines force a choice: **Extreme Speed** (using unsafe string manipulation and `eval`) or **Total Security** (using slow interpreters). Mutor.js refuses to compromise. By utilizing an Abstract Syntax Tree (AST) to compile templates into pure, optimized JavaScript, Mutor delivers top-tier performance while running in a strictly sandboxed environment. 

Developed by Onah Victor, Mutor is engineered for high-concurrency environments and is efficient enough to run flawlessly on anything from modern cloud infrastructure to legacy 1st-generation core processors.

---

## ⚡ Why Switch to Mutor?

* **Raw Speed**: Surpasses Eta by **1.2x to 5.0x** in raw compiled template execution, often tying with native JavaScript.
* **Security by Design**: Completely sandboxed. Forbidden properties (like `__proto__`) are blocked by default. Arbitrary function execution is locked down.
* **Namespace Operator**: Access built-in JS utilities (Math, JSON, String) safely without polluting the global scope.
* **Precision Whitespace Control**: Clean up your output without messy regex workarounds.
* **Developer-Friendly Error Traces**: Because it's AST-based, errors map directly to line and column numbers.

---

## 💡 A Detailed Example

Mutor handles complex nested logic, data formatting, and whitespace control natively, without requiring arbitrary JS execution.
```hbs
{{# Manage a project list with precision logic and security #}}
<section class="project-board">
  {{~ if projects.length > 0 ~}}
    {{ for item of projects }}
      <div class="card">
        <h3>{{ item.name.toUpperCase() }}</h3>
        <p>Budget: {{ Math::floor(item.budget) }} USD</p>
        
        {{# Securely handle nested logic #}}
        {{ if item.status == "active" }}
           <span class="status-pill">Last Updated: {{ JSON::stringify(item.meta.date) }}</span>
        {{ end }}
      </div>
    {{ end }}
  {{~ else ~}}
    <p>No active projects found in {{ Date::getFullYear() }}.</p>
  {{~ end ~}}
</section>
```

---

## 🏗 Architecture & Pipeline

Mutor isn't just a regex replacer; it's a full compiler.

1. **Tokenize (`src/core/tokenize.ts`)**: Breaks your template string into distinct logical units.
2. **Parse (`src/core/parse.ts` & `src/core/generate-ast.ts`)**: Converts tokens into a secure Abstract Syntax Tree (AST).
3. **Compile (`src/core/compile.ts`)**: Transforms the AST into a highly optimized, "pure" JavaScript function.
4. **Execute**: The compiled function runs within a restricted scope, safely interpolating your context.

---

## 🛠 Core Innovations

### 1. The Namespace Operator (`::`)
Traditional engines either block all JS helpers or give templates full access to your server's global object. Mutor’s Namespace Operator solves this elegantly. Safely tap into built-ins directly in the template:
* `{{ Math::floor(price) }}`
* `{{ JSON::stringify(data) }}`
* `{{ Array::isArray(items) }}`

### 2. Perfect Whitespace Control
Use the configurable whitespace directive (`~` by default) exactly where you need it:
* `{{~ name }}` (Trim left)
* `{{ name ~}}` (Trim right)
* `{{~ name ~}}` (Trim both sides)

### 3. Total Flexibility
Don't like `{{` and `}}`? Change them. Mutor allows you to completely redefine the syntax delimiters (e.g., `<%=` and `%>`) via the configuration object.

---

## 📊 Performance Benchmarks

Mutor is built to dominate in scale and high-load scenarios.

| Metric | Mutor.js | Eta | EJS | Nunjucks / Handlebars |
| :--- | :--- | :--- | :--- | :--- |
| **Full Pipeline (Compile + Exec)** | **2nd Overall** | 1st | Distant 3rd | Slower |
| **Raw Execution (Compiled)** | **Top Tier (1.2x - 5x lead)** | Competitive | Significantly Slower | Significantly Slower |

*Memory Management*: Mutor includes a built-in LRU cache (defaulting to 50MB) to ensure frequently used templates execute instantly without causing memory leaks.

---

## ⚙️ Out-of-the-Box Configuration

Mutor works instantly, but exposes deep controls for enterprise needs.
```typescript
export const defaultConfig: MutorConfig = {
  build: {
    include: new Set([".html", ".txt"]),
    exclude: new Set(["node_modules", ".git"]),
  },
  autoEscape: true,
  allowedProps: new Set(),
  forbiddenProps: new Set(["__proto__", "constructor", "prototype"]),
  allowFnCalls: false, // Prevents unintended side effects
  delimiters: {
    closingTag: "}}",
    openingTag: "{{",
    openingTagEscape: "\\",
    whitespaceTrim: "~",
  },
  keepOpeningTagEscapeDelimiter: false,
  cache: {
    active: true,
    maxSize: 50 * 1024 * 1024, // 50MB
  },
};
```

---

## ⚖️ Is Mutor Right For You? (Honest Trade-offs)

**When to use Mutor:**
* You are rendering user-generated content and cannot risk XSS or prototype pollution.
* You need near-native execution speed for high-traffic applications.
* You want clean, debuggable templates that fail with exact line/column numbers.
* You need to pre-compile entire view directories ahead of time.

**When NOT to use Mutor:**
* You require the ability to write complex, arbitrary JavaScript directly inside your HTML. Mutor's sandbox will block this.
* You only need simple string replacement for a tiny script where initializing an AST engine is overkill.

---

## 🚀 Coming Soon: The CLI Tool

Mutor's core features are ready, and the CLI is currently in active development to streamline your CI/CD pipelines. 
```bash
# Preview CLI Commands
mutor compile ./views/index.html --out ./dist
mutor build ./views --max-mem 50MB
```
