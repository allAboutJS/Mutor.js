# Security Policy

## Supported Versions

Only the current stable major release of Mutor.js receives security fixes.

| Version | Supported |
|---|---|
| `3.x` | ✅ |
| `2.x` and older | ❌ |

---

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Please report privately using one of the following:

- **GitHub private vulnerability reporting** — go to the [Security tab](https://github.com/allAboutJS/Mutor.js/security) of this repository and click "Report a vulnerability"
- **Direct contact** — reach out to the maintainer, Onah Victor, via GitHub

### What to Include

A useful report includes:

- a clear description of the issue and what it allows an attacker to do
- a minimal reproduction using a template string or template file plus context
- the Mutor.js version and Node.js version tested
- your estimate of severity and exploitability, if available

---

## Scope

Mutor.js is a constrained template engine, not a full sandbox and not a complete HTML sanitization system.

The following are in scope:

- access to blocked globals or runtime values that should not be reachable from templates
- bypasses of forbidden property protections such as `__proto__`, `constructor`, or `prototype`
- bypasses of computed-property validation
- function invocation when `allowFnCalls: false`
- server-side file resolution escapes outside a configured `rootDir`
- circularity or resolution bugs that allow unexpected file access
- denial-of-service cases that cause the compiler or renderer to hang, crash, or consume unbounded memory with realistic template input
- code execution paths that bypass the intended parser/compiler pipeline

The following are not generally in scope by themselves:

- expected behavior after explicitly opting into unsafe output with `HTML::safe(...)`
- issues caused entirely by application-level context preparation
- reports that require arbitrary code execution on the host first
- purely theoretical attacks with no practical reproduction

---

## Response Process

Once a report is received:

1. acknowledgement within 3 business days
2. confirmation after reproduction and validation
3. fix and release as soon as a correct patch is available
4. public disclosure through a security advisory after the fix ships

We aim to resolve critical vulnerabilities quickly, with severity and exploitability guiding the exact timeline.

---

## Notes

Mutor defaults to escaped output and restricted function calls, but users should still treat template rendering as a security-sensitive surface.

Use `HTML::safe(...)` only for trusted content.

---

*Mutor.js — built for constrained templates and fast rendering.*
