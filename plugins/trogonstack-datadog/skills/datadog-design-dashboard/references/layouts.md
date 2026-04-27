# Layout & Structure

Template variable conventions, group structure patterns, dashboard strategy trade-offs, and grid sizing.

---

## Template Variables

Template variables make one dashboard serve many contexts. Define them before laying out widgets.

**`env` is always required.** The remaining variables depend on the dashboard type:

| Dashboard Type | Template Variables |
|---------------|-------------------|
| Service Overview (RED), Debugging | `env` · `service` |
| Infrastructure (USE) | `env` · `host` · `availability_zone` |
| Executive / Golden Signals | `env` · `team` · `region` |

**Optional variables** (add when relevant to the dashboard type):

| Variable | Tag | Use Case |
|----------|-----|----------|
| `region` | `region` | Regional filtering |
| `availability_zone` | `availability_zone` | AZ-level drill-down |
| `host` | `host` | Host-level investigation |
| `endpoint` | `http.url` | Per-route investigation (Debugging dashboards) |

- For **service dashboards** (RED, Debugging): scope every widget query with `{$service,$env}`
- For **infrastructure dashboards**: scope queries with `{$host,$env}` or `{$availability_zone,$env}` instead
- For **executive dashboards**: scope queries with `{$team,$env}` or `{$region,$env}` instead
- Use `*` as the default value so dashboards load with full scope
- Never put environment or region in the dashboard title — that is what template variables are for
- Name variables after the tag they filter on

---

## Dashboard Strategy

| Approach | Strengths | Weaknesses |
|----------|-----------|------------|
| **Per-service** | Focused, fast to scan during incidents. Each team owns their dashboard. Business section is specific and actionable. Ops reviews can go service-by-service. | More dashboards to maintain. Cross-service correlation requires switching dashboards. |
| **Consolidated** | Single pane of glass for multiple services. Good for seeing cross-service dependencies. Fewer dashboards to maintain. | Can become overwhelming (100+ metrics). Business section becomes diluted. Slower to load and harder to scan during incidents. |
| **Hybrid** | Per-service dashboards for depth + one top-level dashboard with only the Business section from each service. Best of both worlds. | Requires maintaining both levels. Business metrics duplicated across dashboards. |

---

## Group Structure

Organize widgets into collapsible groups. Groups are the primary navigation mechanism.

**Recommended groups** (in order):

1. **Business** — 5-8 `B`-prefixed metrics that answer "are customers affected?" within 5 seconds. Should be the first group. The specific metrics depend on the product. Design so someone with zero service knowledge can spot problems via red indicators.
2. **Overview** — Service checks, key health indicators, monitor summaries.
3. **Domain-specific groups** — Organized by the chosen framework (e.g., Rate / Errors / Duration for RED), adapted to the service's actual architecture and concerns.

**Optional groups**: Logs, Infrastructure, Dependencies, Deployment.

- Group titles use **Title Case**
- Keep groups to 4-8 widgets each (collapse if more)
- Order groups macro-to-micro (health overview → detailed diagnostics)
- Color-code group headers for visual scanning

---

## Layout Templates

Standard group structures by dashboard type. Use these as starting points and customize based on specific needs.

### Service Overview (RED)

The most common dashboard type. Monitors a single service's request-level health.

