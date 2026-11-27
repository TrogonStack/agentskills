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

An `Email` value should be constructible only through its parser, and `send_email` should accept `Email`, not `String`. A successful parse is evidence carried by the type, rather than a fact a comment or a prior call must preserve. Read [value objects](references/value-objects.md) when choosing the refined type or deciding how it may change after construction.

## Procedure

1. Identify the boundary where data first enters the trusted part of the system.
2. List the invariants the downstream operation requires, including shape, syntax, ranges, and cross-field relationships.
3. Define a refined value object or domain type whose construction is restricted to the parser. Keep it immutable or make every mutation preserve its invariant. Read [value objects](references/value-objects.md) for the relationship between parsing and refined types.
4. Return an explicit success-or-failure result with actionable parse errors. Do not hide failure in a boolean, assertion, nullable value, or exception unless the surrounding API requires it.
5. Make downstream functions accept the refined type so callers cannot skip the parse step.
6. Remove duplicate validation from downstream code. Keep checks for mutable state or external facts that can change after parsing, and perform those checks at the operation boundary.
7. Test both rejection cases and the guarantee that successful parsing produces a value accepted by downstream operations.

If the input tag determines which fields are required, return a variant carrying those fields. See [Make Impossible States Unrepresentable](../make-impossible-states-unrepresentable/SKILL.md).

Read [review guidance](references/review.md) when reviewing an implementation or writing a finding. Read [the checklist](references/checklist.md) before considering the work complete.
