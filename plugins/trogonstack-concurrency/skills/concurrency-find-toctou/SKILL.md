---
name: concurrency-find-toctou
description: "Find, prove, and fix time-of-check to time-of-use (TOCTOU) races: code that checks a condition, then acts as if nothing changed in between. Covers check-then-act in files (exists then open), databases (SELECT then INSERT, find-or-create, read-modify-write), authorization (permission check, later effect), caches (get-or-compute), distributed stores (NATS KV revision, JetStream expected sequence, event-store expected version), and async code (check, await, write). Each finding names the check, the act, the window, who can interleave, the consequence, and the fix. Use when reviewing code for race conditions, duplicate inserts, lost updates, double charges, stale permission checks, flaky tests under parallel load, intermittent 'already exists' errors, when asked 'is this atomic', 'can two requests collide', or 'what if this runs twice', and before adding a mutex, lock, or retry loop. Do not use for: deadlocks or lock ordering, performance tuning, memory-model data races, event model or NATS subject design."
allowed-tools:
  - AskUserQuestion
  - Read
  - Write
  - Shell
---

# Find TOCTOU Races

A check is true only at the instant it is made. Correctness has to come from an atomic primitive at the point of effect, never from the gap between the check and the act being short.

## Core Principle

Every `if exists / if allowed / if enough / if not yet` followed by a write is a bet that nothing else touched the same state in between. The bet is lost by another request, another process, another node, a retry, a redelivered message, or the same user clicking twice. A short window does not shrink the bug, it only lowers how often the test suite sees it.

The fix is never "check faster" or "check again". The fix is to make the store that owns the state reject or absorb the second actor. Everything below follows from that.

## Principles

Apply them in order. A pair that fails an earlier principle is a finding; the later principles decide the fix and what the finding has to cite. Each one names the references that show it in practice; read them when the situation matches, not up front.

### 1. A Read Is A Fact About The Past

The moment a read returns, the value it reported is history. A condition evaluated on that value is a statement about a moment that has already passed, and nothing in the language makes the next line run in the same moment. Any check-then-act pair is therefore stale by construction unless something else holds the world still.

Read [references/principles/read-is-the-past.md](references/principles/read-is-the-past.md) when deciding whether a pair is a candidate at all, or when someone argues the window is too small to matter.

### 2. Only The Owner Of The State Can Decide

The store that holds the state is the only actor that sees every writer. A decision made anywhere else is made on a copy: an application variable, a cache, a projection, a session. The atomic primitive has to come from the owner (a constraint, a conditional write, an exclusive create, a revision), and the caller's job is to ask the owner to decide.

Read [references/principles/owner-decides.md](references/principles/owner-decides.md) when picking which layer the fix belongs in, or when a proposed fix adds a lock in the caller.

### 3. The Write Must Carry Its Condition

When the condition travels inside the write, the store evaluates it at the instant it applies the write, and the earlier check becomes a fast path or disappears. `WHERE status = 'pending'`, `ON CONFLICT`, `O_EXCL`, an expected revision, and an expected version are all the same move: the condition and the effect in one indivisible operation whose result tells the caller whether it won.

Read [references/principles/write-carries-condition.md](references/principles/write-carries-condition.md) when shaping the fix, and the surface reference for how the store under review spells it.

### 4. Serialization Is Proven By Naming The Serializer

A pair is safe only when something already makes the actors take turns, and that something has a name: one writer by construction, a lock every writer takes, a synchronous section with no yield. "Unlikely", "rarely called", and "never seen it" are not names. A safe verdict without a named serializer is an unreviewed pair.

Read [references/principles/serializer-is-named.md](references/principles/serializer-is-named.md) before marking any pair safe.

### 5. A Lock Only Helps When The Read Happens Under It

A lock serializes the actors that take it, for the span they hold it. A read outside the lock, a writer that skips the lock, or a lease that can expire mid-act all leave the race in place and add the cost of the lock on top. Reach for a lock only when the decision genuinely needs application code between the read and the write, and only when every writer can be made to take it.

Read [references/principles/lock-moves-the-race.md](references/principles/lock-moves-the-race.md) when a lock or a lease is proposed or already present.

### 6. Retry Belongs Around The Conditional Write

A conditional write reports a conflict; a retry around it reloads, re-decides, and tries again against fresh state. A retry around a check-then-act repeats the race with the same stale read. Serializable isolation, optimistic versions, and expected revisions all require this loop or they turn a silent race into a user-facing error.

Read [references/principles/retry-wraps-the-write.md](references/principles/retry-wraps-the-write.md) when a retry loop exists or the fix introduces one.

