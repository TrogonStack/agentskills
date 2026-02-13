# NATS Subject Anti-Patterns

This reference documents 8 common mistakes in subject design with detection, fixes, and migration strategies.

**Related references**: For correct patterns see [patterns.md](patterns.md). For security-specific mistakes see [security.md](security.md). For JetStream-specific design see [jetstream.md](jetstream.md).

## Anti-Pattern 1: High-Cardinality Left ⚠️ CRITICAL

**What it looks like**:
```
✗ BAD:
orders.order-123.created.us-west
orders.order-456.created.us-west
orders.order-789.created.us-west

✓ GOOD:
orders.created.us-west.order-123
orders.created.us-west.order-456
orders.created.us-west.order-789
```

**Why it's bad**:
- Kills hierarchical filtering
- Subscriber must use wildcard: `orders.*.created.us-west.>` (matches thousands)
- Cannot efficiently say "all orders created in US West"
- High memory usage for wildcard subscriptions

**Detection**:
```nats
# If you're writing subscribers like this, you have the problem:
subscribers: orders.*.created.>      # Wildcard in middle = high-cardinality left
```

**Fix**:
1. Restructure subjects: Move ID to rightmost position
2. Update publishers to use new subject format
3. Update subscribers accordingly

**Migration Strategy**:
```
Phase 1 (week 1-2):
  - Start new subjects: orders.created.us-west.order-123 (new ID position)
  - Keep publishing to both old and new subjects
  - Old subscribers still work: orders.order-123.>
  - New subscribers use: orders.created.us-west.>

Phase 2 (week 3-4):
  - Update all subscribers to new subjects
  - Verify both old and new working
  - Monitor for gaps

Phase 3 (week 5):
  - Stop publishing to old subjects
  - Decommission old subscriptions
  - Celebrate!
```

**Real Example (E-Commerce)**:
```
BEFORE (❌ high-cardinality left):
orders.12345678.created       (customer ID on left)
orders.12345678.shipped       (must filter by customer first)
orders.12345679.created       (10 million customers = 10 million prefixes)

AFTER (✓ good):
orders.created.customer-12345678
orders.shipped.customer-87654321
Subscriber: orders.created.customer-12345678.>
Subscriber: orders.shipped.>    (all shipments efficiently)
```

---

## Anti-Pattern 2: Inconsistent Segment Ordering

**What it looks like**:
```
✗ BAD (mixed ordering):
orders.created.us-west.order-123      (action before region)
orders.us-west.created.order-456      (region before action)
payments.authorized.payment-789       (no region)
payments.us-west.authorized.payment-101  (different order)

✓ GOOD (consistent):
orders.created.us-west.order-123      (always: domain.action.region.id)
orders.shipped.us-west.order-456
payments.authorized.us-west.payment-789
payments.failed.us-west.payment-101
```

**Why it's bad**:
- Subscribers get confused with inconsistent patterns
- Different teams invent different orderings
- Impossible to write efficient wildcard filters
- Maintenance nightmare as system grows

**Detection**:
```bash
# Check your subjects for inconsistency
grep -o '[^.]*\.[^.]*\.[^.]*\.[^.]*' subjects.txt | sort | uniq
# If outputs vary wildly, you have the problem
```

**Fix**:
1. Define canonical ordering for your domains
2. Document in architecture decision record
3. Use linter/validator in CI/CD

**Validation Checklist**:
```
For all subjects:
- [ ] Layer 1: Always domain?
- [ ] Layer 2: Always action/event?
- [ ] Layer 3: Always scope (region/tenant)?
- [ ] Layer 4+: Always identifier?
```

**Real Example**:
```
INCONSISTENT ORDERING (❌):
users.profile.updated.us-west.user-123   (L2=profile)
users.updated.us-west.user-123           (L2=action, skip profile)
admins.us-west.updated.admin-456         (L2=region)

Frustration: Subscriber needs:
users.*.updated.>          # Some have profile in L2
users.>.updated.>          # Others don't

CONSISTENT ORDERING (✓):
users.profile.updated.us-west.user-123   (always: domain.context.action.region.id)
users.admin.updated.us-west.user-456     (always same order)

Subscriber:
users.profile.updated.us-west.>
users.admin.updated.us-west.>
users.>.updated.us-west.>                # All same ordering!
```

---

## Anti-Pattern 3: Over-Segmentation (Too Many Layers)

**What it looks like**:
```
✗ BAD (9 segments):
orders.created.v1.us-west.us-west-2a.customer-123.order-456.line-item-789.warehouse-101

✓ GOOD (4-5 segments):
orders.created.us-west.order-456
  (other details in message headers/payload)
```

**Why it's bad**:
- Subjects get unwieldy and error-prone
- Subscribers have to navigate deep hierarchies
- Makes JetStream consumer filters complex
- Maintenance burden grows exponentially

**Detection**:
```bash
# Count segments
echo "orders.created.v1.us-west.customer.order-456.line-item.warehouse" | tr '.' '\n' | wc -l
# If > 6, you likely have over-segmentation
```

