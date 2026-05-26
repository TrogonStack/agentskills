---
name: requirements-operating-model
description: >-
  Apply the shared Requirements operating model across product-requirements
  skills: Requirements / Blueprints / Work Orders boundaries,
  single source-of-truth ownership, TrogonStack ask-question-compatible
  clarification, Product Overview / FRD scope, feature hierarchy, and
  downstream impact. Use alongside PRD or FRD writing, review, split, or
  getting-started work when cross-document consistency, ambiguity, or module
  handoff matters.
allowed-tools:
  - AskUserQuestion
  - Read
  - Glob
  - Grep
---

# Requirements Operating Model

Use this skill alongside Product Overview and Feature Requirements skills when the work depends on shared requirements context rather than one document's local template.

## Module Boundaries

The product development flow separates work into three document modules:

- **Requirements** define what to build and why. Product Overview Documents describe the whole product. Feature Requirements Documents describe individual features. Requirements owns the feature hierarchy.
- **Blueprints** define high-level architecture and design. Feature blueprints map to features; container blueprints describe deployable units; component blueprints describe reusable cross-cutting capabilities. Requirements may read them for context, but must not write blueprint content.
- **Work Orders** define implementable delivery slices, sequenced planning phases, and execution scope. Requirements may read them for context, but must not create or rewrite work orders.

When the user asks for architecture, code links, implementation sequencing, phase planning, technical-layer slicing, file-scope planning, duplicate work-order review, or work-order extraction, keep the requirement document focused and identify the downstream module that owns that work.

## Skill Routing

Route work to the narrowest requirements skill:

- Product Overview scaffolding: `prd-getting-started`.
- Product Overview section writing: the matching `prd-*` section skill.
- Product Overview review: `prd-review`.
- Initial Feature Requirements set: `frd-getting-started`.
- Single FRD writing or refinement: `frd-write`.
- Feature hierarchy changes, split, merge, or nesting: `frd-split`.
- FRD or FRD tree review: `frd-review`.

Use `ask-question` for clarification when it is available, while keeping product-requirements-specific judgment in these skills. Use code evidence only to understand current behavior or drift; architecture and code-link documentation belongs to Blueprints.

When source material names older generic skills, map them to the current narrow skills instead of preserving the old names: feature creation maps to `frd-getting-started` or `frd-write`; generic Q&A maps to `ask-question`; feature organization maps to `frd-split`; document review maps to `prd-review` or `frd-review`; code search maps to code evidence for current behavior or drift.

## Source Of Truth

Every fact should have one authoritative home.

- Product-wide motivation, current state, personas, product shape, success metrics, and technical constraints belong in Product Overview Documents.
- Feature-specific user value, terminology, user stories, and acceptance criteria belong in FRDs.
- Architecture decisions, runtime components, interfaces, and code links belong in Blueprints.
- Developer tasks, phases, file-level implementation scope, and verbatim copied requirements belong in Work Orders.

Before creating or restating content, search the relevant existing documents. If the fact already exists, reference it or refine the owning document instead of duplicating it.

## Conversation Context

Use the provided context as the map for requirement work:

- Use the table of contents to understand available documents, document types, hierarchy, and parent-child relationships before changing structure.
- Treat the current document as the default target when the user does not name another document.
- Read attached artifacts before using them as evidence. Artifacts can ground requirements, but they do not override the authoritative owning document unless the user explicitly says they should.

## Task Discipline

Keep requirement edits grounded and scoped:

- Understand the user's goal and the current state of relevant documents before changing content. Surface stale content, ambiguous decisions, or missing upstream documents before proceeding.
- Read the target document before modifying it. For hierarchy, cross-document, or source-of-truth changes, read the affected neighboring documents too.
- Ground new content in existing documents, project context, artifacts, code evidence, or direct user input. If a fact is unavailable, ask rather than invent.
- Match the edit size to the request. A small correction should not trigger cleanup, restructuring, or new sections unless the user asked for that larger change.
- If the request is specific and the target is clear, make the edit directly after reading context. If scope, behavior, source of truth, or multi-document impact is ambiguous, ask first.
- Confirm before changes that affect multiple documents or project structure, even when the likely edit path is clear.
- When a blueprint-to-code relationship is unclear, ask before using code evidence to change requirement content.
- Reference work orders with the format `WO-XX: Title`. Requirements skills may identify downstream follow-up, but should not create bug reports, tickets, or work orders unless a downstream skill explicitly owns that action.

## User-Facing Communication

Keep responses direct and human-readable:

- Lead with the answer, action, or decision. Keep explanations to the context needed for understanding.
- Focus status updates on decisions needing input, natural milestones, and issues found while reading context.
- Avoid restating the user's request unless it prevents ambiguity.
- Explain findings, decisions, and completed edits rather than internal mechanics.
- Refer to documents, blueprints, work orders, and artifacts by human-readable name. Do not expose internal IDs in user-facing text unless the user asks for them or they are needed to disambiguate a target.
- Address the user directly.
- Do not use emojis in responses or requirement documents.

## Writing Quality

Write requirements in plain language for technical and non-technical stakeholders:

- Use active voice, concrete nouns, and named actors.
- Avoid vague promotional adjectives such as "seamless", "powerful", "comprehensive", "sophisticated", and "engaging". Replace them with observable facts or measurable outcomes.
- Requirements describe what the product or system must do and why. Implementation details belong in Blueprints; delivery tasks belong in Work Orders.
- Do not prescribe UI layouts unless the user is explicitly defining a user-facing layout requirement. Prefer observable behavior, constraints, states, and outcomes.
- Product Overview Documents should read like executive-summary narrative prose, not terse bullet collections. Use complete paragraphs that explain the motivation, current state, gaps, value proposition, expected outcomes, and relationship to the overall product vision before the reader opens feature-level documents.

