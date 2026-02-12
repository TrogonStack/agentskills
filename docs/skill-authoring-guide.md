# Skill Authoring Guide

A practical guide to writing, structuring, and maintaining agent skills that work reliably in production.

## What is a skill?

A skill is a bundle of files with a `SKILL.md` manifest containing frontmatter and instructions. Think of it as a versioned playbook an agent can consult when it needs to do real work.

When skills are available, the platform exposes each skill's `name`, `description`, and `path` to the model. The model uses that metadata to decide whether to invoke a skill. If it does, it reads `SKILL.md` for the full workflow.

Skills reduce prompt spaghetti by moving stable procedures and examples into a reusable bundle. They turn brittle megadocs into modular, versionable units of work.

## Anatomy of a SKILL.md

Every skill has two parts: YAML frontmatter and a markdown body.

### Frontmatter

```yaml
---
name: my-skill-name
description: One-line description explaining when to use this skill and what it produces.
allowed-tools: Read, Write, Shell
---
```

| Field | Required | Purpose |
|-------|----------|---------|
| `name` | Yes | Unique identifier. Use kebab-case. Must match the directory name. |
| `description` | Yes | The model's decision boundary for whether to invoke this skill. |
| `allowed-tools` | No | Restricts which tools the agent can use while executing the skill. Omit to allow all tools. |

### Markdown body

The body contains the full workflow: context, steps, templates, examples, and quality checks. Structure it so the agent can follow it top-to-bottom without guessing.

## Writing effective descriptions

Your skill's description is the most important line you'll write. It's the model's routing logic — the decision boundary for when to invoke and when to skip.

### What a good description answers

- **When should I use this?** — The trigger conditions.
- **When should I NOT use this?** — The boundaries (especially important when multiple skills look similar).
- **What are the outputs?** — What the skill produces.

### Description patterns

**Weak (marketing copy):**

```yaml
description: A powerful tool for improving documentation quality.
```

**Strong (routing logic):**

```yaml
description: >-
  Reorganize documentation into the Diataxis framework structure.
  Splits existing docs into tutorials, how-to guides, reference,
  and explanation sections. Use when documentation exists but is
  disorganized or mixes content types. Do not use for generating
  new documentation from scratch.
```

The strong version tells the model exactly when to fire, what it does, and when to skip it.

### Use-when / don't-use-when blocks

For skills where routing ambiguity is likely, add an explicit block directly in the description:

```yaml
description: >-
  Enrich GitHub PR descriptions with root-cause context, related
  issues/PRs, and CC mentions. Use when creating or editing a PR,
  when a PR has an empty or sparse description, or when the user
  asks to improve a PR description. Do not use for commit messages,
  release notes, or changelog entries.
```

This pattern is critical when you have multiple skills that look similar at a glance. Negative examples in descriptions have been shown to recover 20%+ accuracy drops in skill-based routing.

## Structuring the workflow

The body of a skill is the procedure the agent follows. Structure it for linear execution — the agent reads top-to-bottom and acts.

### Recommended sections

```markdown
# Skill Title

Brief description of what this skill accomplishes.

## When to Use

- Trigger condition 1
- Trigger condition 2
- Trigger condition 3

## Workflow

### 1. First Step
What to do and how to do it.

### 2. Second Step
What to do and how to do it.

### 3. Final Step
What to do and how to do it.

## Quality Checklist

- [ ] Check 1
- [ ] Check 2
- [ ] Check 3
```

### Key structural principles

1. **Lead with context, not instructions.** Give the agent enough understanding to make good decisions when the workflow hits an edge case.

2. **Number your steps.** Numbered steps create a clear execution path and make it easy to reference specific points in the workflow.

3. **Use code blocks for commands and templates.** When the agent needs to run a command or produce output in a specific format, show it exactly.

4. **End with a quality checklist.** Checklists act as a verification gate. The agent can self-check before declaring the task complete.

## Templates and examples inside skills

If you've been cramming templates into system prompts, stop. Templates and worked examples inside skills have two advantages:

- **Available exactly when needed.** They load only when the skill is invoked.
- **Zero cost when unused.** They don't inflate tokens for unrelated queries.

This pattern is especially effective for knowledge work outputs:

- Structured reports
- Triage summaries
- Data analysis writeups
- Standardized documents

### How to include templates

Embed templates directly as fenced code blocks inside the workflow step that produces the output:

