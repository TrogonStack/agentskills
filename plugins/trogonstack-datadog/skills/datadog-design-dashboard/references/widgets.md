# Widget Reference

Configuration details, display options, and best practices for each widget type.

---

## Widget Selection

| Data Type | Widget | Display Type |
|-----------|--------|-------------|
| **Current value** (latency p99, error rate) | Query Value | With timeseries background |
| **Trend over time** (request rate, CPU) | Timeseries | `lines` for multiple groups, `area` for volume, `bars` for counts |
| **Ranked comparison** (top endpoints, busiest hosts) | Top List | Descending order |
| **Distribution** (latency percentiles) | Heatmap | Color-coded density |
| **Multiple related metrics** | Group | Collapsible container |
| **Status at a glance** (service checks) | Check Status | Color-coded grid |
| **Log volume** | Timeseries | `bars` grouped by status |
| **Log entries** | Log Stream | Filtered to error/critical |
| **Recent events** | Event Stream | Filtered by source |
| **Text context** | Note | Runbook links, team ownership |

```text
What are you showing?
│
├── Single current value? → Query Value (with timeseries bg)
├── Trend over time? → Timeseries
│   ├── Volume/composition? → area display
│   ├── Counts? → bars display
│   └── Multiple series? → lines display
├── Ranked comparison? → Top List
├── Distribution density? → Heatmap
├── Up/down status? → Check Status
├── Log entries? → Log Stream
├── Events/deploys? → Event Stream
├── Period comparison? → Change
├── SLO compliance? → SLO widget
└── Context/links? → Note
```

---

## Query Value

Displays a single numeric value with optional conditional formatting and timeseries background.

**Use for**: Current metric values — error rate, latency, throughput, count.

**Configuration**:
- Enable timeseries background (a bare number without trend context is rarely useful)
- Use conditional formatting to color-code thresholds (green/yellow/red)
- Set appropriate precision (2 decimals for percentages, 0 for counts)

**Sizing**: 3 columns wide, 2 rows tall (standard), or 2 columns for compact layouts.

**Conditional Formatting Example**:

| Condition | Color | Meaning |
|-----------|-------|---------|
| value < 1% | Green | Healthy error rate |
| value >= 1% AND value < 5% | Yellow | Warning |
| value >= 5% | Red | Critical |

---

## Timeseries

Time-based line, area, or bar chart. The most versatile widget.

**Use for**: Any metric over time — trends, comparisons, correlations.

**Display Types**:

| Display | Use When |
|---------|----------|
| `lines` | Multiple groups/series, general trends |
| `area` | Volume metrics (stacked area for composition) |
| `bars` | Count-based metrics, log volume by status |

**Configuration**:
- Add a legend (automatic mode for > 5 series)
- Alias formula expressions for readable legends
- Set y-axis minimum to 0 unless negative values are expected
- Set `yaxis.max` explicitly — see [thresholds.md](thresholds.md) for Y-axis guidance
- Use markers for threshold lines — see [thresholds.md](thresholds.md) for threshold configuration

**Sizing**: Minimum 4 columns, recommended 6 columns. Use 12 columns for high-detail single-metric views.

**Multiple Queries**: Overlay related metrics (e.g., p50, p90, p99 on one chart) rather than creating separate widgets.

---

## Top List

Ranked list of values by a dimension.

**Use for**: Identifying outliers — busiest endpoints, highest error sources, slowest queries.

**Configuration**:
- Order descending by default (highest values first)
- Limit to top 10-25 entries
- Use conditional formatting to highlight problematic entries
- Show both absolute value and percentage where useful

**Sizing**: Minimum 4 columns, recommended 6 columns.

---

## Heatmap

Color-coded density visualization.

**Use for**: Distribution data — latency distributions, request size distributions.

**Configuration**:
- Use for metrics with many unique values (percentile distributions)
- Color palette should represent density (lighter = fewer, darker = more)
- Works well paired with a timeseries showing the same metric's percentiles

**Sizing**: Minimum 4 columns, recommended 6 columns.

---

## Group

Container widget that organizes other widgets into a collapsible section.

**Use for**: Organizing dashboard into logical sections.

**Configuration**:
- Title in Title Case
- Color-code headers for visual scanning (consistent across similar groups)
- Collapse non-critical groups by default (Infrastructure, Dependencies)
- Keep 4-8 widgets per group

---

## Check Status

Color-coded grid showing service check results.

**Use for**: Binary health status — service up/down, integration connected/disconnected.

**Configuration**:
- One check per cell
- Green = OK, Red = Critical, Yellow = Warning, Grey = Unknown
- Group by host or service tag

**Sizing**: 2-3 columns wide.

---

