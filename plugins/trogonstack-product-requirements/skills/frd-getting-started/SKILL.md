---
name: frd-getting-started
description: Produce the initial set of Feature Requirements Documents (FRDs) for a new project. Calibrates between an agile first pass (small set of must-have features only) and a waterfall first pass (comprehensive coverage). Asks how many features to draft, identifies them from the project's product overview, and scaffolds each via the FRD template. Use when the user is starting a project and there are no FRDs yet.
allowed-tools:
  - AskUserQuestion
  - Read
  - Write
  - Glob
  - Grep
---

# FRD Getting Started: Initial Feature Set

## Purpose

Projects are not seeded with any default FRDs. This skill walks the user through producing the **initial set** of FRDs once, calibrated to how the user wants to work.

## Shared Operating Model

Use `requirements-operating-model` before translating Product Overview Documents into FRDs. Use its clarification pattern for ambiguous feature boundaries, and follow its source-of-truth and downstream-impact rules.

## When to Use

- A project has been created and `.trogonai/project/{projectid}/frd/` is empty
- The user wants to plan a chunk of features in one pass rather than drafting them ad-hoc
- The user has just produced the Product Overview Documents (`prd-*` files) and wants to translate them into the first FRDs

## Resolve Project

1. Determine `projectid` (ask if not supplied; offer choices via `Glob`).
2. `Glob` `.trogonai/project/{projectid}/frd/**/*.frd.md`: if any FRDs already exist, stop and direct the user to `frd-write`. This skill is for getting started only, not for extending an established set.
3. Read whichever of these files exist for context, in priority order:
   - `personas.prd.md` (roles for user stories)
   - `product-description.prd.md` (the surfaces and components to translate into features)
   - `business-problem.prd.md`, `success-metrics.prd.md` (to prioritize)
   - `current-state.prd.md`, `technical-requirements.prd.md` (to catch status-quo scope and constraints)

If the Product Overview is missing, surface that as a finding and ask whether to proceed or run the relevant `prd-*` skills first.

## Calibrate the Pass

Ask the user how they want to work this first time. Offer two anchors and let them pick or land somewhere in between:

- **Agile first pass**: draft only the **2–4 must-have features** that prove the product can deliver its primary outcome metric. Other features are deferred to later passes.
- **Waterfall first pass**: draft **every feature visible in the Product Description** before any one is built, so engineering can plan and estimate the whole scope.

Then ask:

- Approximate number of FRDs for this pass (the calibration sets a default; the user can override).
- Whether sub-features should be drafted now, or deferred until the parent is built (`frd-split` can do this later).

## Identify the Feature Set

Use the Product Description's components and surfaces as the candidate list. For each candidate, ask:

- Does this pass the **feature unit** definition: one cohesive, independently-buildable capability with a clear user-facing value?
- Is it top-level, or a child of another candidate? Apply the parent-delivers-value rule: parents must work without the child; children must be meaningless without the parent.

Group candidates into:

- **This pass** (in-scope for getting started)
- **Later passes** (deferred)
- **Not a feature** (cross-cutting concerns, non-functional requirements: these belong in `technical-requirements.prd.md`)

Read the grouping back to the user and get explicit confirmation before scaffolding.

## Scaffold the FRDs

For each feature in **this pass**, scaffold a file at:

- Top-level → `.trogonai/project/{projectid}/frd/{slug}.frd.md`
- Child → if the initial pass includes children, write the parent directly as `{parent}/index.frd.md` and write children as `{parent}/{slug}.frd.md`

Each scaffold is a **stub**, not a finished FRD. It contains:

- Title, project, prefix, parent reference, status `Stub`, last-updated.
- A placeholder Overview noting what the feature is meant to cover (one sentence, taken from the Product Description).
- An empty Terminology section.
- A placeholder requirement `REQ-{PREFIX}-001: <to be authored>` with no acceptance criteria, marked `Status: pending`.

After scaffolding, list the files and recommend the user run `frd-write` per feature to fill in the actual requirements. Do **not** try to fully author every FRD here; that loses the per-feature discovery quality.

### Prefix assignment

For each top-level scaffold, ask the user to confirm a 2–4 letter prefix derived from the feature name. `Grep` existing files in the project to ensure uniqueness. For children, the prefix is `{parent-prefix}-{sub}` per the standard rule.

## Stub Template

```markdown
# <Feature Name>

- **Project:** {projectid}
- **Prefix:** {PREFIX}
- **Parent FRD:** <relative path or "none (top-level)">
- **Status:** Stub
- **Last updated:** <YYYY-MM-DD>

## Overview

<One-sentence placeholder taken from the Product Description. Author with `frd-write` to expand into the full 1–2 paragraph overview.>

## Terminology

<To be authored.>

## Requirements

### REQ-{PREFIX}-001: <to be authored>

**Status:** pending

**User Story:** <author with `frd-write`>

**Acceptance Criteria:**
- <author with `frd-write`>

```

The canonical shape comes from the project's Feature Requirements Template when available. Otherwise, use the bundled default at `../frd-write/assets/frd-template.md`. The stub above is the abbreviated form for scaffolding; `frd-write` expands it into the full template.

## Output Summary

After scaffolding, write `.trogonai/project/{projectid}/frd/_getting-started.md` summarizing the pass:

```markdown
# Getting Started: Initial FRD Set

- **Project:** {projectid}
- **Date:** <YYYY-MM-DD>
- **Pass style:** <Agile / Waterfall / Custom>
- **Features in this pass:** <N>
- **Features deferred:** <N>

## This Pass
- [{slug}](./{slug}.frd.md): <one-line>
- [{parent-slug}/{child-slug}](./{parent-slug}/{child-slug}.frd.md): <one-line; nested under parent-slug>

## Deferred to Later Passes
- <feature>: <one-line; why deferred>

## Not a Feature (re-homed elsewhere)
- <item>: belongs in <prd file or other location>

## Next Steps
1. Run `frd-write` per stub to author the full FRD.
2. Run `frd-review` once a meaningful chunk is authored.
3. Run `frd-split` if a feature grows beyond ~5 requirements.
```

## Quality Bar

The pass is complete when:

- Every feature in this pass has a stub file with prefix, parent reference, and a placeholder REQ-001.
- Parents and children follow the parent-delivers-value rule.
- A summary file enumerates the pass, deferrals, and non-features.
- The user has explicit next steps (which `frd-write` calls come next).

## Anti-Patterns to Reject

- Trying to fully author every FRD in one pass; that bypasses per-feature discovery.
- Scaffolding "every component" without applying the feature-unit definition.
- Scaffolding sub-features whose parents have not been scaffolded.
- Re-running this skill against a project that already has FRDs; use `frd-write` instead.

## Related Skills

- `frd-write`: author the full content of each scaffolded FRD
- `frd-split`: decompose a feature that turns out to be an umbrella
- `frd-review`: audit once a pass of authoring is done
- `prd-product-description`: re-check if the candidate feature list reveals product-shape gaps

## Allowed Tools

- **AskUserQuestion**: drive calibration and feature grouping
- **Read**: load Product Overview files for context
- **Write**: scaffold stub FRDs and the getting-started summary
- **Glob**: verify the project is empty of FRDs and list candidates