```markdown
### 5. Compose the Description

Use this structure:

​```markdown
## Summary

[2-4 sentences explaining WHAT changed and WHY.]

## Related

- #<number> -- <relationship>: <brief description>

CC @<username> @<username>
​```
```

The agent sees the template at the moment it needs to produce output, and follows the structure exactly.

### Worked examples

When a template alone isn't enough, add a concrete worked example showing the transformation from input to output:

```markdown
### Example

**Input:**
Raw PR diff showing a null-check was added to `handleAuth()`.

**Output:**
## Summary
Add null-check guard in `handleAuth()` to prevent crash when
session token is undefined. The session middleware strips expired
tokens but `handleAuth` assumed tokens were always present.

## Related
- #342 -- origin: Introduced session token stripping in middleware
- #389 -- related: Similar null-check added to `handleRefresh()`

CC @alice @bob
```

## Negative examples and edge cases

A surprising failure mode: making skills available can initially *reduce* correct triggering. The fix is negative examples plus edge case coverage.

### Why negatives matter

The model doesn't just need to know when to fire a skill — it needs to know when NOT to. Without negatives, similar-looking skills cannibalize each other's triggers.

### Where to place negatives

**In the description** (for routing):

```yaml
description: >-
  Generate a README introduction following the Diataxis 4-paragraph
  structure. Use when creating a new README or rewriting an existing
  one. Do not use for API documentation, changelogs, or contributing
  guides — those need different structures.
```

**In the "When to Use" section** (for edge cases during execution):

```markdown
## When to Use

- Creating a new PR
- Improving an existing PR description
- User asks who to CC or what to reference

## When NOT to Use

- Writing commit messages (use conventional commit format instead)
- Generating release notes (use changelog tooling)
- Reviewing PR code (this skill handles descriptions, not reviews)
```

### Anti-pattern: vague negatives

```markdown
## When NOT to Use
- When it doesn't make sense
- When the user doesn't want it
```

These tell the model nothing. Be specific about what the alternative action should be.

## Quality checklists

Every skill should end with a quality checklist. Checklists serve as a verification gate — the agent self-checks before completing.

### Writing effective checks

Each check should be:

- **Observable** — Can be verified by reading the output.
- **Specific** — References a concrete property, not a feeling.
- **Actionable** — If it fails, the agent knows what to fix.

**Weak checks:**

```markdown
- [ ] Output looks good
- [ ] Everything is correct
```

**Strong checks:**

```markdown
- [ ] Summary explains the root cause, not just the symptom
- [ ] Each related PR has a relationship label (origin, related, alternate)
- [ ] No speculative CC — only people with direct involvement
```

## Deterministic invocation

The default behavior is the model decides when to use a skill. That's often what you want. But when you're running a production workflow with a clear contract, explicitly tell the model to use the skill:

> "Use the `gh-enrich-pr-description` skill."

This is the simplest reliability lever. It turns fuzzy routing into an explicit contract. Use it when:

- The workflow is scripted, not exploratory.
- You need consistent outputs across runs.
- The skill is the only correct action for the context.

## Allowed tools

The `allowed-tools` frontmatter field restricts which tools the agent can use during skill execution. This is both a safety mechanism and a clarity signal.

### When to restrict tools

- **Read-only skills** (analysis, classification): `allowed-tools: Read`
- **File-producing skills** (documentation, reports): `allowed-tools: Read, Write`
- **Shell-dependent skills** (git operations, API calls): `allowed-tools: Read, Write, Shell`

### When to omit

Omit `allowed-tools` when the skill needs full flexibility, such as skills that might use search, browser, or other specialized tools depending on context.

## Skill sizing

A common mistake is making skills too large or too small.

### Too large

A skill that covers an entire domain ("handle all documentation tasks") becomes an unfocused megadoc. The model can't reliably follow a 500-line procedure.

**Symptoms:**
- The workflow has branching paths ("if X, do A; if Y, do B").
- Steps are only relevant in certain scenarios.
- The quality checklist has items that don't always apply.

**Fix:** Split into focused skills, one per concrete task.

### Too small

A skill that wraps a single command or trivial action adds overhead without value. The model could do it without the skill.

**Symptoms:**
- The skill is under 10 lines.
- It doesn't encode any judgment or structure the model wouldn't already produce.
- The workflow has only one step.

