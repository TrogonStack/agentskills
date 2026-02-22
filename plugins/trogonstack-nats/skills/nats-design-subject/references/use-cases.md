# NATS Subject Architecture: Domain-Specific Use Cases

Complete worked examples showing how subject patterns, security, and JetStream come together for 5 real-world domains. Each use case focuses on the end-to-end flow — for pattern details see [patterns.md](patterns.md), for authorization see [security.md](security.md), for stream design see [jetstream.md](jetstream.md).

## Index

1. [Microservices (E-Commerce)](#use-case-1-microservices-e-commerce) - Multi-service pub/sub + request/reply patterns
2. [IoT / Device Telemetry](#use-case-2-iot--device-telemetry) - High-volume sensor data with regional aggregation
3. [Multi-Tenant SaaS](#use-case-3-multi-tenant-saas) - Tenant isolation + authorization patterns
4. [Event Sourcing / CQRS](#use-case-4-event-sourcing--cqrs) - Aggregate streams + projection patterns
5. [Agentic AI Platform](#use-case-5-agentic-ai-platform) - Agent communication + task routing

---

## Use Case 1: Microservices (E-Commerce)

### Scenario

E-commerce platform with microservices: Orders, Payments, Inventory, Shipping. Services communicate via NATS pub/sub and request/reply.

### Subject Architecture

```
{service}.{action}.{region}.{resource-id}

- orders.created.us-west.order-123
- orders.cancelled.us-west.order-456
- payments.authorized.us-west.payment-789
- payments.failed.us-west.payment-101
- inventory.reserved.us-west.item-456
- shipping.dispatched.us-east.shipment-123
```

### Request/Reply for Synchronous Calls

```
Order Service → Inventory Service: "Do I have this item?"

Request Subject: inventory.request.check-availability
Reply-To: _INBOX.order-service-abc-123

Inventory Service Response:
  Publishes to: _INBOX.order-service-abc-123
  With result: {available: true, quantity: 5}
```

### Cross-Service Subscriber Map

```
Order Service subscribes to:
- payments.authorized.>         (payment confirmations)
- inventory.reserved.>          (fulfillment ready)
- shipping.dispatched.>         (tracking updates)

Inventory Service subscribes to:
- orders.created.>              (new orders to reserve)
- orders.cancelled.>            (release reservations)
- inventory.request.>           (availability queries)

Shipping Service subscribes to:
- orders.paid.>                 (ready to ship)

Order Dashboard subscribes to:
- orders.>                      (all order events, any region)
- orders.>.us-west.>            (regional dashboard)
```

### Multi-Region Deployment

```
Regional Dashboard: orders.created.us-west.>
Global Dashboard: orders.created.>
```

### JetStream Retention by Domain

```nats
stream: "order-events"    subjects: ["orders.>"]     max_age: 90d
stream: "payment-events"  subjects: ["payments.>"]   max_age: 7y    # Compliance
stream: "inventory-events" subjects: ["inventory.>"] max_age: 30d
stream: "shipping-events" subjects: ["shipping.>"]   max_age: 1y
```

For full stream configuration see [jetstream.md](jetstream.md) Pattern 2 (Multi-Domain Streams).

---

## Use Case 2: IoT / Device Telemetry

### Scenario

Smart building system: 10,000 sensors across regions sending temperature, humidity, and occupancy. Needs real-time monitoring, aggregation, and alerting.

### Subject Architecture

```
devices.{metric}.{region}.{device-id}

- devices.temperature.us-west.sensor-456
- devices.humidity.us-west.sensor-456
- devices.occupancy.us-west.floor-1-zone-a
```

### Message Content

```json
Subject: devices.temperature.us-west.sensor-456
Headers:
  X-Timestamp: 2026-01-24T12:34:56Z
  X-Device-Type: temperature-sensor
  X-Battery: 87%
Payload: {
  temperature: 22.5,
  unit: "celsius",
  accuracy: 0.1
}
```

### Subscriber Paths

```
Real-Time Dashboard:
- devices.temperature.us-west.>      (all temps in US West)
- devices.humidity.us-west.>         (all humidity in US West)

Temperature Alerting:
- devices.temperature.>              (all temperatures, any region)

Regional Aggregator:
- devices.>.us-west.>                (all metrics in region)

Specific Sensor Debug:
- devices.>.us-west.sensor-456       (all metrics from one sensor)
```

### Aggregation Workflow

```
Raw telemetry (10,000 sensors every 30 sec)
    ↓
Consumer: raw-telemetry (filter: devices.temperature.us-west.>)
    ↓ (process: calculate avg, min, max per floor)
    ↓
Publish to: devices.aggregated.hourly.us-west.floor-1
    ↓
Consumer: aggregation-stream (filter: devices.aggregated.>)
    ↓
Store in time-series DB or separate stream
```

### Alerting

```
Temperature out of range:
- Subscribe: devices.temperature.>
- Alert if: value > 28 or value < 18
- Publish: devices.alerts.temperature-high.us-west.sensor-456

Offline device:
- Subscribe: devices.temperature.>
- Alert if: no message in 60 seconds
- Publish: devices.alerts.offline.us-west.sensor-456
```

### High-Volume Strategy

With 10,000 devices sending every 30 seconds = ~1,000 messages/sec total.

- One stream per region (not global)
- Consumer per metric type
- Aggressive retention: 7 days raw, 1 year aggregated
- Size limits to force data aging

For stream configuration see [jetstream.md](jetstream.md) High-Volume Subject Design section.

---

## Use Case 3: Multi-Tenant SaaS Platform

### Scenario

Analytics SaaS serving 100 customers. Each tenant has events, queries, reports. Strict isolation required.

### Subject Architecture

```
{tenant}.{domain}.{action}.{scope}.{id}

Tenant A (ACME Corp):
- acme-corp.events.ingested.2026-01-24.event-123
- acme-corp.queries.created.2026-01-24.query-456
- acme-corp.reports.generated.2026-01-24.report-789

Tenant B (StartUp Inc):
- startup-inc.events.ingested.2026-01-24.event-101
- startup-inc.queries.created.2026-01-24.query-202
```

### Subscriber Paths

```
Tenant-scoped:
ACME Dashboard: acme-corp.>
ACME Query Engine: acme-corp.queries.created.>

Cross-tenant (admin only):
Platform Monitor: analytics.>
Usage Tracker: analytics.usage.daily.>
```

### Analytics Aggregation Flow

This is the unique challenge for multi-tenant SaaS — how to aggregate across tenants while maintaining isolation:

```
Individual tenant events:
acme-corp.events.ingested.2026-01-24.event-123
startup-inc.events.ingested.2026-01-24.event-456

  ↓ Aggregator service (reads all tenants, writes analytics)

Aggregated analytics (admin only):
analytics.usage.acme-corp.events-per-day
analytics.usage.all-tenants.total-events-per-day
analytics.cost.all-tenants.monthly-revenue
```

### GDPR Compliance via Region Filtering

```
{tenant}.{domain}.{action}.{region}.{id}

EU customers: startup-inc.*.*.eu-central.>
US customers: startup-inc.*.*.us-*.>
```

For authorization configuration see [security.md](security.md) Pattern 1 (Tenant Isolation) and Pattern 4 (Cross-Tenant Analytics). For stream-per-tenant setup see [jetstream.md](jetstream.md) Pattern 3.

---

## Use Case 4: Event-Sourced Systems (CQRS)

### Scenario

Order processing domain using event sourcing. All state changes are immutable events. Separate read models (projections) from command model (aggregates).

### Subject Architecture

```
{aggregate}.{action}.v{version}.{aggregate-id}

Orders Aggregate:
- orders.order.created.v1.order-123       (event 1)
- orders.order.confirmed.v1.order-123     (event 2)
- orders.order.paid.v1.order-123          (event 3)
- orders.order.shipped.v1.order-123       (event 4)

Accounts Aggregate:
- accounts.account.opened.v1.account-456
- accounts.account.credited.v1.account-456
- accounts.account.debited.v1.account-456
```

### Event Versioning

```
Old version (deprecated):  orders.order.created.v1.order-1
New version (current):     orders.order.created.v2.order-3

Transition strategy:
1. Services read both v1 and v2
2. New publishers send v2 only
3. Migrate all consumers to v2
4. Retire v1 after full migration
```

### CQRS Flow

```
User Command: "Create Order"
    ↓
Command Handler: CreateOrderCommand
    ↓
Aggregate: OrderAggregate.createOrder()
    ↓
Publish to: orders.order.created.v1.order-123
    ↓
┌─────────────────────────────────────────┐
│ Multiple Consumers (Projections)        │
├─────────────────────────────────────────┤
│ OrderStatusProjection                   │
│ ↓ updates OrderStatus read model        │
│                                         │
│ CustomerOrdersProjection                │
│ ↓ updates CustomerOrders read model     │
│                                         │
│ RevenueProjection (waits for order.paid)│
│ ↓ later updates Revenue read model      │
└─────────────────────────────────────────┘
    ↓
Read Models ready for queries
```

### Projection Subscriber Patterns

```
Current Order Status:      orders.order.>           → OrderStatusReadModel
Orders by Customer:        orders.order.>           → CustomerOrdersReadModel
Revenue by Region:         orders.order.paid.>      → RevenueReadModel
```

For JetStream event store configuration and consumer patterns see [jetstream.md](jetstream.md) Pattern 4 (Event-Sourced Aggregate Streams).

---

## Use Case 5: Agentic AI Platforms (Multi-Tenant)

### Scenario

Multi-tenant platform where AI agents autonomously process tasks. Each tenant has isolation, agents collaborate within tenant, platform monitors all.

### Subject Architecture

```
agents.{action}.{tenant}.{agent-id}.{task-id}
agents.capabilities.{tenant}.{agent-type}
agents.collaborate.{tenant}.{session-id}.{agent-id}
platform.monitoring.{tenant}.{metric}
```

### Multi-Agent Workflow

This is the unique value of the agentic AI pattern — orchestrated multi-step task processing:

```
User Request (Tenant ACME): "Implement OAuth2 in our API"

Orchestrator publishes:
agents.task-assigned.tenant-acme.agent-planning-1.task-001
  → Planning Agent analyzes requirements

Planning Agent collaborates:
agents.collaborate.tenant-acme.session-001.agent-planning-1
  → Requests code agents for implementation

Orchestrator fans out:
agents.task-assigned.tenant-acme.agent-code-1.task-002
agents.task-assigned.tenant-acme.agent-code-2.task-003
  → Code agents implement + test in parallel

Code agents report:
agents.task-completed.tenant-acme.agent-code-1.task-002
agents.task-completed.tenant-acme.agent-code-2.task-003

Orchestrator routes to review:
agents.task-assigned.tenant-acme.agent-review-1.task-004
  → Review agent checks quality → done
```

### Subscriber Paths

```
Agent Task Queue:
Agent LLM-1: agents.task-assigned.tenant-acme.agent-llm-1.>

Inter-Agent Collaboration:
All agents in session: agents.collaborate.tenant-acme.session-001.>

Orchestrator Tracking:
Completions: agents.task-completed.tenant-acme.>
Failures: agents.task-failed.tenant-acme.>

Capability Discovery:
All agents: agents.capabilities.tenant-acme.>

Platform Monitoring:
Admin: platform.monitoring.>
```

### Message Example

```json
Subject: agents.task-assigned.tenant-acme.agent-llm-1.task-abc-123
Headers:
  X-Priority: high
  X-Deadline: 2026-01-24T14:00:00Z
  X-Correlation-Id: request-456
Payload: {
  taskId: "task-abc-123",
  type: "code-review",
  context: {
    repository: "oauth2-api",
    pullRequestId: "pr-789"
  },
  requirements: [
    "Review security best practices",
    "Verify test coverage"
  ]
}
```

For tenant isolation authorization see [security.md](security.md) Pattern 5 (AI Agent Sandbox Isolation). For JetStream stream setup see [jetstream.md](jetstream.md) Pattern 3.

---

## Comparison Matrix

| Use Case | Subject Depth | Domain Count | Subscriber Count | Throughput | Retention |
|----------|---|---|---|---|---|
| Microservices | 4 | 3-10 | 50-100 | 10k-100k/sec | 30d-7y |
| IoT | 4 | 1 (many dimensions) | 20-50 | 1M+/sec | 1-7 days |
| Multi-Tenant SaaS | 5 | 3-8 | 50-200 | 100k-1M/sec | 30-90d |
| Event Sourcing | 4 | 5-20 | 100+ | 10k-100k/sec | forever |
| Agentic AI | 5 | 2-3 | 100-1000+ | 10k-100k/sec | 30-365d |
