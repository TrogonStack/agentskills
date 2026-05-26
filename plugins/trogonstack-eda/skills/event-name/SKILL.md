---
name: event-name
description: >-
  Review or create event names and payload field names following
  event-driven architecture conventions. Covers both domain events
  (event-sourcing) and integration events (cross-service). Validates
  tense, specificity, field naming, and metadata placement. Use when
  designing new events, reviewing existing event definitions, or
  auditing naming consistency across an event catalog. Do not use for:
  (1) event schema evolution or versioning strategy (use event-design-contract),
  (2) full event payload design (use event-design-domain-schema or
  event-design-integration-schema), (3) event modeling workflows
  (use trogonstack-eventmodeling skills).
allowed-tools:
  - AskUserQuestion
  - Write
  - Read
  - Bash
---

# Review or Create Event Names

Review or create event names and payload field names that follow event-driven architecture conventions, ensuring correct tense, domain language, specificity, and field naming for both domain and integration events.

## Core Principle

An event name declares **what happened** as a fact. A payload field name declares **what business fact was captured** about that event.

Keep three layers distinct:

- **Record metadata**: event-store facts such as `event_id`, `stream_id`, `stream_version`, and `recorded_at`
- **Event context/envelope**: generic event-sourcing facts such as `event_type`, `actor_id`, `on_behalf_of`, `occurred_at`, `correlation_id`, and `causation_id`
- **Payload**: domain facts such as `order_id`, `owner_id`, `approved_by`, `effective_at`, and `expires_at`

Do not push generic causality, tracing, persistence, or transport facts into the domain payload. Do keep actor and time fields in the payload when they are part of the domain rule.

## Interview

Before reviewing or creating names, establish:

1. **Domain or integration?** Domain events live inside a bounded context and are the source of truth for state. Integration events cross service boundaries and form a public contract.
2. **What business process or workflow does this event belong to?**
3. **What are the existing naming conventions in the codebase?** If there is an existing event catalog, read it first and follow its conventions unless they violate the rules below.

If the user provides event names to review, skip to the review. If the user asks to design new events, gather the business context first.

## Event Naming Rules

### 1. Past Tense — Events Are Facts

Events record something that already happened. Always use past tense.

| Good | Bad | Why bad |
|------|-----|---------|
| `OrderPlaced` | `PlaceOrder` | Imperative — that's a command |
| `PaymentFailed` | `PaymentFailing` | Progressive — not a fact yet |
| `ItemAddedToCart` | `AddItemToCart` | Imperative |
| `SubscriptionRenewed` | `RenewSubscription` | Imperative |
| `OrderPlaced` | `OrderWasPlaced` | Redundant — events are already facts, `Was` adds nothing |

### 2. Domain Language — Not Technical Jargon

Use the language of the business, not the implementation.

| Good | Bad | Why bad |
|------|-----|---------|
| `OrderPlaced` | `OrderCreated` | "Created" is CRUD, not domain language (unless creation IS the domain concept) |
| `ShipmentDispatched` | `ShipmentUpdated` | "Updated" says nothing about what happened |
| `ClaimApproved` | `ClaimStatusChanged` | Hides the actual business event |
| `EmployeePromoted` | `EmployeeRecordModified` | Technical, not business |

### 3. Specific — Not Generic

An event name should tell you exactly what happened without reading the payload.

| Good | Bad | Why bad |
|------|-----|---------|
| `OrderItemAdded` | `OrderChanged` | What changed? |
| `InvoiceSentToCustomer` | `InvoiceProcessed` | Processed how? |
| `PasswordResetRequested` | `UserActionOccurred` | Meaningless |
| `InventoryReplenished` | `InventoryEvent` | Not an event name, it's a category |

### 4. No CRUD Unless CRUD IS the Domain

Reserve `Created`, `Updated`, `Deleted` for domains where those operations ARE the business concept (e.g., CMS content management, configuration management). In most domains, a more specific verb exists.

| Domain | CRUD OK? | Better name |
|--------|----------|-------------|
| Order management | No | `OrderPlaced` not `OrderCreated` |
| CMS page editing | Yes | `PageCreated` is the actual domain concept |
| User signup | No | `AccountRegistered` not `UserCreated` |
| Config management | Yes | `SettingUpdated` is the actual domain concept |

### 5. One Event — One Thing That Happened

Do not combine multiple facts into one event name.

