---
name: protobuf-evolve-schemas
description: "Evolve an existing protobuf schema without breaking consumers: field renames, type changes, reserved numbers and names, buf breaking detection in CI, and pre-release package versioning. Use when changing fields, enums, or packages in a .proto file that already has consumers, or setting up breaking-change CI. Do not use for designing new messages or field naming from scratch (use protobuf-design-messages)."
allowed-tools:
  - AskUserQuestion
  - Read
  - Write
  - Shell
---

# Evolve Protobuf Schemas Without Breaking Consumers

A `.proto` file has audiences that can each break independently: the binary wire, JSON consumers, and generated source code. "Non-breaking" has no meaning until you say non-breaking for whom, so check every change against every compatibility surface that applies to the package's actual consumers, not just the one that is easiest to verify.

## Principles

1. **Know every compatibility surface.** Binary wire, JSON, and generated source code each have their own rules for what counts as breaking; if anyone consumes JSON, `WIRE` alone is not enough.
2. **A rename keeps the field number and type.** It is binary-compatible but breaks JSON keys, generated code identifiers, and, for an enum value, the JSON serialization of the enum too.
3. **A type change never reuses a field number.** It allocates a new number and reserves the old one; a reserved number or name is never reused, ever.
4. **Run `buf breaking` in CI, with an explicit opt-out for intentional breaks.** Scope the exception to the one change that needs it instead of weakening the configuration permanently.
5. **Pre-release packages version instead of breaking silently.** A stable package that needs a breaking change gets a new package version, not a break inside the existing one.

## Load a Reference

| When you are... | Load |
|---|---|
| Deciding which `buf breaking` category to run | [references/compatibility-surfaces.md](references/compatibility-surfaces.md) |
| Renaming a field, message, or enum value | [references/renames-and-reserved.md](references/renames-and-reserved.md) |
| Changing a field's type | [references/renames-and-reserved.md](references/renames-and-reserved.md) |
| Setting up or reviewing breaking-change detection in CI | [references/ci-and-governance.md](references/ci-and-governance.md) |
| Deciding whether a breaking change needs a new package version | [references/package-versioning.md](references/package-versioning.md) |
| Wanting to see a rename, a type change, and a version bump applied to one schema | [references/example-schema-evolution.md](references/example-schema-evolution.md) |
| Reviewing a diff to an existing `.proto` file | [references/review-checklist.md](references/review-checklist.md) |
