---
name: datadog-review-dashboard
description: >-
  Review existing Datadog dashboards for operational readiness. Audits alert
  threshold markers, threshold proximity to normal traffic, customer-facing
  section completeness, and zero-knowledge readability. Uses pup CLI to fetch
  dashboard definitions. Use when auditing dashboards before on-call handoff,
  after dashboard changes, or during operational reviews. Do not use for:
  (1) designing new dashboards from scratch, (2) monitor/alert rule design,
  (3) APM instrumentation or tracing setup, (4) log pipeline configuration.
allowed-tools: AskUserQuestion, Read, Shell
---

# Review Datadog Dashboard

Audit an existing Datadog dashboard against operational readiness principles. The core principles are: graphs should earn their place with alert thresholds, thresholds should sit close to normal traffic, a customer-facing section should exist, and the dashboard should be readable by someone with zero service knowledge.

These are guiding principles — not a rigid checklist. Apply judgment based on the product and business context. A context-providing metric (like deployment events) may earn its place without a threshold. A service with unusual traffic patterns may need different proximity rules.

## Interview Phase

**Skip interview if ALL of these are already specified:**
- Dashboard ID or URL
- Service name or team context

**Always interview if**: No dashboard ID is provided or multiple dashboards may be relevant.

### Questions

1. **Dashboard** — "Which dashboard should I review? Provide a dashboard ID, URL, or service name to search for."
   - Impact: Determines which dashboard definition to fetch

2. **Business Context** — "Can you tell me what this service does for customers? Are there codebases or docs I can read to understand the product?"
   - Impact: Understanding the domain lets the review focus on whether the right metrics are being tracked, not just whether generic rules are followed

3. **Focus** — "Is there anything specific you want me to focus on? (A) Full review, (B) Alert thresholds only, (C) Customer-facing section, (D) Layout and readability"
   - Impact: Determines review scope — default to full review if unspecified

---

## Workflow

### 1. Fetch Dashboard Definition

```bash
# If given a service name, search for matching dashboards
pup dashboards list --filter="<service-name>"

# If given a URL, extract the dashboard ID from the path (e.g., /dashboard/abc-def-ghi/...)

# Get the full dashboard definition
pup dashboards get <dashboard-id>

# Get the dashboard URL for reference
pup dashboards url <dashboard-id>
```

Parse the response to build an inventory of all widgets, groups, and their configurations.

### 2. Build Widget Inventory

Catalog every widget in the dashboard:

| Widget Title | Prefix | Type | Group | Has Alert Threshold | Threshold Value | Notes |
|-------------|--------|------|-------|--------------------:|----------------|-------|
| ... | I0/P1/D0/— | ... | ... | ... | ... | ... |

Check that every widget title uses the layer-priority prefix system:
- `I0-N:` for infrastructure (load balancers, databases, networks)
- `P0-N:` for platform (service-specific components from the codebase)
- `D0-N:` for domain (business metrics)
- The number indicates priority within the layer (`0` = most critical)

**Customer-Facing group and the prefix system**: The Customer-Facing group is a cross-cutting view across layers, not a fourth layer. Widgets inside it retain their source-layer prefix (e.g., `P0: GraphQL Error Rate`, `D0: Purchase Success Rate`, `I0: Healthy Hosts`). The group name itself does not use a layer prefix — it is simply called "Customer-Facing" (or "Triage", "Overview", etc.). Query Value widgets in the Customer-Facing group do not need a prefix since they are big-number status indicators, not timeseries.

Focus on timeseries and query value widgets — these are the primary candidates for alert threshold markers.

### 3. Audit Alert Thresholds

**Principle**: Timeseries graphs should generally have an alert threshold (red line). If a metric doesn't warrant an alert, question whether it belongs — but use judgment. Some metrics provide valuable context (deployment markers, dependency traffic patterns) without needing a threshold.

For each timeseries widget, check:
- Does it have a marker/threshold line configured?
- Is the marker colored red for visibility?
- Does the threshold correspond to an actual monitor/alert?