| Good | Bad |
|------|-----|
| `OrderPlaced` + `PaymentAuthorized` | `OrderPlacedAndPaymentAuthorized` |
| `ItemShipped` + `TrackingNumberAssigned` | `ItemShippedWithTracking` |

If two things always happen together, they are still two events that happen to share the same cause.

### 6. Naming Format

Choose one format and apply it consistently across the entire system:

- **PascalCase** (most common): `OrderPlaced`, `PaymentFailed`
- **dot.delimited** (common in messaging systems): `order.placed`, `payment.failed`
- **kebab-case** (less common): `order-placed`, `payment-failed`

Do not mix formats within a system.

### No Redundant Suffixes — "Event", "Message", "Notification"

The event name describes what happened. It is already an event by context — appending `Event`, `Message`, or `Notification` adds nothing.

| Good | Bad | Why bad |
|------|-----|---------|
| `OrderPlaced` | `OrderPlacedEvent` | Redundant — it's already an event |
| `PaymentFailed` | `PaymentFailedMessage` | "Message" is a delivery mechanism, not a domain concept |
| `ShipmentDispatched` | `ShipmentDispatchedNotification` | "Notification" is a side effect, not the fact itself |

### No Infrastructure or Technology in Names

Event names must survive technology migrations. Do not embed broker names, protocols, or infrastructure details.

| Good | Bad | Why bad |
|------|-----|---------|
| `OrderPlaced` | `KafkaOrderPlaced` | Coupled to Kafka — what happens when you migrate? |
| `PaymentCompleted` | `SQSPaymentCompleted` | Coupled to SQS |
| `UserRegistered` | `RabbitMQUserRegisteredMessage` | Infrastructure + redundant suffix |

### Avoid Negatives in Event Names

Negative event names usually hide a positive event with a reason. Prefer the positive form with a field explaining the outcome.

| Good | Bad | Why bad |
|------|-----|---------|
| `ShipmentFailed { reason: "address_invalid" }` | `OrderNotShipped` | Negative — what DID happen? |
| `PaymentDeclined { reason: "insufficient_funds" }` | `PaymentNotProcessed` | Negative — why not? |
| `ApplicationRejected { reason: "..." }` | `ApplicationNotApproved` | Double negative with `Approved` |

If a negative sounds natural in the domain (e.g., `ClaimDenied`), that's fine — it's domain language, not a negation of another event.

### Event Type Is The Schema Discriminator

Use one canonical discriminator for routing and decoding.

Persisted `event_type` should be self-identifying for the domain/event schema contract. Short names are acceptable as local code aliases, but the durable value should not depend on parsing the stream name.

For protobuf-style contracts, prefer an event type or type URL that maps directly to the wire contract. Do not assume the stream namespace version is the same thing as the event schema revision.

| Good | Bad | Why bad |
|------|-----|---------|
| `trogon.cron.jobs.v1.JobPaused` | `JobPaused` + `schema_version: 1` | Splits one discriminator across two fields |
| `type.googleapis.com/acme.orders.v1.OrderPlacedV2` | `type.googleapis.com/acme.orders.v2.OrderPlaced` | Bumps the stream namespace when only the event schema changed |
| `billing.v1.InvoiceIssued` | `InvoiceIssued` with no schema identity | Ambiguous across producers and decoders |

Do not carry both a versioned `event_type` and a separate `schema_version` when both encode the same schema version.

Use a separate `schema_version`, schema registry id, descriptor, or type URL only when `event_type` is intentionally an unversioned semantic label and another field is required to select the decoder.

Keep `event_type` stable for compatible additive changes. Use a revision such as `OrderPlacedV2` only when the event schema or semantic contract changes incompatibly.

Distinguish stream version from event schema revision:

- **Stream version** identifies the stream family, namespace, routing contract, or compatibility boundary.
- **Event schema revision** identifies the shape of one event inside that stream.

If only one event schema changes, keep the stream namespace stable and revise the event type: `stream: acme.orders.v1`, `event_type: type.googleapis.com/acme.orders.v1.OrderPlacedV2`. Do not use `type.googleapis.com/acme.orders.v2.OrderPlaced` for a single event shape change.

Bump the stream namespace only when the stream contract itself changes, such as routing, partitioning, stream identity, ordering semantics, or compatibility for the event family.

### Stream Names Are Storage Addresses

Stream names do not need to repeat the full event type or schema identity. Once `event_type` is self-identifying, keep stream names compact, readable, and focused on storage concerns:

