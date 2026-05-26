# Event Record Boundaries

Use this reference when an event review involves payload-vs-context placement, stream names, `event_type` schema identity, actor metadata, ownership checks, or deterministic event handlers.

## Event Type

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

## Stream Version Vs Event Schema Revision

- **Stream version** identifies the stream family, namespace, routing contract, or compatibility boundary.
- **Event schema revision** identifies the shape of one event inside that stream.

If only one event schema changes, keep the stream namespace stable and revise the event type: `stream: acme.orders.v1`, `event_type: type.googleapis.com/acme.orders.v1.OrderPlacedV2`. Do not use `type.googleapis.com/acme.orders.v2.OrderPlaced` for a single event shape change.

Bump the stream namespace only when the stream contract itself changes, such as routing, partitioning, stream identity, ordering semantics, or compatibility for the event family.

## Stream Names

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

## Event Record Layers

Separate record metadata, event context, and business payload.

**Record metadata:**

- `event_id` - unique identifier for this stored event
- `stream_id` - compact storage stream name or id that contains the event
- `stream_version` - event position in that stream
- `recorded_at` - when the event store persisted the event

**Event context/envelope:**

- `event_type` - canonical routing and decoding discriminator
- `actor_id` - actor associated with the command or event context
- `on_behalf_of` - actor represented by another actor, when delegated
- `occurred_at` - when the producer says the event happened
- `correlation_id` - ties events across one workflow
- `causation_id` - command or event that caused this event
- `source` - originating service/context for integration events

**Domain fields (payload):**

Everything specific to the business fact: `order_id`, `customer_id`, `owner_id`, `approved_by`, `effective_at`, `total_amount`, `items[]`, etc.

Use this test for each field:

```text
Is this field needed to express or enforce the business fact?
```

If yes, keep it in the payload. If it is generic causality, tracing, workflow identity, transport, or persistence context, keep it outside the payload.

Do not duplicate generic context in payload once readers can access event context. During migration, duplicated fields such as `added_by`, `added_at`, `paused_by`, or `paused_at` may remain until consumers can rely on context.

## Actor Context

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

## Ownership And Authorization

`context.actor_id` is not ownership.

Use `actor_id` as the actor attempting the command. Validate ownership or permission against aggregate state, a policy service, or a read model before emitting events.

Keep actor relationships in payload when they are business facts:

- `owner_id`
- `grantee`
- `approved_by`
- `assigned_to`
- `tenant_id`

If ownership can change over time, model that explicitly with events such as `OwnershipTransferred` or `PermissionGranted`.

## Deterministic Handler Inputs

Event handlers and projections should consume immutable `RecordedEvent` data.

Pure handlers should not call clocks, random ID generators, actor lookup, or authorization services during replay. Tests should build fixed recorded-event fixtures with stable record metadata, context, and payload.

If processing time is needed, record it as handler/runtime metadata such as `processed_at`, not by mutating the original event.
