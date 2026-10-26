# A Read Is A Fact About The Past

The value a read returns describes the state at some instant before the read completed, and the condition evaluated on it is true of that instant only.

## Why It Holds

Nothing in a language, a driver, or a runtime makes the line after a read execute in the same moment as the read. Between them sit scheduler preemption, an `await`, a network round trip, a transaction boundary, a queue, or simply another core running another request. The world keeps moving while the caller holds a snapshot and reasons about it as if it were live.

The width of the gap changes how often the race fires, not whether it exists. A gap of microseconds still loses under load, under a retry storm, under a replay, or under a double-click, and those are exactly the conditions production produces and tests do not.

## What Violating It Looks Like

- `exists(path)` then `open(path)`: the path can be swapped for a symlink in between.
- `SELECT` then `INSERT`: two transactions both see nothing and both insert.
- `can(user, action)` then `await render()` then write: the grant is revoked during the render.
- `cache.get` misses, then every concurrent caller recomputes.
- `kv.get` then `kv.put`: the put overwrites a write that landed in between.
- `if not busy: busy = true` with an `await` between the read and the assignment.
- Two `GenServer.call`s, one to read and one to write: each call is serialized, the pair is not.

The shape is always the same: a read, a decision on its result, a write that assumes the result still holds.

## What The Reviewer Must Cite

The read, the write it gates, and what runs between them. A pair where nothing runs between them on a single-threaded loop is the one case where the read is still the present; the finding must say so explicitly and name the function that contains no yield.

## The Wrong Fix It Rules Out

Checking again right before the write. Two checks have two windows. Narrowing the window by moving the check closer to the write changes the odds and nothing else. The fix is in [owner-decides.md](owner-decides.md) and [write-carries-condition.md](write-carries-condition.md): stop deciding on the snapshot and let the store decide at the instant of the write.
