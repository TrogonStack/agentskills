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

The fix is never "check faster" or "check again". The fix is to make the store that owns the state reject or absorb the second actor: a unique constraint, a conditional update, a compare-and-swap, an expected version, a create-exclusive open, or a single synchronous section that holds both the check and the act.

## Procedure

Work the code in this order. Skipping a step produces either a missed race or a false alarm.

### 1. Locate Every Check-Then-Act Pair

Scan for a read whose result decides a write. Typical shapes: `exists` then `create`, `find` then `insert`, `get` then `set`, `load` then `save`, `can?` then `do`, `balance >= amount` then `debit`, `status == pending` then `transition`, `get revision` then `put`, `has(key)` then `compute`. Include pairs split across functions, across an `await`, across a queue hop, and across two HTTP requests (preview then confirm).

### 2. Describe the Pair

For each pair, write down the check, the act, the window between them, who can interleave, and the consequence if they do. Interleavers to consider every time: a concurrent request for the same key, another worker on the same queue, another node holding the same cached view, a client retry after a timeout, a redelivered message, and a double-submitted form.

### 3. Decide Whether the Interleaving Is Real

A pair is safe only when something already serializes it: one writer by construction, a lock already held by the enclosing transaction, or a primitive at the point of effect that would reject the second actor. "Unlikely" and "the window is tiny" are not evidence. A pair judged safe must say what serializes it, by name.

Read [references/false-positives.md](references/false-positives.md) before marking any pair safe.

### 4. Pick the Atomic Fix

Match the surface to its primitive. Do not reach for a mutex first: an in-process lock does nothing across nodes and workers, and a distributed lock usually moves the race into the lock's own lease.

Read [references/fix-catalog.md](references/fix-catalog.md) to choose, then the surface reference for the idiomatic form.

### 5. Write the Finding

Report every confirmed pair in the format below, one finding per pair. Pairs judged safe are listed separately with the serializer that makes them safe.

## Finding Format

```
### <short title>

- Location: <file:line> (check) and <file:line> (act)
- Check: <what is read and the condition on it>
- Act: <what is written>
- Window: <what runs between them: an await, a network call, a queue hop, a second request>
- Interleaver: <who else can run between the check and the act, and how>
- Consequence: <the concrete wrong outcome: duplicate row, negative balance, write by a revoked user>
- Fix: <the atomic primitive, and the code shape that uses it>
- Residual: <what the fix still does not cover, or "none">
```

Read [references/finding-template.md](references/finding-template.md) for a fully worked example.

## References

Read [references/surfaces-filesystem.md](references/surfaces-filesystem.md) when the check is `exists`, `stat`, `access`, or a path lookup, and the act opens, creates, renames, or deletes.

Read [references/surfaces-database.md](references/surfaces-database.md) when the check is a `SELECT` and the act is an `INSERT`, `UPDATE`, or `DELETE`, including find-or-create, counters, balances, and status transitions.

Read [references/surfaces-authorization.md](references/surfaces-authorization.md) when the check is a permission, role, ownership, or quota decision and the effect happens later, in another request, or in a job.

Read [references/surfaces-cache.md](references/surfaces-cache.md) when the check is a cache miss and the act fills the cache or recomputes a value.

Read [references/surfaces-distributed.md](references/surfaces-distributed.md) when the state lives in NATS KV, a JetStream stream, an event store, or behind an at-least-once consumer.

Read [references/surfaces-async.md](references/surfaces-async.md) when the check and the act are in the same process but separated by an `await`, a message to another process, or a second call into the same server.
