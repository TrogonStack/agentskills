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

Design a NATS channel contract that stays understandable as the system grows. A subject is the routing key, not a declaration of transport or storage. Record delivery, acknowledgement, and ownership separately.

JetStream is not a second application subject tree. Streams bind to ordinary application subjects. The `$JS` subjects are the control plane and need separate permissions and management ownership.

## Start with the message behavior

Choose what the publisher and reader expect before choosing a subject shape. These kinds describe behavior; they are not required subject tokens:

| Kind | Typical transport | Contract |
| --- | --- | --- |
| Request/reply | Core NATS | A caller waits for a business response or a timeout. |
| Live signal | Core NATS publish-subscribe | Delivery is best effort while subscribers are connected. |
| Durable event | JetStream | The event can be replayed and consumers acknowledge progress. |
| Durable work | JetStream | A worker pool shares a durable consumer and retries unacknowledged work. |

Do not silently fall back from Core NATS to JetStream. That changes delivery guarantees. If a durable event also needs live observers, publish it on the JetStream subject and let live Core subscribers observe it. The durable consumer remains the correctness path.

If a stream captures a subject, a Core publish can be stored without giving the publisher a persistence acknowledgement. Use the JetStream publish path when the publisher must know that the server accepted the message for storage.

## Interview only for missing decisions

Skip questions that the user already answered. Ask for the missing contract decisions:

- Is this a new design or a migration?
- What behavior is needed: request/reply, live signal, durable event, or durable work?
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

Record one logical channel before creating subjects or streams. Use the small [AsyncAPI fragments](references/gateway-asyncapi-fragments.yaml) for application send and receive behavior. Use the [NACK JetStream resources](references/nack-jetstream.yaml) for Kubernetes-owned streams and optional consumers. The compact record below is review metadata, not a replacement wire specification:

```yaml
id: gateway.ingress.raw.github.v1
kind: durable-event
subjects:
  - gateway.ingress.raw.github.v1.<event>
transport: jetstream
stream: GITHUB_PRIMARY
owner: gitops
retention: 7d
ack: explicit
```

For a request/reply channel:

```yaml
id: gateway.health.v1.check
kind: request-reply
request_subjects:
  - gateway.health.v1.check
reply_subjects:
  - _INBOX.<generated-by-client>
transport: core
storage: none
owner: gateway
```

The request subject has no `.rpc.` token. Such a token is an optional local naming convention, not a NATS requirement. The channel contract states the behavior. Combine it with provisioned resources, such as NACK manifests, and observed state to show topology; do not infer transport from spelling. An application must not create a stream that GitOps or an operator already owns.

### Choose the subject shape

Choose tokens that identify the message and support the intended subscriptions and permissions. A stable, low-cardinality prefix helps with bounded filters. Use a kind token such as `rpc` or `event` only when it serves that design; no kind token or universal token order is required.

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

```yaml nats-subjects
- kind: stream
  subjects:
    - gateway.ingress.raw.github.v1.>
    - gateway.ingress.raw.slack.v1.>
- kind: consumer
  subjects:
    - gateway.ingress.raw.github.v1.pull_request
```

For a request, document the request subject and reply-to behavior. NATS request-reply uses a generated inbox. Responders publish to the request's reply subject; they do not invent a shared reply subject for each correlation ID.

Compare request subjects with stream filters. A request that expects a business response should not be captured by an unrelated JetStream stream. The [NACK example](references/nack-jetstream.yaml) captures ingress events and work, not `gateway.health.v1.check`.

For each principal, list publish and subscribe permissions separately. A broad `>` permission also reaches the JetStream control plane, so scope permissions to the channel and the required `$JS` or `_INBOX` subjects.

### Design JetStream storage and consumers

Choose a stream boundary from retention, storage, replication, throughput, ownership, and consumer topology. One stream per domain is an option, not a rule.

Select the retention policy deliberately:

