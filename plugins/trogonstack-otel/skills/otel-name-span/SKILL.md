---
name: otel-name-span
description: >-
  Review or create OpenTelemetry span names following semantic conventions.
  Validates naming, cardinality, attribute placement, and protocol-specific
  patterns. Use when designing new spans, reviewing existing instrumentation,
  or auditing span naming consistency. Do not use for: (1) metric naming, (2)
  OTel collector configuration, (3) SDK installation or setup, (4) alerting or
  dashboard design.
allowed-tools: AskUserQuestion, Write, Read, Shell
---

# Review or Create OpenTelemetry Span Names

Review or create span names that follow OTel Semantic Conventions, ensuring low cardinality, correct protocol-specific patterns, and proper attribute separation.

**Before applying any rule below**, fetch the latest naming guidance to check for updates:
- https://opentelemetry.io/docs/specs/semconv/general/naming/
- https://opentelemetry.io/docs/specs/semconv/general/trace/
- https://opentelemetry.io/blog/2025/how-to-name-your-spans/

If the fetched content contradicts any rule in this skill, follow the fetched content and flag the discrepancy.

## Core Principle

Span names MUST have **low cardinality**. The name describes the class of operation, not the specific instance.

## General Naming Pattern: `{verb} {object}`

- **Verb**: the work being done — process, send, calculate, render, validate
- **Object**: a noun describing what is acted upon — payment, invoice, order

This naturally produces low-cardinality names suitable for grouping and aggregation.

## What Goes Where

| In Span Name | In Span Attributes |
|-------------|-------------------|
| Operation type | User IDs |
| Resource category | Invoice numbers |
| | Campaign names, zip codes |
| | Parameter values |
| | Status/outcome (use span status) |

## Reference Material

Detailed guidance on specific topics is in the `references/` directory:

- **protocols.md** — Protocol-specific span naming patterns (HTTP, DB, messaging, RPC)
- **anti-patterns.md** — Bad→good naming examples, cardinality red flags, attribute anti-patterns

## Attribute Naming

- Pattern: `{object}.{property}` with dot separators
- Lowercase, snake_case within segments
- Namespace related attributes together: `order.id`, `order.total`, `order.status`
- Keep names stable; let values carry dynamic data: `{ "user.id": "12345" }` not `{ "user_12345.action": "login" }`

### System-Specific Attributes

- Pattern: `{system_name}.*.{property}`
- Examples: `cassandra.consistency.level`, `aws.s3.key`
- The system name MUST match the value in `*.system.name` attribute

### Attribute Requirement Levels

- **Required**: must always be present
- **Conditionally Required**: required under specified conditions
- **Recommended**: should be present when available
- **Opt-In**: included only when explicitly configured

## Span Status Mapping (HTTP)

| Status Code | Server Span | Client Span |
|-------------|-------------|-------------|
| 1xx, 2xx, 3xx | Unset (OK) | Unset (OK) |
| 4xx | Unset (client error) | **Error** |
| 5xx | **Error** | **Error** |

## Review Checklist

When reviewing span definitions, verify:

1. Name has low cardinality — no IDs, timestamps, user data, full URLs
2. Follows `{verb} {object}` or protocol-specific pattern
3. Instance-specific data is in span attributes, not the name
4. Outcome/status uses span status, not the name
5. HTTP spans use route templates, not raw paths
6. DB spans use parameterized queries
7. Messaging spans follow `{operation} {destination}` pattern
8. Attributes use `{object}.{property}` dot-delimited snake_case
9. No service name, version, or environment in the span name
10. SpanKind is correct for the operation type

## Output

Provide:
- List of spans reviewed with pass/fail per checklist item
- Suggested corrections for any violations
- Attribute placement corrections (name → attribute)
- SpanKind recommendation if missing or incorrect
- Protocol-specific pattern recommendation where applicable
