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

A `.proto` file has audiences that can each break independently: the binary wire, JSON consumers, and generated source code. A change that is safe for one can be a break for another.

## Core Principle

"Non-breaking" has no meaning until you say non-breaking for whom. Check every change against every compatibility surface that applies to the package's actual consumers, not just the one that is easiest to verify.

## Principles

Apply them in order. A design that fails an earlier principle makes the later ones moot. Each one names the references that show it in practice; read them when the situation matches, not up front.

### 1. Know Every Compatibility Surface

Binary wire, JSON, and generated source code each have their own rules for what counts as breaking. `buf breaking` groups its checks into categories (`FILE`, `PACKAGE`, `WIRE_JSON`, `WIRE`) that map onto these surfaces. If anyone consumes JSON, `WIRE` alone is not enough; `FILE` and `PACKAGE` already include every `WIRE_JSON` check.

Read [references/compatibility-surfaces.md](references/compatibility-surfaces.md) when deciding which `buf breaking` category to run, or when a proposed change needs to be checked against more than the wire format.

### 2. A Rename Keeps the Field Number and Type

Renaming a field is binary-compatible (the wire format encodes field numbers, not names) but breaks JSON keys and generated code identifiers. Renaming an enum value breaks JSON too, because enum values serialize by name.

Read [references/renames-and-reserved.md](references/renames-and-reserved.md) when renaming a field, a message, or an enum value, or when reviewing a diff that does.

### 3. A Type Change Never Reuses a Field Number

Changing a field's type allocates a new field number and reserves the old one; the old name is reserved too unless it keeps pointing at the new number. A reserved number or name is never reused, ever.

Read [references/renames-and-reserved.md](references/renames-and-reserved.md) for the `reserved` syntax and worked examples.

### 4. Run `buf breaking` in CI, With an Explicit Opt-Out for Intentional Breaks

Detect breaks automatically rather than by review alone. When a break is intentional in a pre-release package, make the exception a reviewable, visible decision (for example a PR label that skips the breaking job for that PR) instead of permanently weakening the `buf breaking` configuration for the whole package.

Read [references/ci-and-governance.md](references/ci-and-governance.md) for the `buf breaking` invocation, the local git-hook caveat, and how to scope an intentional-break exception.

### 5. Pre-Release Packages Version Instead of Breaking Silently

A package name's last component signals its stability (`v1alpha1` -> `v1beta1` -> `v1`, per buf's `PACKAGE_VERSION_SUFFIX` lint rule). A stable package (`v1`) that needs a breaking change gets a new package version, not a break inside the existing one.

Read [references/package-versioning.md](references/package-versioning.md) for the versioning progression and when a breaking change forces a new package version versus living inside the current pre-release one.

## Worked Example

Read [references/example-schema-evolution.md](references/example-schema-evolution.md) to see a field rename, a type change, and a package version bump applied to one schema, each handled the compatible way.

## Reviewing a Proposed Schema Change

Read [references/review-checklist.md](references/review-checklist.md) when reviewing a diff to an existing `.proto` file. Each item is a symptom; a failing item is a question about the principle behind it, answered in the linked reference.
