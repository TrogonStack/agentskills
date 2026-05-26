---
name: prd-business-problem
description: Draft the Business Problem of a PRD by framing the core problem the product addresses, the gaps in today's tools and processes, and why change is necessary now. Drives discovery through who experiences the pain, what fails today, and the cost of inaction. Writes to `.trogonai/project/{projectid}/prd/business-problem.prd.md`. Use when the user wants to write, refine, or audit the problem framing of a product or feature.
allowed-tools:
  - AskUserQuestion
  - Read
  - Write
---

# PRD: Business Problem

## Purpose

Produce the **Business Problem** file of a PRD: the core problem the product addresses, what current tools and processes fail to solve, and why change is necessary now: grounded in evidence.

## Shared Operating Model

Use `requirements-operating-model` when the problem framing depends on existing product context, artifacts, unclear source of truth, or clarification before editing.

## When to Use

- The user is starting a PRD and needs to frame the problem
- An existing PRD has a vague problem statement that needs sharpening
- The user is pitching an idea and needs to validate there is a real problem before designing a solution

## Project Identifier

Before writing, determine the `projectid`:

1. If the user has supplied one, use it verbatim.
2. Otherwise, ask for it once. The `projectid` should be a stable, kebab-case identifier for the product/initiative (e.g., `onboarding-revamp`, `realtime-collab`).
3. Confirm the resolved path before writing: `.trogonai/project/{projectid}/prd/business-problem.prd.md`.

If the file already exists, read it first and ask whether to **replace** or **refine** before overwriting.

## Discovery

Ask until all three areas are answered concretely. Each section of the template must be backed by evidence (data, tickets, quotes, lost deals, churn signals): opinion alone is not evidence.

1. **The Problem**
   - Who experiences it? Specific user segment: role, team, persona. Reject "users", "everyone", "our customers".
   - What pain does it cause, in their words? Symptom and observable behavior, not a missing feature. Reject solution-shaped answers like "we need a dashboard".
   - Why does it matter? The business or user impact in concrete terms.

2. **Current Gaps**
   - What tools, processes, or systems do people use today to cope?
   - Where do those fail: workarounds, manual effort, missing capability, fragmented data, blind spots?
   - Why are those gaps significant rather than minor inconveniences?

3. **Why Change Is Necessary**
   - What is the trigger making this urgent now: a market shift, a deadline, an escalation, a strategic bet?
   - What happens if nothing changes in the next quarter / year?
   - What opportunity is at risk: revenue, retention, competitive position, regulatory standing?

If the user describes a solution, ask: *"What pain does that solve, for whom, and how do you know they have it?"* Restart from step 1.

If the user describes a metric improvement ("increase conversion"), ask: *"What is the user-facing symptom that drives that metric today?"*

## Quality Bar

The file is complete when:

- A reader unfamiliar with the project can name the affected user segment and the pain they feel
- Current Gaps name real tools, processes, or systems, not abstractions like "the current experience"
- Why Change Is Necessary points to a concrete trigger and a named consequence of inaction
- At least one concrete piece of evidence (a number, a quote, a ticket count, a lost deal) is woven into the document, not just "we hear this a lot"

## Output

Write the complete file to `.trogonai/project/{projectid}/prd/business-problem.prd.md` using the template at `assets/business-problem-template.md`. Read it, substitute `{projectid}` and the date, and fill in each section from the discovery output.

## Writing Guidance

### Writing approach
- **Complete paragraphs, not bullet grids.** Each section is prose that tells a story and supplies context. Lists belong inside paragraphs only when they enumerate concrete evidence.
- **Defend every claim.** A problem statement, a gap, or a "why now" is only acceptable when paired with the reasoning or evidence that supports it. If a sentence could be deleted without losing the argument, delete it.
- **Lead with the why before the what.** The reader is a stakeholder deciding whether this is worth doing. Anchor on motivation; mechanics belong in `prd-product-description`.
- **Weave evidence into the prose.** Numbers, quotes, and named incidents belong inside the paragraphs, not in a separate evidence list.

### Tone and language
- **Active voice and concrete nouns.** Name the actor, the action, and the object. "Reps re-enter notes" beats "notes are re-entered."
- **No fluffy adjectives.** Forbidden words include *comprehensive, sophisticated, seamless, powerful, engaging, robust, world-class, cutting-edge, next-generation*. If the sentence relies on one of these, rewrite it with a measurable fact.
- **Readable by both technical and non-technical stakeholders.** No internal acronyms, no jargon without a definition the first time it appears.

### Scope
- **Problem, not solution.** Anything that prescribes how to build, what the UI looks like, or which technology to use is out of scope here. Park solution ideas for `prd-product-description`.
- **No invention.** Every claim must come from the user's input or named project context (interviews, tickets, dashboards, contracts). If a fact is not available, ask for it rather than fabricating one.

## Good vs Bad Example

**Good**

```markdown
## The Problem
Mid-market sales reps at companies of 200–2000 employees who manage 30–80 active
deals at once in Salesforce spend 45–60 minutes per day re-entering deal notes
from Zoom calls. They miss follow-ups because notes live in three places
(Zoom chat, their notebook, Salesforce), and managers cannot see deal status
without DMing the rep. This matters because forecast accuracy and rep retention
both depend on the system of record being current.

## Current Gaps
Today reps stitch together Zoom's auto-transcripts, a personal notebook, and
manual Salesforce entry. Salesforce's native call logging requires reps to
re-listen to recordings; Zoom AI Companion does not write back to Salesforce;
internal Zapier flows break weekly because Zoom topic strings change. The
result is that the "next steps" field is blank for 38% of deals at week 2 of
the cycle, leaving managers without the signal they need to coach or
intervene.

## Why Change Is Necessary
Q3 forecast accuracy dropped from 78% to 61% and the CFO escalated to the CRO.
Two enterprise deals slipped last quarter because follow-ups were missed,
representing $1.4M in lost ARR. Six of the last nine AE exit interviews cited
"tooling frustration" as a reason for leaving. If nothing changes, we expect
forecast accuracy to keep declining into Q4 board reviews and to lose another
2–3 AEs we cannot afford to backfill before renewal season.
```

**Bad**

```markdown
## The Problem
Our users find the current experience frustrating and want something better.

## Current Gaps
The existing tools do not work very well and customers have been asking for
improvements.

## Why Change Is Necessary
We need to improve the product to stay competitive and keep up with industry
trends.
```

The bad version has no segment, no observable pain, no named tools, no
quantified consequence, and no real evidence: every line could apply to any
product. A reader is no more motivated after reading it than before.

## Anti-Patterns to Reject

- "Users want a better experience" is not a problem, has no segment, and offers no evidence.
- "We need feature X": solution stated as problem.
- "Conversion is low": metric, not a user pain.
- "Customers have asked for this": push for how many, who specifically, and what they actually said.
- "Industry trend": push for how it shows up for *this* user segment.
- "The current tools are bad" in Current Gaps: name the actual tools and the specific failure mode.
- Fluffy adjectives: "comprehensive", "seamless", "powerful", "engaging" and similar. Replace with a measurable fact.
- Passive voice that hides the actor: "notes are missed" → who misses them, and how often.
- Any claim that cannot be traced back to user input or named project context: ask, do not invent.

## Allowed Tools

- **AskUserQuestion**: drive discovery and resolve `projectid`
- **Read**: load the existing file if it exists, to decide replace vs refine
- **Write**: write the file
