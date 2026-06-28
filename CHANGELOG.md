# Changelog

All notable changes to Mutor.js will be documented in this file.

## [3.0.5] - 2026-06-28

### Changed

- Regex-based escape detection now uses greedy matching to capture complete mutor includes and html safe function calls.

## [3.0.4] - 2026-06-27

### Changed

- Removed CLI `compile` command. This is a breaking change, but it won't affect any existing usage, as there was no one using it anyway.
- Override `invalidateTemplateCacheEntry` behavior in server instance to resolve paths to their absolute forms before invalidating the cache

## [3.0.2] - 2026-06-17

### Changed

- Root package exports are now narrower in both `mutorjs` and `mutorjs/server`
- Instead of re-exporting all enums and types, the public entry points now export only `MutorConfig` and `PartialMutorConfig`

## [3.0.1] - 2026-06-17

### Added

- Validation that custom `openingTag` and `closingTag` delimiters do not overlap

### Changed

- Comment syntax is now fixed to `#` and no longer configurable through delimiters
- Internal server code comments and method documentation were clarified

## [3.0.0] - 2026-06-17

### Added

- Official synchronous v3 release line
- Layout support through `{{# layout ... }}`, `{{# use ... }}`, and `{{ ::slot }}`
- `::prop` shorthand alias for Mutor-specific namespace members such as `::include`, `::slot`, and `::$$context`
- `break` and `continue` control-flow tags inside loops
- `addLayout(...)` for in-memory layout registration
- `addLayoutFromPath(...)` for loading a layout from disk
- `addLayoutsInDir(...)` for recursive file-based layout registration
- `invalidateLayoutCacheEntry(...)` for server layout cache invalidation
- Expanded client and server regression coverage, including file resolution tests

### Changed

- Documentation rewritten to match the v3 API surface
- File rendering now resolves top-level relative paths correctly with `rootDir`
- Root-constrained include checks now use safer relative-path validation
- `buildDir(...)` now rejects destinations that are the same as, or nested inside, the source directory
- Server directory workflows now register layouts from matching files
- Layout files are skipped from build output by default unless explicitly kept
- Auto-escaping and runtime behavior are now documented more precisely

### Removed

- Async rendering APIs and async-template documentation
- v2-era documentation claiming layouts were unsupported

### Security

- Retained guarded expression execution model
- Retained blocked dangerous property access
- Retained default restriction on function calls from context values
- Retained rootDir enforcement for server-side includes

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
