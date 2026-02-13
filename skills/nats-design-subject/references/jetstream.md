# NATS JetStream Subject Design

This reference covers subject patterns specific to NATS JetStream (streams, consumers, persistence, and event distribution).

**Related references**: For core subject hierarchy patterns see [patterns.md](patterns.md). For stream-level security and tenant isolation see [security.md](security.md). For common design mistakes see [anti-patterns.md](anti-patterns.md).

## JetStream Subject Basics

### Streams vs Publishers

JetStream **streams** define which subjects to persist:

```nats
stream: {
  name: "orders-stream"
  subjects: ["orders.>"]              # Stream captures subjects matching this filter
}
```

This doesn't stop publishers from publishing elsewhere—streams define what JetStream captures.

### Consumer Filtering

JetStream **consumers** can further filter subjects:

```nats
stream: "orders-stream"
subjects: ["orders.>"]               # Stream captures all orders

consumer: {
  name: "order-created-consumer"
  filter_subject: "orders.created.>"  # Consumer only sees creations
}
```

**Key Insight**: Design subjects considering both stream capture and consumer filtering.

---

## Pattern 1: Simple Domain Stream

**Use when**: Single domain, simple event types, single consumer.

**Stream Definition**:
```nats
stream: {
  name: "orders"
  subjects: ["orders.>"]              # Captures all order subjects
  max_age: 7d
  storage: file
}
```

**Subjects**:
```
orders.created.us-west.order-123
orders.shipped.us-west.order-456
orders.cancelled.us-east.order-789
```

**Consumers**:
```nats
# Consumer 1: All order events
consumer: {
  name: "all-orders"
  filter_subject: "orders.>"          # All order events
  deliver_policy: new              # Start with new messages
}

# Consumer 2: Creations only
consumer: {
  name: "order-creations"
  filter_subject: "orders.created.>"  # Creations only
}

# Consumer 3: Regional (US West)
consumer: {
  name: "us-west-orders"
  filter_subject: "orders.>.us-west.>" # All order actions in US West
}
```

---

## Pattern 2: Multi-Domain Streams (One per Domain)

**Use when**: Clear domain boundaries, separate scaling needs, independent retention.

**Stream Definitions**:
```nats
stream: {
  name: "orders-domain"
  subjects: ["orders.>"]
  max_age: 30d                        # Keep order history long
}

stream: {
  name: "payments-domain"
  subjects: ["payments.>"]
  max_age: 7y                         # Keep payment history for 7 years
}

stream: {
  name: "inventory-domain"
  subjects: ["inventory.>"]
  max_age: 1d                         # Short retention (high volume)
}
```

**Advantages**:
- Each domain scales independently
- Retention policies per domain
- Clear separation of concerns
- Easy to troubleshoot per domain

**Consumer Patterns**:
```nats
# Cross-domain: Process orders and their payments
consumer: {
  name: "order-with-payments"
  filter_subject: "orders.created.>"  # Subscribe to orders stream
  # Then separately subscribe to payments-domain stream
}
```

---

## Pattern 3: Multi-Tenant Streams

**Use when**: Multi-tenant SaaS, separate streams per tenant, complete isolation.

**Stream Naming**:
```nats
stream: {
  name: "tenant-acme-corp"            # One stream per tenant
  subjects: ["acme-corp.>"]
}

stream: {
  name: "tenant-startup-inc"
  subjects: ["startup-inc.>"]
}

stream: {
  name: "tenant-big-enterprise"
  subjects: ["big-enterprise.>"]
}
```

**Subjects**:
```
# Tenant A
acme-corp.orders.created.us-west.order-123
acme-corp.payments.authorized.us-west.payment-456

# Tenant B
startup-inc.orders.created.eu-central.order-789
startup-inc.payments.authorized.eu-central.payment-101

# Tenant C
big-enterprise.orders.created.us-east.order-abc
big-enterprise.payments.authorized.us-east.payment-def
```

**Consumers (Tenant-Scoped)**:
```nats
# Tenant A - Orders only
stream: "tenant-acme-corp"
consumer: {
  name: "acme-orders-consumer"
  filter_subject: "acme-corp.orders.>"
}

# Tenant B - Payments only
stream: "tenant-startup-inc"
consumer: {
  name: "startup-payments-consumer"
  filter_subject: "startup-inc.payments.>"
}
```

**Advantages**:
- Complete tenant isolation
- Different retention per tenant
- Different redundancy per tenant
- Easy to add/remove tenants
- Per-tenant backups

**Scaling Considerations**:
- With 100 tenants = 100 streams (scalable with modern hardware)
- With 1000 tenants = consider sharding or hierarchical streams

---

## Pattern 4: Event-Sourced Aggregate Streams

**Use when**: Event-sourcing, CQRS, domain-driven design.

**Subject Format**:
```
{aggregate-type}.{action}.v{version}.{aggregate-id}
```