**When Each Segment is Justified**:
- L1 Domain: Always needed (orders, payments)
- L2 Action: Nearly always (created, updated, cancelled)
- L3 Scope: Usually (region, tenant, environment)
- L4 ID: Usually (order-id, customer-id)
- L5+ Only if: High-volume filtering needs (e.g., warehouse-specific subscribers)

**Fix**:
1. Move low-cardinality data to message headers/properties
2. Use JetStream consumer filters for fine-grained routing
3. Keep subjects to 4-5 segments max

**Better Approach Using JetStream**:
```
Subjects (simple):
orders.created.us-west.order-456

Message headers/properties (detailed):
headers:
  X-LineItem: 789
  X-Warehouse: 101
  X-API-Version: 1

JetStream Consumer Filter:
  Subject filter: orders.created.us-west.>
  (Consumer can also filter by headers if needed)
```

---

## Anti-Pattern 4: Under-Segmentation (Not Enough Layers)

**What it looks like**:
```
✗ BAD (too simple):
orders.order-123
payments.payment-456
users.user-789

Subscriber: orders.>  (gets ALL order events, cannot filter by action)

✓ GOOD (proper segmentation):
orders.created.order-123
orders.shipped.order-456
payments.authorized.payment-789
```

**Why it's bad**:
- Subscribers receive too many unwanted messages
- Cannot filter by event type or region
- Inefficient use of bandwidth and memory
- Hard to add complexity later

**Detection**:
```bash
# If subjects only have 2 segments, check if subscribers would benefit from filtering
grep ">\." subscriptions.txt | wc -l
# If high count, you need more segmentation
```

**Fix**:
1. Add action/event type as L2
2. Add scope (region, tenant) as L3 if relevant
3. Follow the quick decision matrix from SKILL.md

**Real Example**:
```
UNDER-SEGMENTED (❌):
orders.order-123
orders.order-456
orders.order-789

// Subscriber forced to handle all order events:
await nc.subscribe("orders.>", (msg) => {
  // Must parse message to determine if it's created, shipped, cancelled, etc.
  const eventType = msg.data.type;
  if (eventType === 'created') { ... }
  if (eventType === 'shipped') { ... }
  if (eventType === 'cancelled') { ... }
});

PROPER SEGMENTATION (✓):
orders.created.order-123
orders.shipped.order-456
orders.cancelled.order-789

// Subscribers get exactly what they need:
await nc.subscribe("orders.created.>", (msg) => {
  // Only created events, no parsing needed
  handleOrderCreated(msg.data);
});
```

---

## Anti-Pattern 5: Ambiguous Segment Names

**What it looks like**:
```
✗ BAD (ambiguous):
orders.process.us-west.order-123      (process = what? created? shipped?)
events.handle.us-west.data-456        (handle = what type?)
system.data.us-west.item-789          (data = what? storage? transmission?)

✓ GOOD (clear):
orders.created.us-west.order-123
events.processed.us-west.data-456
system.configuration.us-west.item-789
```

**Why it's bad**:
- New developers misunderstand the architecture
- Subjects proliferate (people guess at names)
- Hard to build tooling and dashboards
- Error-prone configuration

**Detection**:
```bash
# Audit segment names for clarity
grep -o '\.[^.]*\.' subjects.txt | sort | uniq
# Look for vague names: process, handle, data, event, etc.
```

**Fix**:
1. Use specific event names: `created`, `updated`, `deleted`, `shipped`, not `process`
2. Use specific scopes: `us-west`, `eu-central`, `tenant-abc`
3. Avoid generic terms: `data`, `event`, `message`

**Naming Guide**:
```
Clear Actions:
✓ created, updated, deleted, cancelled, shipped, arrived, paid, failed
✗ process, handle, changed, occurred

Clear Scopes:
✓ us-west, eu-central, tenant-abc, department-sales
✗ region, scope, context, place

Clear Types:
✓ orders, payments, users, devices
✗ things, objects, entities, stuff
```

---

## Anti-Pattern 6: Version Number Misplacement

**What it looks like**:
```
✗ BAD (version in wrong position):
v1.orders.created.us-west.order-123    (version on left)
orders.v1.created.us-west.order-123    (version after domain)

✓ GOOD (version in right position):
orders.created.v1.us-west.order-123    (version after action)
orders.created.us-west.v1.order-123    (version after scope)
```

**Why it's bad**:
- Version on left fragments subscriptions by version
- Makes it hard to upgrade versions gradually
- Breaks the broad-to-specific ordering principle

**When to Use Version Numbers**:
- Evolving event schemas
- Deprecating old event formats
- Running multiple API versions in parallel

**Fix**:
1. Version numbers belong after action/scope, before identifiers
2. Use version in consumer filters, not subject structure when possible

**Migration with Versioning**:
```
Current: orders.created.v1.us-west.order-123
Target:  orders.created.v2.us-west.order-123

Phase 1: Dual publish
  - Publish both v1 and v2 subjects simultaneously
  - Old subscribers still work: v1
  - New subscribers use: v2

Phase 2: Read from both
  - Services read from both: orders.created.v1.> and orders.created.v2.>
  - Process both formats

Phase 3: Switch to v2
  - All publishers send v2
  - Old subscribers deprecate

Phase 4: Clean up
  - Stop publishing v1
  - Remove v1 subscribers
```

