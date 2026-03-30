---
name: otel-name-metric
description: >-
  Review or create OpenTelemetry metric names following semantic conventions.
  Validates naming format, units, instrument selection, and attribute placement.
  Use when designing new metrics, reviewing existing instrumentation, or auditing
  metric naming consistency. Do not use for: (1) span or trace naming, (2) OTel
  collector configuration, (3) SDK installation or setup, (4) alerting or
  dashboard design.
allowed-tools: AskUserQuestion, Write, Read, Shell
---

# Review or Create OpenTelemetry Metric Names

Review or create metric names that follow OTel Semantic Conventions, ensuring correct naming format, instrument selection, unit placement, and attribute separation.

**Before applying any rule below**, fetch the latest naming guidance to check for updates:
- https://opentelemetry.io/docs/specs/semconv/general/naming/
- https://opentelemetry.io/docs/specs/semconv/general/metrics/
- https://opentelemetry.io/blog/2025/how-to-name-your-metrics/

If the fetched content contradicts any rule in this skill, follow the fetched content and flag the discrepancy.

## Core Principle

The metric name identifies **what you are measuring**. Everything else — who is measuring, where it runs, which version — belongs in attributes or resource attributes.

## Metric Name Patterns

The OTel spec defines these patterns for metric names:

### Default Pattern: `{area}.{metric_name}`

Use when the area or metric name already implies the communication side.

Examples: `system.memory.usage`, `kestrel.connection.duration`, `messaging.process.duration`

### Client/Server Pattern: `{area}.{client|server}.{metric_name}`

Use when the communication side is **ambiguous** for a given `{area}` and `{metric_name}`.

- **Include** `client` or `server` when both perspectives exist (e.g., `http.server.*` vs `http.client.*`)
- **Omit** when the system name implies the side (e.g., `kestrel` is always a server)
- **Omit** when the metric name implies the side (e.g., `messaging.process` is always consumer)

Examples: `http.server.request.duration`, `db.client.operation.duration`

### System-Specific Pattern: `{system_name}.*.{metric_name}`

Use when a metric is specific to a system, project, or provider.

Examples: `azure.cosmosdb.client.operation.request_charge`, `jvm.gc.duration`

### How Segments Work

Metric names use dot-delimited namespaces where each dot adds specificity. Namespaces can be nested — there is no fixed number of segments. Real metrics range from 2 segments (`system.uptime`) to 6 segments (`azure.cosmosdb.client.operation.request_charge`).

Follow the `{object}.{property}` principle: be precise. Use `system.network.packet.dropped` instead of `system.network.dropped`.

## Name vs Attributes

If a dimension changes **what** is being measured → put it in the metric name.
If it changes **who/where/when** → put it in attributes.

| Dimension | Goes in... | Why |
|-----------|-----------|-----|
| Protocol domain (`http`, `db`) | Name | Changes what you're measuring |
| Communication side (`client`, `server`) | Name (when ambiguous) | Changes the perspective |
| Entity and property (`request.duration`) | Name | Changes what is captured |
| Service name | Resource attribute | Same metric across services |
| Environment | Resource attribute | Same metric across envs |
| Version | Resource attribute | Same metric across versions |
| HTTP method, route | Metric attribute | Filters within the same metric |
| Technology stack | Nowhere in name | Won't survive language migrations |
| Unit (`ms`, `bytes`) | Unit metadata field | UCUM standard, not in name |

## Naming Format

- **Lowercase** with **dot-delimited** namespaces
- **snake_case** within segments: `http.response.status_code`
- Must start with a letter, end with alphanumeric
- No consecutive delimiters (`..`, `__`, `._`)
- Printable Basic Latin only (U+0021–U+007E)

## Measurement Suffixes

| Suffix | Meaning | Example |
|--------|---------|---------|
| `entity.limit` | Known total amount | `system.memory.limit` |
| `entity.usage` | Amount used from known total | `system.memory.usage` |
| `entity.utilization` | Fraction of usage/limit (0–1) | `system.memory.utilization` |
| `entity.time` | Passage of time | `system.cpu.time` |
| `entity.io` | Bidirectional data flow | `system.network.io` |

## Pluralization Rules

- **Pluralize Counters** for discrete countable instances: `system.paging.faults`, `system.disk.operations`
- **Do NOT pluralize** utilization, duration, time: `system.filesystem.utilization`
- **UpDownCounter names SHOULD NOT be pluralized**: `system.process.count` not `system.processes`
- **Never append `_total`** — confuses meaning in delta backends

## Unit Conventions (UCUM)

- Units go in **metadata**, NOT in metric names
- Use non-prefixed units: `By` not `MiBy`
- Durations: use seconds (`s`)
- Utilization: dimensionless, unit `1`
- Curly brace annotations match grammatical number: `{request}` not `{requests}`
- Case-sensitive: `Cel` for degree Celsius

## Attribute Naming

- Pattern: `{object}.{property}` with dot separators
- Lowercase, snake_case within segments
- Namespace related attributes together: `order.id`, `order.total`, `order.status`
- Keep names stable; let values carry dynamic data
- Do NOT put user IDs, request IDs, or IP addresses as metric attributes — cardinality explosion

## Reference Material

Detailed guidance on specific topics is in the `references/` directory. Read these when the task requires deeper context:

- **namespaces.md** — Full catalog of official namespace roots, worked examples showing which pattern each metric uses, custom namespace guidelines
- **instruments.md** — Instrument selection decision tree, additivity rules, sync vs async, UpDownCounter consistency
- **anti-patterns.md** — Bad→good naming examples, attribute anti-patterns, cardinality traps

## Review Checklist

When reviewing metric definitions, verify:

1. Name uses dot-delimited lowercase snake_case
2. No unit, service name, environment, or version in the metric name
3. Correct instrument type for the measurement
4. Unit in metadata field, following UCUM
5. Pluralization matches the instrument type
6. No `_total` suffix
7. Custom names don't collide with `otel.*` or existing semantic convention namespaces
8. Attributes follow `{object}.{property}` format
9. No high-cardinality values in metric attributes
10. UpDownCounter increments/decrements use matching attribute values

## Output

Provide:
- List of metrics reviewed with pass/fail per checklist item
- Suggested corrections for any violations
- Instrument type recommendation if missing or incorrect
- Attribute placement corrections (name → resource → metric attribute)
