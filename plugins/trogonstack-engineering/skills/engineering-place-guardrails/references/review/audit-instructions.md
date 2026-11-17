# Auditing An Instructions File

For AGENTS.md, CLAUDE.md, a rules directory, a style guide, or a review checklist that keeps growing.

## Steps

1. **Split into rules.** One line per distinct instruction. Merge duplicates; note contradictions as findings on their own.
2. **Classify each rule.**
   - *Mechanical*: a program could decide compliance from the code alone. Promotion candidate.
   - *Already enforced*: a tool already checks it, the check runs in a required CI gate, and it covers the rule's full scope. Delete. A check that only runs locally, is optional, or covers part of the rule is a promotion candidate: make it required or widen it first.
   - *Judgment*: intent, priority, trade-off, navigation. Stays in prose.
   - *Stale reference*: the requirement still holds but names code, tools, or paths that moved. Update the reference, then classify the rule again.
   - *Obsolete*: the requirement itself no longer applies. Delete.
3. **Walk each promotion candidate down the pyramid** and write a report entry using [report-template.md](report-template.md).
4. **Rank** candidates by recurrence (how often the mistake actually happens) times cost of a miss. Promote the top ones first; the rest are recorded as follow-ups.
5. **Show the end state.** The file after deletions and promotions, so the reduction is visible.

## Output

```markdown
## Summary
<n> rules: <a> to promote, <b> already enforced, <c> obsolete, <d> judgment (kept)

## Promotions
<report entries, ranked>

## Delete
- <rule>: <already enforced by required check X | obsolete because Y>

## Keep
- <rule>: <why it needs a reader>
```
