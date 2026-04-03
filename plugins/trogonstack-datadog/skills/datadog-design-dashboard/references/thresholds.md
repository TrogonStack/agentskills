# Alert Thresholds

Guidance for configuring alert threshold markers and Y-axis settings on timeseries widgets.

---

## Threshold Markers

Timeseries widgets should have a red threshold marker line so anomalies are immediately visible.

- The threshold should correspond to an actionable alert — if the metric crosses this line, someone investigates
- Use `markers` in the widget definition with `display_type: "error dashed"` and `value: "y = <threshold>"`
- The threshold should match (or be derived from) an actual Datadog monitor
- Use red color for instant visual identification

Not every metric needs a threshold. Context-providing metrics (deployment markers, dependency traffic patterns) may earn their place on a dashboard without one. Use judgment based on the service's domain.

---

## Threshold Proximity

Set thresholds close to normal traffic. Large gaps between normal values and the alert line create blind spots where anomalies go unnoticed.

**Bad**: Normal CPU is 20%, alert threshold at 95% — the graph is mostly empty space and a slow climb from 20% to 80% looks flat.

**Good**: Normal CPU is 20%, alert threshold at 45% — anomalies visually stand out immediately.

| Normal Value | Bad Threshold | Good Threshold | Why |
|-------------|--------------|----------------|-----|
| CPU ~20% | 95% | 40-50% | 75% gap hides slow climbs |
| Error rate ~0.1% | 10% | 1-2% | 10% gap masks gradual increase |
| Latency p99 ~50ms | 5000ms | 100-150ms | 100x gap makes 200ms look normal |
| Queue depth ~10 | 10000 | 50-100 | 1000x gap hides backpressure |

**Design test**: If the metric slowly climbs from normal to 2x normal, the change should be visually obvious on the graph. If the threshold is too far away, the graph compresses the normal range and the climb looks flat.

---

## Y-Axis Configuration

Do not rely on Y-axis auto-scaling. Set `yaxis.max` explicitly to slightly above the alert threshold.

**Why**: Auto-scaling fits the entire value range (normal traffic + threshold), which compresses normal traffic into a flat band at the bottom of the graph. Anomalies become invisible because the Y-axis range is too wide.

**Rule**: The Y-axis max should frame the normal-to-threshold range so that deviations are visually obvious. The alert threshold should sit near the top of the graph, and normal traffic should occupy the visible area.

| Metric | Normal | Threshold | Y-Axis Max |
|--------|--------|-----------|------------|
| CPU | ~20% | 45% | 55% |
| Error rate | ~0.1% | 2% | 3% |
| Latency p99 | ~50ms | 150ms | 175ms |
| Queue depth | ~10 | 50 | 65 |

---

## Audit Findings Format

### Alert Threshold Audit

```markdown
#### Alert Threshold Audit

| Widget | Group | Status | Finding |
|--------|-------|--------|---------|
| Requests/s | Rate | MISSING | No threshold marker — add alert line or remove widget |
| Error rate | Errors | OK | Red line at 5% |
| CPU usage | Infra | MISSING | No threshold — is this metric alertable? |
```

### Threshold Proximity Audit

```markdown
#### Threshold Proximity Audit

| Widget | Normal Range | Threshold | Gap | Y-Axis | Status |
|--------|-------------|-----------|-----|--------|--------|
| CPU usage | ~20% | 95% | 75% | auto | TOO FAR — lower to 40-50%, set Y-max to 55% |
| Error rate | ~0.1% | 5% | ~5% | auto | OK gap — but set Y-max to 6% |
| p99 latency | ~50ms | 500ms | 10x | auto | TOO FAR — lower to 100-150ms, set Y-max to 175ms |
```

---

## Metrics Near Zero

Some metrics hover close to zero under normal conditions (e.g., error counts, retry rates, dead letter queue depth). For these:

- A threshold still makes sense — even a small absolute increase can indicate a problem
- Set the threshold at a level that represents "something changed" rather than a percentage of capacity
- The Y-axis max matters even more here — auto-scaling on a metric that's normally 0 and spikes to 5 will look the same as one that spikes to 5000
