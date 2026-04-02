---
name: datadog-design-dashboard
description: >-
  Design Datadog dashboards with proper widget selection, layout organization,
  template variables, and group structure. Uses pup CLI for inspecting existing
  dashboards and validating designs. Use when designing new dashboards, auditing
  existing ones, or planning observability layouts for services. Do not use for:
  (1) Datadog agent installation or configuration, (2) monitor/alert rule design,
  (3) APM instrumentation or tracing setup, (4) log pipeline configuration.
allowed-tools: AskUserQuestion, Write, Read, Shell
---

# Design Datadog Dashboard

Design a dashboard layout that tells a clear story — from high-level health signals down to granular diagnostics — using proper widget types, group organization, and template variables for reusability.

**Important**: Always check for existing dashboards first with `pup dashboards list`. Do not create a new dashboard if one already exists for the same service or purpose — update the existing one instead. Only create a new dashboard when no relevant one exists or the user explicitly asks for a new one.

**Philosophy**: The frameworks, layouts, and widget guides in this skill are starting points — not rigid rules. Every product and business is different. Understand the domain first, then adapt the frameworks to fit. The best dashboards reflect how the business actually works, not how a generic template says they should.

## Domain Discovery

Before designing, understand what you are building observability for. The metrics that matter depend entirely on the product and business context.

**Ask the user**:
- "Can you tell me about the product and what this service does for the business? What does a customer experience when they interact with it?"
- "What does a bad day look like for this service? What breaks, and how do customers feel it?"
- "Are there codebases, architecture docs, or README files I can read to understand the service and its dependencies?"

**If the user points you to a codebase**: Read it. Look at the entry points, the API routes, the database models, the queue consumers, the external service calls. Understanding the code gives you the context to choose metrics that actually matter — not just generic RED/USE signals.

**If the user describes the business**: Use that context to tailor the Business (`B`) section. An e-commerce service cares about checkout success rates. A messaging service cares about delivery latency. A payment service cares about transaction completion. Generic "request rate" and "error rate" are a starting point, but the real value comes from metrics that map to customer-visible outcomes.

**Skip domain discovery if**: You already have deep context about the service from prior conversations or the user has provided detailed specifications.

## Interview

**Skip if ALL of these are already specified**: dashboard purpose, target audience, data sources, template variable needs, dashboard strategy.

**Always interview if**: Auditing or redesigning an existing dashboard (needs current state review first).

1. **Purpose** — "What is this dashboard for? Service overview, infrastructure, executive KPIs, debugging, or SLO tracking?"
2. **Audience** — "Who will use this? On-call engineers, platform team, leadership, or mixed?"
3. **Data Sources** — "Which Datadog products are involved? Metrics only, APM + Metrics, Logs + Metrics, or full stack?"
4. **Scope** — "Is this for a single service, a group of services, or infrastructure-wide?"
5. **Dashboard Strategy** — "One dashboard per service, or a consolidated view?" — share the trade-offs from [references/layouts.md](references/layouts.md) to help them decide. If unsure, ask: "During an outage, does your team investigate one service at a time, or do they need to see all services simultaneously?"
6. **Existing Dashboard** — "Is there an existing dashboard to audit or redesign?" If yes, fetch with `pup dashboards get <id>` before designing.

---

## Workflow

### 1. Gather existing context

```bash
pup dashboards list
pup dashboards get <dashboard-id>
pup dashboards url <dashboard-id>
```

If auditing an existing dashboard, fetch its definition first and analyze its current structure before redesigning.

### 2. Choose a framework

Match the dashboard purpose to a framework. Read [references/frameworks.md](references/frameworks.md) for detailed metric mappings and group structures.

| Purpose | Framework |
|---------|-----------|
| Service overview | RED (Rate, Errors, Duration) |
| Infrastructure | USE (Utilization, Saturation, Errors) |
| Executive/business | Golden Signals |
| SLO tracking | SLI/SLO |
| Debugging | Drill-down |

### 3. Design the layout

Using your domain understanding and the chosen framework, design the group structure and select widgets. Read these references as needed:

- **[layouts.md](references/layouts.md)** — Template variable conventions, group structure patterns, dashboard strategy trade-offs, grid sizing, anti-patterns
- **[widgets.md](references/widgets.md)** — Widget selection guide, display options, sizing, naming conventions
- **[thresholds.md](references/thresholds.md)** — Alert threshold markers, threshold proximity, Y-axis configuration

**Key principles** (not rigid rules — use judgment):
- **Prefix every widget title** with its layer and priority: `I0:` (most critical infra), `P0:` (most critical platform), `D0:` (most critical domain), `B0:` (most critical business). See [widgets.md](references/widgets.md) for the full prefix system.
- Start with a **Business** group (5-8 `B`-prefixed metrics) so someone with zero service knowledge can tell if customers are affected within 5 seconds. Tailor the metrics to the domain.
- Timeseries widgets should have **alert threshold markers** (red lines) with thresholds close to normal traffic. If a metric doesn't warrant an alert, question whether it belongs — but context-providing metrics can earn their place.
- Set **Y-axis max** explicitly near the threshold — don't let auto-scaling compress the normal range.
- Order groups macro-to-micro: business → overview → domain-specific → infrastructure.

### 4. Write the output

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

## Quality Validation
[Run quality principles below]
```

### 5. Validate

```bash
pup dashboards list
pup dashboards get <dashboard-id>
pup metrics list --filter="trace.http.request.*"
```

---

## Quality Principles

- [ ] Dashboard reflects the actual product and business — metrics tailored to the domain
- [ ] Dashboard title is concise (no environment, region, or version)
- [ ] Template variables defined for env, service, and relevant scopes (default `*`)
- [ ] **Business group** with 5-8 `B`-prefixed metrics tailored to the service's customer-visible outcomes
- [ ] Groups ordered macro-to-micro (business → overview → details)
- [ ] **Timeseries widgets have alert threshold markers** (red lines) where the metric is alertable
- [ ] **Thresholds close to normal traffic** — no excessive whitespace
- [ ] **Zero-knowledge readability** — someone with no service knowledge can spot problems via red indicators
- [ ] **Widget titles prefixed** with layer and priority (`I0:`, `P1:`, `D0:`, `B0:`, etc.)
- [ ] Widget titles use sentence case, don't repeat group name
- [ ] Every metric earns its place — if it spikes, someone can act on it

## References

- **[Observability Frameworks](references/frameworks.md)** — RED, USE, Golden Signals, SLI/SLO with metric mappings
- **[Layout & Structure](references/layouts.md)** — Template variables, group patterns, dashboard strategy, grid sizing, anti-patterns
- **[Widgets](references/widgets.md)** — Widget types, display options, sizing, naming conventions
- **[Alert Thresholds](references/thresholds.md)** — Threshold markers, proximity guide, Y-axis configuration
