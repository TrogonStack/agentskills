---
name: diataxis-write-docs
description: Draft or revise project documentation for the reader's purpose using Diataxis. Use for writing tutorials, how-to guides, reference, or explanation; use diataxis-organize-docs for reorganizing an existing documentation collection.
allowed-tools:
  - Read
  - Write
---

# Diataxis Documentation Writing

Write documentation that answers a specific reader need and reflects the project's actual behavior. This workflow works independently of documentation reorganization.

## Choose the Reader Need

Identify the audience, assumed knowledge, desired outcome, and requested scope from the task and available material. Ask only when missing information would materially change the document.

Choose by purpose, not topic difficulty or the presence of code. Read the matching reference when drafting or revising that type; load additional references only for additional requested document types.

| Reader need | Document type | Writing guidance |
|-------------|---------------|------------------|
| Learn through a guided exercise | Tutorial | [Tutorial writing](references/tutorial.md) |
| Accomplish a particular task | How-to | [How-to writing](references/how-to.md) |
| Look up precise information | Reference | [Reference writing](references/reference.md) |
| Understand a concept or rationale | Explanation | [Explanation writing](references/explanation.md) |

For a mixed request, give each document a primary purpose and connect related material with links. Preserve the user's requested deliverables. A request to draft a page does not require reorganizing the collection first.

## Establish the Evidence

Inspect the relevant implementation, schemas, tests, existing documentation, and maintained project examples. Match external documentation to the project's version and dependencies. Use available project discovery tools when provided.

Resolve conflicting sources before making a definitive claim. Distinguish implemented behavior from proposals, intentions, and assumptions. Do not invent commands, API signatures, defaults, output, or design rationale to complete a draft. Narrow unsupported claims or ask for the missing information when it prevents a useful result.

## Draft or Revise

Apply the selected reference's writing guidance and anti-pattern checks. Make the title and opening identify the reader's goal, then include the detail needed to achieve it. Preserve useful existing content and project terminology during revision.

Keep instructions and generated documentation free of manually maintained totals and numbered section references. Use descriptive headings and named links. For actual ordered procedures, write every Markdown list marker as `1.` so the renderer maintains numbering. Preserve necessary numeric facts such as versions, limits, and measured values.

## Place and Connect

Honor the requested destination and existing documentation conventions. For a new documentation collection without an established layout, use `docs/tutorial/`, `docs/how-to/`, `docs/reference/`, and `docs/explanation/`, with `docs/README.md` as the navigation hub. Create only the directories the requested documents need.

Add relevant navigation links when maintaining the collection is within scope, and repair links affected by your edits. Link only to known destinations. When draft pages have no assigned paths, report suggested cross-references in the delivery note instead of adding speculative paths or cross-document anchors. Leave unrelated files and organization alone. Use `diataxis-organize-docs` when the user also requests collection restructuring.

## Verify and Deliver

- Check claims, identifiers, and example inputs against the evidence and declared version.
- Exercise executable examples when available tools, environment, and authorization permit. Otherwise inspect them against source and report that they were not run. Label conceptual snippets as illustrative when readers could mistake them for executable examples.
- Check affected links, anchors, and any applicable documentation build using available tools.
- Confirm the document satisfies the selected reader need without unnecessary digressions.

Deliver the requested documentation with a concise account of verification and any remaining evidence gaps. Do not present static inspection as execution or a proposed design as shipped behavior.