```text
┌─────────────────────────────────────────────────────┐
│ Template Variables: env | service | region           │
├─────────────────────────────────────────────────────┤
│ Group: Business                                      │
│ ┌──────────┬──────────┬──────────┬──────────┐       │
│ │ B0:Req/s │ B0:Errs  │ B0:p99   │ B0:Apdex │       │
│ │ (QV+bg)  │ (QV+bg)  │ (QV+bg)  │ (QV+bg)  │       │
│ ├──────────────────────┬────────────────────┤       │
│ │ B0: Key txn success  │ B1: DB conn pool   │       │
│ │ (TS + red threshold) │ (TS + red thresh.) │       │
│ └──────────────────────┴────────────────────┘       │
│ 5-8 metrics · zero-knowledge readable               │
├─────────────────────────────────────────────────────┤
│ Group: Overview                                      │
│ ┌──────────┬──────────┬──────────┬──────────┐       │
│ │ P0:Req/s │ P0:Err % │ P0:p99   │ P0:Apdex │       │
│ │ (QV+bg)  │ (QV+bg)  │ (QV+bg)  │ (QV+bg)  │       │
│ └──────────┴──────────┴──────────┴──────────┘       │
├─────────────────────────────────────────────────────┤
│ Group: Rate                                          │
│ ┌────────────────────────┬──────────────────────┐   │
│ │ P0: Requests/s (TS)    │ P1: By endpoint (TL) │   │
│ │ ── red threshold ──    │                      │   │
│ └────────────────────────┴──────────────────────┘   │
├─────────────────────────────────────────────────────┤
│ Group: Errors                                        │
│ ┌────────────────────────┬──────────────────────┐   │
│ │ P0: Error rate (TS)    │ P1: Top errors (TL)  │   │
│ │ ── red threshold ──    │                      │   │
│ ├────────────────────────────────────────────────┤   │
│ │ P1: Error logs (log stream, full width)        │   │
│ └────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────┤
│ Group: Duration                                      │
│ ┌────────────────────────┬──────────────────────┐   │
│ │ P0: Latency p50/90/99  │ P1: Latency heatmap  │   │
│ │ (TS + red threshold)   │ (heatmap)            │   │
│ ├────────────────────────────────────────────────┤   │
│ │ P1: Slowest endpoints (toplist, full width)    │   │
│ └────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────┤
│ Group: Infrastructure (collapsed by default)         │
│ ┌────────────┬────────────┬────────────┐            │
│ │ I0: CPU    │ I0: Memory │ I1: Disk   │            │
│ │(TS + red)  │(TS + red)  │(TS + red)  │            │
│ └────────────┴────────────┴────────────┘            │
└─────────────────────────────────────────────────────┘
```

All widget titles use the layer-priority prefix system (`I0:`, `P0:`, `D0:`, `B0:`, etc.) — see [widgets.md](widgets.md) for details.
All timeseries widgets include red alert threshold markers set close to normal traffic.

**Widget count**: 20-24
**Target audience**: On-call engineers, service owners

---

### Infrastructure (USE)

Monitors host, container, or VM resource health.

