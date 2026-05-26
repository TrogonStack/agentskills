---
name: prd-product-description
description: Draft the Product Description of a PRD by describing what the product is and how its parts fit together. Drives discovery through the one-liner, the user-facing surfaces, the major components, how they interact, and the boundaries of what the product is not. Writes to `.trogonai/project/{projectid}/prd/product-description.prd.md`. Use when the user wants to describe the product shape without diving into requirements.
allowed-tools:
  - AskUserQuestion
  - Read
  - Write
---

# PRD: Product Description

## Purpose

Describe what the product is, the surfaces it shows up in, and how its parts fit together: at a level of detail that lets a new engineer, designer, or stakeholder form an accurate mental model in a few minutes.

This file is not the technical design, and it is not the requirements list. It is the **shape** of the product.

## Shared Operating Model

Use `requirements-operating-model` before writing when product shape depends on other overview documents, FRD boundaries, unclear source of truth, or downstream Blueprint / Work Order handoff.

## When to Use

- A PRD has goals and personas but no clear picture of what is being built
- New stakeholders keep asking "wait, what does this actually do?"
- The team is conflating the technical design with the product description

## Project Identifier

Before writing, determine the `projectid`:

1. If the user has supplied one, use it verbatim.
2. Otherwise, ask for it once. The `projectid` should be a stable, kebab-case identifier for the product/initiative.
3. Confirm the resolved path before writing: `.trogonai/project/{projectid}/prd/product-description.prd.md`.

If the file already exists, read it first and ask whether to **replace** or **refine** before overwriting.

## Read Existing Context

Before discovery, read these files when they exist:

- `.trogonai/project/{projectid}/prd/business-problem.prd.md`
- `.trogonai/project/{projectid}/prd/current-state.prd.md`
- `.trogonai/project/{projectid}/prd/personas.prd.md`

Use them as the source for why the product exists, what it improves, and who it serves. If the product shape conflicts with those files, ask one clarification question using the shared clarification pattern before writing.

## Discovery

Ask until all are answered:

1. **One-liner**: a single sentence in the form *"<persona> can <do thing> so that <outcome>"*. Refuse multi-clause sentences.
2. **Surfaces**: where does the user encounter the product? Web app, mobile, CLI, API, email, embedded in another product, physical device.
3. **Major components**: the named pieces that make up the product (e.g., onboarding flow, ingestion pipeline, dashboard, notification engine). Three to seven is typical; if there are more than ten, group them.
4. **How the pieces fit together**: a simple flow describing input → processing → output, or the path a user takes through the surfaces. A short ASCII or text diagram is welcome; do not require formal modeling here.
5. **Primary user flow**: the happy-path scenario for the primary persona in three to seven steps.
6. **Boundaries (what the product is NOT)**: adjacent surfaces, capabilities, or use cases that someone might assume are in but are not. This is the cheapest place to prevent scope creep.

Push back on:

- One-liners that describe the technology ("an event-sourced ingestion service") rather than the value to the user
- Component lists that read like a microservices inventory rather than user-meaningful parts
- Skipping the boundaries: boundaries are mandatory

## Quality Bar

The file is complete when:

- The one-liner names a persona, an action, and an outcome
- A reader can list the major components without re-reading the file
- The happy-path flow is concrete enough to storyboard
- At least three "is not" statements are present

## Output

Write the complete file to `.trogonai/project/{projectid}/prd/product-description.prd.md` using the template at `assets/product-description-template.md`. Read it, substitute `{projectid}` and the date, and fill in each section from the discovery output.

## Writing Guidance

### Writing approach
- **Describe shape, not implementation.** Name the surfaces, components, and flows in product terms. Architecture, data models, and technology choices belong in `prd-technical-requirements` and engineering design docs, not here.
- **Components in product terms.** A reader should be able to tell what each component *does for the user*, not what microservice it maps to. "Notification engine" beats "kafka-notifications-svc".
- **Flow as a storyboard.** The primary user flow should read like steps a designer could turn into screens. If the flow needs implementation detail to make sense, it has drifted into design.
- **Boundaries are mandatory.** The "is NOT" list prevents months of accidental scope. Treat it as load-bearing, not optional.

### Tone and language
- **Plain language.** No internal acronyms, no platform jargon without a one-line definition.
- **Name the user encounter.** For every surface and component, say where the user meets it (open the web app, get an email, hit the API).
- **Avoid "platform for…" framing.** Say what the user *does*, not what the product *is*.

### Scope
- **What, not how.** Mechanism, schema, and stack live in technical docs.
- **Shape, not requirements.** Detailed behaviors and acceptance criteria live in FRDs. This file gives the mental model a reader needs before opening any FRD.
- **No invention.** Every component and surface must come from user input or earlier PRD sections. If something is undecided, mark it as open rather than guessing.

## Good vs Bad Example

**Good**

```markdown
## One-liner
A mid-market AE can capture a deal update in under 30 seconds after a Zoom call,
so Salesforce stays current without evening data entry.

## Surfaces
- Zoom side-panel app (during and after calls)
- Salesforce Lightning component (deal record)
- Mobile web (between meetings)

## Major components
- **Call Capture:** listens for the end of a Zoom call and proposes a structured note.
- **Salesforce Bridge:** writes the note to the right opportunity and updates Next Steps.
- **Coaching Inbox:** surfaces deals where Next Steps is blank, for the manager.

## Primary user flow (happy path)
1. AE finishes a Zoom call. Side-panel proposes a 3-bullet summary and a Next Step.
2. AE confirms or edits in <15 seconds.
3. Salesforce Bridge writes the note and updates Next Steps on the opportunity.
4. Manager's Coaching Inbox clears the deal from its "blank Next Steps" list.

## What this product is NOT
- A meeting transcription product: we use Zoom's transcript, we do not produce one.
- A pipeline analytics tool: managers use existing Salesforce reports.
- A customer-facing product: buyers never see this; only the selling team does.
```

**Bad**

```markdown
## One-liner
A platform for sales productivity.

## Surfaces
- Web

## Major components
- Frontend
- Backend
- Database

## Primary user flow (happy path)
1. User logs in.
2. User uses the product.
3. Profit.
```

The bad version describes infrastructure, not a product. No persona, no outcome, no boundaries: a reader cannot picture what gets built or who uses it.

## Anti-Patterns to Reject

- "A platform for…": say what the user does, not what the product *is*.
- Listing internal services as components: name user-meaningful parts.
- "It will support X, Y, Z" without saying *how the user encounters* X, Y, Z.
- Skipping the "is NOT" boundaries.

## Allowed Tools

- **AskUserQuestion**: drive discovery and resolve `projectid`
- **Read**: load the existing file if it exists, to decide replace vs refine
- **Write**: write the file
