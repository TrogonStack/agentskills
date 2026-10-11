# Worked Example: Evolving a Project Schema

Use this reference when you want to see a field rename, a type change, and a package version bump applied to one schema, each handled the compatible way.

The same kind of `Project` resource as the worked example in the protobuf-design-messages skill, carried through real changes: a rename, a type change, and a breaking change in a stable package.

## Contents

- Starting Point
- Change 1: a Rename, Handled as a Breaking Change
- Change 2: a Type Change, Handled With `reserved`
- Change 3: the Package Stabilizes, Then Needs a Breaking Change
- What Each Change Demonstrates

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
  reserved title;
  string name = 2;  // renamed from `title`; breaking, acceptable pre-v1
  string owner_id = 3;
}
```

In CI, this PR carries the `breaking-change-acknowledged` label (or whatever a given repository's equivalent is) so the `buf breaking` job's finding is reviewed and consciously accepted rather than the check being disabled for the package; see [references/ci-and-governance.md](ci-and-governance.md).

## Change 2: a Type Change, Handled With `reserved`

`owner_id` becomes a wrapper message (`UserId`) instead of a bare string, per the protobuf-design-messages skill's no-primitive-obsession principle. The new field gets a new number and the old number is reserved. The name stays `owner_id`, because a reference keeps its suffix for JSON readers who never see the type, so the name is not reserved (reserving a name the message still uses does not compile):

```protobuf
package example.projects.v1alpha1;

message UserId {
  string value = 1;
}

message Project {
  reserved 3;
  reserved title;
  ProjectId project_id = 1;
  string name = 2;
  UserId owner_id = 4;
}
```

The JSON key stays `ownerId`, but its value changes from a string to an object (`{"value": "..."}`), so JSON consumers still break; the new field number protects binary consumers, not JSON ones. That is acceptable here for the same reason as the rename: the package is pre-release and the break is acknowledged in CI.

## Change 3: the Package Stabilizes, Then Needs a Breaking Change

The package graduates: `v1alpha1` -> `v1beta1` -> `v1`, and ships as `example.projects.v1`. Later, `name` needs to become two fields (`display_name` and a separate `slug`). That is a breaking change to a stable package, so it does not land inside `v1`; it lands in a new `v2` package, and `v1` is left untouched for its existing consumers (see [references/package-versioning.md](package-versioning.md)):

```protobuf
// example/projects/v1/project.proto: untouched, still serving v1 consumers.
package example.projects.v1;

message Project {
  ProjectId project_id = 1;
  reserved 3;
  reserved title;
  string name = 2;
  UserId owner_id = 4;
}
```

```protobuf
// example/projects/v2/project.proto: the breaking change lives here.
package example.projects.v2;

message Project {
  ProjectId project_id = 1;
  string display_name = 2;
  string slug = 3;
  UserId owner_id = 4;
}
```

## What Each Change Demonstrates

| Change | Principle |
|---|---|
| `title` -> `name` | A rename is wire-safe, JSON/codegen-breaking; acceptable pre-`v1`, made visible via a reviewed CI opt-out |
| `string owner_id` -> `UserId owner_id` | A type change gets a new field number and the old number is `reserved`; the name stays, because a reference keeps its suffix |
| `v1alpha1` -> `v1beta1` -> `v1` -> `v2` | A stable package's breaking change produces a new package version instead of mutating the one consumers already depend on |

Note: `example.projects.*` does not refer to any real service; it is a placeholder package name for this worked example.