```text
┌─────────────────────────────────────────────────────┐
│ Template Variables: env | host | availability_zone   │
├─────────────────────────────────────────────────────┤
│ Group: Business                                      │
│ ┌──────────┬──────────┬──────────┬──────────┐       │
│ │B0:Svc Rq │B0:Svc Err│B0:Svc p99│B0:Apdex  │       │
│ │ (QV+bg)  │ (QV+bg)  │ (QV+bg)  │ (QV+bg)  │       │
│ ├──────────────────────┬────────────────────┤       │
│ │ B0: Host avail.      │ B1: Network errors │       │
│ │ (TS + red threshold) │ (TS + red thresh.) │       │
│ └──────────────────────┴────────────────────┘       │
│ 5-8 metrics · zero-knowledge readable               │
├─────────────────────────────────────────────────────┤
│ Group: Overview                                      │
│ ┌──────────┬──────────┬──────────┬──────────┐       │
│ │ I0:CPU % │ I0:Mem % │ I0:Disk% │ I1:NetBps│       │
│ │ (QV+bg)  │ (QV+bg)  │ (QV+bg)  │ (QV+bg)  │       │
│ └──────────┴──────────┴──────────┴──────────┘       │
├─────────────────────────────────────────────────────┤
│ Group: CPU                                           │
│ ┌────────────────────────┬──────────────────────┐   │
│ │ I0: CPU by core        │ I1: Load avg         │   │
│ │ (TS + red threshold)   │ (TS + red threshold) │   │
│ └────────────────────────┴──────────────────────┘   │
├─────────────────────────────────────────────────────┤
│ Group: Memory                                        │
│ ┌────────────────────────┬──────────────────────┐   │
│ │ I0: Memory usage       │ I1: Swap usage       │   │
│ │ (TS + red threshold)   │ (TS + red threshold) │   │
│ └────────────────────────┴──────────────────────┘   │
├─────────────────────────────────────────────────────┤
│ Group: Disk                                          │
│ ┌────────────────────────┬──────────────────────┐   │
│ │ I0: Disk utilization   │ I1: I/O wait         │   │
│ │ (TS + red threshold)   │ (TS + red threshold) │   │
│ └────────────────────────┴──────────────────────┘   │
├─────────────────────────────────────────────────────┤
│ Group: Network                                       │
│ ┌────────────────────────┬──────────────────────┐   │
│ │ I0: Bytes in/out       │ I0: Errors + drops   │   │
│ │ (TS + red threshold)   │ (TS + red threshold) │   │
│ └────────────────────────┴──────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

All widget titles use the layer-priority prefix system — see [widgets.md](widgets.md) for details.
All timeseries widgets include red alert threshold markers set close to normal traffic.

**Widget count**: 18-22
**Target audience**: Platform/SRE team

---

### Executive / Golden Signals

High-level view across multiple services for leadership.

```text
┌─────────────────────────────────────────────────────┐
│ Template Variables: env | team | region               │
├─────────────────────────────────────────────────────┤
│ Group: Business                                      │
│ ┌──────────┬──────────┬──────────┬──────────┐       │
│ │B0:Uptime │B0:Cst Err│B0:p99 Lat│B0:Traffic│       │
│ │ (QV+bg)  │ (QV+bg)  │ (QV+bg)  │ (QV+bg)  │       │
│ ├──────────────────────┬────────────────────┤       │
│ │ B0: Revenue txn succ │ B0: Checkout lat   │       │
│ │ (TS + red threshold) │ (TS + red thresh.) │       │
│ └──────────────────────┴────────────────────┘       │
│ 5-8 metrics · zero-knowledge readable               │
├─────────────────────────────────────────────────────┤
│ Group: Executive Summary                             │
│ ┌──────────┬──────────┬──────────┬──────────┐       │
│ │P0:Uptime │P1:Avg Lat│P1:Tot Rq │P0:Err %  │       │
│ │ (QV+bg)  │ (QV+bg)  │ (QV+bg)  │ (QV+bg)  │       │
│ └──────────┴──────────┴──────────┴──────────┘       │
├─────────────────────────────────────────────────────┤
│ Group: Traffic                                       │
│ ┌──────────────────────────────────────────────┐    │
│ │ P0: Request volume by svc (TS + red thresh.)  │    │
│ └──────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────┤
│ Group: Latency                                       │
│ ┌──────────────────────────────────────────────┐    │
│ │ P0: p99 latency by svc (TS + red threshold)   │    │
│ └──────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────┤
│ Group: Errors                                        │
│ ┌────────────────────────┬──────────────────────┐   │
│ │ P0: Err rate by svc    │ P1: Svcs w/ errors   │   │
│ │ (TS + red threshold)   │ (toplist)            │   │
│ └────────────────────────┴──────────────────────┘   │
├─────────────────────────────────────────────────────┤
│ Group: Saturation                                    │
│ ┌────────────────────────┬──────────────────────┐   │
│ │ I0: CPU across fleet   │ I0: Memory fleet     │   │
│ │ (TS + red threshold)   │ (TS + red threshold) │   │
│ └────────────────────────┴──────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

All widget titles use the layer-priority prefix system — see [widgets.md](widgets.md) for details.
All timeseries widgets include red alert threshold markers set close to normal traffic.

**Widget count**: 16-20
**Target audience**: Engineering leadership, SRE

---

### Debugging / Investigation

Deep-dive dashboard for active incident investigation.