- tenant or account partition
- aggregate/resource identity
- short stable domain code when it is documented
- backend routing or ordering needs

Good:

```text
stream_name: tenant/tenant_123/orders/order_456
event_type:  acme.orders.v1.OrderPlacedV2
metadata:
  tenant_id: tenant_123
```

Use shorter codes such as `tenant/tenant_123/ord/order_456` only when they are documented and useful to operators.

Bad because schema identity leaks into storage layout:

```text
stream_name: tenants/tenant_123/acme.orders.v1.OrderPlacedV2/orders/order_456
event_type:  OrderPlacedV2
```

Keep tenant, environment, region, or shard values out of `event_type`. Put them in the stream name/subject for routing and in metadata/context when consumers need them without parsing the stream.

## Integration Event Naming — Additional Rules

Integration events cross service boundaries. They carry additional constraints:

### 7. Prefix With Bounded Context or Service

Integration events must be unambiguous across the entire system. Prefix with the originating bounded context.

| Good | Bad | Why bad |
|------|-----|---------|
| `billing.InvoiceIssued` | `InvoiceIssued` | Which service? Billing? Accounting? |
| `warehouse.ShipmentDispatched` | `ShipmentDispatched` | Could be logistics or warehouse |
| `identity.AccountLocked` | `AccountLocked` | Could be identity or fraud |

### 8. Use Shared Vocabulary

Integration events form a public contract. Use terms that consumers across teams understand, not internal jargon.

| Good (shared) | Bad (internal jargon) |
|----------------|----------------------|
| `order.PaymentCompleted` | `order.PGTxnSettled` |
| `shipping.DeliveryAttempted` | `shipping.LMDAttemptV2` |

## Field Naming Rules

### The What, Who, When Principle

Every persisted event record should capture three things:

- **What** happened — `event_type` or the typed event name (`OrderPlaced`, `ClaimApproved`)
- **Which actor** initiated it — event context such as `actor_id`
- **When** it happened — event context such as `occurred_at`

Generic Who and When belong in event context, not automatically in payload fields:

```text
RecordedEvent
  event_type: "trogon.cron.jobs.v1.JobPaused"
  context:
    actor_id: "users/usr_123"
    occurred_at: "2026-04-30T10:00:00Z"
  payload:
    job_id: "jobs/job_456"
```

Use payload `_by`, `_at`, or `_on` fields only when the actor or time is part of the domain fact:

```text
ClaimApproved
  claim_id: "claim-123"
  approved_by: "adjusters/adj_456"
  effective_at: "2026-05-01T00:00:00Z"
```

Flag missing Who or When at the record/context level first. Flag missing payload `_by` or `_at` fields only when that actor or timestamp is itself a domain fact.

### 9. Domain Language for Fields Too

Fields describe facts captured about the event. Use business language.

| Good | Bad | Why bad |
|------|-----|---------|
| `order_id` | `id` | Which id? |
| `total_amount` | `val` | Abbreviation hides meaning |
| `shipping_address` | `addr` | Abbreviation |
| `customer_email` | `data` | Meaningless |

### 10. Explicit Identifiers

Always suffix identifiers with what they reference. Never use bare `id`.

| Good | Bad |
|------|-----|
| `order_id` | `id` |
| `customer_id` | `cid` |
| `product_sku` | `sku` (acceptable if unambiguous in context) |
| `correlation_id` | `corr_id` |

### 11. Temporal Fields Use Past Tense or `_at` / `_on` Suffix

| Good | Bad | Why bad |
|------|-----|---------|
| `placed_at` | `place_time` | Not past tense |
| `shipped_on` | `ship_date` | Not past tense |
| `confirmed_at` | `confirmation_timestamp` | Verbose, inconsistent |
| `occurred_at` in context | `timestamp` | Generic, unclear what time it refers to |

Pick `_at` (for datetime with time) or `_on` (for date only) and be consistent. Keep generic occurrence time in context; keep business times such as `effective_at`, `expires_at`, `scheduled_for`, or `starts_at` in payload.

### 12. Prefer Enums Over Booleans

Booleans lock you into two states. Enums allow future additions without breaking changes.

