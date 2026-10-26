# A Lock Only Helps When The Read Happens Under It

A lock serializes the actors that take it, for the span they hold it. Everything outside that span, and every actor that does not take it, is unaffected.

## Why It Holds

A lock does not protect data. It protects a critical section, and only against other holders of the same lock. The guarantee it gives is exactly "no other holder runs between my acquire and my release". So the read has to be inside that span, the write has to be inside that span, and every writer to the same state has to be a holder. Remove any one of those and the lock is paying its cost for nothing.

## When A Lock Is The Answer

The decision genuinely needs application code between the read and the write, cannot be folded into one conditional statement, and every writer to that state can be made to take the same lock. A row lock (`SELECT ... FOR UPDATE`), an advisory lock on a key, and a single process that owns the state all satisfy that. The finding must list the other writers and confirm each one takes the lock.

The choice between a lock and a conditional write is the choice between pessimistic and optimistic. Pessimistic costs waiting on every call and never surfaces a conflict. Optimistic costs nothing when conflicts are rare and pushes the conflict to the caller as a retry ([retry-wraps-the-write.md](retry-wraps-the-write.md)). Pick pessimistic when the decision is expensive, conflicts are common, or a retry would repeat a side effect that is not idempotent.

## When A Lock Moves The Race

- **In-process lock, shared store.** A mutex guards nothing against a second process, worker, or node. If the state lives in a shared store, the mutex is decoration.
- **Read outside, lock inside.** "Read, then lock, then write" protects the write from other writers but not the decision from staleness. The read has to happen under the lock.
- **Lock, release, re-lock.** Checking under one acquire and writing under a second one is two critical sections with a gap. On an async runtime this is the common shape when a guard cannot be held across an `await`.
- **A writer that skips the lock.** A migration script, an admin endpoint, a second service, or a background job that writes the same row without `FOR UPDATE` defeats every caller that did take it.
- **A lease.** A distributed lock with an expiry (`SET NX PX`, a leader election) is itself a check-then-act: the holder checks it has the lease, then acts, and the lease can expire in between. It bounds how often the race happens; it does not remove it. Fence the act with a token the owning store verifies (a version, a revision, a lease number stored with the write) or accept the window and state it.
- **`FOR UPDATE` on a missing row.** Locking a row that does not exist locks nothing, so a row lock never solves find-or-create. The unique constraint is the primitive.

## What The Reviewer Must Cite

The lock, the span it is held for, that the read is inside the span, and the list of writers with confirmation that each takes it. For a lease, the expiry and what fences the act after expiry.

## The Wrong Fix It Rules Out

Adding a mutex, a semaphore, or a distributed lock as the first response to a race on shared state. Before any lock, ask whether the owner of the state can carry the condition in the write ([write-carries-condition.md](write-carries-condition.md)); most races end there with no lock at all.
