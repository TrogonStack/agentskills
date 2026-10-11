# Renames, Type Changes, and Reserved Fields

Use this reference when renaming a field, message, or enum value, when changing a field's type, or when reviewing a diff that does either.

## A Field Rename Keeps the Number and Type

The binary wire format encodes field numbers, not field names; a decoder that has never seen the new name still decodes the message correctly as long as the number and wire type are unchanged. JSON and generated code are not so forgiving: the JSON key is the field name (or `json_name`), and generated identifiers are derived from the field name in every target language.

```protobuf
// Before
message Project {
  string title = 1;
}

// After: renamed title -> name. Binary still decodes (field 1 unchanged).
// JSON breaks: a client sending {"title": "..."} now sets nothing, and a
// client reading the response no longer finds a "title" key.
// Generated code breaks: callers of project.title() / project.Title no longer compile.
// The old name is reserved so nothing reintroduces "title" with another meaning.
message Project {
  reserved title;
  string name = 1;
}
```

A rename is a `WIRE_JSON`-category and `FILE`/`PACKAGE`-category break even though it is a `WIRE`-category no-op; see [references/compatibility-surfaces.md](compatibility-surfaces.md). If a rename is still necessary (the old name was wrong, or collided with other vocabulary per the protobuf-design-messages skill), treat it as a breaking change requiring the same coordination as any other: a new package version, or a deliberate opt-out in CI for a pre-release package (see [references/ci-and-governance.md](ci-and-governance.md)).

Reserved names in these examples use editions syntax, a bare identifier. In proto2 and proto3 files the name is quoted (`reserved "title";`). Field and enum-value names can be reserved; message names cannot.

## An Enum Value Rename Breaks JSON Too

Enum values serialize to JSON by name, not by number, so renaming an enum value is a JSON break even though the underlying integer is unchanged:

```protobuf
// Before
enum ProjectState {
  PROJECT_STATE_UNSPECIFIED = 0;
  PROJECT_STATE_DONE = 1;
}

// After: DONE -> COMPLETED. The integer 1 is unchanged, but a JSON consumer
// that was matching the string "PROJECT_STATE_DONE" now sees
// "PROJECT_STATE_COMPLETED" and silently fails to match.
enum ProjectState {
  reserved PROJECT_STATE_DONE;
  PROJECT_STATE_UNSPECIFIED = 0;
  PROJECT_STATE_COMPLETED = 1;
}
```

## A Type Change Never Reuses the Old Field Number

Changing a field's type (for example, a `string` identifier becoming a wrapper message, or an `int32` becoming an `int64` outside the compatible-widening cases documented by protobuf) is a wire-level break if the new wire type differs. Give the new value a new field number, and mark the old number (and, unless the old name is being reused for the new field at the new number, the old name too) `reserved` so nothing ever reuses it:

```protobuf
// Before
message Project {
  string owner_id = 9;
}

// After: owner_id becomes a wrapper message instead of a bare string.
// The old field 9 is reserved, never reused. The name owner_id is not
// reserved because the new field reuses it; reserving it would not compile.
message Project {
  reserved 9;
  UserId owner_id = 10;
}
```

A future reader (or a future engineer who does not know this history) who adds a new field will see the `reserved` statement and knows not to pick number 9 for anything unrelated. Without it, a new field at number 9 would be silently misinterpreted by any old binary still holding a message serialized under the old schema, which is exactly the class of bug `reserved` exists to prevent.

## Never Reuse a Reserved Number, Even Much Later

A `reserved` statement is permanent. Removing it to "free up" the number for an unrelated field defeats the entire purpose: any message serialized under the old schema that still exists anywhere (a queue, a log, a backup, a long-lived client) will be misinterpreted as having the new field's meaning at the old number.

## Review Questions

- Does the diff rename a field or enum value without reserving the old name, or without a plan for the resulting JSON/generated-code break?
- Does the diff rename a message? Message names cannot be reserved, so the plan has to cover every consumer that names the type: generated code, `google.protobuf.Any` type URLs, and anything that stores the full name.
- Does the diff change a field's type at the same field number, instead of allocating a new number and reserving the old one?
- Does the diff remove a `reserved` statement to reuse a number or name?
- Does the diff rename an enum value, and has it been checked against `WIRE_JSON`, not just `WIRE`?
