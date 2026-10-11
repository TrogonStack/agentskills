# Event-Sourced and Decider Contracts

Use this reference when designing commands, events, state, or faults for an event-sourced resource (a decider: command in, events out, state folded from events). Skip it for plain CRUD-shaped or RPC request/response schemas; it does not apply to them.

## Name by Tense

Commands are imperative, because a command is a request that something happen and might be refused. Events are past tense, because an event is a fact that already happened and cannot be refused after the fact:

```protobuf
// Commands: imperative, a request to act.
message CreateProject { ... }
message RenameProject { ... }
message ArchiveProject { ... }

// Events: past tense, a fact that already happened.
message ProjectCreated { ... }
message ProjectRenamed { ... }
message ProjectArchived { ... }
```

## Record Creation-Time Facts on the Creation Event, Even When Another System Owns What Happens Later

A resource's creation event is the one place certain facts can ever be recorded as "true at the moment this came into existence": who created it, where it was placed at birth, what access level it started with. Even if another system owns moves, renames, or access changes afterward, the creation event still owns the initial values, because nothing else will ever again be in a position to say what they were at creation time.

```protobuf
message ProjectCreated {
  ProjectId project_id = 1;
  string name = 2;
  UserId created_by = 3;
  NodeId parent = 4;          // where it was placed at birth
  AccessPreset initial_access_preset = 5;  // access choice at creation, even if access changes later move elsewhere
  google.protobuf.Timestamp created_at = 6;
}
```

## Do Not Add an Event for a Fact the Aggregate Does Not Own

If moves are owned by a hierarchy/placement service and access changes are owned by an access-control service, the project aggregate does not get a `ProjectMoved` or `ProjectAccessChanged` event just because those facts are interesting to the project. Emitting an event for a fact you do not own creates two systems of record for the same fact and invites them to disagree.

```protobuf
// Avoid: the project aggregate does not own placement; emitting this event
// gives placement two sources of truth (the hierarchy service, and this event).
message ProjectMoved {
  ProjectId project_id = 1;
  NodeId new_parent = 2;
}

// Prefer: the project aggregate only emits events for facts it owns.
// Consumers that need current placement read it from the hierarchy service,
// or from a read model built off the hierarchy service's own events.
```

The exception is the creation-time snapshot above: recording "where it was placed at birth" on `ProjectCreated` is not a claim about current placement, only about the fact of creation, which the aggregate does own.

## State and Faults

The folded state message is named after the resource, not the aggregate pattern:

```protobuf
message Project {
  ProjectId project_id = 1;
  string name = 2;
  AccessPreset access_preset = 3;
  ProjectState state = 4;
}
```

Faults (the decider's rejection outcomes) are a `oneof`, not a generic error string, so a caller can match on the specific reason without parsing text:

```protobuf
message RenameProjectFault {
  oneof fault {
    ProjectNotFound not_found = 1;
    ProjectArchivedFault archived = 2;
    InvalidName invalid_name = 3;
  }
}

message ProjectNotFound {
  ProjectId project_id = 1;
}

message ProjectArchivedFault {
  ProjectId project_id = 1;
}

message InvalidName {
  string reason = 1;
}
```

## Comments Document Invariants, Not Mechanics

Keep comments to the rule a reader cannot infer from the schema (an invariant, a non-obvious lifecycle rule), not a restatement of what the field declaration already says:

```protobuf
// Avoid: restates the type.
// The project id.
ProjectId project_id = 1;

// Prefer: states an invariant the schema cannot express.
// Immutable once set; renaming a project does not change this id.
ProjectId project_id = 1;
```

## Review Questions

- Are commands named imperatively and events named in the past tense?
- Does the creation event carry every fact that is only knowable at creation time, even if later changes to those facts are owned elsewhere?
- Does any event represent a fact the aggregate does not own, duplicating another system's source of truth?
- Are faults modeled as a `oneof` of specific types rather than a generic error string or code?
- Do comments add information the schema cannot express, instead of restating field names?
