# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [4.1.0] - 2026-06-14

### Added

- Adds support for `Map`-like objects with a `get` method for property access.

## [4.0.0] - 2026-06-03

### Added

- Add async expand and compile exports under `expand-value/async` for resolving promise-backed values.
- Add a `resolve` option for customizing value resolution during property access.
- Add support for nested computed bracket expressions such as `themes[config[setting]].background`.
- Add subpath exports for source modules, node classes, and async helpers.
- Add async examples and test coverage for nested promise resolution.

### Changed

- Update build output to include all TypeScript source entries.
- Update the test suite to use `tsx` with `*.test.ts` files.
- Replace the legacy ESLint configuration with a flat ESLint config.
- Tighten internal TypeScript types by replacing broad `any` usage with `unknown`.

### Fixed

- Resolve values consistently when accessing identifiers, quoted keys, symbols, numbers, ranges, and direct paths.
- Normalize expression node names for number and binary expression parsing.

## [3.0.0] - 2025-12-15

### Added

- Implement bracket-notation support for nested value retrieval in `src/expression.ts`.
- Update `src/compile.ts` to integrate changes for enhanced expression parsing.
- Add corresponding tests in `test/expand-value.ts` to cover new features.

## [2.0.0] - 2025-07-16

### Added

- TypeScript support with full type definitions
- Symbol data type support with `Symbol.for()` parsing
- Number data type support including special values (`NaN`, `Infinity`, `-Infinity`, `-0`)
- Bracket notation property access (`[property]`) optimization
- Negative array index support
- Advanced string segmentation using `Intl.Segmenter`
- Enhanced error handling and validation
- Security improvements with `isSafeKey` validation

### Changed

- Helper function improvements for better null/undefined handling
- Enhanced Unicode support with grapheme cluster handling for strings
- Enhanced `size` helper to return `1` for `null` values
- Improved regular expressions for better parsing accuracy
- Enhanced method detection regex for bracket notation
- Better escape sequence handling in string parsing
- Optimized property access with direct bracket notation support
- Improved helper function resolution and context management

### Fixed

- Prototype pollution prevention with `__proto__`, `constructor`, and `prototype` key filtering
- Proper handling of escaped characters in identifiers
- Better Unicode character boundary detection
- Improved error messages for undefined variables
- Enhanced validation for object property access
- Fixed context preservation for nested function calls