| Good (enum) | Bad (boolean) | Why bad |
|-------------|---------------|---------|
| `shipping_priority: "standard" \| "expedited"` | `is_expedited: true` | Can't add `"overnight"` later without a new field |
| `payment_status: "pending" \| "authorized" \| "declined"` | `is_authorized: true` | Can't represent `"pending"` or future states |
| `discount_type: "none" \| "percentage" \| "fixed"` | `has_discount: true` | Can't distinguish discount types |

Use booleans only when the field is genuinely and permanently binary (e.g., `is_test_order`).

When a boolean is unavoidable, use predicate form:

| Good | Bad |
|------|-----|
| `is_test_order` | `test_order` (ambiguous — could be a noun) |
| `is_gift` | `gift` (ambiguous — could be the gift itself) |

### 13. No Computed or Derived Fields in Domain Events

Domain events capture raw facts. Computed values belong in read models.

| Domain event field (good) | Read model field (where computed values go) |
|--------------------------|---------------------------------------------|
| `unit_price`, `quantity` | `line_total` (= unit_price * quantity) |
| `items[]` | `item_count` (= items.length) |
| `subtotal`, `tax`, `discount` | `total` (= subtotal + tax - discount) |

This rule does NOT apply to integration events — integration events may include pre-computed values to avoid forcing consumers to replicate business logic.

### 14. Event Record Layers

Separate record metadata, event context, and business payload.

**Record metadata:**
- `event_id` — unique identifier for this stored event
- `stream_id` — compact storage stream name or id that contains the event
- `stream_version` — event position in that stream
- `recorded_at` — when the event store persisted the event

**Event context/envelope:**
- `event_type` — canonical routing and decoding discriminator
- `actor_id` — actor associated with the command or event context
- `on_behalf_of` — actor represented by another actor, when delegated
- `occurred_at` — when the producer says the event happened
- `correlation_id` — ties events across one workflow
- `causation_id` — command or event that caused this event
- `source` — originating service/context for integration events

**Domain fields (payload):**
Everything specific to the business fact: `order_id`, `customer_id`, `owner_id`, `approved_by`, `effective_at`, `total_amount`, `items[]`, etc.

Use this test for each field:

```text
Is this field needed to express or enforce the business fact?
```

If yes, keep it in the payload. If it is generic causality, tracing, workflow identity, transport, or persistence context, keep it outside the payload.

Do not duplicate generic context in payload once readers can access event context. During migration, duplicated fields such as `added_by`, `added_at`, `paused_by`, or `paused_at` may remain until consumers can rely on context.

### 15. Actor Context Enforcement

Do not rely on event authors remembering to add actor and timestamp fields.

The command execution or append boundary must require typed context:

```text
DomainEvent + CommandContext -> RecordedEvent
```

`CommandContext` or `EventContext` should carry required fields such as `actor_id`, `occurred_at`, `correlation_id`, and `causation_id`.

Review for these enforcement points:

- append APIs cannot persist bare payloads without context
- raw `RecordedEvent` construction is hidden from application code
- required context fields are non-optional or validated before append
- system work uses explicit actors such as `systems/cron` or `services/scheduler`

Payload `_by` and `_at` checks are migration or domain-fact checks. They are not the primary proof of actor context once typed context exists.

### 16. Ownership And Authorization

`context.actor_id` is not ownership.

Use `actor_id` as the actor attempting the command. Validate ownership or permission against aggregate state, a policy service, or a read model before emitting events.

Keep actor relationships in payload when they are business facts:

- `owner_id`
- `grantee`
- `approved_by`
- `assigned_to`
- `tenant_id`

If ownership can change over time, model that explicitly with events such as `OwnershipTransferred` or `PermissionGranted`.

### 17. Deterministic Handler Inputs

Event handlers and projections should consume immutable `RecordedEvent` data.

Pure handlers should not call clocks, random ID generators, actor lookup, or authorization services during replay. Tests should build fixed recorded-event fixtures with stable record metadata, context, and payload.

If processing time is needed, record it as handler/runtime metadata such as `processed_at`, not by mutating the original event.

### 18. Monetary Amounts Must Include Currency

A bare amount field is incomplete. Always pair with currency or use a composite money object.

| Good | Bad | Why bad |
|------|-----|---------|
| `total_amount`, `total_currency` | `total` | Which currency? |
| `price: { amount: 1999, currency: "USD" }` | `price: 1999` | Ambiguous — cents? dollars? which currency? |
| `refund_amount`, `refund_currency` | `refund_amount` alone | Loses currency context across services |

For domain events, capture the currency at the time of the fact — currencies can change between events.

