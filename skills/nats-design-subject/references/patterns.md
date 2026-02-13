# NATS Subject Hierarchy Patterns

This reference covers 6 proven subject hierarchy patterns and 5 segmentation strategies for different use cases.

**Related references**: For authorization on these patterns see [security.md](security.md). For JetStream stream design see [jetstream.md](jetstream.md). For common mistakes see [anti-patterns.md](anti-patterns.md).

## Pattern 1: Simple Domain Pattern (3 Segments)

**Use when**: Single region, straightforward domains, learning NATS.

```
{domain}.{action}.{id}

Examples:
- orders.created.order-123
- orders.shipped.order-456
- inventory.reserved.item-789
- payments.authorized.payment-101
```

**Subscriber Paths**:
```nats
orders.>              # All order events
orders.created.>      # All order creations
inventory.>           # All inventory events
```

**Best For**: E-commerce backend, simple microservices, IoT with single location.

**Scaling**: Works for 10k-100k events/sec with moderate subscriber count. Add region/tenant at layer 3 when scaling.

---

## Pattern 2: Multi-Region Pattern (4-5 Segments)

**Use when**: Geographically distributed services, compliance/data residency, regional failover.

```
{domain}.{action}.{region}.{id}

Examples:
- orders.created.us-west.order-123
- orders.created.eu-central.order-456
- devices.telemetry.ap-south.device-789
- payments.processed.us-east.payment-101
```

**Subscriber Paths**:
```nats
orders.>                    # All orders (any region)
orders.created.>            # All order creations (any region)
orders.created.us-west.>    # Order creations in US West
orders.>.us-west.>          # All order actions in US West (less efficient)
```

**Best For**: Global e-commerce, distributed IoT networks, compliance-required data residency.

**Patterns**:
- Region as L3: Efficient regional filtering
- Region as L4: Less efficient, use L3 for regional subscriptions

---

## Pattern 3: Multi-Tenant Pattern (4-6 Segments)

**Use when**: SaaS platform, multi-tenant app, shared infrastructure.

```
{tenant}.{domain}.{action}.{id}

Examples:
- acme-corp.orders.created.order-123
- acme-corp.orders.updated.order-456
- startup-inc.analytics.processed.report-789
- startup-inc.users.registered.user-101
```

**Subscriber Paths**:
```nats
acme-corp.>                     # All events for tenant (admin dashboard)
acme-corp.orders.>              # All order events for tenant
acme-corp.orders.created.>      # All order creations for tenant
```

**Authorization** (with NATS auth):
```
User from acme-corp:
  Publish: acme-corp.>
  Subscribe: acme-corp.>

User from startup-inc:
  Publish: startup-inc.>
  Subscribe: startup-inc.>

Admin user:
  Publish: >
  Subscribe: >
```

**Best For**: Multi-tenant SaaS, white-label platforms, shared NATS clusters.

**Variation with Region** (5 segments):
```
{tenant}.{domain}.{action}.{region}.{id}

acme-corp.orders.created.us-west.order-123
```

---

## Pattern 4: Request/Reply Pattern

**Use when**: Synchronous microservices, command-response, RPC-like communication.

```
Request Subject: {service}.request.{request-type}
Reply Subject: {service}.reply.{correlation-id}

Examples:
orders.request.get-order
orders.request.calculate-total
payments.request.authorize

Reply inbox: _INBOX.{auto-generated-id}
```

**Implementation**:
```
Requester publishes to: orders.request.get-order
With reply-to: _INBOX.abc123

Responder subscribes to: orders.request.>
  Reads reply-to header
  Publishes response to: _INBOX.abc123
```

**Built-in Support**: NATS provides automatic reply-to handling for request/reply.

**Best For**: Synchronous service calls, command-query, request-response patterns.

---

## Pattern 5: Event Sourcing Pattern

**Use when**: CQRS systems, domain-driven design, event-sourced aggregates.

```
{aggregate-type}.{action}.v{version}.{aggregate-id}

Examples:
- orders.order.created.v1.order-123
- orders.order.updated.v1.order-123
- accounts.account.debited.v1.account-456
- accounts.account.credited.v1.account-456
```

