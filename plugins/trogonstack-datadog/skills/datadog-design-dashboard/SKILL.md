---
name: datadog-design-dashboard
description: >-
  Design new Datadog dashboards, redesign existing ones, or audit dashboards
  for operational readiness. Covers widget selection, layout organization,
  template variables, group structure, alert threshold validation, and
  zero-knowledge readability. Uses pup CLI for inspecting dashboards and
  validating designs. Use when designing new dashboards, redesigning existing
  ones, auditing before on-call handoff, or reviewing after dashboard changes.
  Do not use for: (1) Datadog agent installation or configuration,
  (2) monitor/alert rule design, (3) APM instrumentation or tracing setup,
  (4) log pipeline configuration.
allowed-tools: AskUserQuestion, Write, Read, Shell
---

# Design Datadog Dashboard

Design a dashboard layout that tells a clear story — from high-level health signals down to granular diagnostics — using proper widget types, group organization, and template variables for reusability.

**Important**: Always check for existing dashboards first with `pup dashboards list`. Do not create a new dashboard if one already exists for the same service or purpose — update the existing one instead. Only create a new dashboard when no relevant one exists or the user explicitly asks for a new one.

**Philosophy**: The frameworks, layouts, and widget guides in this skill are starting points — not rigid rules. Every product and business is different. Understand the domain first, then adapt the frameworks to fit. The best dashboards reflect how the business actually works, not how a generic template says they should.

---

## Interview