### 7. Idempotence Absorbs What Ordering Cannot Prevent

Redelivery, client retries, and double submits run the same act twice no matter how well the single run is guarded. When the second run produces the same end state and no second side effect, the race is tolerable even though it exists. Idempotence is a property of the effect, keyed by something deterministic, and the finding has to say which side effects it covers.

Read [references/principles/idempotence-absorbs.md](references/principles/idempotence-absorbs.md) when the interleaver is a retry or a redelivery, or when the effect cannot be made conditional.

## Procedure

1. Locate every check-then-act pair: a read whose result decides a write, including pairs split across functions, an `await`, a queue hop, or two requests.
2. Describe the pair: the check, the act, the window, who can interleave, and the consequence.
3. Name the serializer, or name the principle the pair violates. A pair without a named serializer is a finding.
4. Pick the primitive from the owner of the state, with the write carrying its condition. Read [references/review/fix-catalog.md](references/review/fix-catalog.md) to choose, then the surface and library references for the spelling.
5. Write the finding in the format below, one per pair. Pairs judged safe are listed separately with their serializer.

## Finding Format

```
### <short title>

- Location: <file:line> (check) and <file:line> (act)
- Check: <what is read and the condition on it>
- Act: <what is written>
- Window: <what runs between them: an await, a network call, a queue hop, a second request>
- Interleaver: <who else can run between the check and the act, and how>
- Consequence: <the concrete wrong outcome: duplicate row, negative balance, write by a revoked user>
- Principle: <the principle the pair violates, by name>
- Fix: <the atomic primitive, and the code shape that uses it>
- Residual: <what the fix still does not cover, or "none">
```

Read [references/review/finding-template.md](references/review/finding-template.md) for a fully worked example.

## Surfaces

Each surface file names the principles it instantiates, shows the smells in SQL or pseudocode, and points at the library files that spell the primitive.

Read [references/surfaces/filesystem.md](references/surfaces/filesystem.md) when the check is `exists`, `stat`, `access`, or a path lookup, and the act opens, creates, renames, or deletes.

Read [references/surfaces/database.md](references/surfaces/database.md) when the check is a `SELECT` and the act is an `INSERT`, `UPDATE`, or `DELETE`, including find-or-create, counters, balances, and status transitions.

Read [references/surfaces/authorization.md](references/surfaces/authorization.md) when the check is a permission, role, ownership, or quota decision and the effect happens later, in another request, or in a job.

Read [references/surfaces/cache.md](references/surfaces/cache.md) when the check is a cache miss and the act fills the cache or recomputes a value.

Read [references/surfaces/distributed.md](references/surfaces/distributed.md) when the state lives in NATS KV, a JetStream stream, an event store, or behind an at-least-once consumer.

Read [references/surfaces/in-process.md](references/surfaces/in-process.md) when the check and the act are in the same process but separated by an `await`, a message to another process, or a second call into the same server.

## Libraries

After the surface reference, read the file for the library under review. Each covers one library, organized by the surfaces it touches.

- TypeScript: [node-fs](references/typescript/node-fs.md), [node-postgres](references/typescript/node-postgres.md), [prisma](references/typescript/prisma.md), [drizzle](references/typescript/drizzle.md), [ioredis](references/typescript/ioredis.md), [nats-js](references/typescript/nats-js.md), [event-loop](references/typescript/event-loop.md).
- Rust: [std-fs](references/rust/std-fs.md), [sqlx](references/rust/sqlx.md), [tokio](references/rust/tokio.md), [moka-dashmap](references/rust/moka-dashmap.md), [async-nats](references/rust/async-nats.md), [atomics](references/rust/atomics.md).
- Elixir: [file](references/elixir/file.md), [ecto](references/elixir/ecto.md), [ets](references/elixir/ets.md), [genserver](references/elixir/genserver.md), [registry](references/elixir/registry.md), [redix](references/elixir/redix.md).
- Go: [os](references/go/os.md), [database-sql](references/go/database-sql.md), [sync](references/go/sync.md), [singleflight](references/go/singleflight.md), [go-redis](references/go/go-redis.md), [nats-go](references/go/nats-go.md).
- Python: [os](references/python/os.md), [psycopg](references/python/psycopg.md), [sqlalchemy](references/python/sqlalchemy.md), [asyncio](references/python/asyncio.md), [redis-py](references/python/redis-py.md), [nats-py](references/python/nats-py.md).
- C: [posix-fs](references/c/posix-fs.md), [atomics](references/c/atomics.md).
