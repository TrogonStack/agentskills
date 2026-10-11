# Review Checklist

Use this reference when reviewing a diff to an existing `.proto` file.

- [ ] `buf format -d --exit-code`, `buf lint` (`STANDARD`), and `buf breaking` (against the category matching this package's actual consumers) all pass

Each remaining item is a symptom of a principle the tools cannot check, not a rule on its own. When an item fails, read the linked reference and judge the change by the principle behind it; a justified exception passes, a compliant change that misses the point does not.

## Compatibility Surfaces ([compatibility-surfaces.md](compatibility-surfaces.md))

- [ ] The `buf breaking` category actually matches this package's consumers (binary-only vs. JSON vs. generated source), not just whichever category happens to pass

## Renames and Reserved Fields ([renames-and-reserved.md](renames-and-reserved.md))

- [ ] A rename or type change flagged by `buf breaking` has its old name or number actually `reserved`, not just a plan to deal with it later
- [ ] A renamed message has every consumer that names it by hand covered (message names cannot be `reserved`, so `buf breaking` cannot catch a dangling reference): generated code, `google.protobuf.Any` type URLs, anything storing the full name
- [ ] A flagged break is actually acceptable here, given the package's real consumers and versioning stage

## CI and Governance ([ci-and-governance.md](ci-and-governance.md))

- [ ] No package's breaking-change check was permanently disabled or weakened to let one change through
- [ ] An intentional break carries the `buf skip breaking` label, reviewed and applied per PR, not a standing exemption
- [ ] Any package excluded from breaking-change checks is confirmed to have no consumers on any surface (generated code, JSON, binary)

## Package Versioning ([package-versioning.md](package-versioning.md))

- [ ] The package's version suffix (`v1alpha1`, `v1beta1`, `v1`, ...) matches its actual stability
- [ ] A breaking change to a stable (`v1`+) package produced a new package version instead of mutating the existing one
- [ ] The previous package version was left untouched after a new one was introduced
