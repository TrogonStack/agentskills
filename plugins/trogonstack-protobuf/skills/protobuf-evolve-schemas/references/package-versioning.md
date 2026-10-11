# Pre-Release Package Versioning

Use this reference for the versioning progression a package's name signals, and when a breaking change needs a new package version rather than living inside the current one.

## The Progression

`buf lint`'s `PACKAGE_VERSION_SUFFIX` rule (part of `STANDARD`) already requires the package name to end in a valid version segment; run the tool instead of checking the format by hand. What it cannot tell you is which stage a package should be at, or when to move to the next one. In practice, most packages move through:

```text
example.projects.v1alpha1  ->  example.projects.v1beta1  ->  example.projects.v1
```

| Suffix | Signals |
|---|---|
| `v1alpha1`, `v1alpha2`, ... | Actively changing shape; breaking changes expected and do not require a new package |
| `v1beta1`, `v1beta2`, ... | Converging on a stable shape; breaking changes are costlier and should be rarer |
| `v1` | Stable; a breaking change here is not a continuation of `v1`, it is `v2` |

## A Breaking Change in a Stable Package Means a New Package Version

Once a package has shipped as `v1`, consumers depend on its current shape. A breaking change to `v1` does not get folded into `v1` after the fact; it produces a new package, `v2`, that coexists with `v1` for as long as `v1` still has consumers:

```protobuf
// example/projects/v1/project.proto keeps its current, stable shape.
package example.projects.v1;

message Project {
  ProjectId project_id = 1;
  string name = 2;
}
```

```protobuf
// example/projects/v2/project.proto carries the breaking change.
// v1 is untouched and keeps serving its existing consumers.
package example.projects.v2;

message Project {
  ProjectId project_id = 1;
  string display_name = 2;  // renamed from `name`, which is why this is v2
}
```

This is the same principle as the reserved-number rule in [references/renames-and-reserved.md](renames-and-reserved.md) applied at the package level: the old shape (`v1`) is never mutated out from under its consumers; a new, separately versioned shape (`v2`) exists alongside it instead.

## Review Questions

- Does the package name's version suffix match its actual stability (alpha/beta churn versus a frozen `v1`)?
- Does a proposed breaking change target a pre-release package (fine, within reason) or a stable one (needs a new package version instead)?
- If a new major package version was introduced, is the old one left untouched rather than also being modified?
