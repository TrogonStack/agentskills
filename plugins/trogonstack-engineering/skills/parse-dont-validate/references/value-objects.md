# Parse Results and Value Objects

Parsing and value objects are two parts of the same design. Parsing checks raw input and constructs a refined value object. The value object carries the stable invariant so downstream APIs can require it by type.

**Related skills:** `design-value-objects` is the canonical guide for replacing primitive obsession with domain types. Use this parse skill when deciding how those values are constructed and verified at an input boundary.

```text
raw input -> parser -> Result<ParseError, Email> -> send_email(Email)
```

## Construction

- Restrict construction so callers cannot create an unchecked value.
- Keep the representation immutable when possible.
- If mutation is required, expose operations that preserve the invariant or return a new parsed value.

## Boundary of the Guarantee

The value object guarantees facts established during parsing. It cannot guarantee external state that changes later. A parsed account identifier does not prove that an account still exists, and a parsed purchase amount does not prove that the current balance can cover it. Check those facts at the operation boundary, atomically with the state change when needed.

## Relationship to Validation

Validation can answer whether a raw value is acceptable, but it leaves the caller with the same weak type. Parsing turns that answer into a value whose API records what has been established. Do not remove a check merely because a value was parsed; remove it only when it repeats the same stable invariant.
