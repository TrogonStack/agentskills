---
name: diataxis-organize-docs
description: Reorganize documentation into the Diataxis framework structure. Splits existing docs into tutorials, how-to guides, reference, and explanation sections.
allowed-tools:
  - Read
  - Write
---

# Diataxis Documentation Organization

Reorganize documentation by classifying content into the Diataxis categories and creating a structured documentation hierarchy.

## Documentation Categories

| Quadrant | Orientation | Purpose | User Need |
|----------|-------------|---------|-----------|
| **Tutorial** | Learning | Teach through doing | "I want to learn" |
| **How-to** | Task | Solve specific problems | "I want to accomplish X" |
| **Reference** | Information | Describe the machinery | "I need facts about Y" |
| **Explanation** | Understanding | Clarify concepts | "I want to understand why" |

## Directory Structure

Organize docs into this hierarchy, adding topic subdirectories as needed:

```text
docs/
├── tutorial/            # Learning-oriented
│   ├── getting-started/
│   └── {topic}/
├── how-to/              # Task-oriented
│   ├── {task-category}/
│   └── troubleshooting/
├── reference/           # Information-oriented
│   ├── api/
│   ├── configuration/
│   └── architecture/
├── explanation/         # Understanding-oriented
│   ├── concepts/
│   ├── decisions/
│   └── background/
└── README.md            # Navigation hub
```

Always use `docs/README.md` as the root navigation file, never `index.md`.

## Writing Conventions

Keep skill instructions and generated documentation free of manually maintained totals and numbered section references. Use descriptive headings and named links. For ordered procedures, write each Markdown list marker as `1.` so the renderer maintains numbering. Preserve numeric facts that are necessary to understand or use the subject.

## Workflow

Load only the references needed for the current task:

1. **Analyze existing content.** Classify each file or section by the reader's need. Read [classification criteria](references/classification.md) when classifying existing content or resolving ambiguous categories.
1. **Map the structure.** Assign content to the hierarchy above and identify which documents to keep, move, or split.
1. **Separate mixed documents.** When a document serves multiple purposes, read [splitting guidance](references/splitting.md) for the migration procedure and example. Preserve context and link related content across quadrants.
1. **Build navigation.** When creating or updating the documentation hub, read [navigation guidance](references/navigation.md) for its template. Update links affected by moved or split content.
1. **Verify and report.** Apply the completion checks below. For an audit, report the current state, classifications, proposed file placements, and needed cross-references. For completed edits, summarize the changes and verification. Scale the report to the task.

## Completion Checks

- [ ] Each document serves one purpose
- [ ] Tutorials have clear learning outcomes
- [ ] How-to guides solve specific problems
- [ ] Reference is complete and accurate
- [ ] Explanations provide genuine insight
- [ ] Cross-references connect related content and resolve after moves
- [ ] `docs/README.md` makes user intent clear
- [ ] No orphaned, duplicated, or lost content
