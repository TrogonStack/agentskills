# Worked Example: Evolving a Project Schema

The same kind of `Project` resource as the [protobuf-design-messages worked example](../../protobuf-design-messages/references/example-project-schema.md), carried through real changes: a rename, a type change, and a breaking change in a stable package.

## Starting Point

```protobuf
edition = "2023";

package example.projects.v1alpha1;

message ProjectId {
  string value = 1;
}

message Project {
  ProjectId project_id = 1;
  string title = 2;
  string owner_id = 3;
}
```

## Change 1: a Rename, Handled as a Breaking Change

`title` should have been `name` from the start. Renaming it is wire-compatible but breaks JSON keys and generated accessors (see [references/renames-and-reserved.md](renames-and-reserved.md)). Because the package is still `v1alpha1`, this is an acceptable break, made visible rather than silent:

```protobuf
package example.projects.v1alpha1;

message Project {
  ProjectId project_id = 1;
  string name = 2;  // renamed from `title`; breaking, acceptable pre-v1
  string owner_id = 3;
}
```

In CI, this PR carries the `breaking-change-acknowledged` label (or whatever a given repository's equivalent is) so the `buf breaking` job's finding is reviewed and consciously accepted rather than the check being disabled for the package; see [references/ci-and-governance.md](ci-and-governance.md).

## Change 2: a Type Change, Handled With `reserved`

`owner_id` becomes a wrapper message (`UserId`) instead of a bare string, per [protobuf-design-messages](../../protobuf-design-messages/SKILL.md)'s no-primitive-obsession principle. The new field gets a new number; the old number and name are reserved:

```protobuf
package example.projects.v1alpha1;

message UserId {
  string value = 1;
}

message Project {
  reserved 3;
  reserved "owner_id";
  ProjectId project_id = 1;
  string name = 2;
  UserId owner = 4;
}
```

Field 4 (`owner`) is deliberately not named `owner_id`: since it is now a typed reference rather than an identifier, `owner_ref` or a bare role name would both be defensible depending on whether `UserId` is treated as an id-wrapper or a richer reference; the point demonstrated here is the mechanic (new number, reserved old number and name), not the specific name chosen.

## Change 3: the Package Stabilizes, Then Needs a Breaking Change

The package graduates: `v1alpha1` -> `v1beta1` -> `v1`, and ships as `example.projects.v1`. Later, `name` needs to become two fields (`display_name` and a separate `slug`). That is a breaking change to a stable package, so it does not land inside `v1`; it lands in a new `v2` package, and `v1` is left untouched for its existing consumers (see [references/package-versioning.md](package-versioning.md)):

```protobuf
// example/projects/v1/project.proto: untouched, still serving v1 consumers.
package example.projects.v1;

message Project {
  ProjectId project_id = 1;
  string name = 2;
  UserId owner = 4;
  reserved 3;
  reserved "owner_id";
}
```

```protobuf
// example/projects/v2/project.proto: the breaking change lives here.
package example.projects.v2;

message Project {
  ProjectId project_id = 1;
  string display_name = 2;
  string slug = 3;
  UserId owner = 4;
}
```

## What Each Change Demonstrates

| Change | Principle |
|---|---|
| `title` -> `name` | A rename is wire-safe, JSON/codegen-breaking; acceptable pre-`v1`, made visible via a reviewed CI opt-out |
| `owner_id` (string) -> `owner` (`UserId`) | A type change gets a new field number; the old number and name are `reserved`, never reused |
| `v1alpha1` -> `v1beta1` -> `v1` -> `v2` | A stable package's breaking change produces a new package version instead of mutating the one consumers already depend on |

Note: `example.projects.*` does not refer to any real service; it is a placeholder package name for this worked example.
