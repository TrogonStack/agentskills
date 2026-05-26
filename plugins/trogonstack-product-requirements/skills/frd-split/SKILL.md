---
name: frd-split
description: Split, merge, or nest Feature Requirements Documents (FRDs) using the parent-delivers-value rule where a parent feature must deliver value on its own and a child must be meaningless without the parent. Promotes parent files into directories, scaffolds child FRDs with appended prefixes, and rewrites the parent into an umbrella. Use when an FRD has grown too large or when multiple FRDs should be combined.
allowed-tools:
  - AskUserQuestion
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash(rm:*)
---

# FRD: Split, Merge, or Nest Features

## Purpose

Restructure FRDs so each one passes the **feature unit** test: it delivers cohesive value, has a single owner, and can be planned independently.

## Shared Operating Model

Use `requirements-operating-model` before restructuring. This skill changes the feature hierarchy, so apply the source-of-truth, clarification, and downstream-impact rules before writing files.

## The Decision Rule

Apply these three options strictly:

- **Split into separate top-level features** when each resulting piece passes the feature unit definition on its own, or when different roles own different parts.
- **Merge / keep in one feature** when the pieces' requirements break without each other, they complete one task together, or they are describable in one sentence.
- **Nest as a child feature** when the parent already delivers value on its own, the child enhances but is not required, and the child is meaningless without the parent.

> Example: "Search" finds items by keyword: complete on its own. "Search Filters" adds faceted filtering. Search works without filters; filters need search. → **Nest** Search Filters under Search.

If a candidate child *would break the parent if removed*, it is not a child. It is part of the parent (merge), or it is its own top-level feature (split).

## When to Use

- An FRD has more than roughly 5–7 requirements
- A reviewer flagged an FRD as overscoped
- Two FRDs duplicate or depend on each other and should be reconciled
- A feature is naturally an umbrella with optional enhancements (e.g., User Management with User Roles, Groups, Audit Log)

## Resolve Project and Targets

1. Determine `projectid` (ask if not supplied; offer choices via `Glob`).
2. Identify the FRD(s) to restructure. If a single FRD is being split, locate it via `Glob`. If multiple FRDs are being reconciled, list them all.
3. Read every target file in full before proposing changes: no requirement may be dropped silently.

## Discovery

### 1. Decide the operation

Ask the user, given the targets, which operation applies. Use the decision rule above; do not let the user pick "nest" for something that violates the parent-delivers-value test.

### 2. For a SPLIT or NEST: identify each resulting feature

For each new child or split-out feature:

- **Slug**: kebab-case, scoped to the parent if a child (e.g., parent `user-management` → child `user-roles`).
- **Sub-prefix** (children only): 2–3 letters appended to the parent's prefix. Confirm uniqueness against siblings (`Grep` existing FRDs for `REQ-{parent-prefix}-{sub}-`).
- **One-line summary**.
- **Which parent requirements move here**: every existing `REQ-...` in the parent must be assigned to exactly one resulting feature, or explicitly retained in the umbrella. No requirement is dropped.
- **Parent-value check** (children only): confirm the parent still passes feature-unit alone after this child is removed.

Reject:
- "Misc" / "other" children; that means the split axis was wrong.
- Children that share requirements: pick one owner per requirement.
- Children whose absence would break the parent: those are merges or top-level splits, not children.

### 3. For a MERGE: confirm coherence

