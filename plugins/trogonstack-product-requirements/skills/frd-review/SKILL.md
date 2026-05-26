---
name: frd-review
description: Review Feature Requirements Documents (FRDs) (single file or full tree) against the Overview / Terminology / Requirements template, source-of-truth rules, module boundaries, downstream impact, and the parent-delivers-value rule for sub-features. Writes a review file. Use when the user asks to review, audit, or sanity-check a feature spec.
allowed-tools:
  - AskUserQuestion
  - Read
  - Write
  - Glob
  - Grep
---

# FRD: Review a Feature Requirements Document

## Purpose

Audit an FRD (or a parent + its nested children) the way an experienced engineer or product lead would in planning: surface the gaps that cause estimation churn, rework after implementation, or bugs found in QA.

## Shared Operating Model

Use `requirements-operating-model` before reviewing. Use it to check module boundaries, source-of-truth conflicts, feature hierarchy, and downstream Blueprint / Work Order impact.

## When to Use

- An FRD draft needs a sanity check before engineering picks it up
- A parent FRD with children needs to be audited as a tree
- A reviewer wants a second pass on someone else's feature spec

## Resolve the Target

1. Determine `projectid` (ask if not supplied; offer choices via `Glob`).
2. Resolve what to review:
   - A specific FRD path → review just that file.
   - A directory (parent with children) → review the parent's `index.frd.md` plus every `*.frd.md` sibling.
   - "Everything under this project" → glob `.trogonai/project/{projectid}/frd/**/*.frd.md`.
3. If `personas.prd.md` exists in the project, read it: user stories should reference its personas.

## Per-FRD Checklist

For each FRD, run every item and mark **Pass**, **Gap**, **Risk**, or **N/A** with a one-line justification.

### 1. Overview
- [ ] One or two narrative paragraphs (not a bullet list)
- [ ] Describes what the feature does and why users need it
- [ ] Focuses on problem solved and value delivered, not implementation mechanisms
- [ ] A stakeholder could understand the feature in under a minute

### 2. Terminology
- [ ] Only feature-specific terms are defined
- [ ] No industry-standard or obvious terms (e.g., "API", "user") are defined
- [ ] Definitions are brief and precise
- [ ] If absent, the absence is justified (no ambiguous terms exist)

### 3. Requirements: structure
- [ ] Each requirement uses the id format `REQ-{PREFIX}-NNN: Title`
- [ ] Prefix matches the FRD's declared prefix (and parent-prefix-{sub} for children)
- [ ] Sequence numbers are zero-padded to three digits and unique within the file
- [ ] Each requirement has a single-sentence user story in `As a [role], I want to [action], so that I can [outcome].` form
- [ ] Role is a concrete persona (and matches `personas.prd.md` if present)
- [ ] At least one acceptance criterion per requirement

### 4. Acceptance Criteria: content
- [ ] Each AC uses id format `AC-{PREFIX}-NNN.N` matching its requirement
- [ ] Each AC begins with `When [condition],` followed by `the system shall/should/may [behavior].`
- [ ] Modal verbs are correctly used: **shall** = mandatory, **should** = recommended, **may** = optional
- [ ] Each AC is atomic (one behavior, not compound)
- [ ] Each AC is testable: clear enough to write a test against
- [ ] Each requirement has at least one happy-path AC and at least one failure / edge-case AC

### 5. Optional Extension Sections
- [ ] `Child FRDs`, if present, matches the actual child files and summarizes their user-facing enhancement
- [ ] Any other extension section is defined by the project's Feature Requirements Template
- [ ] Extension sections do not prescribe UI, screens, user flows, or implementation details
- [ ] Cross-requirement behavior is captured as acceptance criteria whenever possible
- [ ] Empty or placeholder extension sections are absent

### 6. Cross-cutting hygiene
- [ ] Project, prefix, parent reference, status, last-updated present
- [ ] Parent reference (if any) points to a file that exists
- [ ] No "TBD" left unowned
- [ ] Adjective-only behaviors ("appropriately", "correctly", "smoothly", "fast") flagged

## Cross-FRD Checks (parent + children)

When reviewing a tree:

