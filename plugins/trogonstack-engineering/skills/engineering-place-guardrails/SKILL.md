---
name: engineering-place-guardrails
description: "Decide where a guardrail belongs so a mistake is prevented by the cheapest layer that can carry it: the codebase itself (API design, architecture, refactoring), then static analysis (types, compilers, lints, tests, CI), then verification (formal, property, runtime), then prose (rules, skills, AGENTS.md), and only last human review. Walks a proposed rule or a recurring mistake down that pyramid, stops at the first layer that can hold it, and reports what to build there plus what prose or review can be deleted once it lands. Use when someone wants to add a rule to AGENTS.md, CLAUDE.md, a skill, a style guide, or a review checklist; when the same review comment or agent mistake keeps coming back; when auditing an instructions file that keeps growing; when asking 'how do we stop agents from doing X', 'should this be a lint', or 'where should this convention live'. Do not use for choosing a specific lint tool's configuration, writing the test itself, or general code review."
allowed-tools:
  - AskUserQuestion
  - Read
  - Write
  - Bash
---

# Place Guardrails

Every guardrail costs something each time it is used. Put it where that cost is lowest: make the mistake impossible in the code before making it detectable, detectable before asking anyone to remember it, and remembered before asking a human to catch it.

## Core Principle

Picture an inverted pyramid. The wide top is where effort should go; cost per prevented mistake grows as you move down.

| Layer | How it stops the mistake | Paid on every change | Read when weighing it |
|---|---|---|---|
| 1. Codebase | cannot be written | nothing | [layers/codebase.md](references/layers/codebase.md) |
| 2. Static analysis | rejected deterministically before merge | machine time | [layers/static-analysis.md](references/layers/static-analysis.md) |
| 3. Verification | caught against a stated property, at build or run time | more machine time, some misses reach runtime | [layers/verification.md](references/layers/verification.md) |
| 4. Prose | a reader remembers and complies | context, attention, drift | [layers/prose.md](references/layers/prose.md) |
| 5. Human review | a person notices | scarce time, slow feedback, inconsistency | [layers/human-review.md](references/layers/human-review.md) |

Each layer down is less reliable and more expensive per use, and the cost recurs: prose is re-read by every agent on every task, review is paid on every pull request. A refactor at the top is paid once.

The lower layers are not bad. They are the right home for intent, trade-offs, and judgment, which the upper layers cannot express. The failure is using a lower layer for something an upper layer could carry: the expensive layer fills with work the cheap one should do, and crowds out what only it can do.

## Principles

### 1. Start At The Top And Walk Down

Ask each layer in order "can you carry this?" and stop at the first yes. Do not start from the layer the request arrived in. A request to "add a line to AGENTS.md" is a request to prevent a mistake; the prose is one candidate answer, usually not the best. Read only the layer files you are actually weighing, top down, and stop reading once one says yes.

### 2. Make It Unrepresentable Before Making It Detectable

A type that cannot hold an invalid value beats a lint that flags it, which beats a test that catches it. If the right path is also the easy path, agents and humans take it without being told.

Read [references/layers/codebase.md](references/layers/codebase.md) when looking for the codebase move, or when it seems too expensive to make now.

### 3. Deterministic Beats Probabilistic

Layers 1 to 3 give the same answer every time and do not depend on anyone having read anything. Layers 4 and 5 depend on attention, which is finite. If a program can check a rule, a program should check it. "Never import X from Y" is a lint, not a sentence.

Read [references/layers/static-analysis.md](references/layers/static-analysis.md) when a rule is phrased "never" or "always", or when a proposed check would be noisy.

### 4. Prose Is A Backlog

Every rule in an instructions file is either something only a reader can apply, or a guardrail waiting to be promoted. Treat the second kind as debt. When it is promoted, delete the prose.

Read [references/layers/prose.md](references/layers/prose.md) when deciding whether a rule is judgment or mechanical. Read [references/review/audit-instructions.md](references/review/audit-instructions.md) when the input is a whole AGENTS.md, CLAUDE.md, rules directory, or checklist rather than one rule.

### 5. Recurrence Is The Signal

The same review comment twice, or the same agent error across sessions, means the current layer is not holding it. Move it up, not sideways: a second, louder sentence is not a fix.

### 6. Human Review Is For Judgment Only

Reserve the bottom layer for what no layer above can decide. Every mechanical catch a reviewer makes is evidence of a missing guardrail higher up.

Read [references/layers/human-review.md](references/layers/human-review.md) when the guardrail seems to land at the bottom, or when mining review comments for candidates.

## Procedure

1. **Name the mistake.** State the concrete wrong outcome, not the rule text. "Handlers call the database directly", not "follow the repository pattern". For a whole file, switch to the audit steps (principle 4).
2. **Find where it lives today.** Which layer catches it now, if any, and the evidence it slips through.
3. **Walk the layers top down** (principle 1), reading each layer's file only while weighing it.
4. **Weigh one-time cost against recurring cost.** If the upper layer is too expensive now, pick the next one down and record the upper move as a follow-up. A breaking change is the user's call; ask with AskUserQuestion.
5. **Plan the deletion.** List the prose, checklist items, or review steps that become redundant once the guardrail lands.
6. **Report** in the format below.

## Report Format

```markdown
### <mistake, one line>

- Today: <layer that catches it now, or "nothing"> (<evidence of slippage>)
- Layer chosen: <codebase | static analysis | verification | prose | human review>
- Why not higher: <one line per layer above the chosen one>
- Move: <the concrete change>
- Delete after: <redundant prose, checklist items, review steps, or "none">
- Follow-up: <deferred higher-layer move, or "none">
```

Read [references/review/report-template.md](references/review/report-template.md) before writing the first entry, for worked examples including one that correctly lands at human review.

## Quality Checklist

- [ ] The mistake is stated as an outcome, not as the text of a rule.
- [ ] Every layer above the chosen one has a stated reason it cannot carry the guardrail.
- [ ] Rules a program can check were not left in prose.
- [ ] Prose kept in place encodes intent, priority, or judgment.
- [ ] Redundant prose and review steps are listed for deletion.
- [ ] Deferred higher-layer moves are recorded, not dropped.
