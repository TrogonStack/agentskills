---
name: prd-review
description: Review Product Overview Documents for completeness, clarity, source-of-truth conflicts, module-boundary drift, and likely downstream FRD / Blueprint / Work Order impact. Reads the default and custom files under `.trogonai/project/{projectid}/prd/` and writes a review. Use when the user asks to review, audit, critique, or sanity-check a PRD.
allowed-tools:
  - AskUserQuestion
  - Read
  - Write
  - Glob
  - Grep
---

# Review a Product Requirements Document

## Purpose

Audit a PRD the way an experienced product reviewer would: surface the gaps that cause planning churn, rework, and post-launch surprises.

## Shared Operating Model

Use `requirements-operating-model` before reviewing. Use it to check module boundaries, source-of-truth conflicts, clarification needs, and likely downstream Blueprint / Work Order impact.

## When to Use

- Review a PRD draft before sharing it for sign-off
- Audit an existing PRD against current state
- Get a second opinion on a spec written by someone else
- Pre-flight a PRD for an engineering planning session

## Project Identifier

Resolve the `projectid` before reading:

1. If the user supplied one, use it verbatim.
2. Otherwise, ask once, or `Glob` `.trogonai/project/*/prd/` to list candidates and confirm.

Expected layout:

```text
.trogonai/project/{projectid}/prd/
├── business-problem.prd.md
├── current-state.prd.md
├── personas.prd.md
├── product-description.prd.md
├── success-metrics.prd.md
└── technical-requirements.prd.md
```

Read whichever files exist. **A missing default file is a finding**, not an error: report it as a Gap in the corresponding section and recommend the matching section skill to author it.

Also read any additional `.prd.md` file in the directory except generated review files. Treat those as custom Product Overview Documents and review them with the custom-document checklist below.

## Review Checklist

Run the PRD against each file. For every item, output one of: **Pass**, **Gap**, **Risk**, **Missing**, **N/A**: with a one-line justification.

### 1. business-problem.prd.md
- [ ] User segment is concrete (role / team / persona), not "users" or "everyone"
- [ ] Pain is stated in user terms, not as a solution
- [ ] "Why now" is answered (trigger, cost of inaction, business impact)
- [ ] Evidence is concrete (data, tickets, interviews, lost deals), not just opinion

### 2. current-state.prd.md
- [ ] Today's workflow can be reconstructed from the file
- [ ] Workarounds in use are named
- [ ] Existing alternatives (internal or external) are addressed
- [ ] At least one quantified cost of the status quo (time, errors, revenue, toil)
- [ ] Parts of current state explicitly left alone are listed

