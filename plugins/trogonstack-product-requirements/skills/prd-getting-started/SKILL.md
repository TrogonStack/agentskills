---
name: prd-getting-started
description: Initialize a new project with the six default Product Overview Documents (business problem, current state, personas, product description, success metrics, technical requirements). Scaffolds stubs and walks the user through running each section skill in priority order. Use when the user is starting a project and there are no PRD files yet.
allowed-tools:
  - AskUserQuestion
  - Read
  - Write
  - Glob
---

# PRD Getting Started: Initial Product Overview Set

## Purpose

Every project starts with the same six Product Overview Documents. This skill creates them once, in priority order, so the user has a complete baseline they can fill in section by section.

This is the PRD counterpart to `frd-getting-started`.

## Shared Operating Model

Use `requirements-operating-model` when the task involves clarification, existing product context, custom overview ownership, feature handoff, or downstream Blueprint / Work Order impact. Use its clarification pattern instead of creating a separate local questioning workflow.

## When to Use

- A project has just been created and `.trogonai/project/{projectid}/prd/` is empty
- The user wants the full Product Overview baseline before starting any feature work
- The user just produced a rough product idea and wants to translate it into a structured overview

## Resolve Project

1. Determine `projectid` (ask if not supplied; offer choices via `Glob` of `.trogonai/project/*/`).
2. `Glob` `.trogonai/project/{projectid}/prd/*.prd.md`: if any default files already exist, ask whether to **skip existing and only scaffold what's missing**, or **stop** (this skill is for getting started, not for re-initialization). Suggest the individual `prd-*` skills for refining existing files.

## Pick the Working Style

Ask the user which style fits this project:

- **Quick scaffold**: write stubs for all six files immediately, then hand off to the individual `prd-*` skills for the user to fill in at their own pace. Best when the user wants to see the shape first and fill in over time.
- **Guided pass**: walk through the six skills in priority order in this session, running each one back-to-back. Best when the user wants a complete first draft today.

If unclear, default to **Quick scaffold**: it is reversible.

## Priority Order

The six default PODs in recommended discovery order (later docs reference earlier ones):

1. `prd-business-problem`: why this exists at all
2. `prd-current-state`: what is being improved
3. `prd-personas`: who it serves (referenced by every later doc)
4. `prd-product-description`: what the product is
5. `prd-success-metrics`: how success is measured (references personas)
6. `prd-technical-requirements`: what the build must satisfy

## Scaffold the Stubs

For each of the six PODs that does not already exist, write a stub file at `.trogonai/project/{projectid}/prd/{filename}` with the headings present but the bodies marked for completion.

### Stub template for each file

```markdown
# <Section Title>

- **Project:** {projectid}
- **Status:** Stub
- **Last updated:** <YYYY-MM-DD>

> This is a stub. Run the corresponding skill (`<skill-name>`) to author the full content.

<headings from the section's template, each with a placeholder body>
```

Use the exact section template defined by the matching `prd-*` skill (don't invent new headings). Stubs preserve the headings so later edits don't have to recreate them.

| File | Skill | Section Title |
|------|-------|---------------|
| `business-problem.prd.md` | `prd-business-problem` | Business Problem |
| `current-state.prd.md` | `prd-current-state` | Current State |
| `personas.prd.md` | `prd-personas` | Personas |
| `product-description.prd.md` | `prd-product-description` | Product Description |
| `success-metrics.prd.md` | `prd-success-metrics` | Success Metrics |
| `technical-requirements.prd.md` | `prd-technical-requirements` | Technical Requirements |

## Hand-off

After scaffolding, write `.trogonai/project/{projectid}/prd/_getting-started.md`:

```markdown
# Getting Started: Initial Product Overview Set

- **Project:** {projectid}
- **Date:** <YYYY-MM-DD>
- **Style:** <Quick scaffold / Guided pass>

## Scaffolded
- [business-problem.prd.md](./business-problem.prd.md): author with `prd-business-problem`
- [current-state.prd.md](./current-state.prd.md): author with `prd-current-state`
- [personas.prd.md](./personas.prd.md): author with `prd-personas`
- [product-description.prd.md](./product-description.prd.md): author with `prd-product-description`
- [success-metrics.prd.md](./success-metrics.prd.md): author with `prd-success-metrics`
- [technical-requirements.prd.md](./technical-requirements.prd.md): author with `prd-technical-requirements`

## Next Steps
1. Run the six skills in priority order. Personas (3) should be authored before Success Metrics (5).
2. Run `prd-review` once a meaningful chunk is authored.
3. Move on to `frd-getting-started` to scaffold the initial Feature Requirements set.
4. Use `prd-custom-overview` only if the project needs a product-level context document beyond the six defaults.
```

If the user picked **Guided pass**, after writing the summary, recommend running `prd-business-problem` next and stop. The user (or the agent on the next turn) can invoke each subsequent skill.

## Quality Bar

The initialization is complete when:

- All six stub files exist (or were intentionally skipped because they already existed).
- The hand-off summary names the matching skill for each file.
- The user knows the priority order and what to do next.

## Anti-Patterns to Reject

- Trying to fully author every POD in this skill; that bypasses per-section discovery, and each `prd-*` skill is responsible for its own quality bar.
- Re-running against a project that already has all six files; use the individual `prd-*` skills instead.
- Inventing additional sections inside the six defaults; use `prd-custom-overview` when the product needs a separate custom Product Overview Document.

## Related Skills

- `prd-business-problem`, `prd-current-state`, `prd-personas`, `prd-product-description`, `prd-success-metrics`, `prd-technical-requirements`: author each section
- `prd-review`: audit once authoring is meaningful
- `prd-custom-overview`: author additional Product Overview Documents beyond the six defaults
- `frd-getting-started`: translate the overview into the initial Feature Requirements set

## Allowed Tools

- **AskUserQuestion**: resolve `projectid` and the working style
- **Read**: load existing files if partial state was detected
- **Write**: scaffold the six stubs and the hand-off summary
- **Glob**: detect existing files and list candidate projects