**Findings format**:

```markdown
#### Alert Threshold Audit

| Widget | Group | Status | Finding |
|--------|-------|--------|---------|
| Requests/s | Rate | MISSING | No threshold marker — add alert line or remove widget |
| Error rate | Errors | OK | Red line at 5% |
| CPU usage | Infra | MISSING | No threshold — is this metric alertable? |
```

### 4. Audit Threshold Proximity

**Principle**: Alert thresholds must be close to normal traffic. Large gaps between normal values and the alert line create blind spots where anomalies go unnoticed.

For each widget with a threshold:
- What is the typical (normal) value range?
- Where is the threshold set?
- Is there excessive whitespace between the normal line and the alert line?
- Is the Y-axis auto-scaled or explicitly set? Auto-scaled Y-axes compress normal traffic into a flat band when the threshold is far above normal — the Y-axis max should be set to slightly above the alert threshold

**Bad example**: Normal CPU is 20%, alert threshold at 95% — the graph is mostly empty space and a slow climb from 20% to 80% looks flat.

**Good example**: Normal CPU is 20%, alert threshold at 45% — anomalies visually stand out immediately.

**Findings format**:

```markdown
#### Threshold Proximity Audit

| Widget | Normal Range | Threshold | Gap | Y-Axis | Status |
|--------|-------------|-----------|-----|--------|--------|
| CPU usage | ~20% | 95% | 75% | auto | TOO FAR — lower to 40-50%, set Y-max to 55% |
| Error rate | ~0.1% | 5% | ~5% | auto | OK gap — but set Y-max to 6% |
| p99 latency | ~50ms | 500ms | 10x | auto | TOO FAR — lower to 100-150ms, set Y-max to 175ms |
```

### 5. Audit Customer-Facing Section

**Principle**: A dedicated "Customer-Facing" group should exist at the top of the dashboard with 5-8 key metrics for immediate outage identification. The specific metrics should reflect the product's business — not just generic traffic and error rates. This group is a cross-cutting view — its timeseries widgets keep their source-layer prefix (`I`, `P`, or `D`), and its query value widgets need no prefix.

Check:
- Does a "Customer-Facing" group exist?
- Is it the first group on the dashboard?
- Does it contain 5-8 metrics covering: traffic volume, API latency, error rates, key business transactions, and database health?
- Do timeseries widgets inside the group carry their source-layer prefix (not a new "CF" or unprefixed title)?
- Can someone determine "are customers affected?" within 5 seconds of opening the dashboard?

**Findings format**:

```markdown
#### Customer-Facing Section Audit

**Status**: MISSING / INCOMPLETE / OK

**Current state**: [Description of what exists]

**Recommended metrics** (if missing or incomplete):
1. Total request rate (are we receiving traffic?)
2. Customer-facing error rate (are requests failing?)
3. API p99 latency (are responses slow?)
4. Key transaction success rate (are critical flows working?)
5. Database connection pool usage (is the data layer healthy?)
6. Queue depth or processing lag (is async work backing up?)
```

### 6. Apply Zero-Knowledge Viewer Test

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

### 7. Generate Review Report

Compile all findings into a structured report:

```markdown
# Dashboard Review: [Dashboard Title]

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

## Customer-Facing Section Audit
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

## Quality Checklist

- [ ] Every timeseries widget title uses the layer-priority prefix (`I0:`, `P1:`, `D0:`, etc.) — including timeseries inside the Customer-Facing group (exception: query value widgets in Customer-Facing need no prefix)
- [ ] Every timeseries widget audited for alert threshold markers
- [ ] Threshold proximity checked (no large gaps between normal values and alert lines)
- [ ] Customer-Facing group exists with 5-8 key metrics at the top
- [ ] Zero-knowledge viewer test applied (red indicators visible without context)
- [ ] Query Value widgets checked for conditional formatting (green/yellow/red)
- [ ] All findings include specific widget names and group references
- [ ] Recommended actions categorized by priority (must/should/nice-to-have)
- [ ] Dashboard URL included in report for easy reference
