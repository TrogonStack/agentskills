---
name: event-definition
description: "Review or create event definitions for event-driven architecture. Covers event names, payload field names, event_type identity, stream naming boundaries, and record metadata/context/payload placement for both domain events (event-sourcing) and integration events (cross-service). Use when designing a new event definition, reviewing an existing event definition, or auditing event definition consistency across a catalog. Do not use for full event modeling workflows (use trogonstack-eventmodeling skills), event schema evolution or migration strategy, or event store implementation design."
allowed-tools:
  - AskUserQuestion
  - Write
  - Read
  - Bash
---

# Review or Create Event Definitions

Review or create event definitions for event-driven systems. Keep the default pass focused on event identity, naming, field placement, record boundaries, and the quality gate; load references only when a decision needs examples, detailed criteria, or deeper modeling guidance.

## Progressive Disclosure

Read these references only when the task needs that depth:

- `references/event-naming-rules.md` - examples for event tense, domain language, CRUD naming, suffixes, infrastructure terms, negatives, and integration-event prefixes.
- `references/field-naming-rules.md` - examples for field names, identifiers, temporal fields, enums vs booleans, derived values, money, collections, polymorphic payloads, PII, and casing.
- `references/event-record-boundaries.md` - event type identity, stream names, stream version vs event schema revision, actor context, ownership checks, and deterministic handlers.
- `references/quality-checklist.md` - full checklist for pass/fail reviews and future criteria additions.

## Core Principle

An event definition declares **what happened**, **how it is identified**, and **which business facts were captured**.

Keep three layers distinct:

- **Record metadata**: event-store facts such as `event_id`, `stream_id`, `stream_version`, and `recorded_at`
- **Event context/envelope**: generic event-sourcing facts such as `event_type`, `actor_id`, `on_behalf_of`, `occurred_at`, `correlation_id`, and `causation_id`
- **Payload**: domain facts such as `order_id`, `owner_id`, `approved_by`, `effective_at`, and `expires_at`

Do not push generic causality, tracing, persistence, or transport facts into the domain payload. Keep actor and time fields in the payload only when they are part of the domain rule.

## Interview

Before reviewing or creating event definitions, establish:

1. **Domain or integration?** Domain events live inside a bounded context and are the source of truth for state. Integration events cross service boundaries and form a public contract.
2. **What business process or workflow does this event belong to?**
3. **What conventions already exist in the codebase?** If there is an event catalog, read it first and follow it unless it violates these rules.

If the user provides event definitions to review, skip to the review. If the user asks to design new event definitions, gather the business context first.

## Event Naming Rules

1. Use past tense because events are facts: `OrderPlaced`, not `PlaceOrder`.
2. Use domain language instead of CRUD or implementation language: `ClaimApproved`, not `ClaimStatusChanged`, unless status changes are the domain concept.
3. Be specific enough to understand the fact without reading the payload: `OrderItemAdded`, not `OrderChanged`.
4. Reserve `Created`, `Updated`, and `Deleted` for domains where those operations are the business concept.
5. Keep one event to one thing that happened. Split combined facts even when they share a cause.
6. Choose one naming format and apply it consistently: PascalCase, dot.delimited, or kebab-case.
7. Avoid redundant suffixes such as `Event`, `Message`, or `Notification`.
8. Keep infrastructure and broker names out of event names.
9. Prefer positive domain facts with reason fields over negative event names, unless the negative term is natural domain language.

For examples and edge cases, read `references/event-naming-rules.md`.

## Integration Event Naming Rules

Integration events cross service boundaries and form public contracts.

1. Prefix or namespace integration events with the originating bounded context or service when they can collide across domains.
2. Use shared vocabulary that consumers understand, not private implementation jargon.

For examples and collision guidance, read `references/event-naming-rules.md`.

## Event Type And Stream Identity

Persisted `event_type` should identify the domain/event schema contract without requiring stream-name parsing. Stream names are storage/routing addresses and may be compact, e.g. `tenant/tenant_123/orders/order_456`; keep tenant, environment, region, and shard values out of `event_type`.

Do not carry both a versioned `event_type` and a separate `schema_version` when both encode the same schema version. Keep `event_type` stable for compatible additive changes; use revisions such as `OrderPlacedV2` only for incompatible schema or semantic changes.

For self-identifying event types, stream names, stream version vs event schema revision, and tenant-scoped streams, read `references/event-record-boundaries.md`.

## Field Naming Rules

1. Capture **What**, **Who**, and **When** through the event type plus typed event context.
2. Keep generic actor and occurrence time in context: `actor_id`, `occurred_at`.
3. Use payload `_by`, `_at`, or `_on` fields only when that actor or time is part of the domain fact.
4. Use domain language for fields and avoid vague names or abbreviations.
5. Make identifiers explicit: `order_id`, not `id`.
6. Use `_at` for datetimes and `_on` for dates; keep generic `occurred_at` in context.
7. Prefer enums over booleans unless the field is permanently binary.
8. Keep computed or derived values out of domain events; put them in read models.
9. Include currency with monetary amounts.
10. Use plural names for collections and singular names for scalar values.
11. Split polymorphic payloads into separate event types.
12. Avoid direct PII in immutable events; reference mutable records by identifier.
13. Use consistent casing across the event catalog.

For examples and edge cases, read `references/field-naming-rules.md`.

## Record Metadata, Context, And Payload

Keep record metadata, event context, and business payload separate. Generic actor, time, correlation, causation, persistence, transport, and routing facts belong outside payload unless they are themselves domain facts.

Use `actor_id` only for the initiating/requesting actor in event context; do not infer ownership or authorization from it. Validate ownership against domain state or policy before emitting events.

Event handlers and projections should consume immutable recorded-event data and avoid clocks, random IDs, actor lookups, or authorization services during replay.

For record-layer, actor-context, ownership, and deterministic-handler rules, read `references/event-record-boundaries.md`.

## Quality Checklist

Use this as the required quality gate when creating or reviewing event definitions:

1. Names are factual, past-tense, domain-specific, and scoped enough to avoid collisions.
2. Field names describe domain facts with explicit identifiers, temporal naming, casing, and safe value shapes.
3. `event_type` is a self-identifying schema discriminator and is not coupled to stream routing details.
4. Record metadata, event context, and payload stay separate.
5. Actor context, ownership checks, and handler inputs support deterministic replay.

For formal pass/fail review output or when adding criteria, read `references/quality-checklist.md`.

## Output

Provide:

- List of events reviewed with pass/fail per quality checklist item
- Suggested corrections for any violations
- Domain vs integration classification if not already clear
- Field naming corrections with rationale
- Payload vs context classification for disputed actor, time, causality, and schema identity fields