### 3. personas.prd.md
- [ ] At least one primary persona with role, job to be done, and constraints
- [ ] Each persona has its own definition of success (not just the business's)
- [ ] Primary vs secondary is explicit
- [ ] At least one excluded persona is named
- [ ] Personas are distinguishable by behavior or context, not just label

### 4. product-description.prd.md
- [ ] One-liner names a persona, an action, and an outcome
- [ ] Surfaces (web / mobile / CLI / API / etc.) are listed
- [ ] Major components are named in product terms, not as an internal service inventory
- [ ] How the pieces fit together is shown (flow or short diagram)
- [ ] Primary user happy-path flow is concrete enough to storyboard
- [ ] At least three explicit "is NOT" boundaries

### 5. success-metrics.prd.md
- [ ] Exactly one primary outcome metric
- [ ] Each metric has baseline, target, timeframe, and source
- [ ] Leading indicators are listed
- [ ] At least two guardrail metrics with thresholds
- [ ] Per-persona success metrics present
- [ ] Instrumentation status is stated; any missing instrumentation has an owner
- [ ] Decision rules state what result triggers what action

### 6. technical-requirements.prd.md
- [ ] Performance targets are per user action with percentiles and conditions
- [ ] Scale targets cover launch and 12 months
- [ ] Reliability is stated as an SLO with a measurement window
- [ ] Security covers authn, authz, and data classification
- [ ] Privacy / compliance regimes are named, not implied
- [ ] Integration contracts and failure semantics are specified
- [ ] Platforms, accessibility, and localization are addressed (target or explicit non-constraint)
- [ ] Observability requirements (logs / metrics / traces / alerts) are listed
- [ ] Categories that do not apply are marked as explicit non-constraints, not silently skipped

### 7. Cross-file consistency
- [ ] Personas referenced in `success-metrics.prd.md` exist in `personas.prd.md`
- [ ] Pain in `business-problem.prd.md` is what `product-description.prd.md` claims to address
- [ ] Cost of status quo in `current-state.prd.md` is plausibly closed by the primary outcome metric
- [ ] No "TBD" left unowned in any file
- [ ] Adjective-only statements ("fast", "scalable", "secure", "better") flagged across files

### 8. Custom Product Overview Documents
For every non-default `.prd.md` file:
- [ ] The title and purpose explain why this document exists beyond the six defaults
- [ ] The scope is product-level why/what, not FRD acceptance criteria or engineering design
- [ ] The document names which default PRD owns any overlapping material
- [ ] The document names its parent or sibling relationship when it belongs to a larger custom overview context
- [ ] Sources, owners, or open questions are named for claims that reviewers may challenge
- [ ] The document is not a "miscellaneous" bucket

### 9. Operating model and downstream impact
- [ ] Product-level facts have one clear source of truth
- [ ] Product Overview content does not drift into FRD acceptance criteria, Blueprint architecture, or Work Order planning
- [ ] Changes likely to affect FRDs, Blueprints, or Work Orders are called out for downstream follow-up
- [ ] Open questions are framed with the shared clarification pattern when they block requirements quality

## Output

Write the review to `.trogonai/project/{projectid}/prd/review.prd.md` using this structure:

```markdown
# PRD Review

- **Project:** {projectid}
- **Reviewed:** <YYYY-MM-DD>
- **Overall verdict:** <Ready / Ready with revisions / Not ready>

## Top Findings
1. <highest-impact gap or risk>
2. <next>
3. <next>

## File-by-file Results

### business-problem.prd.md
- Status: Present / Missing
- Pass / Gap / Risk: <one line>
- Fix path: run `prd-business-problem` if changes needed

### current-state.prd.md
- ...

### personas.prd.md
- ...

### product-description.prd.md
- ...

### success-metrics.prd.md
- ...

### technical-requirements.prd.md
- ...

### Cross-file consistency
- ...

### Custom Product Overview Documents
- ...

### Operating Model and Downstream Impact
- Source of truth: Pass / Gap / Risk: <one line>
- Module boundaries: Pass / Gap / Risk: <one line>
- Likely downstream follow-up: <none / affected FRDs, Blueprints, or Work Orders by human-readable name>

## Required Revisions (blockers)
- <must fix before sign-off>: fix with `<skill-name>`

## Recommended Revisions (non-blockers)
- <should fix, not blocking>: fix with `<skill-name>`

## Suggested Questions for the Author
- <question that exposes an assumption>
```

If a previous review file exists at the same path, overwrite it.

## Verdict Rubric

- **Ready**: no gaps in `business-problem`, `personas`, `success-metrics`, `technical-requirements`; minor wording only.
- **Ready with revisions**: gaps exist but the path to fix is clear and small; for each gap, name the section skill (`prd-business-problem`, `prd-current-state`, `prd-personas`, `prd-product-description`, `prd-success-metrics`, `prd-technical-requirements`) to run.
- **Not ready**: problem framing, success metrics, or personas are missing or solution-shaped. The PRD cannot be planned against as written.

## Key Principles

- **Surface gaps, do not rewrite.** Point to what is missing and why it matters; let the author fix it.
- **Cite the file.** Every finding references the file it came from.
- **Distinguish blockers from polish.** Required vs recommended must be obvious.
- **Be specific.** "Metric is vague" is not feedback; "`success-metrics.prd.md` primary metric 'better onboarding' has no baseline, target, or measurement source" is.
- **Always recommend the fix path.** Each gap maps to one section skill.

## Related Skills

- `prd-business-problem`, `prd-current-state`, `prd-personas`, `prd-product-description`, `prd-success-metrics`, `prd-technical-requirements`, `prd-custom-overview`

## Allowed Tools

- **AskUserQuestion**: resolve `projectid` if not supplied
- **Read**: load each PRD file
- **Glob / Grep**: list projects and locate files
- **Write**: write the review file
