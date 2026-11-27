---
name: design-value-objects
description: "Replace primitive obsession with focused value objects that make domain invariants explicit and difficult to bypass. Use when a primitive carries domain meaning, when validation is repeated, or when designing construction, equality, mutation, serialization, and boundary APIs for domain values. Pair with parse-dont-validate when the value is created from untrusted input. Do not use for ordinary data containers, external facts that change over time, or framework-specific schema configuration."
allowed-tools:
 - AskUserQuestion
 - Read
 - Write
 - Bash
---

# Design Value Objects

Give domain concepts their own types instead of passing primitives whose meaning exists only in names, comments, or calling conventions. A value object combines a representation with the stable invariant that makes the value safe to use.

## Core Principle

Primitive obsession occurs when domain concepts such as email addresses, money, identifiers, or bounded quantities remain strings and numbers throughout the system. Replace the primitive with a value object when the concept has an invariant, domain behavior, or a meaningful boundary.

```text
primitive -> constructor/parser -> ValueObject -> domain operation
```

Use [parse-dont-validate](../parse-dont-validate/SKILL.md) when the value comes from untrusted input. Parsing establishes the value object's invariant at the boundary; this skill defines what the value object should guarantee after construction.

## Procedure

1. Name the domain concept currently represented by a primitive.
2. State the stable invariant that every valid instance must preserve.
3. Choose a representation that cannot be confused with neighboring concepts.
4. Restrict construction to a named constructor or parser that establishes the invariant.
5. Make the representation immutable when possible. If mutation is required, expose only invariant-preserving operations.
6. Define equality and serialization in terms of the domain concept, not incidental representation details.
7. Change downstream APIs to accept the value object and remove checks that merely repeat its stable invariant.
8. Keep checks for mutable state and external facts at the operation boundary.

Read [the checklist](references/checklist.md) before considering the design complete.

## Relationship to Existing Guidance

- `design-value-objects` provides the modeling and API procedure.
- `parse-dont-validate` handles construction from untrusted or weakly typed input.
- When a value is required in some cases and meaningless in others, put it on the case that owns it. See [Make Impossible States Unrepresentable](../make-impossible-states-unrepresentable/SKILL.md).