```text
┌─────────────────────────────────────────────────────┐
│ Template Variables: env | service | host | endpoint   │
├─────────────────────────────────────────────────────┤
│ Group: Business                                      │
│ ┌──────────┬──────────┬──────────┬──────────┐       │
│ │B0:Cst Err│B0:p99 Lat│B0:Req/s  │B0:Apdex  │       │
│ │ (QV+bg)  │ (QV+bg)  │ (QV+bg)  │ (QV+bg)  │       │
│ ├──────────────────────┬────────────────────┤       │
│ │ B0: Key txn success  │ B1: DB conn pool   │       │
│ │ (TS + red threshold) │ (TS + red thresh.) │       │
│ └──────────────────────┴────────────────────┘       │
│ 5-8 metrics · zero-knowledge readable               │
├─────────────────────────────────────────────────────┤
│ Group: Current State                                 │
│ ┌──────────┬──────────┬──────────┬──────────┐       │
│ │P0:Err %  │P0:p99 ms │P1:Req/s  │I1:Hosts  │       │
│ │ (QV+bg)  │ (QV+bg)  │ (QV+bg)  │ (QV+bg)  │       │
│ └──────────┴──────────┴──────────┴──────────┘       │
├─────────────────────────────────────────────────────┤
│ Group: Error Analysis                                │
│ ┌────────────────────────┬──────────────────────┐   │
│ │ P0: Errors by type     │ P1: By endpoint (TL) │   │
│ │ (TS + red threshold)   │ (toplist)            │   │
│ ├────────────────────────────────────────────────┤   │
│ │ P1: Error logs (log stream, full width)        │   │
│ └────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────┤
│ Group: Latency Breakdown                             │
│ ┌────────────────────────┬──────────────────────┐   │
│ │ P0: Latency by endpt   │ P1: Latency distrib. │   │
│ │ (TS + red threshold)   │ (heatmap)            │   │
│ └────────────────────────┴──────────────────────┘   │
├─────────────────────────────────────────────────────┤
│ Group: Dependencies                                  │
│ ┌────────────────────────┬──────────────────────┐   │
│ │ P0: Downstream latency │ P0: Downstream errs  │   │
│ │ (TS + red threshold)   │ (TS + red threshold) │   │
│ └────────────────────────┴──────────────────────┘   │
├─────────────────────────────────────────────────────┤
│ Group: Resource Pressure                             │
│ ┌────────────┬────────────┬────────────┐            │
│ │ I0: CPU    │ I0: Memory │ P1: Conns  │            │
│ │(TS + red)  │(TS + red)  │(TS + red)  │            │
│ └────────────┴────────────┴────────────┘            │
├─────────────────────────────────────────────────────┤
│ Group: Recent Events                                 │
│ ┌──────────────────────────────────────────────┐    │
│ │ Deploy + event stream (full width)            │    │
│ └──────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

All widget titles use the layer-priority prefix system — see [widgets.md](widgets.md) for details.
All timeseries widgets include red alert threshold markers set close to normal traffic.

**Widget count**: 24-30
**Target audience**: On-call engineers during incidents
**Note**: More template variables for deeper filtering; `endpoint` variable enables per-route investigation

---

## Grid System

Datadog uses a 12-column grid.

| Widget Type | Minimum Width | Recommended Width |
|-------------|--------------|-------------------|
| Query Value | 2 col | 3 col |
| Timeseries | 4 col | 6 col |
| Top List | 4 col | 6 col |
| Heatmap | 4 col | 6 col |
| Log Stream | 6 col | 12 col |
| Event Stream | 6 col | 12 col |
| Note | 2 col | 3-4 col |
| Check Status | 2 col | 3 col |

---

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|-------------|---------|-----|
| Separate dashboards per environment | Dashboard sprawl, inconsistent layouts | Use `env` template variable |
| 50+ widgets in a single group | Overwhelming, slow to load | Split into focused groups, collapse secondary groups |
| Query Value without timeseries background | No trend context, just a number | Enable timeseries background |
| Mixing unrelated metrics in one group | Unclear narrative, hard to scan | One concern per group |
| Dashboard title with environment/region | Forces duplication | Put context in template variables |
| Identical widgets with different filters | Redundant, hard to maintain | Use template variables + saved views |
| Y-axis auto-scaling with distant threshold | Normal traffic compressed into flat band | Set `yaxis.max` near threshold — see [thresholds.md](thresholds.md) |
| Domain-specific filters in platform groups | Platform group silently shows only one domain; new domains are invisible | Platform groups (Commanded, Oban, Broadway, etc.) must scope only by template variables (`$env`, `$service`). Hardcoded handler names, queue names, or domain names belong in domain groups, not platform groups. |
| Individual handler/worker widget when global `by {dimension}` view exists | Redundant widget adds noise without adding signal | Before adding a widget scoped to a specific handler, queue, or worker in a platform group, check: does a global `by {handler_name}` / `by {queue}` timeseries already exist? If yes, the specific widget adds nothing — the global view already surfaces it when it spikes. Only add specific widgets when they have their own alert threshold or SLO that justifies the dedicated callout, and place them in the domain group, not the platform group. |
| Transport metrics (`P`) placed in Business group | Misleads readers into thinking protocol health = business health; obscures what domain outcomes actually are | gRPC error rate, HTTP request rate, and apdex are `P` regardless of placement. See [widgets.md](widgets.md) for the full B trap guide. |
| 13+ groups without tabs | Endless scrolling, no way to jump to the right layer during an incident | Organize groups into tabs by observability layer (Service Health, Platform, Infrastructure). See [tabs.md](tabs.md). |
