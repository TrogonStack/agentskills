---
name: frd-write
description: Draft a Feature Requirements Document (FRD) using the Overview / Terminology / Requirements template, Product Overview context, source-of-truth checks, and REQ-[PREFIX]-NNN / AC-[PREFIX]-NNN.N acceptance criteria. Supports nested sub-features with appended prefixes. Use when the user wants to spec a feature for engineering to build.
allowed-tools:
  - AskUserQuestion
  - Read
  - Write
  - Glob
  - Grep
  - Bash(rm:*)
---

# FRD: Write a Feature Requirements Document

## Purpose

Produce a single `.frd.md` file engineers can build from. FRDs follow a consistent three-section structure: **Overview**, **Terminology**, **Requirements**.

## Shared Operating Model

Use `requirements-operating-model` before writing when the task touches Product Overview context, existing FRDs, feature hierarchy, ambiguous behavior, or downstream Blueprint / Work Order impact. Use its clarification pattern instead of creating a separate local questioning workflow.

## When to Use

- The user has a feature in mind and needs it specified
- A Product Overview Document (the `prd-*` files) describes the product shape; a specific feature still needs to be pinned down
- A vague ticket needs to be turned into something testable

## Resolve Project, Prefix, and Parent

### Project

Determine `projectid`:

1. If supplied, use it verbatim.
2. Otherwise, ask once. `Glob` `.trogonai/project/*/` to offer existing projects.

### Parent FRD (sub-feature check)

Ask: **is this a top-level feature, or a sub-feature of an existing FRD?**

Apply the sub-feature rule strictly: a child is only a child if **the parent delivers complete value on its own and the child is meaningless without the parent**. If the user describes it as a child but the parent would not work without it, push back; that means it should be merged, not nested.

- **Top-level** → file: `.trogonai/project/{projectid}/frd/{slug}.frd.md`
- **Child** → `Glob` existing FRDs to pick the parent:
  - If parent is at `frd/{parent-slug}.frd.md`, promote to `frd/{parent-slug}/index.frd.md` first (read, write to new path, remove the old file with `rm` only after the new index exists).
  - Write child at `frd/{parent-slug}/{slug}.frd.md`.
  - Deeper nesting follows the same pattern recursively.

If the target file already exists, read it first and ask **replace** or **refine**.

### Product Context

Before discovery, read the relevant Product Overview files when they exist:

- `personas.prd.md` for user-story roles
- `product-description.prd.md` for product surfaces and boundaries
- `business-problem.prd.md` and `current-state.prd.md` for the user pain and status quo
- `success-metrics.prd.md` for outcome priority
- `technical-requirements.prd.md` for constraints that acceptance criteria must respect

Also read nearby FRDs that share the same parent, prefix family, or product surface. If the new requirement duplicates an existing requirement, refine the owner instead of creating a second source of truth.

### ID Convention

Requirements and acceptance criteria use stable IDs so they can be referenced unambiguously from code, commits, tickets, tests, and reviews.

- **`REQ-`** stands for **Requirement**: a single cohesive, independently testable capability.
- **`AC-`** stands for **Acceptance Criterion**: one observable behavior the system must exhibit to satisfy its parent requirement.

Format:

- Requirement id: `REQ-{PREFIX}-NNN` (e.g., `REQ-CHK-003`).
- Acceptance criterion id: `AC-{PREFIX}-NNN.N`, where `NNN` matches its parent requirement (e.g., `AC-CHK-003.2` is the 2nd acceptance criterion of `REQ-CHK-003`).

### Prefix

Every FRD has a short uppercase prefix used inside its requirement and acceptance ids.

- **Top-level FRDs:** ask the user for a 2–4 letter prefix derived from the feature name (e.g., `CHK` for Checkout, `AUTH` for Auth). Confirm uniqueness by `Grep`-ing existing FRDs in the project for `REQ-<prefix>-`.
- **Child FRDs:** the prefix is the parent's prefix + `-` + a 2–3 letter sub-prefix specific to the child (e.g., parent `AUTH` + child Password Reset → `AUTH-PR`). The full requirement id then looks like `REQ-AUTH-PR-001`.

## Discovery

### 1. Overview

Drive the user to produce **1–2 narrative paragraphs** answering:

- What the feature does
- Why users need it (problem solved, value delivered)
- How it relates to the rest of the product (integrations, dependencies, but not implementation)

A stakeholder should understand the purpose in under a minute. Reject paragraphs that describe mechanisms or implementation: the Overview is purpose, not design.

### 2. Terminology

Ask: *"Which terms specific to this feature could be misunderstood?"*

- Define only feature-specific terms. Do **not** define industry-standard terms (e.g., "API", "user").
- Each definition is brief and precise.
- Use the template's term-definition shape: `- **Term:** Definition`.
- If no ambiguous terms exist, the section may be omitted.

### 3. Requirements

