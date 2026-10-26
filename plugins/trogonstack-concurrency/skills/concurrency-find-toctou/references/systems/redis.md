# Redis

Redis executes commands one at a time on a single thread, so every single command is atomic, and every sequence of commands from one client is not. A check-then-act on Redis is any place where the client issues a read, decides, and issues a write as a second round trip. The fix is always to move the decision into one command, one script, or one `WATCH`-guarded transaction.

## Principles At Work

- [Only the owner of the state can decide](../principles/owner-decides.md): the server evaluates `NX`, `INCR`, and the script; the client only observes.
- [The write must carry its condition](../principles/write-carries-condition.md): `SET NX`, `HSETNX`, `WATCH` plus `EXEC`, a script that compares before it deletes.
- [Retry belongs around the conditional write](../principles/retry-wraps-the-write.md): a `nil` from `SET NX` or from `EXEC` is the signal, and the loop is bounded.
- [Idempotence absorbs what ordering cannot prevent](../principles/idempotence-absorbs.md): a lease can expire while its holder still runs; only a fencing token the resource checks turns the lease into a lock.
- [Serialization is proven by naming the serializer](../principles/serializer-is-named.md): one command, one script, or one `MULTI` block, named by the reviewer.

## Single Commands That Carry Their Condition

```
SET lock:order:42 <token> NX PX 30000        -- nil when already held
SET cache:user:7 <blob> NX EX 300            -- fill only if absent
INCR rate:ip:10.0.0.1                        -- returns the new value; the check is the compare on the return
HSETNX sessions <sid> <data>                 -- field-level create
GETDEL job:claim:9                           -- read and remove in one step
```

`SET` with `NX` and an expiry in one command replaced the `SETNX` then `EXPIRE` pair. The pair is a TOCTOU in the other direction: a crash between the two leaves a key with no expiry, and the lease never releases. `SET ... GET` returns the previous value in the same step. That is an atomic swap, not a compare-and-swap: nothing is compared, and the write lands whatever the old value was. Compare-and-swap on a string is `SET key value IFEQ expected` (8.4 and later; `IFNE`, `IFDEQ`, and `IFDNE` arrived with it, confirm against the version in use), or on older servers a `WATCH` sequence or a script. Combining `GET` with `NX` is allowed from 7.0.

`INCR` is the right counter and the right rate limiter. `GET` then `SET value+1` loses increments under any load.

## WATCH, MULTI, EXEC

`MULTI` queues commands and `EXEC` runs them back to back with nothing interleaved. On its own that is atomicity, not a condition: the queued commands cannot look at a value and branch on it. `WATCH` adds the condition:

```
WATCH account:42
GET account:42                 -- decide on the client
MULTI
SET account:42 <new>
EXEC                           -- nil if account:42 changed since WATCH
```

`WATCH` is optimistic. It blocks nobody; it makes `EXEC` return `nil` when a watched key was written by anyone after the `WATCH`. The caller retries from `WATCH`. A `WATCH` on one connection does not guard an `EXEC` on another, so pooled clients have to pin the connection for the whole sequence, and a pool that hands back the connection between `WATCH` and `EXEC` has silently removed the guard. `MULTI` does not roll back: a command that fails inside `EXEC` fails alone and the others still apply.

## Scripts

A Lua script via `EVAL` (or a loaded function via `FCALL` from 7.0) runs with no other command interleaved. It is the general read-modify-write:

```lua
-- release only if this caller still holds the lease
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
end
return 0
```

The unguarded `DEL` is the classic finding: the lease expired, another holder acquired it, and the first holder deletes the second holder's lease. The compare and the delete have to be in the script. The same shape extends a lease (`GET` compare then `PEXPIRE`) and implements a token bucket (`GET`, arithmetic, `SET`). Scripts block the server for their whole run, so a script that loops over many keys is a latency problem, not a safety one.

## Leases Are Not Locks

A `SET NX PX` lease expires on a timer. The holder can be paused by garbage collection, a network partition, or a slow disk past the expiry and keep acting while another holder owns the lease. Redis cannot know. The protected resource has to reject stale holders: hand out a monotonic fencing token (`INCR lease:token` taken with the lease), pass it with every write to the resource, and have the resource refuse tokens lower than the last one it accepted. When the resource cannot check a token, the finding says the lease reduces duplicates rather than prevents them.

