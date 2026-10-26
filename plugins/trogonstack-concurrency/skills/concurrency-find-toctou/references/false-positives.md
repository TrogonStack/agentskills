# Proving A Pair Is Safe

A check-then-act pair is safe only when something already serializes the actors or the write itself carries the condition. "The window is small", "this is rarely called", and "we have never seen it" are not proofs. The reviewer who marks a pair safe owes the same evidence as the reviewer who marks it unsafe.

## Single Writer By Construction

The strongest proof is that only one actor can ever reach the act for a given key. Accepted forms, each with what must be cited:

- **Partition key ownership.** Messages for a key always land on the same consumer instance (a Kafka partition keyed by the aggregate id, a NATS queue group is not enough on its own because a queue group balances without affinity). Cite the partitioner or the subject-to-consumer mapping, and the config that keeps one instance per partition.
- **One process per entity.** A `GenServer` registered under the entity id handles every write to that entity. Cite the registry, the `:unique` key, and that no other code path writes the same state outside that process.
- **Single consumer on the subject.** A JetStream consumer with `max_ack_pending: 1` on an ordered stream, or a single-instance worker by deployment. Cite the consumer config and the deployment constraint, and note that redelivery after `ack_wait` still re-enters the same consumer, which is fine only if the effect is idempotent or the dedupe is transactional.
- **Already inside a lock.** The enclosing transaction holds `FOR UPDATE` on the row, or an advisory lock on the key, before the check runs. Cite the lock statement and confirm every other writer to that state takes the same lock. A lock taken by this code path alone proves nothing.
- **Synchronous section.** On a single-threaded event loop with no `await`, `yield`, or callback between the check and the act. Cite the function and state that it contains no yield point.

## The Write Carries The Condition

The pair is also safe when the act is itself conditional and the earlier check is only a fast path:

- A unique constraint exists on the key and the insert handles the violation. Cite the index name.
- The update has `WHERE status = ...`, `WHERE version = ...`, or `WHERE owner_id = ...` and the code checks the rowcount. Cite the statement.
- The KV `update` passes the revision, the publish carries the expected sequence header, the append carries the expected version. Cite the call.

In that case the earlier check is harmless and the finding can say "redundant check, write is conditional" rather than reporting a race.

## Idempotent Effect

If running the act twice produces the same end state and no second side effect, the race is tolerable even though it exists. An upsert with a deterministic id, a `SET` of an absolute value, a `mkdir -p`. Cite why the effect is idempotent and confirm no counter, email, charge, or log line fires on the second run.

## What Is Not A Proof

- A comment saying the function is not reentrant.
- A mutex in one service when another service writes the same table.
- A low request rate. Rates change, and retries and replays cluster.
- A check repeated right before the write. Two checks have two windows.
- A test that passes. Races are the one bug class a passing test says nothing about.

## What The Safe Verdict Must Contain

```
- Location: <file:line>
- Pair: <check> then <act>
- Serialized by: <the construction, lock, constraint, or synchronous section, by name>
- Other writers: <list, each confirmed to go through the same serializer>
```

A safe verdict without a named serializer is an unreviewed pair, not a safe one.