## Log Stream

Live-updating list of log entries matching a query.

**Use for**: Viewing actual log lines — error details, request traces, debug output.

**Configuration**:
- Filter to relevant log level (error, critical) or service
- Show timestamp, status, message columns at minimum
- Sort by timestamp descending (newest first)
- Link to Log Explorer for deeper investigation

**Sizing**: Minimum 6 columns, recommended 12 columns (full width). Needs horizontal space for message readability.

---

## Event Stream

Timeline of Datadog events.

**Use for**: Deployment events, alert triggers, infrastructure changes.

**Configuration**:
- Filter by source (deploy, monitor, integration)
- Useful in debugging dashboards to correlate changes with metric shifts

**Sizing**: Minimum 6 columns, recommended 12 columns.

---

## Note

Markdown text widget.

**Use for**: Context that is not metric data — runbook links, team ownership, on-call rotation, usage instructions.

**Configuration**:
- Keep concise — dashboards are for data, not documentation
- Include runbook links for on-call dashboards
- Use sparingly — if you need many notes, the dashboard structure might be unclear

**Sizing**: 2-4 columns wide.

---

## Change

Shows the change in a metric value over a time period.

**Use for**: Week-over-week or day-over-day comparisons.

**Configuration**:
- Compare against previous period (1d, 1w)
- Use conditional formatting for increase/decrease
- Pairs well with Query Value for current value + Change for trend

**Sizing**: 3-4 columns wide.

---

## SLO

Native Datadog SLO tracking widget.

**Use for**: SLO compliance, error budget remaining.

**Configuration**:
- Reference an existing SLO definition
- Show target, current value, and error budget
- Time window matching SLO period (7d, 30d, 90d)

**Sizing**: 4-6 columns wide.

---

## Widget Title Prefix System

Every widget title starts with a layer-priority prefix so anyone can immediately tell what layer the metric belongs to and how critical it is.

### Layers

| Prefix | Layer | What it covers |
|--------|-------|---------------|
| `I` | **Infrastructure** | Load balancers, databases, networks, DNS, CDN, storage — shared infrastructure that the service depends on but doesn't own |
| `P` | **Platform** | Service-specific platform components from the codebase — gRPC servers, connection pools, cache clients, queue consumers, circuit breakers |
| `D` | **Domain** | Logical domain units in the system — bounded contexts, aggregates, domain components (e.g., order processing pipeline, payment saga, delivery tracking) |
| `B` | **Business** | Customer-visible outcomes and business transactions — checkout success rate, order throughput, payment completion, delivery latency, user sign-ups |

### Priority Numbers

The number after the layer letter indicates priority within that layer. `0` is the most critical — the metric you look at first during an outage. Higher numbers are progressively less critical.

| Priority | Meaning |
|----------|---------|
| `0` | Most critical — look at this first during an outage |
| `1` | Important — check after priority 0 is clear |
| `2+` | Supporting context — useful for investigation |

### Examples

```text
Group: "Business"
  B0: Checkout success rate
  B0: Order throughput
  B1: API p99 latency
  B1: Customer-visible error rate
  B2: Failed payment rate

Group: "Rate"
  P0: Requests per second
  P1: By endpoint

Group: "Errors"
  P0: Error rate over time
  D1: Order saga failures
  P2: Top errors by endpoint

Group: "Infrastructure"
  I0: CPU usage
  I0: Memory usage
  I1: Disk I/O
  I2: Network errors
```

### Classification Guide

When assigning prefixes, use the domain discovery context:

- **I (Infrastructure)**: Would this metric exist even if your code didn't? Load balancer, database engine, OS resources, network — things the ops team manages.
- **P (Platform)**: Is this about how your code runs? Connection pools your code configures, gRPC channels your code opens, cache hit rates for caches your code uses — the technical platform layer.
- **D (Domain)**: Is this about a logical unit in your domain model? An order processing pipeline, a payment saga, a delivery tracking aggregate — things a domain expert would recognize as a bounded context or aggregate.
- **B (Business)**: Does this metric map to a customer-visible outcome? Checkout completions, delivery SLA, payment success — things a product manager would put on a KPI dashboard.

The priority number comes from the ops review order: what do you look at first when paged at 3am? That's `0`.

---

## General Naming Rules

**Dashboard title**: Concise, purpose-driven. Example: `Order Service`, not `Order Service Production US-East Dashboard v2`.

**Widget titles**: Prefix + sentence case, concise, action-oriented.

- Always start with the layer-priority prefix (`I0:`, `P1:`, `D0:`, `B0:`, etc.)
- Do not repeat the group title after the prefix
- Do not repeat the integration name if it is obvious from context
- Alias all formulas so legends are readable