**Stream Definition**:
```nats
stream: {
  name: "order-events"
  subjects: [
    "orders.order.created.>",         # All order creation events
    "orders.order.updated.>",         # All order updates
    "orders.order.shipped.>",         # All order shipments
    "orders.order.cancelled.>"        # All cancellations
  ]
  max_age: never                      # Audit trail, never expire
  storage: file
}
```

**Subjects**:
```
orders.order.created.v1.order-123      (1st event)
orders.order.updated.v1.order-123      (2nd event)
orders.order.shipped.v1.order-123      (3rd event)

# Version upgrade scenario
orders.order.created.v2.order-456      (v2 event)
orders.order.updated.v2.order-456
```

**Consumers**:
```nats
# Consumer 1: Rebuild aggregate from events
consumer: {
  name: "order-rebuilder"
  filter_subject: "orders.order.>"     # All order events
  deliver_policy: all                  # From the beginning
  flow_control: enable                 # Handle backpressure
  max_deliver: 3                       # Retry failed messages
}

# Consumer 2: Track completions
consumer: {
  name: "order-completions"
  filter_subject: "orders.order.shipped.>" # Shipped events only
}

# Consumer 3: Track errors
consumer: {
  name: "order-errors"
  filter_subject: "orders.order.failed.>"  # Failed events only
}
```

**Event Sourcing Benefits**:
- Full audit trail of state changes
- Can rebuild any aggregate at any point in time
- Replay events for debugging
- Events are the source of truth

---

## Pattern 5: Stream Mirror (Replication)

**Use when**: Multi-region, disaster recovery, high availability.

**Primary Stream (Region 1)**:
```nats
stream: {
  name: "orders-primary"
  subjects: ["orders.>"]
  storage: file
}
```

**Mirror Stream (Region 2)**:
```nats
stream: {
  name: "orders-replica"
  mirror: {
    name: "orders-primary"            # Mirror from primary
    domain: "us-west"                 # Primary is in US West
  }
}
```

**Subject Behavior**:
```
Publisher publishes to: orders.created.us-west.order-123
  ↓
Primary stream captures: orders.>
  ↓
Mirror stream replicates: orders.>
  ↓
Consumers in Region 2 read from mirror

Failover:
  If primary fails → consumers switch to mirror
  Mirror stream same subject naming, seamless failover
```

---

## Pattern 6: Subject Transforms (Republish Pattern)

**Use when**: Transform events, fan-out to derived streams, normalizations.

**Source Subjects**:
```
orders.created.us-west.order-123
orders.created.eu-central.order-456
```

**Transform to Derived Stream**:
```nats
stream: {
  name: "orders-raw"
  subjects: ["orders.>"]
}

stream: {
  name: "orders-by-region"           # Derived stream
  sources: [{
    name: "orders-raw"
  }]
}

consumer: {
  name: "transform-by-region"
  filter_subject: "orders.created.>" # Source
  deliver_subject: "orders.region-{region}.created.>"  # Transform target
}
```

**Transform Flow**:
```
Input: orders.created.us-west.order-123
  ↓ (Consumer with subject transform)
Output: orders.region-us-west.created.order-123

Input: orders.created.eu-central.order-456
  ↓
Output: orders.region-eu-central.created.order-456
```

**Use Cases**:
- Normalize subject hierarchies
- Fan-out to multiple derived streams
- Create read models
- Prepare data for analytics

---

## Pattern 7: Multi-Tenant Stream Isolation

**Scenario**: SaaS with multi-tenant streams where subjects are tenant-prefixed.

**Stream Design**:
```nats
# Option A: One stream per tenant (recommended)
stream: {
  name: "tenant-acme-corp"
  subjects: ["acme-corp.>"]           # All acme events
}

stream: {
  name: "tenant-startup-inc"
  subjects: ["startup-inc.>"]
}

# Option B: Single stream, multiple tenants
stream: {
  name: "all-tenants"
  subjects: [
    "acme-corp.>",
    "startup-inc.>",
    "big-enterprise.>"
  ]
}
```

**Consumer (Option A - Recommended)**:
```nats
stream: "tenant-acme-corp"
consumer: {
  name: "acme-orders"
  filter_subject: "acme-corp.orders.>"
}
```

**Consumer (Option B - Less Recommended)**:
```nats
stream: "all-tenants"
consumer: {
  name: "acme-orders"
  filter_subject: "acme-corp.orders.>"   # Filter by tenant prefix
}
```

**Recommendation**: Option A (one stream per tenant) is better:
- Easier scaling
- Tenant isolation
- Different retention per tenant
- Better disaster recovery

---

## Retention Policies by Domain

Different domains need different retention:

```nats
# Financial (long retention)
stream: {
  name: "payments-stream"
  subjects: ["payments.>"]
  max_age: 7y                         # 7 year audit requirement
}

# Orders (medium retention)
stream: {
  name: "orders-stream"
  subjects: ["orders.>"]
  max_age: 90d                        # 90 days, then archived
}

# Metrics/Telemetry (short retention)
stream: {
  name: "telemetry-stream"
  subjects: ["devices.telemetry.>"]
  max_age: 24h                        # High volume, 1 day only
  max_bytes: 100gb                    # Also limit by size
}

# Audit (never expire)
stream: {
  name: "audit-stream"
  subjects: ["_audit.>"]
  max_age: never                      # Never delete audit logs
}
```

---

## High-Volume Subject Design (IoT)

**Challenge**: Device telemetry generates 1M+ events/sec with high cardinality device IDs.

**Subject Design**:
```
devices.telemetry.{region}.{device-id}.{metric}
devices.telemetry.us-west.sensor-456.temperature
devices.telemetry.us-west.sensor-789.humidity
```

**Stream Strategy**:
```nats
# One stream per region (separate load)
stream: {
  name: "telemetry-us-west"
  subjects: ["devices.telemetry.us-west.>"]
  max_bytes: 500gb                    # Limit stream size
  discard_policy: new                 # Drop oldest if full
}

stream: {
  name: "telemetry-eu-central"
  subjects: ["devices.telemetry.eu-central.>"]
  max_bytes: 500gb
}
```

**Consumer Strategy**:
```nats
# Consumer 1: Temperature metrics only
consumer: {
  name: "temp-aggregator"
  filter_subject: "devices.telemetry.us-west.>.temperature"
}

# Consumer 2: Specific device
consumer: {
  name: "sensor-456-monitor"
  filter_subject: "devices.telemetry.us-west.sensor-456.>"
}

# Consumer 3: All metrics (aggregation)
consumer: {
  name: "all-metrics-stream"
  filter_subject: "devices.telemetry.us-west.>"
}
```

**Scaling Tactics**:
- One stream per region (not global)
- Consumer per metric type
- Aggressive retention (1-7 days)
- Size limits to force data aging

---

## Consumer Ordering Considerations

**Subject Order Matters for Message Ordering**:

```nats
Stream subjects: "orders.>"

Message 1: orders.created.us-west.order-1
Message 2: orders.shipped.us-east.order-2
Message 3: orders.created.us-east.order-3

Consumer reads in order: 1, 2, 3
(Subjects are different, so ordering by receipt time)
```

**For Aggregate Ordering Use Aggregate ID**:
```nats
Subjects with aggregate ID: orders.{action}.{order-id}

orders.created.order-1
orders.updated.order-1      ← Same order-id, maintains ordering
orders.shipped.order-1

Consumer: filter_subject: "orders.>order-1"
Reads in insertion order: created → updated → shipped
```

---

## Message Headers and Metadata

**Don't Put Everything in Subject—Use Headers**:

```nats
Subject: orders.created.us-west.order-123
Headers:
  X-Correlation-Id: abc-123-def
  X-User-Id: user-456
  X-Tenant-Id: acme-corp
  X-Timestamp: 2026-01-24T12:34:56Z
Payload: { orderId: "order-123", total: 99.99, ... }
```

**Benefits**:
- Subject stays readable (not bloated)
- Headers for filtering/metadata
- Payload for business data
- Supports header-based filtering in consumers (future)

---

## JetStream Configuration Checklist

When designing JetStream subjects:

- [ ] **Stream Subjects Defined**: Clear subject filters for each stream?
- [ ] **Consumer Filters**: Each consumer has appropriate filter_subject?
- [ ] **Retention Policy**: max_age set appropriately per domain?
- [ ] **Storage Strategy**: File vs memory decided per workload?
- [ ] **Ordering Semantics**: Aggregate ID in subject for ordered consumers?
- [ ] **Headers Used**: Heavy data in headers, not subject?
- [ ] **Mirroring**: Cross-region streams planned?
- [ ] **Scaling Plan**: Stream per region/tenant/domain as needed?
- [ ] **Backpressure**: flow_control enabled for slow consumers?
- [ ] **Monitoring**: Subjects planned for stream/consumer metrics?

---

## Migration: Core NATS → JetStream

**Scenario**: Existing pub/sub, now want persistence.

**Step 1: Existing Core NATS**:
```nats
Publisher: orders.created.us-west.order-123
Subscriber: orders.created.>
```

**Step 2: Add JetStream (Dual System)**:
```nats
# Keep existing subjects (unchanged)
Publisher: orders.created.us-west.order-123
Subscriber 1 (Core): orders.created.>      (memory only)
Subscriber 2 (JS): orders.created.>        (persisted)
```

**Step 3: Switch to JetStream**:
```nats
# Publishers unchanged
Publisher: orders.created.us-west.order-123

# Subscribers migrate to JetStream
Consumer: filter_subject: "orders.created.>"
```

**No subject changes needed** if your subjects are well-designed!