**Rationale**:
- Aggregate type (orders) groups related events
- Action (created, updated) describes what happened
- Version for API evolution
- ID for traceability

**Subscriber Paths**:
```nats
orders.>                  # All order aggregate events
orders.order.>            # All events for order aggregate
orders.order.created.>    # All order creation events
orders.order.created.v1.> # All v1 order creations
```

**JetStream Stream Subject**:
```
Stream name: orders-domain
Subject filter: orders.>

Consumers subscribe with filters:
Filter: orders.order.created.v1.>  (only order creations)
Filter: orders.order.>              (all order events)
```

**Best For**: Event-sourced systems, domain-driven design, audit trails.

---

## Pattern 6: Temporal/Versioned Pattern

**Use when**: Versioned APIs, time-series data, deprecation management.

```
{domain}.{action}.v{version}.{resource-id}
OR
{domain}.{action}.{timestamp}.{id}

Examples:
- orders.created.v2.order-123     (API version)
- devices.telemetry.2026-01-24.sensor-456 (time-based)
- prices.updated.v3.product-789   (schema version)
```

**Version Management**:
```
Version 1 (deprecated): orders.created.v1.order-123
Version 2 (current):    orders.created.v2.order-123
Version 3 (beta):       orders.created.v3.order-123

Subscriber paths:
orders.created.v2.>   # Subscribe to v2 only
orders.created.>      # Subscribe to all versions (less safe)
```

**Time-Series Variant**:
```
devices.telemetry.2026-01-24.sensor-456
devices.telemetry.2026-01-23.sensor-456

Subscriber: devices.telemetry.2026-01-24.> (current day only)
Subscriber: devices.telemetry.>.>           (all days)
```

**Best For**: API evolution, device telemetry, multi-version deployments.

---

## Segmentation Strategies

### Strategy 1: Domain-Based (DDD Bounded Contexts)

Organize by business domains from DDD:

```
orders.{action}.{id}
payments.{action}.{id}
inventory.{action}.{id}
shipping.{action}.{id}
```

**When**: Microservices with clear domain boundaries.

**Subscribers**:
- `orders.>` - Order service
- `payments.>` - Payment service
- `inventory.>` - Inventory service

---

### Strategy 2: Tenant-Based (Multi-Tenancy)

Organize by tenant with domains nested:

```
{tenant}.{domain}.{action}.{id}
```

**When**: SaaS platforms, multi-tenant apps.

**Subscribers**:
- `acme-corp.>` - All events for ACME Corp
- `acme-corp.orders.>` - ACME Corp orders
- `startup-inc.orders.>` - StartUp Inc orders

**Authorization**: Tenant prefix enables subject-based auth.

---

### Strategy 3: Regional (Geo-Distribution)

Organize by geographic region:

```
{domain}.{action}.{region}.{id}
```

**When**: Global systems, data residency requirements, compliance.

**Subscribers**:
- `orders.>.us-west.>` - Orders in US West
- `orders.>.eu-central.>` - Orders in EU Central
- `orders.>` - All orders globally

**Use Case**: GDPR compliance (EU data stays in EU).

---

### Strategy 4: Temporal (Time-Series)

Organize by time for IoT and monitoring:

```
{device-type}.{metric}.{region}.{device-id}.{timestamp}
OR
{device-type}.{metric}.{date}.{device-id}
```

**When**: IoT telemetry, device monitoring, high-velocity streams.

**Examples**:
```
sensors.temperature.us-west.sensor-456
sensors.temperature.us-west.sensor-789
sensors.humidity.us-west.sensor-456
```

**Subscribers**:
- `sensors.temperature.us-west.>` - All temperature in US West
- `sensors.>.us-west.sensor-456` - All metrics from specific sensor
- `sensors.>` - All sensor data

**JetStream Streams**:
```
Stream: sensor-data
Subject: sensors.>

Consumers filter by:
- sensors.temperature.> (temperature only)
- sensors.humidity.> (humidity only)
- sensors.>.us-west.> (region only)
```

---

### Strategy 5: Versioning (Evolution)

Organize by API/schema version:

```
{domain}.{action}.v{version}.{id}
```

**When**: APIs evolving, schema changes, gradual rollout.

