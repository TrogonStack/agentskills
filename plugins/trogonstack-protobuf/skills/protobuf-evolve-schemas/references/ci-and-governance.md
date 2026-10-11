# Running `buf breaking` in CI, With a Reviewable Opt-Out

Use this reference when setting up or reviewing breaking-change detection in CI, or when a break is genuinely intentional and needs a way through.

## The Command

Compare the working tree against the base branch using buf's git input syntax (see [buf docs: Breaking usage](https://buf.build/docs/breaking/usage/) and [buf docs: Inputs](https://buf.build/docs/reference/inputs/)):

```bash
buf breaking --against '.git#branch=main'
```

Run this in CI on every pull request, against whatever branch the PR targets, so a break is caught before merge rather than discovered by a downstream consumer after release.

## Local Tip: Breaking Global Git Config

Running `buf breaking` against a git ref clones into a temporary directory and can trip over global git hooks or config that assume a normal working tree (commit signing hooks, credential helpers, or custom templates). If the local run fails for reasons that look like git configuration rather than an actual schema break, isolate it from global config:

```bash
GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_SYSTEM=/dev/null buf breaking --against '.git#branch=main'
```

This is a local troubleshooting step, not something to bake into CI, where the environment is already clean.

## When a Break Is Intentional

A pre-release package (`v1alpha1`, see [references/package-versioning.md](package-versioning.md)) is explicitly allowed to break while its shape is being designed. The failure mode to avoid is making that exception permanent and invisible: weakening the `buf breaking` configuration for the package (removing it from the checked inputs, or lowering its category) silences every future break in that package too, intentional or not, and nobody reviewing a later PR will know the guardrail is gone.

Prefer an opt-out that is explicit and scoped to the one PR that needs it: a PR label (for example `breaking-change-acknowledged`) that the CI breaking-change job checks for and skips only when present, so:

- The exception is visible in the PR itself, not buried in a config file diff.
- A reviewer has to see and approve the label before the break ships.
- The next PR to this package is checked normally again; nothing was permanently turned off.

```text
# CI job pseudocode: skip only this run, only when a human applied the label.
if pr.has_label("breaking-change-acknowledged"):
    skip buf breaking
else:
    run buf breaking --against '.git#branch=main'
```

The exact mechanism (a label, a required commit trailer, a specific reviewer's approval) matters less than the property it has to preserve: the opt-out is a per-change, reviewed decision, not a standing exemption.

## Pre-Codegen Packages Cost Nothing to Break

A package that is excluded from code generation entirely (nothing in the build consumes its generated bindings yet) has no consumers to break, so `buf breaking` findings against it are not really "breaks," they are just diff noise. It is reasonable to exclude such a package from the breaking-change check altogether until it is wired into code generation for the first time; at that point, treat its current shape as the new baseline and start enforcing `buf breaking` on it like any other package.

## Review Questions

- Does CI run `buf breaking` against the correct base branch on every pull request?
- Is any package's breaking-change check permanently disabled or weakened, rather than opted out of per-change?
- When a break was intentional, is there a visible, reviewed record of that decision on the PR, rather than a silent config change?
- Is a package excluded from breaking-change checks actually pre-codegen, or does it already have consumers?
