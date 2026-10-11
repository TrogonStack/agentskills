---
name: protobuf-design-messages
description: "Design or review protobuf message and field definitions: field naming for JSON consumers, identifier and reference value objects, enums, presence, and validation. Use when writing a new .proto message, enum, or field, or reviewing one for naming and shape. Do not use for schema evolution, breaking-change detection, or buf lint/breaking CI setup (use protobuf-evolve-schemas)."
allowed-tools:
  - AskUserQuestion
  - Read
  - Write
  - Shell
---

# Design or Review Protobuf Messages and Fields

Shape messages and fields so the schema itself carries the meaning: what a field points at, what a zero value does, and what the schema can and cannot guarantee.

## Core Principle

A `.proto` file is read by more than the compiler. ProtoJSON consumers see only field names, never types; reviewers see only names and comments, never runtime behavior; everyone who did not write the schema sees only what it says. A field, message, or enum that relies on tribal knowledge to interpret correctly is a defect, not a style nit.

## Principles

Apply them in order. A design that fails an earlier principle makes the later ones moot. Each one names the references that show it in practice; read them when the situation matches, not up front.

### 1. Names Must Survive Schema-less JSON Readers

ProtoJSON keys default to the lowerCamelCase of the field name (`json_name` overrides it, and parsers accept both forms). Many consumers see only the JSON, never the `.proto`, so the field name is the only signal they get. A field whose value points at something stored or owned elsewhere keeps a suffix in its name even when its type already says so.

Read [references/json-field-naming.md](references/json-field-naming.md) when naming a field that is an identifier, a structured reference, or a hierarchy position, or when reviewing a schema for names that read as inline content but are not.

### 2. No Primitive Obsession

Identifiers are single-field wrapper messages, not a bare `string` whose only clue is the field name. References are value objects. Bytes stored out of line pair a storage locator with the digest it is verified against, in one message. Units live in names, and money and instants use the field name patterns the rest of the ecosystem already uses.

Read [references/value-objects.md](references/value-objects.md) when defining an identifier, a reference to another resource, a pointer to out-of-line content, a quantity, a monetary amount, or an instant in time.

### 3. Enums Encode an Exhaustive Choice, Not a Growable Boolean

The zero value is always `<ENUM>_UNSPECIFIED`, and code must reject it rather than resolve it to a default. An omitted choice must never silently widen behavior. Prefer an enum, or a `oneof`, over a boolean that is one feature request away from needing a third state.

Read [references/enums-and-presets.md](references/enums-and-presets.md) when defining an enum, naming its values, or designing a preset/option field such as an access or visibility level.

### 4. Know What the Schema Can and Cannot Guarantee

Editions presence (`EXPLICIT`, `IMPLICIT`, `LEGACY_REQUIRED`) and `protovalidate` constraints are schema-level tools, and each has a limit: `LEGACY_REQUIRED` makes removing the field later a breaking change; `buf.validate` annotations are documentation unless something in the stack actually runs protovalidate. Some invariants cannot be checked from the schema at all because they need live state.

Read [references/presence-and-validation.md](references/presence-and-validation.md) when deciding whether a field should be required, writing a `buf.validate` constraint, or distinguishing a schema-checkable invariant from one that belongs in the service.

### 5. Event-Sourced Contracts Separate Commands, Events, State, and Faults

When the package models a decider (command handler plus event-sourced aggregate), commands are imperative and events are past tense. Facts that exist only at creation time belong on the creation event, even when another system owns everything that happens afterward. An aggregate does not get an event for a fact it does not own.

Read [references/event-sourced-contracts.md](references/event-sourced-contracts.md) when designing commands, events, state, or faults for an event-sourced resource. Skip this reference entirely for plain CRUD-shaped or RPC request/response schemas; it does not apply to them.

### 6. Rename Early When Words Collide With Product Vocabulary

A name that is fine in isolation can collide with a term the product already uses for something else. The cheapest moment to fix a name is before anything generates code from it; a package still under design can be excluded from code generation so the churn costs nothing.

Read [references/naming-collisions.md](references/naming-collisions.md) when a field, message, or package name echoes a term used elsewhere in the product for a different concept.

## Worked Example

Read [references/example-project-schema.md](references/example-project-schema.md) to see every principle applied in one complete `.proto` package: a `Project` resource with an identifier, a hierarchy position, an access preset enum, and the commands and events that create, rename, and archive it.

## Reviewing an Existing Schema

Read [references/review-checklist.md](references/review-checklist.md) when reviewing or auditing message and field definitions. Each item is a symptom; a failing item is a question about the principle behind it, answered in the linked reference.
