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

Who caused an event and when each step of its life happened are provenance. They are the same question for every event in the system, so they belong to platform metadata the infrastructure attaches to every event's envelope, not to individual contracts. When the infrastructure records them, keep them out of the payload. A `created_by`, `requested_by`, `creator`, `principal_id`, or `recorded_at` on a command or event then duplicates the envelope at best, and at worst lets the caller decide whose name goes on the record.

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

- The platform, not the caller or the domain logic, records the authenticated actor on every event, across every contract, with no opt-in. System processes (schedulers, processors) act under identities of their own, so no event lacks an actor.
- The platform records a time for each step that matters, not only the write to storage: when the request was accepted, when the event was produced, and when it was first recorded. Each is stamped by the part of the platform that observed that step.
- Both survive everything that moves events: replay, re-appending into another stream, restore from backup or archive, mirroring and replication. A store's own message timestamp is usually the time of that particular write, so re-appending an event elsewhere resets it unless the original is carried forward as metadata.
- Consumers that need these values (an access-control system granting the creator membership, an audit view) have a supported way to read them.

Where these values live and how they are encoded is specific to each platform and each store, so this skill names no keys. The platform has to document, in one place, which envelope values it guarantees, where each lives, and what is still missing. Read that before dropping a payload field, and if it does not exist, that is the first gap.

Until those hold, a payload field is the honest place for the value; document it as a stopgap tied to the missing guarantee. If a pure decider needs the value to emit it, the trusted ingress that authenticated the caller stamps it onto the command, overwriting anything the client sent, the same way a host stamps the time; the client's own claim is never trusted.

### Recorded Time Is Not Domain Time

Times about the event itself and times inside the business fact are different values, and only the first kind is provenance:

- **Envelope times**: when the request was accepted, when the event was produced, and when it was first recorded. Assigned by the infrastructure, never by the caller.
- **Occurrence time**: when the producer says the event happened (`occurred_at`), which differs from recorded time for a device that synced hours later, a backfill or import of historical facts, or a webhook carrying the external system's own timestamp. Every event has one, so it is event context in the envelope, kept distinct from recorded time, and recorded as the producer's claim rather than a platform observation.
- **Domain time**: a time that is part of the business fact itself, such as when a scheduled occurrence was due, when a policy change takes effect, or when a measurement was taken. This belongs in the payload.

Name a domain time for what it means (`due_at`, `effective_at`, `measured_at`), never with a generic `occurred_at` or `created_at` that a reader will mistake for an envelope or occurrence time. If an envelope or occurrence time is always the right answer for a use case, there is no domain time to model. See the EDA skill's event record layers for the same split between record metadata, event context, and payload.

A decider's `decide` is pure and has no clock. When a decision needs domain time, it arrives in the command from a source the system trusts (a timer, a host-stamped value, a validated external timestamp), never from a client's unchecked `now`.

An actor field belongs in the payload by the same test: only when it names someone other than the issuer, such as an approver named in a command a system process issues on their behalf. If the value is always the actor that caused the event or one of the envelope times, it is provenance. No linter catches this; it has to be checked in review.

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
- Does any command or event copy who caused it or when it was accepted, produced, or recorded into the payload, while the platform already guarantees those on every event's envelope? If the infrastructure does not guarantee them yet, is that the gap being fixed?
- Does any command let the caller supply its own identity?
- Is every payload time a domain time named for its meaning, distinct from the envelope times?
- Does the creation event carry every fact that is only knowable at creation time, even if later changes to those facts are owned elsewhere?
- Does any event represent a fact the aggregate does not own, duplicating another system's source of truth?
- Are faults modeled as a `oneof` of specific types rather than a generic error string or code?
- Do comments add information the schema cannot express, instead of restating field names?
