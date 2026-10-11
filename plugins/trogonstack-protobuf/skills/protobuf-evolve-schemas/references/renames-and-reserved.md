# Renames, Type Changes, and Reserved Fields

Use this reference when renaming a field, message, or enum value, when changing a field's type, or when reviewing a diff that does either.

## A Field Rename Keeps the Number and Type

`buf breaking`'s `FIELD_SAME_NAME` (in `FILE`, `PACKAGE`, and `WIRE_JSON`) flags any field rename; run it instead of tracing renames by eye. What the tool cannot tell you is what to do once it fires: a rename is binary-compatible (the wire format encodes field numbers, not names) but breaks JSON keys and generated-code identifiers, so whether to proceed is a judgment call, not a lint failure to silence.

The part the tool does not check at all: reserving the old name. A rename is not a deletion, so nothing forces this, but leaving the old name free lets a later field reuse it for a different meaning, confusing anyone reading the history or anything that stored the old name:

```protobuf
// After: renamed title -> name. The old name is reserved so nothing
// reintroduces "title" with another meaning, even though buf breaking
// has no rule requiring this (the field still exists, just renamed).
message Project {
  reserved title;
  string name = 1;
}
```

If a rename is still necessary (the old name was wrong, or collided with other vocabulary per the protobuf-design-messages skill), treat the `FIELD_SAME_NAME` finding as a breaking change requiring the same coordination as any other: a new package version, or a deliberate opt-out in CI for a pre-release package (see [references/ci-and-governance.md](ci-and-governance.md)).

Reserved names in these examples use editions syntax, a bare identifier. In proto2 and proto3 files the name is quoted (`reserved "title";`). Field and enum-value names can be reserved; message names cannot, which matters for the review question below.

## An Enum Value Rename Breaks JSON Too

Enum values serialize to JSON by name, not by number. `ENUM_VALUE_SAME_NAME` (`FILE`, `PACKAGE`, `WIRE_JSON`) flags this the same way `FIELD_SAME_NAME` flags a field rename; the same reserve-the-old-name judgment call applies:

```protobuf
enum ProjectState {
  reserved PROJECT_STATE_DONE;
  PROJECT_STATE_UNSPECIFIED = 0;
  PROJECT_STATE_COMPLETED = 1;  // renamed from DONE
}
```

## A Type Change Never Reuses the Old Field Number

`FIELD_SAME_TYPE` (`FILE`, `PACKAGE`) flags a field whose type changed at its existing number. The fix is mechanical and the tool verifies it: allocate a new field number for the new type, and reserve the old number so `FIELD_NO_DELETE_UNLESS_NUMBER_RESERVED` (`WIRE`, `WIRE_JSON`) does not also fire for silently dropping the old one. Reserve the old name too, unless the new field reuses it at the new number (reserving a name still in use does not compile):

```protobuf
// After: owner_id becomes a wrapper message instead of a bare string.
message Project {
  reserved 9;
  UserId owner_id = 10;
}
```

Without the reservation, a future field at number 9 would be silently misinterpreted by any old binary still holding a message serialized under the old schema, which is exactly the class of bug `reserved` exists to prevent, and exactly what `FIELD_NO_DELETE_UNLESS_NUMBER_RESERVED` is there to catch before it ships.

## Never Reuse a Reserved Number, Even Much Later

`RESERVED_MESSAGE_NO_DELETE` and `RESERVED_ENUM_NO_DELETE` (all four categories) flag removing a `reserved` statement. Removing it to "free up" the number for an unrelated field defeats the entire purpose: any message serialized under the old schema that still exists anywhere (a queue, a log, a backup, a long-lived client) will be misinterpreted as having the new field's meaning at the old number. There is no judgment call here beyond "don't"; treat a finding on these rules as a bug in the change, not a candidate for an opt-out.

(Run `buf breaking` first: it catches the rename, type change, deletion, and removed-`reserved` findings above. The questions below are what it cannot check.)

## Review Questions

- Does a flagged rename or type change have the old name or number actually `reserved`, not just a plan to deal with the break later?
- Does the diff rename a message? Message names cannot be reserved, so nothing in `buf breaking` will catch a dangling reference; the plan has to cover every consumer that names the type by hand: generated code, `google.protobuf.Any` type URLs, and anything that stores the full name.
- Is a flagged break actually acceptable here, given this package's real consumers and its versioning stage?
