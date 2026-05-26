---
name: prd-success-metrics
description: Draft the Success Metrics of a PRD by defining the key metrics used to measure success. Drives discovery through the primary outcome metric, leading indicators, guardrail metrics that must not regress, and the instrumentation source for each. Writes to `.trogonai/project/{projectid}/prd/success-metrics.prd.md`. Use when the user wants to define how success will be measured before building.
allowed-tools:
  - AskUserQuestion
  - Read
  - Write
---

# PRD: Success Metrics

## Purpose

Define the metrics that will decide whether the product is working: with baselines, targets, timeframes, and a clear measurement source. A PRD without measurable success criteria cannot be evaluated post-launch.

## Shared Operating Model

Use `requirements-operating-model` before writing when metrics depend on personas, business problem, current-state costs, unclear source of truth, or downstream impact.

## When to Use

- A PRD has goals but no numbers to measure against
- The team is debating whether the product "worked" after launch
- An existing metrics file is vague ("improve engagement") and needs to be made testable

## Project Identifier

Before writing, determine the `projectid`:

1. If the user has supplied one, use it verbatim.
2. Otherwise, ask for it once. The `projectid` should be a stable, kebab-case identifier for the product/initiative.
3. Confirm the resolved path before writing: `.trogonai/project/{projectid}/prd/success-metrics.prd.md`.

If the file already exists, read it first and ask whether to **replace** or **refine** before overwriting.

## Read Existing Context

Before discovery, read these files when they exist:

- `.trogonai/project/{projectid}/prd/business-problem.prd.md`
- `.trogonai/project/{projectid}/prd/current-state.prd.md`
- `.trogonai/project/{projectid}/prd/personas.prd.md`
- `.trogonai/project/{projectid}/prd/product-description.prd.md`

Use them to tie metrics back to the problem, the status quo cost, user success, and the product shape. If the user proposes a metric that does not connect to those sources, ask one clarification question using the shared clarification pattern before writing.

## Discovery

Ask until all are answered:

1. **Primary outcome metric**: the one number that, if it moved, would prove the product solved the business problem. Must include:
   - Baseline (current value)
   - Target (desired value)
   - Timeframe (when measured)
   - Measurement source (event, query, dashboard, system of record)
2. **Leading indicators**: earlier signals that predict the primary metric will move. Typically observable within days/weeks, while the primary outcome may take a quarter or more.
3. **Guardrail / counter-metrics**: what must NOT regress. Latency, conversion elsewhere, support load, cost-to-serve, churn, error rate. Every product change has potential side effects; name the ones the team is unwilling to accept.
4. **Per-persona success**: for each persona, what is the metric that reflects *their* success (not the business's)? Time-to-value, task completion rate, satisfaction.
5. **Instrumentation status**: for each metric, can it be measured today, or does instrumentation need to be added? If new, who owns adding it and when?
6. **Decision rules**: what result triggers what action? E.g., "if primary metric moves <25% by week 8, we revisit scope; if guardrail breaches threshold, we roll back."

Reject:

- "Users will love it" is not measurable
- "Engagement" without specifying which event
- "Better performance" without a target number and a timeframe
- A target with no baseline: without a baseline, you cannot tell whether the target is ambitious or trivial

## Quality Bar

The file is complete when:

- Exactly **one** primary outcome metric is named (multiple primaries means none is primary)
- Each metric row has baseline, target, timeframe, and source
- At least two guardrail metrics exist
- Each metric is measurable from existing or planned instrumentation, and any missing instrumentation has an owner
- Decision rules state what result triggers what action

## Output

Write the complete file to `.trogonai/project/{projectid}/prd/success-metrics.prd.md` using the template at `assets/success-metrics-template.md`. Read it, substitute `{projectid}` and the date, and fill in each section from the discovery output.

## Writing Guidance

### Writing approach
- **One number that proves the product worked.** Lead with the primary outcome metric; everything else is supporting. If the file opens with five "primaries", none of them is primary.
- **Baseline before target.** Without a baseline, "increase X by 20%" is a wish. Every row must show today's value before tomorrow's.
- **Instrument before you measure.** If a metric depends on instrumentation that does not exist, that is a finding, not a footnote: name the owner and the date.
- **Decision rules link result to action.** A metric the team will not act on is a vanity metric. Pair each metric with what the team will *do* if it moves or stalls.

### Tone and language
- **Numeric, not adjectival.** "Activation" is not a metric: "% of new accounts that create their first project in 7 days" is. Replace adjectives with the event or query that produces the value.
- **Name the source.** Every row references the event, query, dashboard, or system of record that produces it. "Mixpanel funnel `signup → first_project`" beats "product analytics".
- **Distinguish primary, leading, and guardrail.** They are not interchangeable; the file should make the role of each metric obvious at a glance.

### Scope
- **Outcome, not output.** "Shipped X features" is an output. The metric measures whether the change in user behavior or business result actually happened.
- **Business plus per-persona.** Business metrics matter, but each persona should also have a metric that reflects *their* success: otherwise the product can "succeed" while users still suffer.
- **Exclude vanity metrics.** A metric that can move without the problem being solved is excluded explicitly, not silently.

## Good vs Bad Example

**Good**

```md
## Primary outcome metric
| Metric | Baseline | Target | Timeframe | Source |
|--------|----------|--------|-----------|--------|
| Forecast accuracy (Salesforce forecast vs actual close) | 61% | 78% | Q4 close | Salesforce `Forecast` vs `Opportunity.CloseDate` query |

## Leading indicators
| Metric | Baseline | Target | Timeframe | Source |
|--------|----------|--------|-----------|--------|
| % of deals with non-blank Next Steps at week 2 | 62% | 90% | rolling 4 weeks | Salesforce report `Deal Hygiene v3` |
| Median seconds from call-end to note saved | 480s | 30s | rolling 2 weeks | Product event `note_saved` − `call_ended` |

## Guardrail metrics (must not regress)
| Metric | Current | Threshold | Source |
|--------|---------|-----------|--------|
| Salesforce write error rate | 0.4% | < 1.0% | Datadog `sfdc.writes.error_rate` |
| AE weekly Salesforce time | 5.2h | ≤ 5.5h | Time-tracking survey, monthly |

## Per-persona success
- **Mid-market AE:** median note-save time < 30s (their definition of "stop typing at night").
- **Sales Manager:** Monday forecast meeting length < 30 min (their definition of "trust the number").

## Decision rules
- If forecast accuracy moves < 5pp by week 8, we narrow scope to AEs in the West region only.
- If Salesforce write error rate exceeds 1.0% for 24h, we roll back and pause the rollout.
```

**Bad**

```md
## Primary outcome metric
- Engagement
- Activation
- Retention

## Leading indicators
- Users will love it.

## Guardrail metrics
- Latency should be fine.

## Decision rules
- We'll check the numbers and decide.
```

The bad version has three "primaries" (so none is primary), no baselines, no sources, no thresholds, and no rules connecting the numbers to action. Nobody can tell whether the product worked.

## Anti-Patterns to Reject

- Multiple "primary" metrics: pick one.
- Targets with no baselines.
- "TBD" instrumentation with no owner.
- Metrics whose movement does not actually imply the problem is solved (vanity metrics).
- Guardrails listed but with no threshold: "monitor latency" is not a guardrail.

## Allowed Tools

- **AskUserQuestion**: drive discovery and resolve `projectid`
- **Read**: load the existing file if it exists, to decide replace vs refine
- **Write**: write the file