---

## Anti-Pattern 7: Mixed Casing and Separators

**What it looks like**:
```
✗ BAD (inconsistent casing):
orders.OrderCreated.us-west.order-123     (PascalCase in segment)
orders.created.US_WEST.order_123          (UPPER_CASE with underscore)
Orders.created.us-west.Order-123          (mixed everywhere)

✓ GOOD (consistent lowercase + hyphens):
orders.created.us-west.order-123
payments.authorized.us-east.payment-456
users.registered.us-central.user-789
```

**Why it's bad**:
- Typos and case mismatches cause silent failures
- Harder to read documentation
- Tooling and monitoring gets confused

**Detection**:
```bash
# Check for uppercase in subjects
grep '[A-Z]' subjects.txt
# Check for underscores in separators
grep '_' subjects.txt
```

**Standard**:
- All lowercase
- Use hyphens, never underscores
- Never use CamelCase or snake_case in segments

**Real Example**:
```
INCONSISTENT (❌):
Orders.created.US_WEST.order_123        # Typo city
orders.Created.us_west.order-123        # Inconsistent casing
ORDERS.CREATED.US-WEST.ORDER-123        # All caps (bad for terminal logs)

CONSISTENT (✓):
orders.created.us-west.order-123        # Lowercase, hyphenated, clear
```

---

## Anti-Pattern 8: No Wildcard Subscription Planning

**What it looks like**:
```
✗ BAD (ad-hoc subjects, no planning):
orders.created.order-123
orders.updated.order-456
orders.cancelled.order-789
orders.shipped.order-101
orders.delivered.order-202

Subscribers guess at patterns:
  Subscribe: orders.>                  (too broad, gets all)
  Subscribe: orders.created.>          (specific, works)
  Subscribe: orders.*.>                (oops, high-cardinality!)

✓ GOOD (planned subscribers):
// Subject design:
orders.created.us-west.order-123
orders.created.eu-central.order-456

// Subscribers documented:
Dashboard: orders.>                    (all regional order events)
Region monitor: orders.>.us-west.>     (all orders in region)
Created events only: orders.created.>  (all creations, all regions)
```

**Why it's bad**:
- Subscribers are ad-hoc and inefficient
- Can't optimize subject structure
- Performance problems discovered late
- Onboarding new subscribers is guesswork

**Fix**:
1. Design subjects with subscriber paths in mind
2. Document all intended subscriber patterns
3. Test subscriber filters for efficiency

**Planning Worksheet**:
```
For each domain, document:
1. Subject format: {domain}.{action}.{scope}.{id}
2. Subscriber patterns:
   - All events: domain.>
   - Domain-specific: domain.action.>
   - Scope-specific: domain.>.scope.>
   - Specific resource: domain.>.scope.resource-id

3. Validate each pattern works and is efficient
```

**Real Example**:
```
UNPLANNED (❌):
devices.sensor-456.reading.temperature
devices.reading.sensor-456.temperature
devices.temperature.sensor-456.reading
(Subscribers confused, mix of patterns)

PLANNED (✓):
Device hierarchy: devices.telemetry.{region}.{device-id}.{metric}
devices.telemetry.us-west.sensor-456.temperature
devices.telemetry.us-west.sensor-456.humidity

Planned subscribers:
- All telemetry: devices.telemetry.>
- Regional: devices.telemetry.us-west.>
- Specific device: devices.telemetry.us-west.sensor-456.>
- Specific metric: devices.telemetry.>.>.temperature
```

---

## Migration Checklist

When fixing anti-patterns, follow this checklist:

- [ ] **Audit Current Subjects**: List all current subject patterns
- [ ] **Identify Problems**: Which anti-patterns are present?
- [ ] **Design Target Architecture**: New subject format(s)
- [ ] **Create Migration Plan**: Phased approach (dual-publish, parallel, etc.)
- [ ] **Test in Dev**: Verify new subjects work with existing code
- [ ] **Update Publishers**: Modify to publish to new subjects (keep old if in Phase 1)
- [ ] **Update Subscribers**: Update to subscribe to new subjects
- [ ] **Monitor Migration**: Track old vs new usage
- [ ] **Clean Up**: Remove old subjects once migration complete
- [ ] **Document**: Update architecture docs with new patterns

---

## Anti-Pattern Prevention

**In Code Review, Check For**:
```
✓ All subjects start with domain
✓ Action/event type is always L2 (or L3 for multi-tenant)
✓ No IDs or UUIDs before action/scope
✓ Consistent casing (lowercase) and separators (hyphens)
✓ Max 5-6 segments per subject
✓ Subscriber patterns documented
```

**In Design Phase, Validate**:
```
✓ Can I efficiently subscribe to "all events in domain"?
✓ Can I efficiently subscribe to "specific action only"?
✓ Can I efficiently subscribe to "specific scope only"?
✓ Do my subscriber patterns avoid wildcards in the middle?
✓ Is my subject format documented for new developers?
```

