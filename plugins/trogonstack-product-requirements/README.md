# Product Requirements

Skills for writing and reviewing product-level and feature-level requirements. All artifacts live under `.trogonai/project/{projectid}/`.

## Requirements Operating Model

These skills operate on the Requirements side of the product development flow:

- **Requirements** own product-level context, feature requirements, and the feature hierarchy.
- **Blueprints** own high-level architecture, runtime design, and code links.
- **Work Orders** own implementable delivery slices and planning phases.

Shared behavior for module boundaries, source-of-truth checks, clarification, feature hierarchy, and downstream impact lives in the `requirements-operating-model` skill. When the TrogonStack `ask-question` skill is available, use it for clarification sessions; these skills keep the Product Requirements-specific judgment about what needs to be clarified.

| Skill | Purpose |
|-------|---------|
| `requirements-operating-model` | Shared Requirements-module boundaries, clarification pattern, source-of-truth rules, feature hierarchy, and downstream-impact guidance |

## Product Overview Documents

Product Overview Documents capture the high-level **why** and **what** for the entire product.

- The **why** is the business motivation: the problems being solved, the KPIs not being met, the North Star goals the business is pursuing.
- The **what** is the product description: what the product is and how its parts fit together.

These documents give anyone (executive, product manager, or engineer) the context they need before looking at specific features.

The six default files live under `.trogonai/project/{projectid}/prd/`:

| Concern | Skill | File |
|---------|-------|------|
| Why: problems being solved | `prd-business-problem` | `business-problem.prd.md` |
| Why: status quo being improved | `prd-current-state` | `current-state.prd.md` |
| Why: who it serves and what success means for them | `prd-personas` | `personas.prd.md` |
| What: the product and how its parts fit together | `prd-product-description` | `product-description.prd.md` |
| Why: the KPIs / North Star being pursued | `prd-success-metrics` | `success-metrics.prd.md` |
| What: the technical constraints the product must meet | `prd-technical-requirements` | `technical-requirements.prd.md` |
| Custom: product-level context beyond the defaults | `prd-custom-overview` | `{slug}.prd.md` |
| Audit of all of the above | `prd-review` | `review.prd.md` |

Each section skill has a focused document owner, but the set is not isolated. Later documents should read the earlier context they depend on, and reviews should flag source-of-truth conflicts across the set.

Additional Product Overview Documents are created with `prd-custom-overview` when the six defaults do not cover a product-specific context area. Custom documents still explain product-level **why** or **what** in plain language; they must name their relationship to the defaults or other custom overviews so they do not become miscellaneous buckets. Feature behavior belongs in FRDs.

## Feature Requirements Documents

Feature Requirements Documents (FRDs) capture the localized **why** and **what** for a single feature: what engineers actually pick up to build.

- The **why** is the user story: *"As a \<role\>, I want to \<action\>, so that I can \<outcome\>."*
- The **what** is the acceptance criteria: *"When \<condition\>, the system shall/should/may \<behavior\>."*

Each FRD follows the same three-section template (**Overview**, **Terminology**, **Requirements**) with stable IDs so they can be referenced unambiguously from code, commits, tickets, tests, and reviews. Cross-requirement behavior should usually be captured as acceptance criteria; `Child FRDs` is the standard built-in extension for parent documents with nested children.

- **`REQ-`** = **Requirement**: one cohesive, independently testable capability. Format: `REQ-[PREFIX]-NNN`.
- **`AC-`** = **Acceptance Criterion**: one observable behavior the system must exhibit. Format: `AC-[PREFIX]-NNN.N`, where `NNN` matches the parent requirement.

Large features nest as parent + children, where the parent delivers value on its own and the child is meaningless without the parent.

Files live under `.trogonai/project/{projectid}/frd/`:

- Top-level: `{slug}.frd.md`
- Parent with children: `{parent-slug}/index.frd.md` + `{parent-slug}/{child-slug}.frd.md`

| Skill | Purpose |
|-------|---------|
| `frd-getting-started` | Produce the initial set of FRDs for a new project, calibrated agile vs waterfall |
| `frd-write` | Author or refine a single FRD |
| `frd-split` | Split, merge, or nest FRDs using the parent-delivers-value rule |
| `frd-review` | Audit a single FRD or a tree of FRDs |

## Installation

```bash
claude plugin marketplace add TrogonStack/agentskills
claude plugin install trogonstack-product-requirements@TrogonStack
```
