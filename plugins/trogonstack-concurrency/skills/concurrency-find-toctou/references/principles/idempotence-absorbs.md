# Idempotence Absorbs What Ordering Cannot Prevent

When running the act twice produces the same end state and no second side effect, a race on that act is tolerable even though it exists.

## Why It Holds

Some interleavers cannot be ordered away. A message redelivered after a crash, a client that retries a timed-out request, a user who double-submits a form: each one runs the whole act again, with the guards intact, because from the system's point of view it is a new request. No constraint on the first run prevents the second run. The only defense is that the second run changes nothing.

Idempotence is a property of the effect, not of the request. It needs a deterministic key that both runs share (a client-generated id, a message id, a natural key) and an effect that is absolute rather than relative (set to a value, upsert by key, create-if-absent) or that is guarded by a record of the key.

## What Idempotence Looks Like

- An upsert keyed by a client-generated id. The second run matches the same row.
- `SET` of an absolute value, `mkdir -p`, `rm -f`. The second run finds the state already there.
- A `processed_messages` row inserted in the same transaction as the effect, with a unique constraint on the message id; the violation means "already done" and the transaction rolls back the duplicate effect.
- A payment with an idempotency key the provider enforces.
- A `Nats-Msg-Id` inside the stream's duplicate window, which absorbs a retried publish.

## What Idempotence Does Not Cover

- A counter increment, an appended log line, a sent email, a charge without an idempotency key. Each second run adds one more.
- A dedupe record written after the effect in a separate transaction. The crash between them leaves the effect done and the record missing, and the redelivery runs the effect again.
- A `Nats-Msg-Id` against two different decisions on the same aggregate. It absorbs the same publish repeated; it does not order two publishers who both read the same state ([write-carries-condition.md](write-carries-condition.md) does that).
- Any effect in a non-transactional store with no deterministic key. Say so in the finding rather than claiming idempotence.

## What The Reviewer Must Cite

The key both runs share, why the effect is absolute or guarded by that key, and a list of the side effects on the path with confirmation that none fires on the second run. For consumers, whether the dedupe record and the effect commit together, and the `ack_wait` and `max_deliver` that bound how many second runs can happen.

## The Wrong Fix It Rules Out

"We check `processed.contains(id)` first." That is a check-then-act on the dedupe set, and two instances handling the same redelivery both pass it. The record of the id has to be the conditional write itself, inside the same transaction as the effect.
