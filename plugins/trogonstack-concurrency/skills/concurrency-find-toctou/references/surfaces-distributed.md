# Distributed Store Surfaces

Across nodes there is no shared memory and no shared lock that costs nothing. What the stores offer instead is a conditional write: "apply this only if the last thing you saw is still the last thing". Every check-then-act against a distributed store must be rewritten as one of these conditional writes, or it is a lost update waiting for load.

## NATS KV

Avoid reading a key, deciding, and writing back with a plain put:

```
entry = kv.get("config.limits")
next  = bump(entry.value)
kv.put("config.limits", next)        # overwrites whatever landed in between
```

Prefer the revision-guarded update. Every KV entry carries a revision; `update` fails when the key's current revision differs from the one you pass:

```
entry = kv.get("config.limits")
next  = bump(entry.value)
kv.update("config.limits", next, entry.revision)
# on "wrong last sequence": re-get, re-decide, retry
```

For first-time creation use `create`, which fails if the key already holds a live value. `create` then `update` on the error path is the correct find-or-create for KV. A `put` is only safe when the writer does not care what it overwrites.

## JetStream Publish

A stream append can be made conditional through headers on the publish:

- `Nats-Expected-Last-Sequence`: the stream's last sequence must equal this value.
- `Nats-Expected-Last-Subject-Sequence`: the last sequence on this message's subject must equal this value. This is the per-aggregate expected version when each aggregate publishes to its own subject.
- `Nats-Expected-Last-Msg-Id`: the last message's `Nats-Msg-Id` must equal this value.
- `Nats-Expected-Stream`: the message must land on this stream, which catches subject overlap misconfiguration.

A mismatch is rejected by the server and surfaces as a publish error. The publisher reloads from the subject, re-decides, and retries. Reading the subject's last sequence and then publishing without the header is the TOCTOU.

`Nats-Msg-Id` on its own deduplicates publishes with the same id inside the stream's duplicate window. That protects against a retried publish, not against two different decisions racing on the same aggregate.

## Event Store Append

The same shape with explicit vocabulary. Load the stream, fold to current state, decide, append with the expected version equal to the version you loaded:

```
events, version = store.read(stream)
state = fold(events)
new_events = decide(state, command)
store.append(stream, new_events, expected_version: version)
# on wrong-expected-version: reload and retry, bounded
```

Appending with "any" expected version, or with a version from a cached projection, is a check made against a copy.

## At-Least-Once Consumers

A consumer that processes a message and then acks can crash between the effect and the ack. The message is redelivered, to this instance or another, and the effect runs twice. An ack-wait that is shorter than processing time produces the same redelivery with no crash at all.

Avoid:

```
if not processed.contains(msg.id):
    apply(msg)
    processed.insert(msg.id)
    msg.ack()
```

Two instances handling the same redelivered message both pass the `contains` check. Prefer recording the message id in the same transaction as the effect, with a unique constraint on the id, and treating the constraint violation as "already done":

```sql
BEGIN;
INSERT INTO processed_messages (msg_id) VALUES ($1);   -- unique; violation means done
UPDATE accounts SET balance = balance - $2 WHERE id = $3;
COMMIT;
```

When the effect is not in a transactional store, make the effect itself idempotent with a deterministic key (an upsert on a client-generated id, a payment with an idempotency key the provider enforces), or accept duplicates and say so in the finding.

Check the consumer configuration while here: `ack_wait` must exceed the worst-case processing time, and `max_deliver` bounds how many times the double effect can happen before the message parks.

## Outbox And Relay

A relay that reads unsent rows, publishes them, and marks them sent has the same two-instance problem. Claim the rows with a conditional update first (`UPDATE outbox SET claimed_by = $1 WHERE claimed_by IS NULL AND id = ANY($2)`), then publish only what was claimed, and rely on `Nats-Msg-Id` deduplication for the publish retry path.

## What The Finding Must Cite

The store, the read that produced the decision, the write that followed, and whether the write carried the expected revision, sequence, or version. For consumers, the ack mode, `ack_wait`, and whether the dedupe record and the effect commit together.
