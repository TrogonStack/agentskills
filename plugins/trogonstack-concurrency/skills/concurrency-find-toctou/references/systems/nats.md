# NATS And JetStream

Core NATS delivers a message at most once and remembers nothing. JetStream persists messages in streams and adds what a check-then-act needs: a sequence number per stream and per subject that a publish can be conditioned on, and a message id that the stream deduplicates for a window. Everything conditional in NATS is a sequence expectation or a message id, and every consumer is at-least-once, so the receiving side has to absorb a second delivery.

## Principles At Work

- [A read is a fact about the past](../principles/read-is-the-past.md): a request-reply answer, a KV `get`, and a watcher's last update are all older than the next publish.
- [The write must carry its condition](../principles/write-carries-condition.md): the expected sequence header, the KV revision, the expected stream.
- [Retry belongs around the conditional write](../principles/retry-wraps-the-write.md): a wrong last sequence rejection means reload the subject, re-decide, publish again.
- [Idempotence absorbs what ordering cannot prevent](../principles/idempotence-absorbs.md): `Nats-Msg-Id` for the publish retry, a transactional dedupe or an idempotent effect for the consumer redelivery.
- [Serialization is proven by naming the serializer](../principles/serializer-is-named.md): a work queue stream, a single pull consumer, or a KV key is a serializer only when the config is cited and redelivery is accounted for.

## Core NATS

A core subscriber that is slow or absent loses messages; a publish has no acknowledgement. Ordering holds per publisher per subject and nowhere else. A service that answers a request with "yes, slot available" has told the caller about the past, and the caller's next publish is a decision made on that past. Core NATS offers no primitive to close the window. Either the state moves into JetStream, or the responder itself owns the state and makes the decision inside the reply handler as a single process.

## Conditional Publish

A JetStream publish is rejected when a header's expectation does not hold:

- `Nats-Expected-Stream`: the subject must map to this stream. It catches a subject landing on the wrong stream after a configuration change.
- `Nats-Expected-Last-Sequence`: the stream's last sequence must equal the value. This serializes against every publisher on the stream, which is rarely what an aggregate wants.
- `Nats-Expected-Last-Subject-Sequence`: the last sequence on this message's subject must equal the value. With one subject per aggregate this is the expected version. The value `0` means the subject has no messages, which makes it the create guard.
- `Nats-Expected-Last-Msg-Id`: the last stored message's `Nats-Msg-Id` must equal the value.

The server answers a mismatch with a wrong last sequence error in the publish ack, and nothing is stored. Reading the last sequence of a subject, deciding, and publishing without the header is the TOCTOU; the header moves the comparison into the server, where it is atomic with the append.

`Nats-Msg-Id` makes the stream drop a second publish with the same id inside the stream's duplicate window (two minutes by default, set per stream) and answer with an ack flagged as a duplicate. It protects a retried publish, not two different decisions on the same aggregate, and it is time bounded: a retry after the window stores the message twice.

## Key-Value

A KV bucket is a stream with one subject per key and a per-key history limit. Every entry carries the revision, which is the stream sequence of the message that wrote it:

- `create(key, value)` publishes with expected last subject sequence `0` and fails when the key holds a live value. Clients retry a create against a key whose last operation is a delete by reusing the delete's revision, so a create after a delete succeeds; confirm the behaviour in the client in use.
- `update(key, value, revision)` publishes with the expected last subject sequence set to the revision. A mismatch is the signal to `get` again and re-decide.
- `put` has no condition and overwrites whatever landed in between. It is correct only when the writer does not care what it replaces.
- `delete` and `purge` accept a last revision in the clients that expose it, which guards against deleting a value someone just replaced.
- A watcher first delivers the current values (unless asked for updates only) and then live changes. Each delivery is a read of the past, and a write decided from a watched value still carries the revision.

History is bounded by the bucket's `history` setting; `get` returns the latest, and the revision in hand is the only thing that proves the latest is still latest.

## Streams As Claims

A stream configured with `max_msgs_per_subject = 1`, `discard = new`, and `discard_new_per_subject = true` rejects a second publish to a subject that already holds a message. Publishing to `claims.<job-id>` is then a claim that exactly one publisher wins, with no header to carry. The discard-per-subject option is recent; confirm against the server version in use.

The object store has no conditional put. Two writers to the same object name are last-writer-wins, and a KV entry beside the object is the claim.

## Consumers Are At-Least-Once

A message is redelivered when `ack_wait` passes without an ack, when the consumer `nak`s it, and when the ack itself is lost on the way to the server. Every effect a consumer makes can therefore run twice, on this instance or another one, with all the guards inside the handler intact. A check against a local `processed` set does not survive the second instance. The consumer either records the message id in the same transaction as the effect, with a unique constraint on the id, or makes the effect idempotent on a deterministic key, or accepts the duplicate and says so.

What the consumer configuration contributes:

- `ack_policy`: `explicit` acks one message, `all` acks every message up to this one, `none` never redelivers and is at-most-once.
- `ack_wait`: must exceed the slowest handler, or the server redelivers to another instance while the first is still working. `in_progress` extends the wait for one message while the handler keeps going.
- `max_ack_pending`: bounds how many messages are in flight at once, which is how many duplicates a crash can produce.
- `nak` with a delay schedules the redelivery instead of letting it happen immediately; `term` stops redelivery of a message that can never succeed.
- `max_deliver`: caps redelivery; after it the message is parked, and an advisory is published. A handler whose effect is not idempotent has run up to this many times.
- A synchronous ack (an ack that waits for the server's confirmation) closes the lost-ack case; a fire-and-forget ack does not.

`NumDelivered` in the message metadata is greater than one on a redelivery, which is useful for logging and never a substitute for the dedupe.

## Work Queues And Ordered Consumers

A stream with `retention = workqueue` deletes a message once it is acked and allows one consumer per overlapping filter subject. That is one delivery per message among competing workers, not exactly-once: a worker that times out hands the message to the next worker, and both effects can land.

An ordered consumer is ephemeral, acks nothing, and recreates itself from the last known sequence when it detects a gap. It is for reading a stream in order, and a decision made from an ordered consumer's position is a read whose publish still needs the expected sequence header.

A pull consumer's `fetch` hands the caller a batch that is ack-pending from the moment it is delivered. A batch that is processed slowly runs out of `ack_wait` on its tail while the head is still being handled, and the tail is redelivered elsewhere. Pull in batches no larger than the handler can finish inside one `ack_wait`.

## What The Finding Must Cite

For a publish: the subject, the sequence or revision the decision was made from, and the header that carries it. For a consumer: the ack policy, `ack_wait`, `max_deliver`, whether the ack is synchronous, and whether the dedupe record commits with the effect.

## Library Files

- TypeScript: [nats-js](../typescript/nats-js.md)
- Rust: [async-nats](../rust/async-nats.md)
- Go: [nats-go](../go/nats-go.md)
- Python: [nats-py](../python/nats-py.md)
- Elixir: the clients differ in how they expose headers and KV; see the Elixir line in [distributed.md](../surfaces/distributed.md). The transactional dedupe is in [ecto](../elixir/ecto.md).
