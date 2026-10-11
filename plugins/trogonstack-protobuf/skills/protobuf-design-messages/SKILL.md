---
name: protobuf-design-messages
description: "Design or review protobuf message and field definitions: field naming for JSON consumers, identifier and reference value objects, enums, presence, validation, and file and service layout. Use when writing a new .proto file, service, message, enum, or field, or reviewing one for naming and shape. Do not use for schema evolution, breaking-change detection, or buf lint/breaking CI setup (use protobuf-evolve-schemas)."
allowed-tools:
  - AskUserQuestion
  - Read
  - Write
  - Shell
---

# Design or Review Protobuf Messages and Fields

A `.proto` file is read by more than the compiler: ProtoJSON consumers see only field names, never types, and reviewers see only names and comments, never runtime behavior. A field, message, or enum that relies on tribal knowledge to interpret correctly is a defect, not a style nit. Apply the principles below in order; a design that fails an earlier one makes the later ones moot.

## Run buf First

Run `buf format -w` and `buf lint` (with `STANDARD`, buf's default) before anything below, and fix every finding the tool reports. Naming case, file/package/directory layout, enum zero-value and prefix conventions, service and RPC naming, and element ordering are mechanical checks a linter makes faster and more reliably than a manual pass; do not re-check them by hand. The principles below cover what `buf lint` has no way to judge: whether a name means what it says, whether a value is a primitive in disguise, and whether a shape fits the domain.

## Principles

1. **Names must survive schema-less JSON readers.** A field whose value points at something stored or owned elsewhere keeps a suffix in its name even when its type already says so.
2. **No primitive obsession.** Identifiers, references, and out-of-line content pointers are value objects, not bare strings; units, money, and instants follow the ecosystem's naming patterns.
3. **Enums encode an exhaustive choice, not a growable boolean.** The zero value is always `<ENUM>_UNSPECIFIED`, code must reject it, and a boolean that might need a third state should be an enum instead.
4. **Know what the schema can and cannot guarantee.** Editions presence and `protovalidate` constraints are schema-level tools with real limits; some invariants need live state and belong in the service.
5. **Event-sourced contracts separate commands, events, state, and faults.** Commands are imperative, events are past tense, and an aggregate never gets an event for a fact it does not own.
6. **Rename early when words collide with product vocabulary.** The cheapest moment to fix a name is before anything generates code from it.
7. **A file is named after what it defines.** One top-level definition per file in `lower_snake_case`, a service in `<name>_service.proto` named `<Name>Service`, and its own `<Method>Request` and `<Method>Response` for every RPC.

## Load a Reference

| When you are... | Load |
|---|---|
| Naming a field that is an identifier, structured reference, or hierarchy position | [references/json-field-naming.md](references/json-field-naming.md) |
| Defining an identifier, or a reference to another resource | [references/identifiers-and-references.md](references/identifiers-and-references.md) |
| Defining a pointer to content stored out of line | [references/claim-checks.md](references/claim-checks.md) |
| Defining a quantity, a monetary amount, or an instant in time | [references/units-money-and-time.md](references/units-money-and-time.md) |
| Defining an enum, naming its values, or designing a preset/option field | [references/enums-and-presets.md](references/enums-and-presets.md) |
| Deciding whether a field should be required, or writing a `buf.validate` constraint | [references/presence-and-validation.md](references/presence-and-validation.md) |
| Designing commands, events, state, or faults for an event-sourced resource | [references/event-sourced-contracts.md](references/event-sourced-contracts.md) |
| A field, message, or package name echoes a term used elsewhere for a different concept | [references/naming-collisions.md](references/naming-collisions.md) |
| Creating a `.proto` file, adding a `service`, or naming RPC request and response messages | [references/file-layout.md](references/file-layout.md) |
| Wanting to see every principle applied in one complete `.proto` package | [references/example-project-schema.md](references/example-project-schema.md) |
| Reviewing or auditing an existing schema | [references/review-checklist.md](references/review-checklist.md) |