Ask: *"In one sentence, what does the merged feature do?"* If the user cannot, the merge is wrong. Identify requirements to drop as duplicates, requirements to combine, and the new prefix (typically the dominant feature's prefix).

### 4. Confirm coverage

Before writing, read back every requirement and where it lands. Get explicit confirmation.

## File Layout

After a SPLIT or NEST under a parent:

```
.trogonai/project/{projectid}/frd/{parent-slug}/
├── index.frd.md
├── {child-1-slug}.frd.md
├── {child-2-slug}.frd.md
└── ...
```

If the parent was at `frd/{parent-slug}.frd.md`, read it, write to `frd/{parent-slug}/index.frd.md`, then remove the original file with `rm` only after every child file has been written successfully.

After a SPLIT into top-level peers: each resulting feature is its own `frd/{slug}.frd.md`. The original file is replaced (its requirements have moved out).

After a MERGE: write the merged file at the surviving slug; remove absorbed files with `rm` only after the merged file is successfully written.

## Output: Child FRD

```markdown
# <Child Feature Name>

- **Project:** {projectid}
- **Prefix:** {PARENT-PREFIX}-{SUB}
- **Parent FRD:** ./index.frd.md
- **Status:** Draft
- **Last updated:** <YYYY-MM-DD>

## Overview

<1–2 paragraphs scoped to this child: what enhancement it adds, why it matters, the parent it builds on>

## Terminology

- **<Term>:** <definition>

## Requirements

### REQ-{PARENT-PREFIX}-{SUB}-001: <Requirement name>
**User Story:** As a <role>, I want to <action>, so that I can <outcome>.

**Acceptance Criteria:**
- AC-{PARENT-PREFIX}-{SUB}-001.1: When <condition>, the system shall <behavior>.

<requirements moved from parent, with IDs renumbered under the new prefix>
```

When moving requirements from parent to child, renumber under the child's prefix starting at `001`. Preserve the original AC text verbatim: only the IDs change. If the source FRD has extension content, move it only when it is defined by the project's template or convert the relevant behavior into acceptance criteria owned by the resulting feature.

## Output: Parent Umbrella (after a NEST)

Rewrite parent `index.frd.md` so that:

- Overview is unchanged or lightly edited to acknowledge the children.
- Terminology stays with the parent only if the terms apply project-wide; otherwise move term entries down to the children they belong to.
- Requirements that remain on the parent are only those that describe the umbrella value (the parent-delivers-value-on-its-own behaviors). Requirements that move to a child are listed at the child instead.
- A new `## Child FRDs` section enumerates the children with one-line summaries.
- Extension sections remain only if the project's template defines them and the content still applies to the parent's remaining requirements or parent/child boundaries.

```markdown
# <Parent Feature Name>

- **Project:** {projectid}
- **Prefix:** {PARENT-PREFIX}
- **Parent FRD:** <unchanged>
- **Status:** Draft
- **Last updated:** <YYYY-MM-DD>

## Overview

<umbrella narrative; mentions that children exist and what they add>

## Terminology

- <only umbrella-level terms>

## Requirements

<requirements that prove the parent delivers value on its own>

## Child FRDs

- [{child-1-slug}](./{child-1-slug}.frd.md): <summary; parent-delivers-value rule satisfied>
- [{child-2-slug}](./{child-2-slug}.frd.md): <summary>
```

## Quality Bar

The restructure is complete when:

- Every original requirement is accounted for: none dropped silently.
- The parent (after a nest) still passes the feature-unit definition on its own.
- Every child fails the feature-unit definition without the parent (that is the point).
- No "misc" or "other" child exists.
- IDs are renumbered correctly under their owning feature's prefix; no duplicate IDs across the project.
- Likely downstream Blueprint or Work Order follow-up is identified by human-readable name when the split changes feature boundaries, requirement IDs, or acceptance criteria.

## Anti-Patterns to Reject

- Splitting by implementation layer ("frontend" vs "backend") instead of user-facing capability.
- Leaving the parent both as an umbrella *and* with its own deep requirements; pick one role per requirement.
- Calling something a child when removing it would break the parent.
- Renaming the parent without keeping the original prefix stable when only children are being added (breaks existing IDs).

## Worked Example

**Parent:** User Management: admins can create, view, edit, deactivate users and reset passwords. Delivers value alone.

**Children (correctly nested: parent works without them, they are meaningless without it):**

- User Roles: assign roles for access control
- User Groups: bulk operations on user sets
- User Audit Log: change tracking for compliance

If, instead, "Login" had been proposed as a child of User Management, reject it: User Management cannot function without authentication, so Login is not a child.

## Related Skills

- `frd-write`: author a new child or top-level FRD
- `frd-review`: audit the parent + children after splitting
- `prd-product-description`: re-check the product-level boundaries after major restructures

## Allowed Tools

- **AskUserQuestion**: drive the operation choice and confirm coverage
- **Read**: load every target FRD before changing anything
- **Write**: create new files and rewrite the parent umbrella
- **Edit**: update Child FRDs lists and surgical sections
- **Glob**: locate existing FRDs
- **Grep**: confirm prefix uniqueness and ID collisions
- **Bash(rm:*)**: remove superseded files only after replacement files are written