- [ ] Every child's requirements describe an enhancement, not a dependency the parent needs to function
- [ ] **Parent-delivers-value rule:** removing any child file would leave the parent still passing the feature-unit definition
- [ ] **Child-meaningless-without-parent rule:** each child only makes sense as part of the parent's scope
- [ ] Child prefixes are `{parent-prefix}-{sub}` and the sub-prefix is unique among siblings
- [ ] No requirement id collides anywhere in the tree
- [ ] Parent's `## Child FRDs` list matches the actual files on disk
- [ ] No "misc" or "other" child (suggests the split axis was wrong)
- [ ] Personas referenced across siblings are consistent with `personas.prd.md`

## Operating Model Checks

- [ ] Feature requirements do not contain Blueprint-owned architecture or Work Order-owned delivery tasks
- [ ] FRD user stories and ACs can be traced to Product Overview context or explicit user input
- [ ] Requirement changes likely to affect Blueprints or Work Orders are called out for downstream follow-up
- [ ] Open questions use the shared clarification pattern when they block engineering readiness

## Output

Write the review to:

- Single FRD: `.trogonai/project/{projectid}/frd/{slug}.review.md`
- Tree: `.trogonai/project/{projectid}/frd/{parent-slug}/_review.md`
- Whole project: `.trogonai/project/{projectid}/frd/_review.md`

Template:

```markdown
# FRD Review

- **Project:** {projectid}
- **Scope:** <single FRD path | parent + N children | whole project>
- **Reviewed:** <YYYY-MM-DD>
- **Overall verdict:** <Ready / Ready with revisions / Not ready>

## Top Findings
1. <highest-impact gap or risk>
2. <next>
3. <next>

## Per-FRD Results

### <path/to/feature.frd.md>
- Overview: Pass / Gap: <one line>
- Terminology: Pass / Gap: <one line>
- Requirements structure: Pass / Gap: <one line, cite any bad ids>
- Acceptance criteria: Pass / Gap: <one line, cite the worst offender as REQ/AC id>
- Optional extension sections: Pass / Gap / N/A: <one line>
- Hygiene: Pass / Gap: <one line>

<repeat for each FRD reviewed>

## Cross-FRD Findings (if tree)
- Parent-delivers-value rule: Pass / Gap: <one line>
- Child-meaningless-without-parent rule: Pass / Gap: <one line>
- ID collisions: <none / cite>
- Child FRDs list consistency: Pass / Gap

## Operating Model and Downstream Impact
- Source of truth: Pass / Gap / Risk: <one line>
- Module boundaries: Pass / Gap / Risk: <one line>
- Likely downstream follow-up: <none / affected Blueprints or Work Orders by human-readable name>

## Required Revisions (blockers)
- <must fix before engineering picks up>: fix with `frd-write` or `frd-split`

## Recommended Revisions (non-blockers)
- <should fix, not blocking>: fix with `<skill>`

## Suggested Questions for the Author
- <question that exposes an assumption>
```

If a previous review file exists at the same path, overwrite it.

## Verdict Rubric

- **Ready**: no gaps in Requirements structure or Acceptance Criteria; overview clear; optional extension sections are either useful or absent; sub-feature rules satisfied. Minor wording only.
- **Ready with revisions**: gaps exist but fix path is clear. For each gap, name the section / requirement and the skill (`frd-write` or `frd-split`) that fixes it.
- **Not ready**: user stories are generic ("As a user, I want X"), ACs are untestable ("handled appropriately"), or sub-features violate the parent-value rules. Engineering cannot estimate or build from this as-is.

## Key Principles

- **Surface gaps, do not rewrite.** Point to what is missing and why it matters.
- **Cite the id.** Every finding references the specific `REQ-...` or `AC-...` it came from.
- **Distinguish blockers from polish.** Required vs recommended must be obvious.
- **Recommend the fix path.** Each gap maps to `frd-write` (refine) or `frd-split` (restructure).

## Related Skills

- `frd-write`: author or refine a single FRD
- `frd-split`: restructure FRDs by splitting, merging, or nesting
- `frd-getting-started`: produce the initial set of FRDs
- `prd-review`: companion overview-level review

## Allowed Tools

- **AskUserQuestion**: resolve project and target if not supplied
- **Read**: load each FRD and the project's personas
- **Write**: write the review file
- **Glob / Grep**: locate FRDs, detect adjective-only ACs, check id collisions
