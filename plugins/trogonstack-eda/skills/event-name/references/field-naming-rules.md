# Field Naming Rules

Use this reference when the default event-name skill needs examples or edge-case guidance for event payload fields.

## What, Who, When

Every persisted event record should capture:

- **What** happened through `event_type` or the typed event name
- **Who** initiated it through event context such as `actor_id`
- **When** it happened through event context such as `occurred_at`

Generic Who and When belong in event context:

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

## Domain Language

Fields describe facts captured about the event. Use business language.

| Good | Bad | Why bad |
|------|-----|---------|
| `order_id` | `id` | Which id? |
| `total_amount` | `val` | Abbreviation hides meaning |
| `shipping_address` | `addr` | Abbreviation |
| `customer_email` | `data` | Meaningless |

## Explicit Identifiers

Always suffix identifiers with what they reference. Never use bare `id`.

| Good | Bad |
|------|-----|
| `order_id` | `id` |
| `customer_id` | `cid` |
| `product_sku` | `sku` when ambiguous outside the local context |
| `correlation_id` | `corr_id` |

## Temporal Fields

| Good | Bad | Why bad |
|------|-----|---------|
| `placed_at` | `place_time` | Not past tense |
| `shipped_on` | `ship_date` | Not past tense |
| `confirmed_at` | `confirmation_timestamp` | Verbose and inconsistent |
| `occurred_at` in context | `timestamp` | Generic and unclear |

Pick `_at` for datetime with time or `_on` for date only. Keep generic occurrence time in context; keep business times such as `effective_at`, `expires_at`, `scheduled_for`, or `starts_at` in payload.

## Enums Over Booleans

Booleans lock you into two states. Enums allow future additions without breaking changes.

| Good | Bad | Why bad |
|------|-----|---------|
| `shipping_priority: standard/expedited` | `is_expedited: true` | Cannot add `"overnight"` without a new field |
| `payment_status: pending/authorized/declined` | `is_authorized: true` | Cannot represent pending or future states |
| `discount_type: none/percentage/fixed` | `has_discount: true` | Cannot distinguish discount types |

Use booleans only when the field is genuinely and permanently binary. When a boolean is unavoidable, use predicate form such as `is_test_order` or `is_gift`.

## Derived Values

Domain events capture raw facts. Computed values belong in read models.

| Domain event field | Read model field |
|--------------------|------------------|
| `unit_price`, `quantity` | `line_total` |
| `items[]` | `item_count` |
| `subtotal`, `tax`, `discount` | `total` |

This rule does not apply to integration events; integration events may include pre-computed values to avoid forcing consumers to replicate business logic.

## Money

A bare amount field is incomplete. Always pair with currency or use a composite money object.

| Good | Bad | Why bad |
|------|-----|---------|
| `total_amount`, `total_currency` | `total` | Which currency? |
| `price: { amount: 1999, currency: "USD" }` | `price: 1999` | Ambiguous units and currency |
| `refund_amount`, `refund_currency` | `refund_amount` alone | Loses currency context across services |

For domain events, capture the currency at the time of the fact; currencies can change between events.

## Collections

| Good | Bad | Why bad |
|------|-----|---------|
| `items` for an array | `item` for an array | Suggests one value |
| `line_items` | `line_item_list` | Redundant suffix |
| `shipping_address` for one object | `shipping_addresses` for one object | Suggests multiple |

## Polymorphic Payloads

An event whose payload shape changes based on a `type` or `kind` field is really multiple events. Split them.

| Good | Bad | Why bad |
|------|-----|---------|
| `PaymentAuthorized`, `PaymentDeclined` | `PaymentProcessed { result_type: authorized/declined }` with different fields per type | Consumers must branch on shape |
| `ItemBackordered`, `ItemReserved` | `InventoryChecked { outcome: backordered/reserved }` with different fields | Different facts forced into one event |

If every instance has the same fields regardless of a status value, it is not polymorphic; it is a field with valid values.

## PII

Events are immutable. PII stored directly in events is hard to delete. Reference sensitive data by ID instead of inlining it.

| Good | Bad | Why bad |
|------|-----|---------|
| `customer_id: "cust-123"` | `customer_email: "alice@example.com"` | Email cannot be erased from immutable history |
| `shipping_address_id: "addr-456"` | `shipping_address: { street: "...", city: "..." }` | Address is baked into history |
| `payment_method_id: "pm-789"` | `card_number: "4111..."` | Sensitive financial data in the log |

Store PII in a mutable store keyed by ID. Events reference the ID. When deletion is requested, delete from the mutable store; events remain intact without leaking personal data.

## Casing

Pick one casing convention and apply it consistently:

- **snake_case**: `order_id`, `total_amount`
- **camelCase**: `orderId`, `totalAmount`

Do not mix casing within a system.
