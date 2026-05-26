---
name: prd-personas
description: Draft the Personas of a PRD by defining the users, their goals, and what success looks like for them. Drives discovery through who the users are, the jobs they are trying to do, their constraints, and the per-persona definition of success. Writes to `.trogonai/project/{projectid}/prd/personas.prd.md`. Use when the user wants to define or sharpen who the product is for.
allowed-tools:
  - AskUserQuestion
  - Read
  - Write
---

# PRD: Personas

## Purpose

Define the users the product serves, the jobs they are trying to get done, and what success looks like *for them*, not for the business. Personas grounded in real roles make scope and tradeoffs much easier to decide later.

## Shared Operating Model

Use `requirements-operating-model` when persona decisions depend on existing product context, artifacts, unclear source of truth, or clarification before editing.

## When to Use

- A PRD targets "users" or "everyone" and needs sharpening
- The team is unclear which user types are primary vs incidental
- Design or scope decisions are stuck because the audience is fuzzy

## Project Identifier

Before writing, determine the `projectid`:

1. If the user has supplied one, use it verbatim.
2. Otherwise, ask for it once. The `projectid` should be a stable, kebab-case identifier for the product/initiative.
3. Confirm the resolved path before writing: `.trogonai/project/{projectid}/prd/personas.prd.md`.

If the file already exists, read it first and ask whether to **replace** or **refine** before overwriting.

## Discovery

For each candidate persona, ask until all are answered:

1. **Identity**: role / job title / team / context. Concrete enough that the user could name a real person who fits.
2. **Job to be done**: what outcome are they trying to achieve, in their own framing? Not the feature they want; the result they need.
3. **Constraints**: time, expertise, tools they already use, permissions, environment (mobile / desktop / shop floor / on-call).
4. **Frequency / intensity**: daily power user, occasional, one-time. This shapes onboarding and depth.
5. **Definition of success for them**: what does a good outcome feel like from their seat? Saved time, fewer escalations, confidence, control.
6. **Priority**: primary, secondary, or explicitly out of scope.

Then ask: **who is explicitly NOT a persona for this product?** Excluding someone is as informative as including them.

Push back on:

- A single "user" persona: there are usually 2–3 distinct ones (e.g., end user, admin, support)
- Personas defined by demographics ("millennials") rather than role / job
- Personas that mirror internal org charts rather than user reality

## Quality Bar

The file is complete when:

- Each persona has a role, a job to be done, and their own definition of success
- Primary vs secondary is explicit
- At least one excluded persona is named
- Each persona is distinguishable from the others by behavior or context, not just label

## Output

Write the complete file to `.trogonai/project/{projectid}/prd/personas.prd.md` using the template at `assets/personas-template.md`. Read it, substitute `{projectid}` and the date, repeat the persona block once per persona (marking primary vs secondary), and fill in each section from the discovery output.

## Writing Guidance

### Writing approach
- **Make the user feel real.** A reader should picture a specific person at a specific moment, not a category. Anchor each persona in their role, environment, and a representative day.
- **One block per persona, in prose.** Identity, job to be done, constraints, frequency, and success live together so the reader meets a person, not a spreadsheet row.
- **Success from their seat.** What does a good day look like for *them*? Saved time, fewer escalations, looking competent to a peer. Business outcomes belong in `prd-success-metrics`.
- **Exclude on purpose.** Naming who is *not* the persona is one of the highest-leverage decisions in a PRD: it prevents months of accidental scope. Treat the exclusions list as load-bearing.

### Tone and language
- **Plain language.** No internal acronyms, no segmentation jargon. Anyone in the company should recognize the persona.
- **Role and job, not demographic.** "Mid-market AE managing 30–80 deals" beats "millennials" or "power user". Persona is what they do and need, not who they are demographically.
- **Use their voice when you have it.** A real quote from a user interview is worth more than a paraphrase. If you have one, weave it in.

### Scope
- **Who, not what.** Behaviors, constraints, and definitions of success, not the features they want. Feature opinions belong in FRDs.
- **Primary vs secondary is explicit.** Without that, every persona will be treated as equally important and tradeoffs become unresolvable.
- **No invention.** Every persona comes from real users, sales conversations, or named research. If a persona is hypothetical, mark it as such so reviewers can challenge it.

## Good vs Bad Example

**Good**

```markdown
## Primary: Mid-market Account Executive
- **Context:** Works from a laptop between back-to-back Zoom calls; 30–80 active opportunities; reports to a Sales Manager who runs weekly pipeline review.
- **Job to be done:** "End the day knowing every deal moved forward, without spending the evening typing notes."
- **Constraints:** Tools already in hand: Zoom, Salesforce, Slack. No tolerance for a new tab. Often on mobile between meetings.
- **Frequency:** Multiple times per day, every workday.
- **Success looks like:** Notes captured in under 30 seconds after a call; manager never has to DM them about pipeline state.

## Secondary: Sales Manager (Mid-market)
- **Context:** Manages 8–15 AEs; spends Monday morning preparing the forecast meeting.
- **Job to be done:** Trust the pipeline number without manually chasing reps.
- **Constraints:** Cannot ask reps for more typing; already at burnout risk per last engagement survey.
- **Frequency:** Daily glance; deep weekly review.
- **Success looks like:** Forecast accuracy back above 75%; pipeline review meeting cut from 60 min to 20.

## Not a persona (out of scope)
- Enterprise AEs (deals > $250k ACV): workflow is different (deal desk, legal review); deferred.
- Sales Operations analysts: they configure but do not live in the deal flow.
- Customers/buyers: this product is for the seller, not the buyer.
```

**Bad**

```markdown
## Primary: Sales user
- **Context:** Uses our product.
- **Job to be done:** Sell more.
- **Constraints:** Wants it to be easy.
- **Frequency:** Often.
- **Success looks like:** Increased revenue.
```

The bad version describes a category, not a person. "Sell more" is the business's goal, not the user's. No reader could rule a feature in or out from it.

## Anti-Patterns to Reject

- "Our users": one undifferentiated blob.
- "Power users vs casual users": without a behavior that distinguishes them.
- Demographics-as-persona ("Gen Z customers"): push for the role and job.
- Success defined only in business terms ("they convert"): must include the user's own definition.

## Allowed Tools

- **AskUserQuestion**: drive discovery and resolve `projectid`
- **Read**: load the existing file if it exists, to decide replace vs refine
- **Write**: write the file
