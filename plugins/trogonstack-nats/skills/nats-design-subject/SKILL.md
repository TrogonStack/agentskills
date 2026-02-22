---
name: nats-design-subject
description: >-
  Design NATS subject hierarchies for messaging patterns (pub/sub, request/reply,
  streaming). Apply naming conventions, segmentation strategies, and wildcard
  patterns to create scalable subject architectures. Use when designing NATS
  messaging systems, planning multi-tenant communication, or auditing existing
  subject hierarchies. Do not use for: (1) NATS server configuration or cluster
  setup, (2) client library implementation or connection code, (3) debugging
  connectivity or performance issues, (4) choosing between NATS and other
  messaging systems.
allowed-tools: AskUserQuestion, Write, Read, Shell
---

# Design NATS Subject Hierarchy

Design a subject architecture that subscribers can efficiently navigate using wildcards, with proper segment ordering, tenant isolation, and growth path.

## Interview Phase

**Skip interview if ALL of these are already specified:**
- Messaging patterns (pub/sub, request/reply, streaming)
- Multi-tenancy needs (single/multi-tenant, scale requirements)
- Security requirements (authorization, tenant isolation)
- Persistence needs (JetStream vs core NATS)

**Always interview if**: Migrating existing subjects (needs anti-pattern audit first)

### Questions

1. **Scope** — "Is this greenfield design or migrating existing subjects?"
   - Impact: Migration needs anti-pattern audit first (see [references/anti-patterns.md](references/anti-patterns.md))

2. **Multi-Tenancy & Scale** — "Do you need: (A) Single tenant, (B) Multi-tenant with isolation, (C) Massive scale with regions/shards?"
   - Impact: Determines whether tenant prefix is needed and segmentation depth

3. **Messaging Patterns** — "Which patterns do you use? (A) Pub/Sub only, (B) Request/Reply, (C) Streaming/JetStream, (D) All/mix?"
   - Impact: JetStream needs stream-aware subject design; request/reply has its own conventions

4. **Security** — "Do you need subject-based authorization or tenant isolation?"
   - Impact: Determines whether tenant/role prefixes are needed and permission boundaries

5. **Persistence** — "Do you need JetStream persistence or core NATS only?"
   - Impact: Determines stream/consumer subject design and retention considerations

---

## When to Use

- Designing a new NATS messaging system
- Planning multi-tenant subject isolation
- Organizing device telemetry or event streams
- Setting up request/reply patterns across microservices
- Defining event subject structure for event-sourced systems
- Building agentic AI platforms with inter-agent messaging

## When NOT to Use

- Configuring NATS server or cluster settings (infrastructure, not subject design)
- Writing NATS client code or connection logic (implementation, not architecture)
- Choosing between NATS and other messaging systems (technology evaluation)
- Debugging existing NATS connectivity or performance issues

---

## Workflow

### 1. Identify Domain Boundaries

List all business domains involved (orders, payments, inventory, etc.). Each domain becomes a top-level subject segment.

### 2. Choose a Pattern

Match the user's scenario to a pattern:

| Use Case | Pattern | Example |
|----------|---------|---------|
| **Simple Domain** | `{domain}.{action}.{scope}` | `orders.created.us-west` |
| **Multi-Region** | `{domain}.{action}.{region}.{id}` | `devices.telemetry.us-east.sensor-456` |
| **Multi-Tenant SaaS** | `{tenant}.{domain}.{action}.{id}` | `acme-corp.analytics.processed.report-123` |
| **Multi-Tenant AI** | `agents.{action}.{tenant}.{agent-id}.{task-id}` | `agents.task-assigned.tenant-abc.agent-xyz.task-123` |
| **Request/Reply** | `{service}.request` / `{service}.reply` | `orders.request` / `orders.reply` |
| **Event Sourcing** | `{aggregate}.{action}.v{version}.{id}` | `orders.order.created.v1.order-123` |