- `limits` keeps replayable history under message, byte, or age limits.
- `workqueue` removes messages after one durable consumer acknowledges them.
- `interest` keeps messages while a matching consumer has interest.

Define storage, replicas, discard behavior, duplicate windows, maximum message size, and retention. Define consumers separately with durable identity, subject filters, pull or push delivery, acknowledgement policy, acknowledgement wait or backoff, maximum delivery attempts, and maximum pending acknowledgements.

Create a consumer only when a reader needs durable delivery. A durable event stream may have zero, one, or many consumers. The producer's event contract does not imply a consumer.

Keep stream subjects disjoint within an account. JetStream rejects a stream whose subjects overlap another stream in the same account. Use sourcing or mirroring to copy messages into another stream. Work-queue consumers must not have overlapping filters. Use a subject filter for routing. Do not assume arbitrary header predicates are available in JetStream consumers.

### Define ownership and management

A single control-plane owner must provision each stream and consumer. In Kubernetes, NACK is the control-plane owner for these JetStream resources. The management view should show:

```text
logical channel
  -> subject or subject filter
  -> Core or JetStream transport
  -> stream and any provisioned consumers
  -> owner
  -> desired state and observed state
  -> retention, backlog, and last error
```

In the gateway example, GitOps applies the NACK resources while the gateway publishes ingress events. The request/reply channel has no NACK resource. Show that separation in the channel contract and management view.

### Plan migrations

Before changing a subject:

1. Inventory concrete subjects, wildcard subscriptions, streams, consumers, and ACLs.
2. Check wildcard syntax and pattern overlap.
3. Define the target contract and its stream ownership.
4. Decide whether dual publishing is safe for ordering, idempotency, and storage cost.
5. Move consumers before removing the old subject.
6. Observe old and new traffic before deleting the old path.

Make consumers idempotent with an application key when a migration can deliver a message twice. `Nats-Msg-Id` deduplicates only inside one stream and its duplicate window. It does not deduplicate across the old and new streams.

## Output

Present a topology a reader can trace from application behavior to the deployed resources. Use the sections that fit the system. Include the relevant account boundary, channel contracts, subject filters, permissions, provisioning owner, and desired versus observed state. Include a migration plan when changing an existing hierarchy.

## Validation

Before presenting the design:

- Validate every concrete publisher subject.
- Validate every wildcard expression.
- Verify that `>` appears only as the final token.
- Verify that request replies use a generated inbox or an explicitly documented alternative.
- Compare request subjects with stream filters. Document any intentional capture and its response behavior.
- Check stream and consumer filter overlap.
- Check permissions against the actual subject and JetStream control-plane requirements.
- Mark machine-readable Markdown fixtures with the `nats-subjects` info tag. For example, use ` ```yaml nats-subjects` and put a `kind` and `subjects` list in each YAML item. Keep the list shape even when it has one value. Ordinary examples stay untagged.
- Run the bundled subject validator when it is available:

```bash
node plugins/trogonstack-nats/skills/nats-design-subject/scripts/validate-subjects.mjs --root plugins/trogonstack-nats/skills/nats-design-subject
```

The bundled validator checks subject syntax and tagged examples. It does not verify stream overlap, permissions, responder availability, or deployed topology.

## References

- [Channel contracts and Core versus JetStream](references/channel-contract.md)
- [AsyncAPI channel fragments](references/gateway-asyncapi-fragments.yaml)
- [NACK JetStream resources](references/nack-jetstream.yaml)
- [Tagged subject validation examples](references/channel-contract.md#gateway-example)
- [Subject fixture YAML](references/subject-fixtures.yaml)
- [Subject patterns](references/patterns.md)
- [JetStream streams and consumers](references/jetstream.md)
- [Subject anti-patterns](references/anti-patterns.md)
- [Security and tenancy](references/security.md)
- [Worked use cases](references/use-cases.md)
