# Instrument Selection

> **Spec sources**:
> - https://opentelemetry.io/docs/specs/semconv/general/metrics/
> - https://opentelemetry.io/docs/specs/otel/metrics/supplementary-guidelines/

## Decision Tree

1. **Counting something (delta values)?**
   - Monotonically increasing → **Counter** (total bytes received, requests completed)
   - Can increase or decrease → **UpDownCounter** (active connections, queue depth)
2. **Need distributions/percentiles?**
   → **Histogram** (request latency, response sizes)
3. **Absolute point-in-time value?**
   - Non-additive (summing meaningless) → **Gauge** (temperature, CPU %)
   - Additive + monotonic → **Asynchronous Counter** (page faults since boot)
   - Additive + non-monotonic → **Asynchronous UpDownCounter**

## Additivity

| Instrument | Additive? | Sum Meaningful? |
|------------|-----------|-----------------|
| Counter | Yes | Total across instances |
| UpDownCounter | Yes | Combined value meaningful |
| Histogram | Mixed | Bucket counts yes; min/max no |
| Gauge | **No** | Summing meaningless |

## Synchronous vs Asynchronous

- **Synchronous**: recorded when events occur (event-driven, lower latency)
- **Asynchronous**: pulled/observed at collection time (reduces unnecessary polling, e.g., reading a sensor only at scrape time)
- Spec uses synchronous names but implementations MAY use async equivalents

## UpDownCounter Consistency

The **same attribute values** used to record an increment MUST be used for the associated decrement. Mismatched attributes create separate time series.

If an attribute is not available at increment time, do not add it at decrement time.