For full pattern details with subscriber paths and scaling guidance, read [references/patterns.md](references/patterns.md).

### 3. Order Segments Strategically

Apply these rules when ordering segments left-to-right:

- **Broad to specific**: Domain → Action → Scope → Identifier
- **Low-cardinality left, high-cardinality right**: Regions (few values) before IDs (millions of values)
- **Never put IDs or UUIDs before actions**

```
✓ GOOD: orders.created.us-west.order-123
                            ↑          ↑
                       low-card    high-card

✗ BAD:  orders.order-123.us-west.created
                ↑
           high-card early (kills wildcard filtering)
```

Why this matters: NATS wildcard matching scans left-to-right. High-cardinality values on the left force subscribers into inefficient `orders.*.us-west.created` patterns that must match thousands of IDs.

For common ordering mistakes and migration strategies, read [references/anti-patterns.md](references/anti-patterns.md).

### 4. Plan Subscriber Paths

For each domain, document how subscribers will filter:

```
orders.>                    → All order events
orders.created.>            → All order creation events
orders.created.us-west.>    → Orders created in US West
orders.created.us-west.order-123 → Specific order
```

Design subjects for subscribers, not publishers. Subscribers determine how you organize — a good hierarchy lets them efficiently filter with wildcards.

### 5. Design Security Model (if multi-tenant)

If the user needs tenant isolation or role-based access:

- Tenant ID as first segment enables subject-based authorization (`acme-corp.>`)
- Separate admin subjects from user operations (`_admin.>` for platform ops)
- Apply least-privilege permissions per service

For authorization patterns and tenant isolation examples, read [references/security.md](references/security.md).

### 6. Design JetStream Streams (if persistence needed)

If the user needs JetStream:

- One stream per domain (or per tenant for isolation)
- Consumer filters for fine-grained routing
- Retention policies per domain (financial: years, telemetry: days)
- Keep to 4-6 subject segments — use consumer filters instead of deeper hierarchies

For stream design, consumer patterns, and migration from core NATS, read [references/jetstream.md](references/jetstream.md).

### 7. Validate and Write Output

Present the design using this template:

```markdown
# NATS Subject Architecture: [System Name]

## Domain Overview
[Describe the domains and their interactions]

## Subject Hierarchy

### Domain: [Name]
- `domain.action.{scope}.{id}`
- `domain.action.{scope}.{id}`

Subscriber paths:
- `domain.>` — All events
- `domain.action.>` — Specific action

[Repeat for each domain]

## Multi-Tenancy Model
[How tenant isolation works via subjects, if applicable]

## Security Model
[Authorization rules per role/service, if applicable]

## JetStream Streams
[Stream definitions and consumer filters, if applicable]

## Quality Validation
[Run checklist below]
```

### Example Output

```markdown
# NATS Subject Architecture: IoT Smart Building Platform

## Domain Overview

Smart building system with 10,000+ sensors across multiple regions sending temperature, humidity, and occupancy data. Needs real-time monitoring, regional aggregation, and alerting.

## Subject Hierarchy

### Domain: Devices
- `devices.telemetry.{region}.{device-id}.{metric}`
- `devices.telemetry.us-west.sensor-456.temperature`
- `devices.telemetry.us-west.sensor-456.humidity`
- `devices.telemetry.eu-central.sensor-789.occupancy`

Subscriber paths:
- `devices.telemetry.>` — All telemetry (global monitoring)
- `devices.telemetry.us-west.>` — Regional dashboard (US West)
- `devices.telemetry.>.>.temperature` — All temperature readings

### Domain: Alerts
- `alerts.triggered.{severity}.{region}.{device-id}`
- `alerts.triggered.critical.us-west.sensor-456`

Subscriber paths:
- `alerts.triggered.critical.>` — Critical alerts only
- `alerts.triggered.>.us-west.>` — Regional alert dashboard

## Multi-Tenancy Model

Not applicable (single organization)

## Security Model

- Building operators: `devices.telemetry.>`, `alerts.>` (subscribe only)
- Alert service: `alerts.>` (publish + subscribe)
- Admin: `>` (full access)

## JetStream Streams

Stream: `telemetry-us-west`
  Subjects: `devices.telemetry.us-west.>`
  Retention: 24h (high volume)
  
Stream: `alerts`
  Subjects: `alerts.>`
  Retention: 30d

## Quality Validation

✓ All segments follow broad-to-specific order
✓ Device IDs at rightmost position
✓ Naming consistent (lowercase, hyphens)
✓ Regional filtering efficient
✓ 4 segments (within 4-6 limit)
```