Each requirement represents **one cohesive, independently testable capability**.

For each requirement, drive:

- **Title**: short, capability-shaped (e.g., "Payment Confirmation", not "Show stuff").
- **User story**: exactly one sentence in the form *"As a [role], I want to [action], so that I can [outcome]."* The role must be a concrete persona. If `personas.prd.md` exists in the project, the role must match (or the deviation must be justified).
- **Acceptance criteria**: one or more `AC-[PREFIX]-NNN.N` items. Each criterion follows:
  - **"When [condition], the system shall [behavior]."**: mandatory
  - **"When [condition], the system should [behavior]."**: recommended
  - **"When [condition], the system may [behavior]."**: optional

Quality bar for requirements:

- **User-centered**: describes what users need, not internal mechanics.
- **Testable**: every AC is clear enough to write a test against.
- **Atomic**: each AC covers exactly one behavior. Split compound ACs.
- **Coverage**: at least one happy-path AC and at least one failure / edge-case AC per requirement (invalid input, missing permission, conflict, empty state, network failure).

Numbering: requirements are sequential, zero-padded to three digits (`001`, `002`, ...). ACs within a requirement are `NNN.N` (`001.1`, `001.2`, ...).

### 4. Optional Extension Sections

After requirements are stable, decide whether the FRD needs any extension section beyond the guide's three-section shape.

- Add `## Child FRDs` only when this FRD has children.
- Capture cross-requirement interactions, defaults, constraints, precedence rules, and edge conditions as acceptance criteria whenever possible.
- Add other extension sections only when the project's Feature Requirements Template provides them.
- If no extension content is needed, omit the extension section entirely. Do not add a placeholder.

### 5. Split check

If the discovery surfaces more than roughly **5 requirements**, or requirements covering capabilities a different team would own, recommend `frd-split` rather than producing a sprawling FRD.

## Output

Resolve the template source before writing:

1. If the user or project context provides a Project Settings > Requirements > Feature Requirements Template, read and use that template.
2. Otherwise, use the bundled default at `assets/frd-template.md`.

Write a single file using the resolved template. Substitute the placeholders (feature name, `{projectid}`, `{PREFIX}`, parent path, date), repeat the `REQ-{PREFIX}-NNN` block once per requirement, and fill in each section from the discovery output.

After writing, if a parent FRD exists, append an entry to its `## Child FRDs` section (creating the section if missing):

```markdown
- [{child-slug}](./{child-slug}.frd.md): <one-line summary>
```

If refining an existing FRD, call out likely downstream Blueprint or Work Order follow-up when user stories, acceptance criteria, requirement IDs, feature boundaries, or technical constraints changed. Do not edit downstream modules from this skill.

## Good vs Bad Example

**Good**

```markdown
REQ-CHK-003: Payment Confirmation

User Story: As a customer, I want to receive confirmation after my payment is processed, so that I can know my order was placed successfully.

Acceptance Criteria:
- AC-CHK-003.1: When payment processing succeeds, the system shall display a confirmation page with the order number and estimated delivery date.
- AC-CHK-003.2: When payment processing fails, the system shall return the user to the payment form with an error message describing the failure reason.
- AC-CHK-003.3: When the user navigates away during processing, the system shall complete the transaction and display the confirmation on their next visit.
```

**Bad** (reject this shape)

```markdown
REQ-CHK-003: Payment Confirmation

User Story: As a user, I want payment to work.

Acceptance Criteria:
- AC-CHK-003.1: The system should show a message.
- AC-CHK-003.2: Errors should be handled appropriately.
```

The user story has no outcome and uses a generic role. The ACs are untestable: "show a message" and "handled appropriately" do not describe specific behaviors.

## Anti-Patterns to Reject

- "As a user, I want X": generic role; force a concrete persona.
- ACs without a "When" condition.
- ACs using "the system handles X appropriately" are not testable.
- One AC describing multiple behaviors: split.
- Overview that describes implementation ("uses Stripe webhooks") instead of purpose.
- Terminology entries for industry-standard terms.
- Calling something a sub-feature when the parent depends on it; that is a merge, not a nest.
- Extension sections that prescribe UI, screens, or user flows.
- Extension sections that restate per-requirement ACs instead of owning new context.
- Empty extension sections with placeholder text.

## Related Skills

- `frd-split`: break an FRD into independently-valuable parent + nested children
- `frd-review`: audit an FRD or a tree of FRDs
- `frd-getting-started`: produce the initial set of FRDs for a new project
- `prd-personas`: define personas that user stories reference

## Allowed Tools

- **AskUserQuestion**: drive discovery, prefix selection, parent picking
- **Read**: load parent FRD and personas
- **Write**: create the FRD file and update parent's Child FRDs list
- **Glob**: locate existing FRDs and projects
- **Grep**: check existing requirement prefixes
- **Bash(rm:*)**: remove the original parent file only after promotion to `index.frd.md` succeeds
