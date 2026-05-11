# Security Policy

## Supported Versions

Only the current stable release of Mutor.js receives security fixes. If you are running an older version, please upgrade before reporting.

| Version | Supported |
|---|---|
| Current stable | ✅ |
| Older releases | ❌ |

---

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Public disclosure before a fix is available puts every user of Mutor.js at risk. Please report privately using one of the following:

- **GitHub private vulnerability reporting** — go to the [Security tab](https://github.com/allAboutJS/Mutor.js/security) of this repository and click "Report a vulnerability".
- **Direct contact** — reach out to the maintainer, Onah Victor, via GitHub.

### What to Include

A useful report includes:

- A clear description of the vulnerability and what it allows an attacker to do
- A minimal, self-contained reproduction — a template string and context object that demonstrates the issue
- The Mutor.js version and Node.js version you tested against
- Your assessment of severity and exploitability, if you have one

The more specific the reproduction, the faster we can confirm and fix the issue.

---

## What Qualifies as a Security Vulnerability

Mutor.js is a template engine with an explicit security architecture. The following are in scope:

- **Sandbox escape** — any template that can access globals (`process`, `window`, `global`, `require`, `globalThis`) without those values being passed in through the context
- **Prototype pollution access** — any template that can read or traverse `__proto__`, `constructor`, or `prototype` despite the forbidden property list
- **Context scope escape** — any template that can read data not present in the explicitly provided context object
- **Dynamic property injection bypass** — any way to use computed property access to reach a forbidden property without the runtime guard catching it
- **Function invocation bypass** — any way to invoke a function from a template when `allowFnCalls: false`
- **Denial of service via template input** — any template string that causes the compiler or runtime to hang, crash, or consume unbounded memory
- **Arbitrary code execution** — any path by which user-controlled input reaches the `Function` constructor without passing through the full compiler pipeline

If you are unsure whether something qualifies, report it anyway. We would rather investigate a non-issue than miss a real one.

---

## Response Process

Once a report is received:

1. **Acknowledgement** within 3 business days confirming the report was received.
2. **Confirmation** once we have reproduced and validated the issue, with an estimated timeline for a fix.
3. **Fix and release** — a patch release is cut as soon as a correct fix is available. For critical issues, this is prioritized above all other work.
4. **Disclosure** — once the fix is released, we will publish a security advisory on GitHub describing the vulnerability, its impact, and the fix. You will be credited unless you prefer to remain anonymous.

We aim to resolve critical vulnerabilities within 7 days of confirmation and lower-severity issues within 30 days.

---

## Scope

The following are **not** in scope for vulnerability reports:

- Templates that produce unexpected output due to misconfigured `autoEscape` or `allowFnCalls` settings — these are documented behaviors requiring explicit opt-in
- Issues that require the attacker to already have arbitrary code execution on the host system
- Theoretical attacks with no practical reproduction
- Vulnerabilities in your application's context preparation layer (what you pass into Mutor.js is your responsibility)

---

## Credit

Security researchers who responsibly disclose valid vulnerabilities will be credited by name in the GitHub security advisory for the fix, unless they prefer to remain anonymous. We do not currently offer a bug bounty program.

---

*Mutor.js — engineered for correctness, security, and speed.*
*Built by Onah Victor.*
