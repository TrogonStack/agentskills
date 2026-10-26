# Fix Catalog

Pick the primitive by the store that owns the state, not by the language the check is written in. Each row names the smell, the primitive that makes the second actor lose, and the surface reference that shows the shape. The language files spell the primitive in the library under review.

| Surface | Smell | Atomic primitive | Reference |
| --- | --- | --- | --- |
| Filesystem | exists then create | exclusive create (`O_CREAT \| O_EXCL`) | surfaces-filesystem.md |
| Filesystem | stat then open | open with no-follow, then `fstat` the descriptor | surfaces-filesystem.md |
| Filesystem | build name, check free, create temp | atomic unique temp creation (`mkstemp` family) | surfaces-filesystem.md |
| Filesystem | write in place | write temp in same dir, `fsync`, `rename` | surfaces-filesystem.md |
| Filesystem | exists then unlink or mkdir | call it and handle `ENOENT` / `EEXIST` | surfaces-filesystem.md |
| Database | SELECT then INSERT (find-or-create) | unique index plus `INSERT ... ON CONFLICT` | surfaces-database.md |
| Database | read balance then write balance | `UPDATE ... SET x = x - $1 WHERE x >= $1`, check rowcount, `CHECK` constraint | surfaces-database.md |
| Database | read status then set status | `UPDATE ... WHERE status = 'expected'`, check rowcount | surfaces-database.md |
| Database | read several columns then write | version column, `WHERE version = $n`, retry on zero rows | surfaces-database.md |
| Database | decide in app code from row data | `SELECT ... FOR UPDATE` inside the transaction, every writer locks | surfaces-database.md |
| Database | count then insert (per-key limit) | `pg_advisory_xact_lock(hashtext(key))` inside the transaction | surfaces-database.md |
| Database | complex multi-row invariant | `SERIALIZABLE` plus retry on `40001` | surfaces-database.md |
| Authorization | check, await, write | fold the condition into the write (`WHERE owner_id = $u`, membership join) | surfaces-authorization.md |
| Authorization | check on preview, write on confirm | re-check on the confirm request | surfaces-authorization.md |
| Authorization | check, enqueue, worker writes | re-check in the worker, or a signed short-lived capability | surfaces-authorization.md |
| Authorization | cached ACL | per-write check, or TTL the domain accepts and the finding states | surfaces-authorization.md |
| Cache | miss then compute (one process) | single-flight on an in-flight map | surfaces-cache.md |
| Cache | miss then compute (fleet) | `SET lock:key token NX PX ttl`, holder computes, compare-and-delete release | surfaces-cache.md |
| Cache | not exists then set | `SET key v NX`, `add`, insert-if-absent | surfaces-cache.md |
| Cache | cached negative outlives the create | invalidate on create, short negative TTL, or write-through | surfaces-cache.md |
| NATS KV | get then put | `update` with the read revision; `create` for first write | surfaces-distributed.md |
| JetStream | read last seq then publish | `Nats-Expected-Last-Subject-Sequence` (or `-Last-Sequence`) header | surfaces-distributed.md |
| JetStream | retried publish | `Nats-Msg-Id` within the duplicate window | surfaces-distributed.md |
| Event store | load then append | append with `expected_version` equal to the loaded version | surfaces-distributed.md |
| Consumer | contains(id) then apply then record | insert the id (unique) and the effect in one transaction | surfaces-distributed.md |
| Consumer | effect in a non-transactional store | idempotent effect keyed by a deterministic id | surfaces-distributed.md |
| In-process | check, yield, set | publish the in-flight claim before the first yield | surfaces-async.md |
| In-process | lock, release, yield, lock, insert | hold an async-aware lock across the decision, or a per-key entry API | surfaces-async.md |
| In-process | two calls into one server | one call whose handler checks and writes | surfaces-async.md |
| In-process | lookup then insert in a shared table | insert-if-absent, atomic counter, compare-and-swap | surfaces-async.md |
| In-process | lookup owner then register | the register call is the claim | surfaces-async.md |

## When A Lock Is The Answer

A lock is the right primitive when the decision genuinely needs application code between the read and the write, and every writer to that state can be made to take the same lock. A row lock (`FOR UPDATE`), an advisory lock on a key, and a single process that owns the state all satisfy that. The finding must list the other writers and confirm each one takes the lock.

## When A Lock Moves The Race

- An in-process mutex guards nothing against a second process, worker, or node. If the state lives in a shared store, the mutex is decoration.
- A distributed lock with a lease (Redis `SET NX PX`, a leader election) is itself a check-then-act: the holder checks it has the lease, then acts, and the lease can expire in between. It bounds how often the race happens; it does not remove it. Fence the act with a token the store verifies (a version, a revision, a lease number stored with the write) or accept the window and state it.
- A lock taken after the read ("read, then lock, then write") protects the write from other writers but not the decision from staleness. The read has to happen under the lock.
- A retry loop around a check-then-act makes the race repeat, not disappear. Retry belongs around a conditional write that reports the conflict.

## Choosing Between Optimistic And Pessimistic

Optimistic (version, revision, expected sequence) costs nothing when conflicts are rare and pushes the conflict to the caller as a retry. Pessimistic (row lock, advisory lock, single owning process) costs waiting on every call and never surfaces a conflict. Pick optimistic when writes to the same key are rare or the caller can re-decide cheaply. Pick pessimistic when the decision is expensive, conflicts are common, or a retry would repeat a side effect that is not idempotent.