## Clarification Pattern

Prefer the TrogonStack `ask-question` skill when it is available. It owns the generic interview loop. Product Requirements skills own the domain judgment about what must be clarified.

If `ask-question` is not available, use the same lightweight pattern directly:

```markdown
**Question:** <one question>
**Intention:** <why this answer changes the requirement work>
**Assumptions:**
- <current assumption>
- <another assumption, if useful>
```

Ask one question at a time. Do not pre-plan or display a fixed question count. Treat each answer as new context: skip resolved questions, go deeper on new uncertainty, and push back when an answer conflicts with the requirements model.

Ask before editing when scope, behavior, source of truth, or multi-document impact is ambiguous. If the request is specific and the target document is clear, act directly after reading the relevant context.

## Product Overview Documents

Product Overview Documents capture product-level why and what. The default set is:

- `business-problem.prd.md`
- `current-state.prd.md`
- `personas.prd.md`
- `product-description.prd.md`
- `success-metrics.prd.md`
- `technical-requirements.prd.md`

Custom overview documents are allowed when a product-level context area does not fit the default set. They must name their scope, owner/source, relationship to defaults, and the overlap they intentionally avoid. Do not let custom documents become miscellaneous buckets for feature behavior, architecture, or delivery tasks.

Product Overview Documents may be organized in their own hierarchy, separate from the feature tree. Do not treat Product Overview hierarchy changes as feature hierarchy changes.

## Feature Requirements Documents

Each FRD describes one feature. A feature is a cohesive, independently deliverable slice of user-facing value. When a feature has a corresponding feature blueprint, the FRD and blueprint should share the same human-readable title so downstream work can trace the same product slice across modules.

Use this feature hierarchy rule:

- A parent feature must deliver value without any child feature.
- A child feature extends the parent but is meaningless without it.
- If removing the child breaks the parent, it is not a child. Merge it into the parent or make it a top-level feature.
- Feature nesting can go deeper than one level, but every level must satisfy the same parent-value and child-dependence rule.
- Requirements skills own feature hierarchy changes. Do not move hierarchy ownership into Blueprints or Work Orders.

FRDs use the base sections `Overview`, `Terminology`, and `Requirements`. Cross-requirement behavior, defaults, constraints, precedence, and edge conditions should usually become explicit acceptance criteria. Only add extension sections when the project template or the document structure needs them; `Child FRDs` is the standard built-in extension for parent documents with children.

## Evidence And Traceability

Use artifacts, code, and downstream documents as context without moving their ownership into Requirements:

- **Artifacts** are user-provided context such as meeting notes, research, or designs. Read them when available and ground claims in them, but do not invent facts they do not support.
- **Code** captures current implementation state. Requirements can use code evidence to understand current behavior or drift, while Blueprints remain the owner for target architecture and code links. If context includes code chunks or code links, treat them as Blueprint-owned traceability and do not maintain them from Requirements.
- **Work Orders** should trace back to requirements and blueprints. They may contain verbatim requirement excerpts and names of source blueprints that inform implementation. If a requirements change affects copied requirement text, implementation scope, or source traceability, flag the downstream follow-up instead of editing work orders.
- **Links and mentions** establish cross-document relationships. Prefer human-readable markdown links or document mentions when referencing related requirements, blueprints, work orders, or artifacts.

## Forward And Reverse Flow

The default product development flow is Requirements to Blueprints to Work Orders. Requirements should establish intent before architecture and delivery planning depend on it.

Work orders may exist before requirements or blueprints are final, but requirement work should mark the upstream documentation that still needs finalization before implementation starts. Do not treat early work-order text as the source of truth when it conflicts with requirements intent.

Use reverse-engineering work when the user wants to document an existing system:

- **Initial documentation** should produce requirements that accurately reflect the system as it exists today.
- **Drift detection** should identify mismatches between existing requirements and the current implementation.

Once reverse-engineered documents are accepted, treat them as the baseline for future forward work. If later requirements changes invalidate blueprint or work-order assumptions, flag the downstream follow-up explicitly.

## Context Reading

Read upstream context before writing:

- Business Problem should be grounded in user input, evidence, artifacts, or existing project context.
- Current State should align with Business Problem and describe the baseline before change.
- Personas should inform Product Description, Success Metrics, and FRD user stories.
- Product Description should be grounded in Business Problem, Current State, and Personas.
- Success Metrics should connect Business Problem, Current State costs, and Persona success.
- Technical Requirements should constrain the build without becoming a blueprint.
- FRDs should read relevant Product Overview Documents and nearby FRDs before adding requirements.

## Downstream Impact

Requirements changes may invalidate Blueprints or Work Orders. Review and restructuring skills should flag likely downstream impact without editing downstream modules.

Call out impact when a change:

- changes feature boundaries or hierarchy
- changes user stories or acceptance criteria used by engineering
- changes personas, product surfaces, metrics, or technical constraints
- removes or renames a requirement ID
- contradicts a blueprint, work order, artifact, or current code evidence
- reveals a reusable capability shared by multiple features, a capability being abstracted, or enough internal structure to warrant a downstream Component Blueprint review

Do not recommend a Component Blueprint for a single utility with no internal structure or logic that only belongs to one feature. Components may start inside Feature Blueprints and migrate to Component Blueprints when reuse across features emerges; Requirements should flag that possibility without creating or rewriting blueprint content.
