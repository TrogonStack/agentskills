# Event-Sourced and Decider Contracts

Use this reference when designing commands, events, state, or faults for an event-sourced resource (a decider: command in, events out, state folded from events). Skip it for plain CRUD-shaped or RPC request/response schemas; it does not apply to them.

## Contents

- Name by Tense
- Who and When Belong to the Envelope, Not the Payload
- Record Creation-Time Facts on the Creation Event, Even When Another System Owns What Happens Later
- Do Not Add an Event for a Fact the Aggregate Does Not Own
- State and Faults
- Comments Document Invariants, Not Mechanics
- Review Questions

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

## Who and When Belong to the Envelope, Not the Payload

Who issued a command and when its events were recorded are provenance. When the infrastructure records them, keep them in the event's envelope (metadata or headers) and out of the payload. A `created_by`, `requested_by`, `creator`, `principal_id`, or `recorded_at` on a command or event then duplicates the envelope at best, and at worst lets the caller decide whose name goes on the record.

Commands are where this goes wrong first. The issuing principal comes from authentication, never from a field the caller fills in; a `creator` on `CreateProject` lets anyone claim to be anyone. Copying it onto the event then turns that claim into a recorded fact.

```protobuf
// Avoid: provenance copied into the payload, and on the command, supplied by the caller.
message CreateProject {
  string name = 1;
  UserId created_by = 2;
}

message ProjectArchived {
  ProjectId project_id = 1;
  UserId archived_by = 2;
  google.protobuf.Timestamp archived_at = 3;
}

// Prefer: the payload carries only domain facts; who and when come from the envelope.
message CreateProject {
  string name = 1;
}

message ProjectArchived {
  ProjectId project_id = 1;
}
```

### The Infrastructure Has to Make It True

Moving provenance to the envelope is only correct when the platform guarantees it, so confirm each of these before removing a payload field, and if any is missing, fix the infrastructure first instead of dropping the only record:

- The runtime, not the caller or the domain logic, writes the authenticated principal onto every event a command produces, under a documented, reserved envelope key.
- The runtime or store records the append time on every event under a documented key.
- Both survive everything that moves events: replay, re-appending into another stream, restore from backup or archive, mirroring and replication. A store's own message timestamp is usually the time of that particular write, so re-appending an event elsewhere resets it unless the original is carried forward as metadata.
- Consumers that need these values (an access-control system granting the creator membership, an audit view) have a supported way to read them.

Until those hold, a payload field is the honest place for the value; document it as a stopgap tied to the missing guarantee. If a pure decider needs the value to emit it, the trusted ingress that authenticated the caller stamps it onto the command, overwriting anything the client sent, the same way a host stamps the time; the client's own claim is never trusted.

### Recorded Time Is Not Domain Time

The time an event was recorded and the time the fact happened in the domain are different values, and only the first is provenance:

- **Recorded time**: when the store appended the event. Envelope, assigned by the infrastructure, never by the caller.
- **Domain time**: when the thing happened, took effect, or was observed: a reading taken by a device that synced hours later, a backfill or import of historical facts, a webhook carrying the external system's own timestamp, the time a scheduled occurrence was due, an effective date for a policy change. This is a domain fact, so it belongs in the payload.

Name a domain time for what it means (`observed_at`, `effective_at`, `due_at`), not with a generic `occurred_at` or `created_at` that a reader will mistake for recorded time. If recorded time is always the right answer for a use case, there is no domain time to model.

A decider's `decide` is pure and has no clock. When a decision needs domain time, it arrives in the command from a source the system trusts (a timer, a host-stamped value, a validated external timestamp), never from a client's unchecked `now`.

An actor field belongs in the payload by the same test: only when it names someone other than the issuer, such as an approver named in a command a system process issues on their behalf. If the value is always the issuing principal or the append time, it is provenance. No linter catches this; it has to be checked in review.

## Record Creation-Time Facts on the Creation Event, Even When Another System Owns What Happens Later

A resource's creation event is the one place certain facts can ever be recorded as "true at the moment this came into existence": where it was placed at birth, what access level it started with. (Who created it and when are provenance, recorded in the envelope as above.) Even if another system owns moves, renames, or access changes afterward, the creation event still owns the initial values, because nothing else will ever again be in a position to say what they were at creation time.

```protobuf
message ProjectCreated {
  ProjectId project_id = 1;
  string name = 2;
  NodeId parent = 3;          // where it was placed at birth
  AccessPreset initial_access_preset = 4;  // access choice at creation, even if access changes later move elsewhere
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
- Does any command or event copy who issued it or when it was recorded into the payload, while the infrastructure already guarantees both in the envelope? If the infrastructure does not guarantee them yet, is that the gap being fixed?
- Does any command let the caller supply its own identity?
- Is every payload time a domain time named for its meaning, distinct from recorded time?
- Does the creation event carry every fact that is only knowable at creation time, even if later changes to those facts are owned elsewhere?
- Does any event represent a fact the aggregate does not own, duplicating another system's source of truth?
- Are faults modeled as a `oneof` of specific types rather than a generic error string or code?
- Do comments add information the schema cannot express, instead of restating field names?
