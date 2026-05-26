---
name: prd-current-state
description: Draft the Current State of a PRD by documenting the status quo the product improves upon. Drives discovery through what users do today, the workarounds in use, the costs of the status quo, and the alternatives that already exist. Writes to `.trogonai/project/{projectid}/prd/current-state.prd.md`. Use when the user wants to document the baseline before proposing a change.
allowed-tools:
  - AskUserQuestion
  - Read
  - Write
---

# PRD: Current State

## Purpose

Describe the status quo the product is intended to improve upon, so the value of the change is measurable and the "do nothing" baseline is explicit.

## Shared Operating Model

Use `requirements-operating-model` when the current-state baseline depends on existing product context, artifacts, unclear source of truth, or clarification before editing.

## When to Use

- A new PRD needs its baseline documented
- An existing PRD jumps to the solution without describing what exists today
- The user wants to justify investment by quantifying the cost of the current state

## Project Identifier

Before writing, determine the `projectid`:

1. If the user has supplied one, use it verbatim.
2. Otherwise, ask for it once. The `projectid` should be a stable, kebab-case identifier for the product/initiative.
3. Confirm the resolved path before writing: `.trogonai/project/{projectid}/prd/current-state.prd.md`.

If the file already exists, read it first and ask whether to **replace** or **refine** before overwriting.

## Discovery

Ask until all are answered:

1. **What do affected users do today** to get the job done? Walk through the actual steps, tools, and handoffs.
2. **What workarounds are in use?** Spreadsheets, manual processes, copy-paste, side scripts, hiring more humans. Workarounds are the strongest evidence of unmet need.
3. **What alternatives already exist**: internal tools, competitor products, third-party services? Why are they not used, or why are they insufficient?
4. **What does the current state cost?** Time per task, error rate, support load, lost revenue, abandonment, hours of toil. Quantify where possible.
5. **What is intentionally left alone?** Parts of the current state that are acceptable and not in scope to change.

Push back on "there is no current process": there is always a current state, even if it is "users do not do this at all and the business loses the opportunity".

## Quality Bar

The file is complete when:

- The current workflow can be reconstructed by a reader who has never used the product
- At least one quantified cost is present (time, money, error rate, volume)
- Workarounds are named, not implied
- The relationship to existing alternatives (internal or external) is explicit

## Output

Write the complete file to `.trogonai/project/{projectid}/prd/current-state.prd.md` using the template at `assets/current-state-template.md`. Read it, substitute `{projectid}` and the date, and fill in each section from the discovery output.

## Writing Guidance

### Writing approach
- **Reconstruct the workflow concretely.** Walk a reader through the actual steps users take today, in the order they take them, with the tools they touch. Skipping a step hides the friction it causes.
- **Name workarounds and tools by name.** "A spreadsheet" is invisible; "a shared Google Sheet titled `Pipeline Reconciliation v7`" is evidence. Workarounds are the strongest signal of unmet need: give them the page space they deserve.
- **Quantify the cost.** Every cost in the table needs a number with a unit and a source. "A lot" is not a cost.
- **Treat alternatives honestly.** Internal tools, competitors, third-party services: say what they do and *why they fall short for this user*, not why they are bad in general.

### Tone and language
- **Plain language.** Anyone in the company should be able to read this and understand what users do today, without internal jargon.
- **Specific, not impressionistic.** "Slow" is impressionistic; "45 minutes per deal" is specific. The reader should feel the friction.
- **Cost, not complaint.** Translate complaints into observable cost: time, errors, lost revenue, headcount, abandonment.

### Scope
- **Today, not tomorrow.** Resist sliding into the desired state. Future workflow belongs in `prd-product-description`.
- **Baseline, not solution.** Even when a workaround obviously points to a feature, this file documents the workaround: feature proposals live in `prd-product-description` and FRDs.
- **No invention.** Every step, workaround, and cost must come from observed behavior, interviews, dashboards, or tickets. If the source is unknown, ask rather than guess.

## Good vs Bad Example

**Good**

```
## How the job gets done today
1. Rep finishes a Zoom call. Notes are in Zoom chat, a physical notebook, or both.
2. Rep opens Salesforce, finds the right opportunity, copy-pastes notes into the Activity log.
3. Rep manually edits the "Next Steps" field. ~40% of the time this field is skipped because the rep is on their next call.
4. Manager pulls the deal report Monday morning; for deals with blank fields, manager DMs the rep individually.

## Workarounds in use
- Personal Notion / Apple Notes pages: 7 of 12 reps maintain a parallel deal tracker because Salesforce notes are not searchable from mobile.
- Weekly "pipeline review" meeting (60 min, 14 attendees) exists primarily to reconcile what Salesforce says vs what reps actually know.

## Cost of the status quo
| Cost | Measure | Source |
|------|---------|--------|
| Rep time on Salesforce data entry | 45–60 min/day per rep × 22 reps | Time-tracking survey, Mar 2026 |
| Forecast accuracy | 61% (down from 78% YoY) | Salesforce forecast vs actual close |
| Manager toil chasing notes | ~6 hours/week per sales manager | Manager interviews, 4/5 |
```

**Bad**

```
## How the job gets done today
1. Users use Salesforce.
2. They enter their notes.

## Workarounds in use
- People do things outside the system sometimes.

## Cost of the status quo
| Cost | Measure | Source |
|------|---------|--------|
| Time | A lot | Anecdote |
```

The bad version is unfalsifiable: no reader can act on it. The good version names actors, counts steps, and quantifies cost with a source.

## Anti-Patterns to Reject

- "Nothing exists today": there is always a status quo, including doing nothing.
- "It's slow": push for a number.
- "Users complain": push for what they do instead, and the cost of doing it.
- Describing the future state in this file; that belongs in `prd-product-description`.

## Allowed Tools

- **AskUserQuestion**: drive discovery and resolve `projectid`
- **Read**: load the existing file if it exists, to decide replace vs refine
- **Write**: write the file
