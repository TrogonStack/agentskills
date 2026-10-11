# Field Names for Schema-less JSON Readers

Use this reference when naming a field that is an identifier, a structured reference to another resource, or a hierarchy position, or when reviewing a schema for names that read as inline content but point elsewhere.

## Why the Field Name Carries the Signal

Protobuf's JSON mapping (ProtoJSON) converts a field name to lowerCamelCase for the JSON key by default; the `json_name` option overrides that, and a conformant parser accepts both the JSON name and the original proto field name on input. See [protobuf.dev: JSON Mapping](https://protobuf.dev/programming-guides/json/).

The type system is invisible to anyone reading only the wire format. A gRPC-Gateway caller, a webhook consumer, a log line, or a frontend that deserializes into a generic object sees `{"project": {"value": "proj_123"}}` and has no way to tell, from that alone, whether `project` is an inline `Project` object or an opaque pointer to one stored elsewhere. The field's type answers that question in the `.proto` file; the field's name has to answer it everywhere else.

## The Suffix Rules

| Shape | Suffix | Example |
|---|---|---|
| Single opaque identifier | `_id` | `ProjectId project_id` -> JSON `projectId` |
| Structured reference (a typed pointer, possibly with more than one field) | `_ref` | `ArtifactRef result_ref`, `CheckoutRef checkout_ref` |
| Hierarchy position (the node a resource is attached to) | none; bare `parent` | `NodeId parent` |
| Kinship (a relation to another resource) | type name plus `_id`; never `parent_id` | `ProjectId project_id`, `SessionId parent_session_id` |

A bare `result` or `project` field reads as inline content. Even though the type (`ArtifactRef`, `ProjectId`) already says it is a pointer, a reader who sees only the JSON key does not see the type, so the key must carry that signal on its own.

```protobuf
// Avoid: the key `project` looks like an inline Project to anyone reading only JSON.
message Task {
  ProjectId project = 1;
}

// Prefer: the key `projectId` tells a schema-less reader this is a pointer, not content.
message Task {
  ProjectId project_id = 1;
}
```

```protobuf
// Avoid: `result` could be inline content or a pointer; the name does not say.
message RunJobResponse {
  ArtifactRef result = 1;
}

// Prefer: the _ref suffix survives even without the schema.
message RunJobResponse {
  ArtifactRef result_ref = 1;
}
```

## The Parent Exception

Hierarchy position is the one case that stays bare. A `parent` field names a role, not a type, because the whole point of a position field is that it can point at a node of any kind. Qualifying it with a type would contradict that:

```protobuf
// Avoid: compounds that do not improve on bare parent.
NodeId parent_id = 1;    // redundant Id suffix on a role name
NodeId parent_node = 1;  // the name repeats what the type already says

// Prefer: bare parent for hierarchy position.
NodeId parent = 1;
```

Kinship between resources is a different relationship and is always qualified with the type, never left bare and never spelled `parent_id`:

```protobuf
// Avoid: ambiguous with hierarchy position, and parent_id has no type.
string parent_id = 1;

// Prefer: the type name says this is kinship, not position.
SessionId parent_session_id = 1;
```

When the identifier is a wrapper message rather than a bare `string`, the `_id` suffix stays on the field name even though the type is already `SessionId`. Consumers of the JSON form often have no schema and see only the key (`parentSessionId`); the key itself has to say the value points at a session. Position needs no such signal, because a parent is never inline content.

This rule and its rationale come from the public straw-hat-team ADR on hierarchy naming: [ADR 6310044131, "Hierarchy position is referenced by a bare parent field"](https://github.com/straw-hat-team/adr/blob/main/src/adrs/6310044131/README.md). Its rule 5 was amended specifically to keep the `_id` suffix on typed kinship fields, for the JSON-reader reason above; read the full ADR for the cross-platform evidence (Google Cloud, AWS, Azure, Kubernetes) behind the bare `parent` convention.

## Review Questions

- Does any field name read as inline content (`project`, `result`, `owner`) while its type is an id or ref wrapper? Rename it with the matching suffix.
- Does any `_id` or `_ref` field have a type that is a bare `string` instead of a wrapper message? See [references/identifiers-and-references.md](identifiers-and-references.md).
- Is `parent` used for anything other than hierarchy position? Rename the kinship use to `parent_<type>_id`.
- Does any field spell kinship as `parent_id` or `parentId` with no type qualifier? That spelling is disallowed under this convention; it reads as a role with no type.
