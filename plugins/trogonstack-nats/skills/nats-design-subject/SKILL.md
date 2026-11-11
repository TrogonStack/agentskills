---
name: nats-design-subject
description: "Design and audit NATS channels across Core NATS and JetStream, including subjects, request-reply, streams, consumers, tenancy, authorization, and migrations."
allowed-tools:
  - AskUserQuestion
  - Write
  - Read
  - Shell
---

# Design NATS Channels

Design a NATS channel contract that stays understandable as the system grows. A subject is the routing key. Core NATS and JetStream are delivery and storage choices that must remain explicit in the contract.

JetStream is not a second application subject tree. Streams bind to ordinary application subjects. The `$JS` subjects are the control plane and need separate permissions and management ownership.

## Start with the channel kind

Choose the semantic kind before choosing the subject shape:

| Kind | Transport | Contract |
| --- | --- | --- |
| RPC | Core NATS request-reply | A caller waits for one response or a timeout. |
| Live signal | Core NATS publish-subscribe | Delivery is best effort while subscribers are connected. |
| Durable event | JetStream | The event can be replayed and consumers acknowledge progress. |
| Durable work | JetStream | A worker pool shares a durable consumer and retries unacknowledged work. |

Do not silently fall back from Core NATS to JetStream. That changes delivery guarantees. If a durable event also needs live observers, publish it on the JetStream subject and let live Core subscribers observe it. The durable consumer remains the correctness path.

If a stream captures a subject, a Core publish can be stored without giving the publisher a persistence acknowledgement. Use the JetStream publish path when the publisher must know that the server accepted the message for storage.

## Interview only for missing decisions

Skip questions that the user already answered. Ask for the missing contract decisions:

- Is this a new design or a migration?
- What channel kinds are needed: RPC, live signal, durable event, or durable work?
- Is tenancy an NATS account boundary, a shared-account subject prefix, or both?
- Which principals publish, subscribe, request, respond, or manage JetStream resources?
- What must survive a disconnect, and what can be lost?
- Who owns stream and consumer provisioning?

For an existing hierarchy, audit current subjects, subscriptions, streams, consumers, and permissions before proposing replacements.

## Workflow

### Define the account and domain boundary

Use NATS Accounts for tenant or environment isolation when the boundary needs independent credentials, quotas, JetStream, or KV. Use a subject prefix only for an intentional shared-account surface or an exported platform view.

Keep tenant identity out of normal tenant-local subjects when the account already supplies it. Put tenant provenance into platform aggregation subjects only when the data crosses an explicit export or import boundary.

### Write the channel contract

Record one logical channel before creating subjects or streams:

```yaml
id: gateway.ingress.raw.github.v1
kind: durable-event
subject: gateway.ingress.raw.github.v1.<event>
transport: jetstream
stream: GATEWAY_GITHUB_PRIMARY
owner: gitops
retention: 7d
ack: explicit
```

For an RPC channel:

```yaml
id: gateway.rpc.v1.health
kind: rpc
request_subject: gateway.rpc.v1.health
reply_subject: _INBOX.<generated-by-client>
transport: core
storage: none
owner: gateway
```

The channel record is the source for the subject, stream filters, consumer filters, permissions, and management status. Do not make an application silently create production streams that are also declared by GitOps or an operator.

### Choose the subject shape

Use a stable, low-cardinality prefix followed by the fields subscribers need to filter:

```text
<domain>.<event-or-action>.<bounded-scope>.<identifier>
```

Examples:

```text
orders.created.us-west.order-123
orders.shipped.us-west.order-123
gateway.ingress.raw.github.v1.pull_request
gateway.ingress.raw.slack.v1.event_callback
```

Publishers send concrete subjects. Only subscriptions, permissions, and stream or consumer filters use wildcards.

- `*` matches exactly one token.
- `>` matches one or more trailing tokens and must be the final token.
- A wildcard is a complete token. `foo*` and `foo.>bar` are not NATS wildcards.
- Keep the subject readable and bounded. NATS documents a reasonable maximum of about 16 tokens and a subject length below 256 characters. A shorter project convention is fine when it is stated as a convention.
- Use one spelling and casing convention. Lowercase with hyphens is a good project convention, while NATS also permits underscores and case-sensitive names.
- Keep `$SYS`, `$JS`, `$KV`, `$O`, `$SRV`, and `_INBOX` for their protocol roles unless the design explicitly documents a boundary.

