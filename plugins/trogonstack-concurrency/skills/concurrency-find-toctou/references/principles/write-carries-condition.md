# The Write Must Carry Its Condition

When the condition is part of the write, the store evaluates it at the instant it applies the write, and the result of the write tells the caller whether it won.

## Why It Holds

A write with a condition inside it is one operation from the store's point of view. There is no instant at which the condition has been checked but the write has not happened, so there is nothing for another actor to slip into. The earlier read, if it survives at all, becomes a fast path that saves work on the common case and decides nothing.

The condition can be spelled many ways and they are the same move:

| Spelling | Where |
| --- | --- |
| `O_CREAT \| O_EXCL` | filesystem create |
| unique index plus `INSERT ... ON CONFLICT` | find-or-create |
| `UPDATE ... WHERE status = 'pending'`, check rowcount | state transition |
| `UPDATE ... SET x = x - $1 WHERE x >= $1` | counter, balance, quota |
| `UPDATE ... WHERE version = $n` | optimistic version |
| `UPDATE ... WHERE owner_id = $u` | authorization folded into the effect |
| `SET key v NX` | cache or lock claim |
| `kv.update(key, value, revision)` | NATS KV |
| `Nats-Expected-Last-Subject-Sequence` header | JetStream append |
| `append(stream, events, expected_version)` | event store |
| `insert_new`, `LoadOrStore`, `compare_exchange` | in-process table or scalar |
| `Registry.register` returning the winner | process ownership |

## What Violating It Looks Like

The write is unconditional and the condition lives in an earlier `if`. The tell is a plain `INSERT`, a plain `UPDATE ... WHERE id = $1`, a plain `put`, a plain `set`, or a plain `insert` that follows a read of the same key.

A weaker form: the write carries a condition but the code never reads the result. A rowcount of zero, a `false` from `insert_new`, a `null` from `SET NX`, and a revision-mismatch error are the store saying "you lost"; ignoring them turns a correct primitive back into a silent race.

## What The Reviewer Must Cite

The write statement or call, whether the condition is inside it, and where the code branches on the result. When the condition is inside the write and the result is handled, the pair is safe and the statement is the evidence. The earlier check can then be reported as redundant rather than as a race.

## The Wrong Fix It Rules Out

A transaction around the check and the write. Under `READ COMMITTED` and under InnoDB's default `REPEATABLE READ`, two transactions can both read nothing and both insert; the transaction gives atomicity of the pair's effects, not exclusion of other readers. Only a constraint, a conditional write, a lock taken before the read, or `SERIALIZABLE` with a retry loop makes one of them lose. The surface files show the spelling for each store.
