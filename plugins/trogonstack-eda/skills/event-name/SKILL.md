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

An event name declares **what happened** as a fact. A field name declares **what was captured** about that fact. Everything else — who emitted it, which service, which environment — belongs in metadata or envelope, not in the event name or field names.

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

### Event Versioning — Keep It Out of the Name

Do not embed version numbers in event names. Use `schema_version` in metadata instead.

| Good | Bad | Why bad |
|------|-----|---------|
| `OrderPlaced` + `schema_version: 2` | `OrderPlacedV2` | Pollutes the name, couples consumers to version |
| `InvoiceIssued` + `schema_version: 3` | `InvoiceIssuedV3` | Every version change requires new consumer routing |

Versioning belongs in the event envelope. The event name describes what happened — that doesn't change when you add a field to the payload.

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

Every event should capture three things:

- **What** happened — the event name itself (`OrderPlaced`, `ClaimApproved`)
- **Who** caused it — `_by` suffix fields (`placed_by`, `approved_by`)
- **When** it happened — `_at` suffix fields (`placed_at`, `approved_at`)

```
OrderPlaced              ← What
  placed_by: "customer-123"   ← Who
  placed_at: "2026-04-30T..."  ← When
  order_id: "order-456"
  items: [...]
```

**Strongly recommend including all three.** If an event is missing Who or When, flag it and suggest adding them. Events without attribution or timestamps lose forensic and audit value that is nearly impossible to recover later. System-initiated events should still capture the actor explicitly (e.g., `initiated_by: "scheduler"`).

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
| `occurred_at` | `timestamp` | Generic, unclear what time it refers to |

Pick `_at` (for datetime with time) or `_on` (for date only) and be consistent.

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

### 14. Metadata vs Domain Fields

Separate envelope/metadata from the business payload. Metadata fields describe the event itself, not the business fact.

**Metadata (envelope):**
- `event_id` — unique identifier for this event instance
- `event_type` — the event name (redundant with deserialization but useful for routing)
- `occurred_at` — when the business fact happened
- `recorded_at` — when the event was persisted (may differ from occurred_at)
- `correlation_id` — ties related events across a workflow
- `causation_id` — the command or event that caused this event
- `source` — originating service/context (integration events)
- `schema_version` — payload schema version

**Domain fields (payload):**
Everything specific to the business fact: `order_id`, `customer_id`, `total_amount`, `items[]`, etc.

### 15. Monetary Amounts Must Include Currency

A bare amount field is incomplete. Always pair with currency or use a composite money object.

| Good | Bad | Why bad |
|------|-----|---------|
| `total_amount`, `total_currency` | `total` | Which currency? |
| `price: { amount: 1999, currency: "USD" }` | `price: 1999` | Ambiguous — cents? dollars? which currency? |
| `refund_amount`, `refund_currency` | `refund_amount` alone | Loses currency context across services |

For domain events, capture the currency at the time of the fact — currencies can change between events.

### 16. Collection Fields Use Plural, Scalars Use Singular

| Good | Bad | Why bad |
|------|-----|---------|
| `items` (array) | `item` (for an array) | Misleading — suggests a single value |
| `line_items` (array) | `line_item_list` | Redundant suffix — plural already signals a collection |
| `shipping_address` (object) | `shipping_addresses` (for one) | Misleading — suggests multiple |

### 17. No Polymorphic Payloads

An event whose payload shape changes based on a `type` or `kind` field is really multiple events. Split them.

| Good | Bad | Why bad |
|------|-----|---------|
| `PaymentAuthorized`, `PaymentDeclined` | `PaymentProcessed { result_type: "authorized" \| "declined" }` with different fields per type | Consumers must branch on `result_type` to know the shape — fragile, hard to evolve independently |
| `ItemBackordered`, `ItemReserved` | `InventoryChecked { outcome: "backordered" \| "reserved" }` with different fields | Two different facts forced into one event |

If every instance of the event has the same fields regardless of a status value, that's fine — it's not polymorphic, it's a field with valid values.

### 18. PII and Sensitive Data — Use Indirection

Events are immutable. PII stored directly in events is nearly impossible to delete (GDPR right to erasure, CCPA). Reference sensitive data by ID instead of inlining it.

| Good | Bad | Why bad |
|------|-----|---------|
| `customer_id: "cust-123"` | `customer_email: "alice@example.com"` | Can't erase the email from an immutable event |
| `shipping_address_id: "addr-456"` | `shipping_address: { street: "...", city: "..." }` | Address baked into immutable history |
| `payment_method_id: "pm-789"` | `card_number: "4111..."` | Sensitive financial data in an immutable log |

Store PII in a mutable store keyed by ID. Events reference the ID. When deletion is requested, delete from the mutable store — events remain intact without leaking personal data.

Flag any PII found directly in event payloads and suggest replacing with an identifier reference.

### 19. Consistent Casing for Fields

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
8. No version numbers in event names — use `schema_version` in metadata
9. Naming format (PascalCase, dot.delimited, etc.) is consistent across the system
10. Integration events are prefixed with bounded context or service name
11. Integration events use shared vocabulary, not internal jargon
12. Event includes Who (`_by`) and When (`_at`) fields
13. Field names use domain language, no abbreviations
14. Identifiers are explicit (`order_id` not `id`)
15. Temporal fields use `_at` or `_on` suffix with past tense
16. Enums preferred over booleans; booleans use predicate form when unavoidable
17. No polymorphic payloads — split into separate events
18. No PII directly in payloads — use identifier references
19. Monetary amounts include currency
20. Collection fields are plural, scalar fields are singular
21. Domain event payloads contain no computed or derived fields
22. Metadata fields are separated from domain fields
23. Field casing is consistent across the system

## Output

Provide:
- List of events reviewed with pass/fail per checklist item
- Suggested corrections for any violations
- Domain vs integration classification if not already clear
- Field naming corrections with rationale