### 19. Collection Fields Use Plural, Scalars Use Singular

| Good | Bad | Why bad |
|------|-----|---------|
| `items` (array) | `item` (for an array) | Misleading — suggests a single value |
| `line_items` (array) | `line_item_list` | Redundant suffix — plural already signals a collection |
| `shipping_address` (object) | `shipping_addresses` (for one) | Misleading — suggests multiple |

### 20. No Polymorphic Payloads

An event whose payload shape changes based on a `type` or `kind` field is really multiple events. Split them.

| Good | Bad | Why bad |
|------|-----|---------|
| `PaymentAuthorized`, `PaymentDeclined` | `PaymentProcessed { result_type: "authorized" \| "declined" }` with different fields per type | Consumers must branch on `result_type` to know the shape — fragile, hard to evolve independently |
| `ItemBackordered`, `ItemReserved` | `InventoryChecked { outcome: "backordered" \| "reserved" }` with different fields | Two different facts forced into one event |

If every instance of the event has the same fields regardless of a status value, that's fine — it's not polymorphic, it's a field with valid values.

### 21. PII and Sensitive Data — Use Indirection

Events are immutable. PII stored directly in events is nearly impossible to delete (GDPR right to erasure, CCPA). Reference sensitive data by ID instead of inlining it.

| Good | Bad | Why bad |
|------|-----|---------|
| `customer_id: "cust-123"` | `customer_email: "alice@example.com"` | Can't erase the email from an immutable event |
| `shipping_address_id: "addr-456"` | `shipping_address: { street: "...", city: "..." }` | Address baked into immutable history |
| `payment_method_id: "pm-789"` | `card_number: "4111..."` | Sensitive financial data in an immutable log |

Store PII in a mutable store keyed by ID. Events reference the ID. When deletion is requested, delete from the mutable store — events remain intact without leaking personal data.

Flag any PII found directly in event payloads and suggest replacing with an identifier reference.

### 22. Consistent Casing for Fields

Pick one and apply it consistently:

- **snake_case** (most common in event stores, Kafka, NATS): `order_id`, `total_amount`
- **camelCase** (common in JavaScript/TypeScript ecosystems): `orderId`, `totalAmount`

Do not mix within a system.

## Review Checklist

When reviewing event definitions, verify:

1. Event name is past tense — records a fact, not a command or intention
2. Event name uses domain language, not CRUD or technical jargon
3. Event name is specific enough to understand without reading the payload
4. One event captures one thing that happened
5. No redundant suffixes (`Event`, `Message`, `Notification`)
6. No infrastructure or technology in event names
7. No negatives in event names — use positive form with a reason field
8. Persisted `event_type` is self-identifying for the domain/event schema contract
9. Event type uses one canonical schema discriminator; do not duplicate the same version in both `event_type` and `schema_version`
10. Event type revisions such as `OrderPlacedV2` are reserved for incompatible schema or semantic changes
11. Naming format (PascalCase, dot.delimited, etc.) is consistent across the system
12. Integration events are prefixed with bounded context or service name
13. Integration events use shared vocabulary, not internal jargon
14. Event captures Who and When through typed event context, or through payload fields only when the actor or time is part of the domain fact
15. Field names use domain language, no abbreviations
16. Identifiers are explicit (`order_id` not `id`)
17. Temporal fields use `_at` or `_on` suffix with past tense
18. Enums preferred over booleans; booleans use predicate form when unavoidable
19. No polymorphic payloads — split into separate events
20. No PII directly in payloads — use identifier references
21. Monetary amounts include currency
22. Collection fields are plural, scalar fields are singular
23. Domain event payloads contain no computed or derived fields
24. Record metadata, event context, and payload fields are separated
25. Generic causality, occurrence time, correlation, causation, and persistence metadata are not duplicated in payload once typed context is available
26. Stream names are compact readable storage addresses, not the source of schema identity
27. Tenant, environment, region, and shard values are outside `event_type` and present in metadata/context when consumers need them
28. Ownership or authorization is validated against domain state or policy, not inferred from `actor_id`
29. Event handlers can be tested with immutable recorded-event fixtures
30. Field casing is consistent across the system

## Output

Provide:
- List of events reviewed with pass/fail per checklist item
- Suggested corrections for any violations
- Domain vs integration classification if not already clear
- Field naming corrections with rationale
- Payload vs context classification for disputed actor, time, causality, and schema identity fields
