# NATS Channel Contracts

A NATS subject is a routing key. Its tokens need not encode transport, storage, or whether a response is expected. Describe those behaviors in the channel contract, then show how the deployed resources implement them.

JetStream does not require a separate application subject namespace. A stream captures ordinary subjects. `$JS` subjects are the JetStream control plane and must remain separate from application channels.

Use [AsyncAPI 3.0](https://www.asyncapi.com/docs/reference/specification/v3.0.0) with the small [channel fragments](gateway-asyncapi-fragments.yaml) to describe application behavior. Its `send` and `receive` operations belong to the application that owns the document. Use [NACK JetStream resources](nack-jetstream.yaml) for Kubernetes-owned streams and optional consumers. Do not put a downstream consumer into a loosely coupled producer contract. A reader can publish its own receive-side contract and own a JetStream consumer separately.

The NATS-specific examples below use list-valued `subjects`, `request_subjects`, and `reply_subjects` fields, even when one value is present. AsyncAPI keeps its singular `address` field, and JetStream examples keep exact server fields such as `filter_subject`.

| Concern | Core NATS | JetStream |
| --- | --- | --- |
| Delivery | Live publish-subscribe or request-reply | Stream-backed delivery through consumers |
| Disconnect | A disconnected subscriber misses the message | A durable consumer can resume or replay |
| Publisher result | Publish has no storage acknowledgement | JetStream publish can return a stream acknowledgement |
| State | No stream or consumer state | Stream and consumer state must be provisioned and observed |
| Use | RPC and best-effort live signals | Durable events and work that require replay or retry |

## Channel kinds

### Request/reply

Use Core NATS request-reply when the caller needs one response now:

```yaml
id: gateway.health.v1.check
kind: request-reply
request_subjects:
  - gateway.health.v1.check
reply_subjects:
  - _INBOX.<generated-by-client>
transport: core
storage: none
```

The client creates a unique inbox and sends it as the reply subject. The responder uses that reply subject. A timeout and retry policy are part of the contract. The `kind` field expresses request/reply behavior; `.rpc.` is not required in the subject. Add a kind token only when it helps a chosen subscription or permission boundary.

### Live signal

Use Core NATS publish-subscribe for best-effort notifications:

```yaml
id: gateway.signal.v1.configuration_changed
kind: live-signal
subjects:
  - gateway.signal.v1.configuration_changed
transport: core
storage: none
```

A disconnected subscriber misses the message. Do not use this kind for an event that must be replayed.

### Durable event

Use JetStream for a fact that must survive a disconnect or be replayed:

```yaml
id: gateway.ingress.raw.github.v1
kind: durable-event
subjects:
  - gateway.ingress.raw.github.v1.<event>
transport: jetstream
stream: GITHUB_PRIMARY
retention: 7d
ack: explicit
```

Core subscribers may observe the same published subject for low-latency reactions. Durable consumers remain the correctness path.

The publisher must choose its acknowledgement requirement explicitly. A Core publish to a subject captured by a stream does not tell the publisher that storage completed. A JetStream publish acknowledgement is the appropriate contract when the publisher needs that proof.

Use the same shape for a second ingress source when it has a separate ownership or retention policy:

```yaml
id: gateway.ingress.slack.v1
kind: durable-event
subjects:
  - gateway.ingress.raw.slack.v1.<event>
transport: jetstream
stream: SLACK_PRIMARY
retention: 7d
ack: explicit
```

### Durable work

Use a JetStream work-queue stream and add a durable consumer only when worker instances need shared, retryable work:

```yaml
id: gateway.work.v1.installation_sync
kind: durable-work
subjects:
  - gateway.work.v1.installation_sync
transport: jetstream
stream: GATEWAY_WORK
retention: workqueue
consumer: installation-sync
ack: explicit
```

Set redelivery, backoff, maximum attempts, and dead-letter behavior as part of the work contract.

The `consumer` field belongs to the worker's receive-side contract. Omit it from a publisher-only event contract.

## Gateway example

```text
gateway.ingress.raw.github.v1.pull_request
gateway.ingress.raw.slack.v1.event_callback
gateway.events.v1.conversation.message
gateway.health.v1.check
gateway.work.v1.installation_sync
```

The GitHub and Slack ingress streams can remain separate when their retention, permissions, or consumers differ. A stream may exist before a reader is deployed. Their [NACK filters](nack-jetstream.yaml) capture ingress events and work, not the health request. That boundary comes from the declared filters and contract, not from a required `.rpc.` prefix. Compare request subjects with stream filters before treating them as separate paths.

The `nats-subjects` tag marks the examples that the bundled validator reads. The `yaml` language tag keeps the fixture readable as a small data document. Narrative examples use ordinary fences and are not treated as machine-readable contracts.

```yaml nats-subjects
- kind: publish
  subjects:
    - gateway.ingress.raw.github.v1.pull_request
- kind: subscribe
  subjects:
    - gateway.ingress.raw.github.v1.>
- kind: stream
  subjects:
    - gateway.ingress.raw.github.v1.>
# This validates an optional reader filter. It does not provision a consumer.
- kind: consumer
  subjects:
    - gateway.ingress.raw.github.v1.pull_request
- kind: publish
  subjects:
    - gateway.ingress.raw.slack.v1.event_callback
- kind: subscribe
  subjects:
    - gateway.ingress.raw.slack.v1.>
- kind: publish
  subjects:
    - gateway.health.v1.check
- kind: deliver
  subjects:
    - _INBOX.generated
```

## Ownership

Declare one owner for each stream and consumer. In Kubernetes, NACK owns the JetStream resources:

```yaml
owner: gitops
provisioner: nack
publisher: trogon-gateway
```

The application can validate that a required stream exists. It should not silently create a second definition that competes with NACK. Apply mTLS connection settings to NACK through its Helm values and Kubernetes Secrets, not through application startup code.

## Management readback

Build management readback from the declared channel behavior, NACK resources, and observed state. Consumer fields appear only when a reader owns one:

```text
channel: gateway.ingress.raw.github.v1
subjects:
  - gateway.ingress.raw.github.v1.>
transport: jetstream
stream: GITHUB_PRIMARY
stream_state: ready
consumers: optional, owned by readers
backlog: 0
owner: gitops
```

The request/reply channel has no stream or consumer entry. Its readback can show the responder, timeout, and permission path instead:

```yaml
channel: gateway.health.v1.check
kind: request-reply
transport: core
request_subjects:
  - gateway.health.v1.check
reply_subjects:
  - _INBOX.<generated-by-client>
responder: gateway
storage: none
```

Observed responder readiness and authorization status belong beside this declared shape. Neither is proved by the subject name.
