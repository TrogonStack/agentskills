# Running `buf breaking` in CI, With a Reviewable Opt-Out

Use this reference when setting up or reviewing breaking-change detection in CI, or when a break is genuinely intentional and needs a way through.

## On GitHub, Use `bufbuild/buf-action`

[`bufbuild/buf-action@v1`](https://github.com/bufbuild/buf-action) runs build, format, lint, and breaking checks in one step, and already implements the reviewable opt-out below as a built-in PR label, so there is nothing to hand-roll:

```yaml
name: buf
on:
  pull_request:
    types: [opened, synchronize, reopened, labeled, unlabeled]
permissions:
  contents: read
  pull-requests: write
jobs:
  buf:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: bufbuild/buf-action@v1
```

`breaking_against` defaults to the pull request's base branch (or the commit before the push outside a PR), so it does not need to be set for the common case. Omit `token` (the BSR authentication input) entirely unless this workflow also publishes to the Buf Schema Registry; it has no role in lint, format, or breaking checks.

### The Opt-Out Is the `buf skip breaking` Label, Not a Custom One

`buf-action` skips breaking-change detection on any pull request carrying the label `buf skip breaking`. That already has the property a hand-written opt-out has to be engineered for: the exception is visible on the PR itself, a reviewer has to apply the label before the break ships, and the next PR to the same package is checked normally again because nothing in config was weakened. Do not invent a repository-specific label or a config-level exclusion for this; use the one the action already recognizes.

## Local Use and Non-GitHub CI

Outside `buf-action` (a local check, or a CI system other than GitHub Actions), run the command directly against the base branch using buf's git input syntax (see [buf docs: Breaking usage](https://buf.build/docs/breaking/usage/) and [buf docs: Inputs](https://buf.build/docs/reference/inputs/)):

```bash
buf breaking --against ".git#branch=${BASE_BRANCH}"
```

Set `BASE_BRANCH` to the branch being merged into, never a hard-coded `main`, and make sure that branch's history is actually fetched (a shallow clone of only the PR head has nothing to compare against).

### Local Tip: Breaking Global Git Config

Running `buf breaking` against a git ref clones into a temporary directory and can trip over global git hooks or config that assume a normal working tree (commit signing hooks, credential helpers, or custom templates). If a local run fails for reasons that look like git configuration rather than an actual schema break, isolate it from global config:

```bash
GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_SYSTEM=/dev/null buf breaking --against '.git#branch=main'  # main: the branch you will merge into
```

This is a local troubleshooting step, not something to bake into CI, where the environment is already clean.

## Packages With No Consumers Cost Nothing to Break

A package with no consumers on any compatibility surface has nobody to break, so `buf breaking` findings against it are diff noise rather than breaks. Excluding it from code generation is not evidence of that on its own: a service can already serve it as JSON, or a client can already read its binary payloads, without any generated bindings in this build. Exclude a package from the breaking-change check only after confirming it has no consumers on any surface, and record that confirmation where reviewers will see it. The moment it gains its first consumer (it is wired into code generation, served, or published), treat its current shape as the new baseline and start enforcing `buf breaking` on it like any other package.

## Review Questions

- Does CI run breaking-change detection (`buf-action` or the CLI) against the correct base branch on every pull request?
- Is any package's breaking-change check permanently disabled or weakened, rather than opted out of per-change via the `buf skip breaking` label?
- When a break was intentional, did a reviewer apply the label and approve it on the PR, rather than a silent config change?
- Is a package excluded from breaking-change checks confirmed to have no consumers on any surface (generated code, JSON, binary)?
