# Review Checklist

Use this reference when reviewing a diff to an existing `.proto` file.

Each item is a symptom of a principle, not a rule on its own. When an item fails, read the linked reference and judge the change by the principle behind it; a justified exception passes, a compliant change that misses the point does not.

## Compatibility Surfaces ([compatibility-surfaces.md](compatibility-surfaces.md))

- [ ] The change was checked against the `buf breaking` category that matches this package's actual consumers (binary-only vs. JSON vs. generated source)
- [ ] `WIRE_JSON` or stricter is the floor for any package with a JSON-speaking consumer

## Renames and Reserved Fields ([renames-and-reserved.md](renames-and-reserved.md))

- [ ] No field, message, or enum value was renamed without accounting for the JSON/generated-code break that follows
- [ ] No field's type changed at its existing field number; a new number was allocated instead
- [ ] The old field number is `reserved`, and the old name is `reserved` unless it stays attached to the new number
- [ ] No `reserved` statement was removed to reuse a number or name

## CI and Governance ([ci-and-governance.md](ci-and-governance.md))

- [ ] `buf breaking` runs in CI against the correct base branch
- [ ] No package's breaking-change check was permanently disabled or weakened to let one change through
- [ ] An intentional break carries a visible, per-change, reviewed opt-out (e.g. a PR label), not a standing exemption
- [ ] Any package excluded from breaking-change checks is actually pre-codegen, with no consumers yet

## Package Versioning ([package-versioning.md](package-versioning.md))

- [ ] The package's version suffix (`v1alpha1`, `v1beta1`, `v1`, ...) matches its actual stability
- [ ] A breaking change to a stable (`v1`+) package produced a new package version instead of mutating the existing one
- [ ] The previous package version was left untouched after a new one was introduced