For complete real-world examples across microservices, IoT, SaaS, event sourcing, and agentic AI platforms, read [references/use-cases.md](references/use-cases.md).

---

## Quick Start (Simple Cases)

If you're designing a simple single-domain system without multi-tenancy:

1. **Use Pattern 1** (Simple Domain): `{domain}.{action}.{id}`
2. **Skip references** — follow the workflow above
3. **Example**: `orders.created.order-123`, `payments.authorized.payment-456`

For multi-region, multi-tenant, or event-sourcing needs, continue with full workflow and read references as needed.

---

## Reference Navigation

The skill includes 5 detailed reference documents — read them as needed during workflow steps:

- **[patterns.md](references/patterns.md)**: Read when choosing initial pattern (step 2)
- **[anti-patterns.md](references/anti-patterns.md)**: Read when migrating or auditing existing subjects
- **[security.md](references/security.md)**: Read when multi-tenancy/authorization needed (step 5)
- **[jetstream.md](references/jetstream.md)**: Read when persistence needed (step 6)
- **[use-cases.md](references/use-cases.md)**: Read for complete worked examples per domain

Don't read all references upfront — use them progressively as the workflow requires.

---

## Naming Rules

- All lowercase with hyphens: `orders.created` ✓
- Never underscores: `orders_created` ✗
- Never mixed case: `Orders.Created` ✗
- Keep to 4-6 segments maximum

---

## Quality Checklist

- [ ] All segments follow broad-to-specific order (`{domain}.{action}.{scope}.{id}`)
- [ ] No UUID/ID fields appear before action/scope segments
- [ ] Naming consistent (all lowercase, hyphens, no underscores)
- [ ] Documented subscriber wildcard paths for each domain
- [ ] No subjects deeper than 6 segments
- [ ] Multi-tenancy isolation is clear (tenant ID positioning documented)
- [ ] Security subjects defined for admin/monitoring access
- [ ] No conflicting patterns (e.g., `orders.created.123` vs `orders.123.created`)
- [ ] High-cardinality decision documented (why ID placement chosen)

## Testing Your Design

Validate your subject hierarchy before deployment:

```bash
# Start local NATS server
nats-server -D

# Test subscriber wildcards
nats sub "orders.>"                    # Should match all order subjects
nats sub "orders.created.>"            # Should match only creations
nats sub "orders.created.us-west.>"    # Should match region-specific

# Test publishing
nats pub "orders.created.us-west.order-123" "test message"

# Verify JetStream streams (if applicable)
nats stream info orders-stream
nats consumer info orders-stream order-consumer
```

For existing deployments, audit current subjects:

```bash
# List active subjects (requires monitoring enabled)
nats server report jetstream

# Check subject permissions
nats server check connection --account <account-name>
```

## Reference Documentation

- **[Patterns](references/patterns.md)**: 6 hierarchy patterns with subscriber paths and scaling guidance
- **[Anti-Patterns](references/anti-patterns.md)**: 8 common mistakes with detection, fixes, and migration strategies
- **[Security & Multi-Tenancy](references/security.md)**: Authorization patterns and tenant isolation
- **[JetStream Design](references/jetstream.md)**: Stream filters, consumer subjects, and retention policies
- **[Use Cases](references/use-cases.md)**: Complete examples for microservices, IoT, SaaS, event sourcing, agentic AI
