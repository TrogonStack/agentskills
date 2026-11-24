---
name: parse-dont-validate
description: "Turn untrusted or weakly typed input into a type that carries its invariants, so downstream code can rely on the result without repeating validation. Use when designing parsers, boundary APIs, value objects, domain types, deserialization, configuration loading, or review guidance about validation. Do not use for sanitization that intentionally changes data, validation-only reporting, or choosing a framework-specific schema library."
allowed-tools:
 - AskUserQuestion
 - Read
 - Write
 - Bash
---

# Parse, Don't Validate

Parse external data once into a representation that makes the required invariants explicit. After parsing succeeds, downstream functions should accept the refined type and should not need to re-check the same conditions.

## Core Principle

Validation answers whether a value is acceptable while leaving the caller with the same weak type. Parsing answers by producing a stronger value or an explicit failure. Prefer APIs that make the valid state easy to use and the unparsed state impossible to pass accidentally.

```text
raw input -> parse -> Result<ParseError, RefinedValue> -> domain operations
```

An `Email` value should be constructible only through its parser, and `send_email` should accept `Email`, not `String`. A successful parse is evidence carried by the type, rather than a fact a comment or a prior call must preserve.

## Procedure

1. Identify the boundary where data first enters the trusted part of the system.
2. List the invariants the downstream operation requires, including shape, syntax, ranges, and cross-field relationships.
3. Define a refined value object or domain type whose construction is restricted to the parser.
4. Return an explicit success-or-failure result with actionable parse errors. Do not hide failure in a boolean, assertion, nullable value, or exception unless the surrounding API requires it.
5. Make downstream functions accept the refined type so callers cannot skip the parse step.
6. Remove duplicate validation from downstream code. Keep checks that enforce a different invariant at a different boundary.
7. Test both rejection cases and the guarantee that successful parsing produces a value accepted by downstream operations.

## Review Questions

- Can an unparsed primitive reach code that assumes the invariant?
- Can callers construct the refined type without parsing?
- Does the parser preserve the original input and enough context to explain failure?
- Are repeated checks proving the same invariant, or do they protect a new boundary?
- Is sanitization being confused with parsing? Sanitization transforms data; parsing establishes what the data means.

## Report Format

```markdown
### <boundary or invariant>

- Raw input: <current weak type and source>
- Refined type: <type that carries the invariant>
- Parser: <function or boundary that constructs it>
- Failure: <explicit error/result shape>
- Downstream change: <functions that now accept the refined type>
- Duplicate checks removed: <same-invariant checks, or "none">
```

## Quality Checklist

- [ ] Parsing occurs at the earliest trusted boundary.
- [ ] The refined type carries the invariant in its API.
- [ ] Construction bypasses are restricted or impossible.
- [ ] Failure is explicit and preserves useful context.
- [ ] Downstream APIs accept refined values instead of raw primitives.
- [ ] Repeated checks enforce distinct invariants or have been removed.
