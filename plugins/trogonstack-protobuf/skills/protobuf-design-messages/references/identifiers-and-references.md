# Identifiers and References Instead of Primitives

Use this reference when defining an identifier or a reference to another resource.

## Identifiers Are Wrapper Messages

A bare `string` or `int64` identifier carries its meaning only in the field name. Once that string crosses a function boundary, a log line, or a generic container, the meaning is gone and the compiler can no longer stop a `UserId` from being passed where a `ProjectId` is expected.

```protobuf
// Avoid: primitive obsession. Nothing stops a swap between two string fields.
message TransferOwnership {
  string project_id = 1;
  string new_owner_id = 2;
}

// Prefer: single-field wrapper messages. A ProjectId cannot be passed where a UserId belongs.
message ProjectId {
  string value = 1;
}

message UserId {
  string value = 1;
}

message TransferOwnership {
  ProjectId project_id = 1;
  UserId new_owner_id = 2;
}
```

The field name still carries the `_id` suffix even though the type already says "identifier." See [references/json-field-naming.md](json-field-naming.md) for why: a schema-less JSON reader sees only the key.

## References Are Value Objects, Not Bare Strings

The same reasoning applies to anything that points at a resource with more than one piece of identifying information: pair the fields in a named message instead of scattering them.

```protobuf
// Avoid: two separate fields that only mean something together.
message RunJobResponse {
  string result_bucket = 1;
  string result_key = 2;
}

// Prefer: a reference value object.
message ArtifactRef {
  string bucket = 1;
  string key = 2;
}

message RunJobResponse {
  ArtifactRef result_ref = 1;
}
```

## Review Questions

- Is any identifier a bare `string` or `int64` instead of a single-field wrapper message?
- Does any reference scatter its fields across sibling fields instead of one value object?
