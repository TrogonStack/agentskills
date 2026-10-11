# Worked Example: a Project Resource

Use this reference when you want to see every principle in [SKILL.md](../SKILL.md) applied together in one complete, small `.proto` package for a generic `Project` resource: wrapped identifiers, a hierarchy position, a bare-vs-qualified parent distinction, an access preset enum that rejects its unspecified value, a money value object, and a decider's commands, events, state, and faults.

## Contents

- The `.proto` package, in full
- What Each Choice Demonstrates

The package is shown as one listing so it reads top to bottom. On disk, principle 7 puts each top-level definition in its own file under `example/projects/v1alpha1/` (`project_id.proto`, `create_project.proto`, `project_created.proto`, and so on).

```protobuf
edition = "2023";

package example.projects.v1alpha1;

import "buf/validate/validate.proto";
import "google/protobuf/timestamp.proto";

// --- Identifiers and references (principle 2: no primitive obsession) ---

message ProjectId {
  string value = 1 [(buf.validate.field).string.min_len = 1];
}

message UserId {
  string value = 1 [(buf.validate.field).string.min_len = 1];
}

// A hierarchy position. Bare `parent` names a role (principle 1's exception):
// a position can point at a node of any kind, which is the point of the field.
message NodeId {
  string value = 1 [(buf.validate.field).string.min_len = 1];
}

// --- Value objects (principle 2) ---

message Money {
  int64 amount_micros = 1;
  string currency_code = 2 [(buf.validate.field).string.len = 3];  // ISO 4217
}

// --- Enums (principle 3: exhaustive choice, UNSPECIFIED is rejected) ---

enum AccessPreset {
  ACCESS_PRESET_UNSPECIFIED = 0;
  ACCESS_PRESET_PRIVATE = 1;
  ACCESS_PRESET_ORGANIZATION = 2;
  ACCESS_PRESET_PUBLIC = 3;
}

enum ProjectState {
  PROJECT_STATE_UNSPECIFIED = 0;
  PROJECT_STATE_ACTIVE = 1;
  PROJECT_STATE_ARCHIVED = 2;
}

// --- State (folded from events) ---

message Project {
  ProjectId project_id = 1;
  string name = 2;
  NodeId parent = 3;
  AccessPreset access_preset = 4;
  ProjectState state = 5;
  Money budget = 6;
}

// --- Commands: imperative (principle 5) ---

message CreateProject {
  string name = 1 [(buf.validate.field).string.min_len = 1];
  NodeId parent = 2;
  AccessPreset access_preset = 3 [
    (buf.validate.field).enum.defined_only = true,
    (buf.validate.field).enum = {not_in: [0]}
  ];
  Money budget = 4;
}

message RenameProject {
  ProjectId project_id = 1;
  string name = 2 [(buf.validate.field).string.min_len = 1];
}

message ArchiveProject {
  ProjectId project_id = 1;
}

// --- Events: past tense (principle 5) ---

message ProjectCreated {
  ProjectId project_id = 1;
  string name = 2;
  UserId created_by = 3;
  // Placement and access at birth. Later moves and access changes are owned
  // by other systems; this event only records the facts true at creation.
  NodeId parent = 4;
  AccessPreset initial_access_preset = 5;
  Money initial_budget = 6;
  google.protobuf.Timestamp created_at = 7;
}

message ProjectRenamed {
  ProjectId project_id = 1;
  string name = 2;
  google.protobuf.Timestamp renamed_at = 3;
}

message ProjectArchived {
  ProjectId project_id = 1;
  google.protobuf.Timestamp archived_at = 2;
}

// Deliberately absent: ProjectMoved, ProjectAccessChanged. Placement and
// access are owned elsewhere; this aggregate does not duplicate their
// source of truth with its own events for those facts.

// --- Faults ---

message ProjectNotFound {
  ProjectId project_id = 1;
}

message ProjectAlreadyArchived {
  ProjectId project_id = 1;
}

message InvalidProjectName {
  string reason = 1;
}

message RenameProjectFault {
  oneof fault {
    ProjectNotFound not_found = 1;
    ProjectAlreadyArchived already_archived = 2;
    InvalidProjectName invalid_name = 3;
  }
}
```

## What Each Choice Demonstrates

| Choice | Principle |
|---|---|
| `ProjectId`, `UserId`, `NodeId` as wrapper messages | No primitive obsession |
| `NodeId parent` bare, no `_id` suffix | `parent` names hierarchy position, never qualified |
| `Money` with `amount_micros` + `currency_code` | Units and currency travel together, never a bare float |
| `AccessPreset` zero value rejected via `buf.validate.field.enum` | An omitted choice cannot silently widen access |
| `CreateProject.name` marked `required` via `string.min_len = 1` | Schema-checkable invariant expressed portably |
| `ProjectCreated` carries `parent` and `initial_access_preset` | Creation-time facts recorded even though later changes are owned elsewhere |
| No `ProjectMoved` or `ProjectAccessChanged` event | The aggregate does not emit events for facts it does not own |
| `RenameProjectFault` as a `oneof` | Specific, matchable fault types instead of a generic error |
| `package example.projects.v1alpha1` | Pre-release versioning; the protobuf-evolve-schemas skill covers when and how this graduates to `v1beta1` and `v1` |

Note: `example.projects.v1alpha1` does not refer to any real service; it is a placeholder package name for this worked example.
