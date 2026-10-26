# Serialization Is Proven By Naming The Serializer

A check-then-act pair is safe only when something already makes the actors take turns, and the reviewer can point at that something by name.

## Why It Holds

The race exists whenever two actors can reach the act with the same stale read. The only ways that cannot happen are that there is exactly one actor by construction, or that the actors are forced through a single door before they read. Both are concrete mechanisms with a name in the code or the configuration. Anything that is not such a mechanism is a probability, and a probability is a race with a smaller number attached.

"The window is small", "this is rarely called", and "we have never seen it" describe odds. The reviewer who marks a pair safe owes the same evidence as the reviewer who marks it unsafe.

## Accepted Serializers

Each one with what must be cited:

- **Partition key ownership.** Messages for a key always land on the same consumer instance, such as a Kafka partition keyed by the aggregate id. Cite the partitioner, the subject-to-consumer mapping, and the config that keeps one instance per partition. A NATS queue group is not this: it balances without affinity.
- **One process per entity.** A single process registered under the entity id handles every write to that entity. Cite the registry, the unique key, and that no other code path writes the same state outside that process.
- **Single consumer on the subject.** A JetStream consumer with `max_ack_pending: 1`, or a single-instance worker by deployment. Cite the consumer config and the deployment constraint, and note that redelivery after `ack_wait` re-enters the same consumer, which is safe only if the effect is idempotent or the dedupe is transactional ([idempotence-absorbs.md](idempotence-absorbs.md)).
- **Already inside a lock.** The enclosing transaction holds `FOR UPDATE` on the row, or an advisory lock on the key, before the check runs. Cite the lock statement and confirm every other writer to that state takes the same lock ([lock-moves-the-race.md](lock-moves-the-race.md)).
- **Synchronous section.** On a single-threaded event loop with no `await`, `yield`, or callback between the check and the act. Cite the function and state that it contains no yield point.

## The Write Already Carries The Condition

The pair is also safe when the act is itself conditional and the earlier check is only a fast path ([write-carries-condition.md](write-carries-condition.md)):

- A unique index exists on the key and the insert handles the violation. Cite the index from the migration, not from a changeset helper.
- The update has `WHERE status = ...`, `WHERE version = ...`, or `WHERE owner_id = ...` and the code branches on the rowcount. Cite the statement.
- The KV update passes the revision, the publish carries the expected sequence header, the append carries the expected version. Cite the call.

In that case the finding says "redundant check, write is conditional" rather than reporting a race.

## What Is Not A Serializer

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
