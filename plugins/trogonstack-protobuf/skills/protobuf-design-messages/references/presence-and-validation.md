# Presence and Validation

Use this reference when deciding whether a field should be required, writing a `buf.validate` constraint, or distinguishing a schema-checkable invariant from one that belongs in the service.

## Presence in Editions

Protobuf Editions (2023, 2024) replace proto2's `required`/`optional` labels and proto3's implicit-presence-by-default with a per-field feature, `features.field_presence` (see [protobuf.dev: Editions Features](https://protobuf.dev/editions/features/)):

| Value | Behavior |
|---|---|
| `EXPLICIT` | The field tracks whether it was explicitly set; an explicitly-set value serializes even if it equals the default. |
| `IMPLICIT` | No presence tracking; the default value never serializes, even if it was explicitly set to it. |
| `LEGACY_REQUIRED` | The field is required for parsing and serialization; this is proto2's `required` behavior carried into Editions for migration. |

## `LEGACY_REQUIRED` Is proto2 `required`, and proto2 `required` Is Discouraged

`LEGACY_REQUIRED` exists so proto2 files with `required` fields can convert to Editions syntax without changing wire behavior. It is not a recommended way to express a new invariant. Protobuf's own guidance on `required` fields states it plainly ([protobuf.dev: Dos and Don'ts](https://protobuf.dev/programming-guides/dos-donts/)):

> "Required fields are considered harmful by so many they were removed from proto3 completely. Make all fields optional or repeated. You never know how long a message type is going to last and whether someone will be forced to fill in your required field with an empty string or zero in four years when it's no longer logically required but the proto still says it is."

The mechanical reason is schema evolution: once a field is wire-required, removing it (or ceasing to populate it) breaks every consumer that still expects it. A field is never required for its entire service's lifetime; it is required until the day it is not, and `LEGACY_REQUIRED`/`required` makes that day a breaking change instead of a deprecation.

**The trade-off, stated honestly:** some codebases use `LEGACY_REQUIRED` deliberately in pre-release packages (`v1alpha1`, `v1beta1`) specifically to document "this must be set" while the schema is still being designed and removal is cheap. That is a defensible, narrow use. It stops being defensible once the package stabilizes, because removing the field then becomes exactly the breaking change the guidance warns about. Prefer never reaching for it in a stable package.

## `protovalidate` Is the Portable Way to Express Invariants

[protovalidate](https://protovalidate.com) (the `buf.validate` annotations plus a runtime library for Go, JavaScript/TypeScript, Java, Python, and C++) expresses "must be set," range, and cross-field invariants as schema annotations that any language's validator enforces identically:

```protobuf
import "buf/validate/validate.proto";

message CreateProject {
  string name = 1 [(buf.validate.field).required = true];

  AccessPreset access_preset = 2 [
    (buf.validate.field).enum = { defined_only: true, not_in: [0] }
  ];
}
```

`required` means something different depending on the field's presence: on a field with explicit presence, it checks that the field was set at all, even to its default value; on a field with implicit presence (plain proto3 scalars), it checks that the field is not the default value, since there is no other way to observe "was it set." `enum.defined_only` rejects any integer not defined on the enum; combining it with `not_in: [0]` (or `in` listing only the allowed non-zero values) is how to reject `_UNSPECIFIED` explicitly, enforcing principle 3 in [SKILL.md](../SKILL.md) at the schema layer. Message-level cross-field invariants are expressed with CEL expressions under `(buf.validate.message).cel`.

**The caveat that matters:** `buf.validate` annotations are declarations, not enforcement. They do nothing on their own; a `buf.validate.field` constraint is only checked where something in the stack actually constructs and runs a protovalidate validator (typically as an interceptor in a gRPC/Connect server, or an explicit call in application code). A client that never wires up protovalidate can still construct and send a message that violates every constraint in the file. Treat `buf.validate` annotations as documentation of intent that becomes an enforced invariant only where the runtime is actually plugged in, and verify that it is plugged in on every path that accepts untrusted input, not just the one it was first added to.

## Not Every Invariant Belongs in the Schema

Some rules need live state the schema cannot see: "this parent must be a node of type workspace," "this user must have write access to the target project," "this slug must be unique." Those are admission-time rules, checked by the service against the current state of the system, not schema-checkable constraints. Trying to express them as `buf.validate` annotations either fails outright (CEL has no access to a database) or produces a constraint that lies about what it actually checked.

| Checkable in the schema | Needs live state (belongs in the service) |
|---|---|
| A string matches a length or pattern | A slug is unique across existing resources |
| A number falls in a range | A referenced id actually exists |
| A oneof has exactly one field set | The caller has permission to perform the action |
| An enum value is not `UNSPECIFIED` | A parent reference points at a node of the required type |

## Review Questions

- Does any field use `LEGACY_REQUIRED` (or proto2 `required`) in a package that is no longer pre-release?
- Does every invariant that protovalidate can express (presence, range, pattern, enum exclusion, cross-field CEL) have a `buf.validate` annotation instead of living only in a comment?
- For every `buf.validate` annotation, is there a validator actually running on every code path that accepts the message, including from untrusted callers?
- Is any rule that needs live state (uniqueness, existence, authorization) mistakenly expressed, or attempted, as a schema-level constraint instead of a service-level check?
