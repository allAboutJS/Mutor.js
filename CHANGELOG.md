# Changelog

All notable changes to Mutor.js will be documented in this file.

## [2.0.0] - 2026-06-07

### Added

- Stable template language
- `if`, `else if`, `else`, `endif`
- `for ... of` loops
- `for ... in` loops
- `break`
- `continue`
- Optional chaining support
- Nullish coalescing support
- Ternary expressions
- Component registration and rendering
- Include system
- Context inheritance for includes
- `Mutor::$$context`
- Async rendering support
- `Mutor::await`
- Namespace system
- Server-side rendering APIs
- Directory build support
- Directory precompilation support
- Cache diagnostics
- Cache invalidation APIs
- CLI support
- Security policy
- Contributing guide
- Code of conduct

### Security

- HTML escaping enabled by default
- Function calls disabled by default
- Dangerous property protection
- Computed property validation
- Guarded expression execution

### Changed

- Documentation established as an official part of the release process
- Components and partial composition preferred over layout inheritance
- Cache management APIs expanded

### Removed

- Experimental and deprecated behaviors from earlier pre-stable releases

### Notes

This release serves as the baseline stable version of Mutor.js going forward.