Do not claim a performance effect from token order without a benchmark. Place fields where they make the intended subscription and authorization patterns obvious.

### Plan subscriber and permission paths

For every subject template, document the intended filters:

```text
gateway.ingress.raw.github.v1.>
gateway.ingress.raw.github.v1.pull_request
gateway.ingress.raw.slack.v1.>
```

For a request, document the request subject and reply-to behavior. NATS request-reply uses a generated inbox. Responders publish to the request's reply subject; they do not invent a shared reply subject for each correlation ID.

For each principal, list publish and subscribe permissions separately. A broad `>` permission also reaches the JetStream control plane, so scope permissions to the channel and the required `$JS` or `_INBOX` subjects.

### Design JetStream storage and consumers

Choose a stream boundary from retention, storage, replication, throughput, ownership, and consumer topology. One stream per domain is an option, not a rule.

Select the retention policy deliberately:

- `limits` keeps replayable history under message, byte, or age limits.
- `workqueue` removes messages after one durable consumer acknowledges them.
- `interest` keeps messages while a matching consumer has interest.

Define storage, replicas, discard behavior, duplicate windows, maximum message size, and retention. Define consumers separately with durable identity, subject filters, pull or push delivery, acknowledgement policy, acknowledgement wait or backoff, maximum delivery attempts, and maximum pending acknowledgements.

Keep stream subject filters disjoint unless overlap is intentional and documented. Work-queue consumers must not have overlapping filters. Use a subject filter for routing. Do not assume arbitrary header predicates are available in JetStream consumers.

### Define ownership and management

A single control-plane owner must provision each stream and consumer. The management view should show:

```text
logical channel
  -> subject or subject filter
  -> Core or JetStream transport
  -> stream and consumers, if durable
  -> owner
  -> desired state and observed state
  -> retention, backlog, and last error
```

For the Trogon gateway, GitOps and NACK can own external ingress streams while the gateway publishes and validates them. The ownership must be visible in the channel contract.

### Plan migrations

Before changing a subject:

1. Inventory concrete subjects, wildcard subscriptions, streams, consumers, and ACLs.
2. Check wildcard syntax and pattern overlap.
3. Define the target contract and its stream ownership.
4. Decide whether dual publishing is safe for ordering, idempotency, and storage cost.
5. Move consumers before removing the old subject.
6. Observe old and new traffic before deleting the old path.

Use `Nats-Msg-Id` or an application idempotency key when a migration can deliver a message twice.

## Output

Write a design that includes:

```markdown
# NATS Channel Architecture: [System]

## Account and tenancy boundary

## Channel contracts

## Subject templates and valid wildcard paths

## Core NATS request-reply and live signals

## JetStream streams and consumers

## Permissions and reserved subjects

## Provisioning owner and management readback

## Migration and validation plan
```

## Validation

Before presenting the design:

- Validate every concrete publisher subject.
- Validate every wildcard expression.
- Verify that `>` appears only as the final token.
- Verify that request replies use a generated inbox or an explicitly documented alternative.
- Check stream and consumer filter overlap.
- Check permissions against the actual subject and JetStream control-plane requirements.
- Run the bundled subject validator when it is available:

```bash
node plugins/trogonstack-nats/skills/nats-design-subject/scripts/validate-subjects.mjs --file plugins/trogonstack-nats/skills/nats-design-subject/references/subject-fixtures.txt
```

## References

- [Channel contracts and Core versus JetStream](references/channel-contract.md)
- [Subject validation fixtures](references/subject-fixtures.txt)
- [Subject patterns](references/patterns.md)
- [JetStream streams and consumers](references/jetstream.md)
- [Subject anti-patterns](references/anti-patterns.md)
- [Security and tenancy](references/security.md)
- [Worked use cases](references/use-cases.md)
