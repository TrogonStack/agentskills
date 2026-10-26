# Retry Belongs Around The Conditional Write

A retry is correct only when what it repeats is a conditional write that reports a conflict, and the loop reloads before it decides again.

## Why It Holds

A conditional write that loses tells the caller the world moved. The right response is to look at the world as it is now, decide again, and try again; that is a retry loop whose body contains the read, the decision, and the conditional write. The loop converges because each iteration either wins against current state or learns that it has to re-decide.

A retry around a check-then-act does none of that. It re-runs the same stale shape, and on each iteration the window is open again. It can even make things worse: a retry storm is exactly the load pattern under which small windows lose.

## Where The Loop Is Mandatory

- **Optimistic version.** `UPDATE ... WHERE version = $n` returning zero rows means reload and re-decide. Without the loop the caller surfaces "conflict" to a user who did nothing wrong.
- **Expected revision or sequence.** `kv.update` with a stale revision, a JetStream publish with a stale expected sequence, an event-store append with a stale expected version. Same loop, bounded.
- **`SERIALIZABLE` isolation.** The database aborts one transaction with SQLSTATE `40001`. It is correct only when every caller retries on that code; without the loop it has turned a silent race into a user-facing error.
- **Exclusive create as find-or-create.** `create` fails because the key exists, so the fallback is `update` with the revision just learned, which can itself lose and loop.

## Where The Loop Is Wrong

- Around `SELECT` then `INSERT` without a constraint. Each iteration can still double-insert.
- Around a lease acquisition that then reads and writes unconditionally. The lease is the check; the write is still unconditional.
- Unbounded. A loop that cannot give up hides a permanently contended key or a bug in the condition. Bound the attempts and report the exhaustion.

## What The Reviewer Must Cite

What the loop body repeats, whether the body reloads before deciding, what conflict signal it branches on (rowcount, error code, `false`), and the bound.

## The Wrong Fix It Rules Out

"Retry on failure" as a wrapper around the existing check-then-act. The retry has to wrap the conditional write from [write-carries-condition.md](write-carries-condition.md), and when the act is not idempotent the loop must not repeat the side effect ([idempotence-absorbs.md](idempotence-absorbs.md)).
