# Observability Frameworks

Choose the framework that matches the dashboard purpose. Each framework defines which metrics to prioritize and how to organize them.

---

## RED Method (Request-Driven Services)

Best for: microservices, APIs, web applications — anything that handles requests.

| Signal | Metric | Example Query |
|--------|--------|---------------|
| **Rate** | Requests per second | `sum:trace.http.request.hits{$service,$env}.as_rate()` |
| **Errors** | Error rate (%) | `sum:trace.http.request.errors{$service,$env} / sum:trace.http.request.hits{$service,$env} * 100` |
| **Duration** | Latency percentiles | `p50:trace.http.request.duration{$service,$env}`, `p90:trace.http.request.duration{$service,$env}`, `p99:trace.http.request.duration{$service,$env}` (one query per percentile, overlaid on the same timeseries widget) |

### Group Structure

```text
Overview → Rate → Errors → Duration → [Dependencies] → [Infrastructure]
```

### When to Use RED

- Service receives external or internal HTTP/gRPC requests
- You care about user-facing latency and availability
- On-call engineers need to quickly identify degradation

### Drill-Down Pattern

1. **Overview**: Query Value widgets showing current Rate, Error %, p99 Latency
2. **Rate**: Timeseries of request rate, Top List by endpoint
3. **Errors**: Timeseries of error rate, Top List of failing endpoints, Log Stream of errors
4. **Duration**: Timeseries of latency percentiles, Heatmap of latency distribution, Top List of slowest endpoints

---

## USE Method (Resource-Oriented)

Best for: infrastructure, databases, queues — anything with finite capacity.

| Signal | Metric | Example Query |
|--------|--------|---------------|
| **Utilization** | Resource usage (%) | `avg:system.cpu.user{$host,$env}` |
| **Saturation** | Queue depth / waiting | `avg:system.load.1{$host,$env}` |
| **Errors** | Hardware/resource errors | `sum:system.disk.error{$host,$env}` |

### Group Structure

```text
Overview → CPU → Memory → Disk → Network → [Application-specific]
```

### When to Use USE

- Monitoring hosts, containers, or VMs
- Database or cache performance
- Queue/worker infrastructure
- Capacity planning

### Resource Mapping

| Resource | Utilization | Saturation | Errors |
|----------|-------------|------------|--------|
| CPU | `system.cpu.user` | `system.load.1` | — |
| Memory | `system.mem.pct_usable` | `system.swap.used` | OOM events |
| Disk | `system.disk.in_use` | `system.io.await` | `system.disk.error` |
| Network | `system.net.bytes_sent` | `system.net.packets_dropped` | `system.net.errors` |

---

## Golden Signals (SRE / Executive)

Best for: executive dashboards, cross-service views, SRE-level monitoring.

| Signal | Description | Example Metric |
|--------|-------------|----------------|
| **Latency** | Time to serve requests | `p99:trace.http.request.duration{$service,$env}` |
| **Traffic** | Request volume | `sum:trace.http.request.hits{$service,$env}.as_rate()` |
| **Errors** | Rate of failed requests | `sum:trace.http.request.errors{$service,$env} / sum:trace.http.request.hits{$service,$env}` |
| **Saturation** | Resource fullness | `avg:system.cpu.user{$service,$env}`, `avg:system.mem.pct_usable{$service,$env}` |

### Group Structure

```text
Executive Summary → Latency → Traffic → Errors → Saturation → [Business KPIs]
```

### When to Use Golden Signals

- Cross-service or platform-wide view
- Executive or leadership audience
- SRE team situational awareness
- Incident command dashboards

### Presentation Style

- Executive dashboards favor **Query Value** and **Timeseries** over detailed Top Lists
- Use wider time windows (1h, 4h, 1d) for trend visibility
- Include week-over-week comparisons where possible

---

## SLI/SLO Tracking

Best for: SLO compliance, error budget monitoring, reliability reviews.

| Signal | Description | Example Metric |
|--------|-------------|----------------|
| **SLI** | Service Level Indicator | Availability %, latency p99 < threshold |
| **Error Budget** | Remaining budget before SLO breach | `(1 - SLI) / (1 - SLO_target)` |
| **Burn Rate** | How fast budget is consumed | Error budget consumed / time elapsed |

### Group Structure

```text
SLO Summary → Error Budget → Burn Rate Alerts → Historical Compliance
```

### When to Use SLI/SLO

- Tracking reliability commitments
- Error budget-driven development decisions
- Reliability review meetings
- Incident post-mortem context

### Widget Recommendations

- **SLO widget**: Native Datadog SLO widget for compliance tracking
- **Query Value**: Current error budget remaining (color-coded)
- **Timeseries**: Burn rate over time with threshold lines
- **Change Widget**: Week-over-week SLI comparison