**Examples**:
```
orders.created.v1.order-123  (old schema)
orders.created.v2.order-123  (new schema)
users.updated.v1.user-456    (v1 update)
users.updated.v2.user-456    (v2 update)
```

**Migration**:
1. v1 service runs old version
2. v2 service runs new version
3. New service publishes to v2 subjects
4. Old service publishes to v1 subjects
5. Subscribers filter by version they understand
6. Once v1 fully deprecated, remove subjects

---

## Real-World Example Combinations

### E-Commerce Microservices

Combines: Domain-based + Multi-region

```
orders.created.us-west.order-123
orders.created.eu-central.order-456
payments.authorized.us-west.payment-789
inventory.reserved.us-west.item-101
shipping.dispatched.eu-central.order-456
```

**Subscribers**:
```
Order Service: orders.>
Payment Service: payments.>
Inventory Service: inventory.>
Shipping Service: shipping.>
Regional Dashboard (US West): >.us-west.>
Regional Dashboard (EU): >.eu-central.>
```

---

### Multi-Tenant SaaS Platform

Combines: Tenant-based + Domain-based + Regional

```
acme-corp.orders.created.us-west.order-123
acme-corp.analytics.processed.report-456
startup-inc.orders.created.eu-central.order-789
startup-inc.analytics.processed.report-101
```

**Subscribers**:
```
ACME Corp Admin Dashboard: acme-corp.>
StartUp Inc Admin: startup-inc.>
Orders Service: >.orders.>
Analytics Service: >.analytics.>
Regional Monitor (US West): >.>.us-west.>
```

---

### IoT Device Telemetry

Combines: Temporal + Domain-based + Regional

```
devices.telemetry.us-east.sensor-456.temperature
devices.telemetry.us-east.sensor-456.humidity
devices.telemetry.ap-south.device-789.voltage
devices.telemetry.ap-south.device-789.current
```

**Subscribers**:
```
Temperature Monitor: devices.telemetry.>.>.temperature
US East Aggregator: devices.telemetry.us-east.>
Device 456 Dashboard: devices.telemetry.>.sensor-456.>
All Telemetry: devices.telemetry.>
```

**JetStream Stream**:
```
Stream: iot-telemetry
Subject: devices.telemetry.>

Consumer: temperature-only
Filter: devices.telemetry.>.>.temperature

Consumer: us-east-only
Filter: devices.telemetry.us-east.>

Consumer: sensor-456
Filter: devices.telemetry.>.sensor-456.>
```

---

### Multi-Tenant Agentic AI Platform

Combines: Tenant-based + Agent-centric + Task-based

```
agents.task-assigned.tenant-abc.agent-xyz.task-123
agents.task-completed.tenant-abc.agent-xyz.task-123
agents.capabilities.tenant-abc.llm-agent
agents.collaborate.tenant-abc.session-456.agent-xyz
platform.monitoring.all-tenants.agent-health
platform.monitoring.tenant-abc.agent-metrics
```

**Subscribers**:
```
AI Agent (xyz) for tenant-abc: agents.>.tenant-abc.agent-xyz.>
All agents in tenant-abc: agents.>.tenant-abc.>
Platform Monitor: platform.monitoring.>
LLM agent capability discovery: agents.capabilities.tenant-abc.llm-agent
```

**Security via Subjects**:
- Tenant A's agents: `agents.>.tenant-a.>` (cannot see tenant-b)
- Tenant B's agents: `agents.>.tenant-b.>` (cannot see tenant-a)
- Admin monitor: `platform.monitoring.>`

---

## Comparison Matrix

| Pattern | Best For | Complexity | Scalability | Auth Support |
|---------|----------|-----------|-------------|--------------|
| Simple | Learning, single domain | Low | 100k events/sec | Good |
| Multi-Region | Global systems | Medium | 1M+ events/sec | Good |
| Multi-Tenant | SaaS, shared infra | Medium-High | 1M+ events/sec | Excellent |
| Request/Reply | Sync services | Low | 10k req/sec | Good |
| Event Sourcing | CQRS, event-sourced | Medium | 100k events/sec | Good |
| Temporal | IoT, time-series | High | 10M+ events/sec | Good |