Redlock across several independent instances addresses losing the lease on failover, not the paused-holder case; the fencing token is still required.

## Replication And Failover

Replication is asynchronous. A `SET NX` acknowledged by the primary can be lost when the primary fails before the replica receives it, and the replica that is promoted hands the same lease to someone else. `WAIT <numreplicas> <timeout>` blocks until the replicas acknowledge and narrows the window; it does not close it, because the primary can still fail after the acknowledgement is sent. A finding that calls a Redis lease the serializer says whether failover is in scope.

## Cluster

Multi-key commands, `MULTI` blocks, and scripts require every key in the same hash slot, otherwise the server answers `CROSSSLOT`. Keys that must change together carry a hash tag so they map to one slot:

```
SET {order:42}:lock <token> NX PX 30000
HSET {order:42}:state status paid
```

A script that reads `{order:42}:lock` and writes `{order:42}:state` is atomic. Spread across slots, the same logic is two round trips with a window between them.

## Reads That Are Not Snapshots

`KEYS` blocks the server, and the list it returns is stale the moment it is returned; acting on each key afterwards is check-then-act per key. `SCAN` never blocks, but it is a cursor over a changing keyspace: it can return a key twice and can miss a key added during the scan. Neither is a basis for a decision about the set as a whole. Pipelining sends commands without waiting for replies and saves round trips; it does not stop other clients' commands from landing between them. Keyspace notifications are fire-and-forget pub/sub, and a subscriber that missed one has no way to know.

## What The Finding Must Cite

The commands issued between the read and the write, whether they are one command, one script, or one `WATCH` sequence on one connection, the expiry on any lease, whether the resource checks a fencing token, and whether failover is accepted as a residual.

## Client Spellings

Every client passes the command through unchanged, and the server evaluates `NX`, the `WATCH` check, and the script atomically, so the finding cites the command and the connection it ran on, not the client. The compare-and-delete release script above is the same text in every client.

- ioredis: `redis.set(key, token, "PX", 5000, "NX")` returns `"OK"` for the winner and `null` for everyone else. Scripts go through `redis.defineCommand(name, { numberOfKeys, lua })`. For a `WATCH`, `MULTI`, `EXEC` sequence use a connection the sequence owns, for example one from `redis.duplicate()`; the ioredis docs do not document `WATCH`, so cite the connection the code actually uses.
- Redix: `Redix.command(conn, ["SET", key, token, "NX", "PX", "5000"])` returns `{:ok, "OK"}` for the winner and `{:ok, nil}` otherwise; pass every argument as a string. Scripts are `["EVAL", script, "1", key, token]`. The Redix docs say to use an isolated connection for a manual `MULTI` and `EXEC`, and `Redix.transaction_pipeline/3` cannot hold a `WATCH` across a read, so a compare-and-set needs a manual sequence on one dedicated connection.
- go-redis: `rdb.SetNX(ctx, key, token, 5*time.Second).Result()` returns `true` only for the winner. `rdb.SetArgs(ctx, key, value, redis.SetArgs{Mode: "NX", TTL: ttl})` returns a `*StatusCmd`; what a lost race returns from it is not confirmed in the docs, so prefer `SetNX` when the reply is the decision. Scripts are `redis.NewScript(src).Run(ctx, rdb, []string{key}, token)`. Compare-and-set is `rdb.Watch(ctx, fn, keys...)` with `tx.TxPipelined` inside `fn`, retried on `errors.Is(err, redis.TxFailedErr)`.
- redis-py: `r.set(key, token, nx=True, px=5000)` returns `True` for the winner and `None` otherwise, not `False`. Scripts are `r.register_script(src)`, called as `script(keys=[...], args=[...])`. Compare-and-set is `pipe = r.pipeline()`, `pipe.watch(key)`, the read with `pipe.get(key)` immediately after, `pipe.multi()`, the writes, then `pipe.execute()`, retried on `redis.WatchError`; `r.transaction(func, *keys)` wraps that loop.
