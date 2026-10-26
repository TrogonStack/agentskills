# Fix Catalog

Pick the primitive by the store that owns the state, not by the language the check is written in. Each row names the smell, the principle the smell violates, the primitive that makes the second actor lose, and the surface file that shows the shape. The library files spell the primitive in the library under review.

Principle abbreviations: Condition is [the write must carry its condition](../principles/write-carries-condition.md); Owner is [only the owner of the state can decide](../principles/owner-decides.md); Lock is [a lock only helps when the read happens under it](../principles/lock-moves-the-race.md); Retry is [retry belongs around the conditional write](../principles/retry-wraps-the-write.md); Idempotence is [idempotence absorbs what ordering cannot prevent](../principles/idempotence-absorbs.md).

| Surface | Smell | Principle | Atomic primitive | Reference |
| --- | --- | --- | --- | --- |
| Filesystem | exists then create | Condition | exclusive create (`O_CREAT \| O_EXCL`) | [filesystem](../surfaces/filesystem.md) |
| Filesystem | stat then open | Condition | open with no-follow, then `fstat` the descriptor | [filesystem](../surfaces/filesystem.md) |
| Filesystem | build name, check free, create temp | Condition | atomic unique temp creation (`mkstemp` family) | [filesystem](../surfaces/filesystem.md) |
| Filesystem | write in place | Condition | write temp in same dir, `fsync`, `rename` | [filesystem](../surfaces/filesystem.md) |
| Filesystem | exists then unlink or mkdir | Idempotence | call it and handle `ENOENT` / `EEXIST` | [filesystem](../surfaces/filesystem.md) |
| Database | SELECT then INSERT (find-or-create) | Condition | unique index plus `INSERT ... ON CONFLICT` | [database](../surfaces/database.md) |
| Database | read balance then write balance | Condition | `UPDATE ... SET x = x - $1 WHERE x >= $1`, check rowcount, `CHECK` constraint | [database](../surfaces/database.md) |
| Database | read status then set status | Condition | `UPDATE ... WHERE status = 'expected'`, check rowcount | [database](../surfaces/database.md) |
| Database | read several columns then write | Condition, Retry | version column, `WHERE version = $n`, retry on zero rows | [database](../surfaces/database.md) |
| Database | decide in app code from row data | Lock | `SELECT ... FOR UPDATE` inside the transaction, every writer locks | [database](../surfaces/database.md) |
| Database | count then insert (per-key limit) | Lock | `pg_advisory_xact_lock(hashtext(key))` inside the transaction | [database](../surfaces/database.md) |
| Database | complex multi-row invariant | Retry | `SERIALIZABLE` plus retry on `40001` | [database](../surfaces/database.md) |
| Authorization | check, await, write | Condition | fold the condition into the write (`WHERE owner_id = $u`, membership join) | [authorization](../surfaces/authorization.md) |
| Authorization | check on preview, write on confirm | Owner | re-check on the confirm request | [authorization](../surfaces/authorization.md) |
| Authorization | check, enqueue, worker writes | Owner | re-check in the worker, or a signed short-lived capability | [authorization](../surfaces/authorization.md) |
| Authorization | cached ACL | Owner | per-write check, or TTL the domain accepts and the finding states | [authorization](../surfaces/authorization.md) |
| Cache | miss then compute (one process) | Condition | single-flight on an in-flight map | [cache](../surfaces/cache.md) |
| Cache | miss then compute (fleet) | Lock | `SET lock:key token NX PX ttl`, holder computes, compare-and-delete release | [cache](../surfaces/cache.md) |
| Cache | not exists then set | Condition | `SET key v NX`, `add`, insert-if-absent | [cache](../surfaces/cache.md) |
| Cache | cached negative outlives the create | Owner | invalidate on create, short negative TTL, or write-through | [cache](../surfaces/cache.md) |
| Cache | decide from a cached count or permission | Owner | the write carries its own condition against the owning store | [cache](../surfaces/cache.md) |
| NATS KV | get then put | Condition, Retry | `update` with the read revision; `create` for first write | [distributed](../surfaces/distributed.md) |
| JetStream | read last seq then publish | Condition, Retry | `Nats-Expected-Last-Subject-Sequence` (or `-Last-Sequence`) header | [distributed](../surfaces/distributed.md) |
| JetStream | retried publish | Idempotence | `Nats-Msg-Id` within the duplicate window | [distributed](../surfaces/distributed.md) |
| Event store | load then append | Condition, Retry | append with `expected_version` equal to the loaded version | [distributed](../surfaces/distributed.md) |
| Consumer | contains(id) then apply then record | Idempotence | insert the id (unique) and the effect in one transaction | [distributed](../surfaces/distributed.md) |
| Consumer | effect in a non-transactional store | Idempotence | idempotent effect keyed by a deterministic id | [distributed](../surfaces/distributed.md) |
| Outbox | read unsent, publish, mark sent | Condition | claim rows with an expiring `UPDATE ... WHERE claimed_until < now() RETURNING`, publish with `Nats-Msg-Id` = row id, reclaim after expiry | [distributed](../surfaces/distributed.md) |
| In-process | check, yield, set | Condition | publish the in-flight claim before the first yield | [in-process](../surfaces/in-process.md) |
| In-process | lock, release, yield, lock, insert | Lock | hold an async-aware lock across the decision, or a per-key entry API | [in-process](../surfaces/in-process.md) |
| In-process | two calls into one server | Owner | one call whose handler checks and writes | [in-process](../surfaces/in-process.md) |
| In-process | lookup then insert in a shared table | Condition | insert-if-absent, atomic counter, compare-and-swap | [in-process](../surfaces/in-process.md) |
| In-process | lookup owner then register | Condition | the register call is the claim | [in-process](../surfaces/in-process.md) |

## Choosing Between Optimistic And Pessimistic

Optimistic (version, revision, expected sequence) costs nothing when conflicts are rare and pushes the conflict to the caller as a retry. Pessimistic (row lock, advisory lock, single owning process) costs waiting on every call and never surfaces a conflict. Pick optimistic when writes to the same key are rare or the caller can re-decide cheaply. Pick pessimistic when the decision is expensive, conflicts are common, or a retry would repeat a side effect that is not idempotent. The cases where a lock is the answer and the cases where it only moves the race are in [lock-moves-the-race.md](../principles/lock-moves-the-race.md).
