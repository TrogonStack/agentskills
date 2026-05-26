---
name: prd-custom-overview
description: Draft an additional Product Overview Document beyond the six defaults when a product-specific context area is needed. Keeps custom PRDs at product-level why/what, prevents duplicate default sections, and writes to `.trogonai/project/{projectid}/prd/{slug}.prd.md`. Use when the user needs a custom overview document rather than a feature requirement.
allowed-tools:
  - AskUserQuestion
  - Read
  - Write
  - Glob
  - Grep
---

# PRD: Custom Product Overview Document

## Purpose

Create an additional Product Overview Document when the six defaults do not capture a product-specific context area the team needs before feature work.

Custom overview documents are still product-level documents. They explain **why** a context area matters or **what** the product is at a broad level. They do not define feature acceptance criteria, engineering design, or implementation plans.

## Shared Operating Model

Use `requirements-operating-model` before creating a custom overview. Use its source-of-truth and clarification rules to decide whether the new document should exist, which default document it overlaps with, and what it must not own.

## When to Use

- The six default Product Overview Documents are present, but the product has another context area reviewers need to understand
- A stakeholder asks for a product-level overview that does not fit Business Problem, Current State, Personas, Product Description, Success Metrics, or Technical Requirements
- The team needs to document product-wide assumptions, market context, rollout strategy, domain model, glossary, or operating constraints before writing FRDs

## Resolve Project and Document

1. Determine `projectid`:
   - If supplied, use it verbatim.
   - Otherwise, ask once. `Glob` `.trogonai/project/*/` to offer existing projects.
2. Ask for a short document title and derive a kebab-case `{slug}`.
3. `Glob` `.trogonai/project/{projectid}/prd/*.prd.md` and reject slugs that collide with reserved files or existing custom documents.
4. `Grep` existing PRD files for the same title or purpose. If a default document already covers the need, recommend that skill instead of creating a duplicate.

Reserved files that should not be recreated as custom documents:

- `business-problem.prd.md`
- `current-state.prd.md`
- `personas.prd.md`
- `product-description.prd.md`
- `review.prd.md`
- `success-metrics.prd.md`
- `technical-requirements.prd.md`

## Discovery

Ask until each area is concrete:

1. **Purpose**: what question should this document answer for an executive, product manager, or engineer before they read FRDs?
2. **Type**: is this primarily **why** context, **what** context, or a blend? If it is feature behavior, redirect to `frd-write`.
3. **Audience**: who needs this document, and what decision will it help them make?
4. **Scope**: what is included, and what adjacent topic is intentionally excluded?
5. **Source of truth**: what inputs support the document: user research, market data, legal policy, sales notes, architecture constraints, operations runbooks, or stakeholder decisions?
6. **Relationship to defaults**: which default PRD files should this document reference, and which should remain the owner for overlapping material?
7. **Relationship to custom overviews**: does this extend an existing custom overview, sit beside it, or stand alone? Name the parent or sibling relationship in the document instead of creating an unowned flat note.

Push back on:

- Custom documents that duplicate a default Product Overview Document
- Feature-specific acceptance criteria: those belong in FRDs
- Technical designs, implementation plans, or API contracts: those belong in engineering docs unless they are product-level constraints for `prd-technical-requirements`
- Vague "miscellaneous" documents with no audience or decision

## Quality Bar

The file is complete when:

- The title and purpose make clear why this needs to exist beyond the six defaults
- The document is understandable by anyone in the company
- The scope boundary prevents overlap with default PRD files
- The parent / sibling relationship is explicit when the document belongs in a larger Product Overview context
- Every claim has a named source, owner, or open question
- The document stays at product-level why/what and does not drift into FRD acceptance criteria

## Output

Write the complete file to `.trogonai/project/{projectid}/prd/{slug}.prd.md` using the template at `assets/custom-overview-template.md`. Read it, substitute `{projectid}`, `{title}`, `{slug}`, and the date, then fill in each section from discovery.

## Writing Guidance

### Writing approach
- **Plain language first.** A custom overview document should be readable by executives, product managers, designers, and engineers without translation.
- **Product-level context only.** Explain why the topic matters or what broad product context is true. Do not list feature-level requirements.
- **Boundary before detail.** Custom documents can become junk drawers unless they name what they are not.
- **Name the source.** If the document summarizes a decision, policy, research finding, or assumption, cite the source or mark the question open with an owner.

### Tone and language
- **Concrete nouns and active voice.** Name the actor, decision, constraint, or product concept directly.
- **No umbrella words.** Avoid "miscellaneous", "general", "etc.", and "various" in titles and headings.
- **No invention.** If the user cannot identify why the custom document exists, stop and recommend the default PRD skills instead.

## Good vs Bad Example

**Good**

```markdown
# Rollout Strategy

## Purpose
This document explains the product-level rollout assumptions for the first three customer cohorts. Sales, Support, and Engineering need the same view of who receives the product first, what success signal allows expansion, and which customer segments are intentionally deferred.

## Scope
- Included: launch cohort selection, expansion trigger, support readiness, rollback owner.
- Excluded: feature acceptance criteria, release checklist tasks, infrastructure deployment steps.

## Product Context
The first cohort is limited to existing mid-market customers with Salesforce and Zoom already connected. This keeps onboarding under the 30-minute support target from `success-metrics.prd.md` and avoids custom integration work during the first validation cycle.
```

**Bad**

```markdown
# Misc Notes

This document has everything we did not put elsewhere. It includes rollout,
analytics, support, APIs, and future UI ideas.
```

The bad version has no decision, no boundary, and no clear relationship to the default Product Overview Documents.

## Anti-Patterns to Reject

- Creating custom documents before the default six exist, unless the user explicitly says this project does not use the defaults
- "Miscellaneous" or "General Notes" documents
- Repeating default sections under a different name
- Writing feature requirements or acceptance criteria in a custom Product Overview Document
- Creating a document with no owner, audience, or source of truth

## Related Skills

- `prd-getting-started`: scaffold the six default Product Overview Documents
- `prd-review`: audit default and custom Product Overview Documents
- `frd-write`: author feature-level requirements when the topic becomes local behavior

## Allowed Tools

- **AskUserQuestion**: drive discovery and resolve `projectid`, title, slug, and scope
- **Read**: load existing PRD files and the custom template
- **Write**: write the custom PRD file
- **Glob / Grep**: detect project files, slug collisions, and duplicate topics