First, determine the mode:
- **Design mode** — user wants to create or redesign a dashboard → ask design questions, then run the full workflow
- **Audit mode** — user wants to review an existing dashboard with no intent to redesign → skip to [Audit](#audit)

### Design Questions

**Skip if ALL of these are already specified**: dashboard purpose, target audience, data sources, template variable needs, dashboard strategy.

1. **Purpose** — "What is this dashboard for? Service overview, infrastructure, executive KPIs, debugging, or SLO tracking?"
2. **Audience** — "Who will use this? On-call engineers, platform team, leadership, or mixed?"
3. **Data Sources** — "Which Datadog products are involved? Metrics only, APM + Metrics, Logs + Metrics, or full stack?"
4. **Scope** — "Is this for a single service, a group of services, or infrastructure-wide?"
5. **Dashboard Strategy** — "One dashboard per service, or a consolidated view?" — share the trade-offs from [references/layouts.md](references/layouts.md) to help them decide. If unsure, ask: "During an outage, does your team investigate one service at a time, or do they need to see all services simultaneously?"
6. **Existing Dashboard** — "Is there an existing dashboard to audit or redesign?" If yes, fetch with `pup dashboards get <id>` before designing.

### Audit Questions

**Skip if ALL of these are already specified**: dashboard ID or URL, service name or team context.

**Always interview if**: No dashboard ID is provided or multiple dashboards may be relevant.

1. **Dashboard** — "Which dashboard should I review? Provide a dashboard ID, URL, or service name to search for."
2. **Business Context** — "Can you tell me what this service does for customers? Are there codebases or docs I can read to understand the product?"
   - Impact: Understanding the domain lets the review focus on whether the right metrics are being tracked, not just whether generic rules are followed
3. **Focus** — "Is there anything specific you want me to focus on? (A) Full review, (B) Alert thresholds only, (C) Business section, (D) Layout and readability"
   - Default to full review if unspecified

---

## Domain Discovery

*Applies to design mode. Skip if auditing only.*

Before designing, understand what you are building observability for. The metrics that matter depend entirely on the product and business context.

**Ask the user**:
- "Can you tell me about the product and what this service does for the business? What does a customer experience when they interact with it?"
- "What does a bad day look like for this service? What breaks, and how do customers feel it?"
- "Are there codebases, architecture docs, or README files I can read to understand the service and its dependencies?"

**If the user points you to a codebase**: Read it. Look at the entry points, the API routes, the database models, the queue consumers, the external service calls. Understanding the code gives you the context to choose metrics that actually matter — not just generic RED/USE signals.

**If the user describes the business**: Use that context to tailor the Business (`B`) section. An e-commerce service cares about checkout success rates. A messaging service cares about delivery latency. A payment service cares about transaction completion. Generic "request rate" and "error rate" are a starting point, but the real value comes from metrics that map to customer-visible outcomes.

**Skip domain discovery if**: You already have deep context about the service from prior conversations or the user has provided detailed specifications.

---

## Design

*Skip to [Audit](#audit) if the user only wants to review an existing dashboard.*

### 1. Gather existing context

```bash
pup dashboards list
pup dashboards get <dashboard-id>
```

If auditing an existing dashboard, fetch its definition first and analyze its current structure before redesigning.

### 2. Explore available telemetry

Before designing widgets, check what metrics and tag values actually exist for the service. This prevents designing around metrics that don't exist or using the wrong tag values in queries.

```bash
# See what metrics are available for the service
pup metrics list --filter="<service-name>.*"

# Verify the service tag is active and see what metrics are flowing
pup metrics list --filter="trace.*" --tag-filter="service:<service-name>"
```

Use the actual metric names and tag values you find here when writing widget queries — do not guess or invent them. If a metric you expect does not appear, flag it to the user before building widgets around it.

### 3. Choose a framework

Match the dashboard purpose to a framework. Read [references/frameworks.md](references/frameworks.md) for detailed metric mappings and group structures.

| Purpose | Framework |
|---------|-----------|
| Service overview | RED (Rate, Errors, Duration) |
| Infrastructure | USE (Utilization, Saturation, Errors) |
| Executive/business | Golden Signals |
| SLO tracking | SLI/SLO |
| Debugging | Drill-down |

### 4. Design the layout

Using your domain understanding and the chosen framework, design the group structure and select widgets. Read these references before designing:

- **[layouts.md](references/layouts.md)** — Template variable conventions, group structure patterns, dashboard strategy trade-offs, grid sizing, anti-patterns
- **[widgets.md](references/widgets.md)** — Widget selection guide, display options, sizing, naming conventions
- **[thresholds.md](references/thresholds.md)** — Alert threshold markers, threshold proximity, Y-axis configuration

### 5. Write the design output

Present the design using this template:

```markdown
# Dashboard Design: [Dashboard Title]

## Purpose
[1-2 sentences: what this monitors, who uses it]

## Template Variables
| Variable | Tag | Default |
|----------|-----|---------|
| ... | ... | `*` |

## Layout

### Group: [Group Title]
| Widget | Type | Query/Metric | Width | Alert Threshold |
|--------|------|-------------|-------|----------------|
| ... | ... | ... | ... | ... |

[Repeat for each group]
```

---

## Audit

Applies to both modes. Run after design, or directly if auditing an existing dashboard.

The core principles are: graphs should earn their place with alert thresholds, thresholds should sit close to normal traffic, a business section should exist at the top, and the dashboard should be readable by someone with zero service knowledge.

These are guiding principles — not a rigid checklist. Apply judgment based on the product and business context. A context-providing metric (like deployment events) may earn its place without a threshold. A service with unusual traffic patterns may need different proximity rules.

### 1. Fetch the dashboard

```bash
# If given a service name, list all dashboards and identify the relevant one by title
pup dashboards list

# If given a URL, extract the dashboard ID from the path (e.g., /dashboard/abc-def-ghi/...)

# Get the full dashboard definition (includes the dashboard URL in the response)
pup dashboards get <dashboard-id>

# Verify real metric names exist
pup metrics list --filter="trace.http.request.*"
```

Parse the response to build an inventory of all widgets, groups, and their configurations.

### 2. Build widget inventory

Read [references/widgets.md](references/widgets.md) for the full widget prefix system before cataloging.

Catalog every widget in the dashboard:

| Widget Title | Prefix | Type | Group | Has Alert Threshold | Threshold Value | Notes |
|-------------|--------|------|-------|--------------------:|----------------|-------|
| ... | I0/P1/D0/B0/— | ... | ... | ... | ... | ... |

Focus on timeseries and query value widgets — these are the primary candidates for alert threshold markers.

### 3. Audit alert thresholds

Read [references/thresholds.md](references/thresholds.md) for threshold marker principles, configuration details, and findings format.

For each timeseries widget, check:
- Does it have a marker/threshold line configured?
- Is the marker colored red for visibility?
- Does the threshold correspond to an actual monitor/alert?

### 4. Audit threshold proximity

Read [references/thresholds.md](references/thresholds.md) for proximity guidance, Y-axis configuration rules, and findings format.

For each widget with a threshold, check:
- What is the typical (normal) value range?
- Where is the threshold set?
- Is there excessive whitespace between the normal line and the alert line?
- Is the Y-axis auto-scaled or explicitly set?

### 5. Audit business section

**Principle**: A dedicated Business (`B`) group should exist at the top of the dashboard with 5-8 key metrics for immediate outage identification. Business metrics are customer-visible outcomes — not infrastructure or domain internals. The specific metrics should reflect the product's business transactions, not generic traffic and error rates.

Check:
- Does a Business group exist (named "Business", "B", or equivalent)?
- Is it the first group on the dashboard?
- Do its widgets use the `B0-N:` prefix?
- Does it contain 5-8 metrics covering: customer-visible success rates, key transaction flows, and SLA-impacting latency?
- Can someone determine "are customers affected?" within 5 seconds of opening the dashboard?

**Findings format**:

```markdown
#### Business Section Audit

**Status**: MISSING / INCOMPLETE / OK

**Current state**: [Description of what exists]

**Recommended metrics** (if missing or incomplete):
1. B0: Key transaction success rate (are critical flows completing?)
2. B0: Customer-facing error rate (are requests failing for customers?)
3. B1: API p99 latency (are responses slow for customers?)
4. B1: Total request rate (are we receiving traffic?)
5. B2: Queue depth or processing lag (is async work backing up?)
6. B2: Key business event throughput (e.g. orders created, payments processed)
```

### 6. Apply zero-knowledge viewer test

**Principle**: Someone with zero knowledge of the service should be able to spot problems by looking for red indicators.

Evaluate:
- Can you identify a problem in under 10 seconds without reading widget titles?
- Are thresholds visible as red lines on every graph?
- Is conditional formatting applied to query value widgets (green/yellow/red)?
- Are group names self-explanatory?
- Is there a note widget with runbook links or team ownership?

**Findings format**:

```markdown
#### Zero-Knowledge Readability Audit

| Check | Status | Finding |
|-------|--------|---------|
| Problems visible in <10s | FAIL | No red lines on 8 of 12 graphs |
| Conditional formatting on QV widgets | PARTIAL | 2 of 4 QV widgets have thresholds |
| Group names self-explanatory | OK | All groups use clear names |
| Runbook/ownership note | MISSING | No note widget with team info |
```

### 7. Generate audit report

Compile all findings into a structured report:

```markdown
# Dashboard Audit: [Dashboard Title]

**Dashboard ID**: [id]
**URL**: [url]
**Review date**: [date]

## Summary

[2-3 sentence summary: overall health of the dashboard, critical issues count]

## Critical Issues

[List issues that must be fixed before the dashboard is production-ready]

## Alert Threshold Audit
[From step 3]

## Threshold Proximity Audit
[From step 4]

## Business Section Audit
[From step 5]

## Zero-Knowledge Readability Audit
[From step 6]

## Recommended Actions

### Must Fix
1. [Action item with specific widget and group reference]

### Should Fix
1. [Action item]

### Nice to Have
1. [Action item]
```

---

## Quality Principles

- [ ] Widget queries use real metric names verified via `pup metrics list` — no invented metric names
- [ ] Dashboard reflects the actual product and business — metrics tailored to the domain
- [ ] Dashboard title follows `[service] Purpose` pattern — no "Dashboard" suffix, no environment in the title
- [ ] `title` field updated in the JSON (not just the filename) — redeploy after any title change
- [ ] Template variables match the dashboard type — see [references/layouts.md](references/layouts.md)
- [ ] Widget queries use template variable scopes verified via `pup metrics list` — no hardcoded env, service, or host values; use the variable set appropriate for the dashboard type (see [references/layouts.md](references/layouts.md))
- [ ] **Business group** with 5-8 `B`-prefixed metrics tailored to the service's customer-visible outcomes
- [ ] Groups ordered macro-to-micro (business → overview → details)
- [ ] **Every widget title uses the layer-priority prefix** (`I0:`, `P1:`, `D0:`, `B0:`, etc.) — see [references/widgets.md](references/widgets.md)
- [ ] Widget titles use sentence case, don't repeat group name
- [ ] **Timeseries widgets have alert threshold markers** (red lines) where the metric is alertable — see [references/thresholds.md](references/thresholds.md)
- [ ] **Thresholds close to normal traffic** — no excessive whitespace
- [ ] **Zero-knowledge readability** — someone with no service knowledge can spot problems via red indicators
- [ ] Query Value widgets have conditional formatting (green/yellow/red)
- [ ] Every metric earns its place — if it spikes, someone can act on it
- [ ] All audit findings include specific widget names and group references
- [ ] Recommended actions categorized by priority (must/should/nice-to-have)
- [ ] Dashboard URL included in audit report

## References

- **[Observability Frameworks](references/frameworks.md)** — RED, USE, Golden Signals, SLI/SLO with metric mappings
- **[Layout & Structure](references/layouts.md)** — Template variables, group patterns, dashboard strategy, grid sizing, anti-patterns
- **[Widgets](references/widgets.md)** — Widget prefix system, types, display options, sizing, naming conventions
- **[Alert Thresholds](references/thresholds.md)** — Threshold markers, proximity guide, Y-axis configuration