**Fix:** Either merge it into a larger skill or remove it entirely.

### Right-sized

A good skill encodes a **procedure** — a multi-step workflow with decisions, structure, and a clear output contract. It should be something the model can do better *with* the skill than without it.

## Maintenance practices

### Version skills through git

Skills are files. Version them the same way you version code:

- Use conventional commits (`feat:`, `fix:`, `chore:`) when changing skills.
- Review skill changes in PRs like you would review code.
- Keep a changelog when skills have external consumers.

### Test skills with real scenarios

Before shipping a skill, run it against 2-3 real scenarios and verify:

1. The model invokes the skill at the right time.
2. The model follows the workflow steps in order.
3. The output matches the quality checklist.
4. Edge cases are handled without the model going off-script.

### Iterate on descriptions first

When a skill misfires (invoked when it shouldn't be, or skipped when it should fire), the first thing to tune is the description. Adjust the routing logic before changing the workflow body.

### Keep skills independent

Skills should not depend on other skills. Each skill should be self-contained — readable and executable in isolation. If two skills share a common procedure, extract the shared part into a separate skill rather than creating implicit dependencies.

## Anti-patterns

| Anti-pattern | Problem | Fix |
|-------------|---------|-----|
| Marketing descriptions | Model can't decide when to invoke | Write routing logic, not slogans |
| No negative examples | Similar skills cannibalize each other | Add "When NOT to Use" with alternatives |
| Monolithic mega-skill | Model can't follow long, branching procedures | Split into focused single-purpose skills |
| Templates in system prompt | Token inflation on every request | Move templates inside the skill |
| Vague quality checks | Agent can't self-verify | Make checks observable, specific, actionable |
| Implicit skill dependencies | Fragile execution, ordering bugs | Keep skills self-contained |
| Missing `allowed-tools` on sensitive skills | Agent uses tools it shouldn't | Restrict tools explicitly |
| Overfitting to one model | Skill breaks when model changes | Test across model versions |

## Example: well-structured skill

Here's the skeleton of a well-structured skill that follows all the patterns above:

```yaml
---
name: analyze-test-coverage
description: >-
  Analyze test coverage gaps and generate a prioritized list of
  missing tests. Use when the user asks about test coverage, wants
  to improve test quality, or before a major release. Do not use
  for writing tests (use a test-writing skill instead) or for
  linting/style checks.
allowed-tools: Read, Shell
---
```

```markdown
# Analyze Test Coverage

Identify untested code paths and produce a prioritized report of
coverage gaps, ranked by risk and change frequency.

## When to Use

- User asks "what's our test coverage?"
- Before a release, to identify risky untested code
- After a large refactor, to find broken coverage

## When NOT to Use

- Writing actual test code (use `write-tests` skill)
- Checking code style or linting issues
- Reviewing test quality (not the same as coverage)

## Workflow

### 1. Collect Coverage Data
[Run coverage tool, parse output]

### 2. Identify Gaps
[Cross-reference with git blame for change frequency]

### 3. Prioritize by Risk
[Rank by: uncovered + frequently changed + critical path]

### 4. Generate Report
[Use report template below]

## Report Template

​```markdown
## Coverage Analysis

**Overall:** X% line coverage, Y% branch coverage

### Critical Gaps (high risk, no coverage)
| File | Lines | Last Changed | Risk |
|------|-------|-------------|------|
| ... | ... | ... | ... |

### Recommended Priority
1. [File] — [reason]
2. [File] — [reason]
​```

## Quality Checklist

- [ ] Coverage data is from the current branch, not stale
- [ ] Gaps are ranked by risk, not just by percentage
- [ ] Report includes change frequency, not just coverage numbers
- [ ] Critical paths (auth, payments, data mutations) are flagged
```

## Further reading

- [Shell + Skills + Compaction: Tips for long-running agents that do real work](https://developers.openai.com/blog/skills-shell-tips) — the OpenAI blog post that inspired many of the patterns in this guide, including production data from Glean on routing accuracy and latency gains.
- [Agent Skills open standard](https://github.com/anthropics/agent-skills)
- [OpenAI Skills documentation](https://platform.openai.com/docs/guides/tools-skills)
- [OpenAI Shell documentation](https://platform.openai.com/docs/guides/tools-shell)
- [OpenAI Compaction documentation](https://platform.openai.com/docs/guides/context-management)
