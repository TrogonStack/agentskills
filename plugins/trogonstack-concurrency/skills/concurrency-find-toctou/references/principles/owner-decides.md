# Only The Owner Of The State Can Decide

The store that holds the state is the only actor that sees every writer, so it is the only actor that can evaluate a condition and apply a write as one event.

## Why It Holds

A caller sees its own reads and its own writes. It does not see the other request on the other node, the worker draining the same queue, or the admin revoking the grant. The database, the filesystem, the KV bucket, and the registry each sit at the point where all of those writers converge, and each one offers a primitive that decides and acts in a single step: a unique constraint, an exclusive create, a conditional update, a revision-guarded put, a register call that returns the winner.

Any decision made outside the owner is made on a copy. An application variable, a cache entry, a projection, a session's permission set, and a GenServer's in-memory map are all copies unless that process is by construction the only writer, in which case it is the owner.

## What Violating It Looks Like

- An in-process mutex around a database read-then-write. The mutex serializes this process; the other replica never took it.
- A cached count or balance consulted before a write to the real store. The cache is a copy and the write to the store carries no condition.
- A permission set loaded at login and trusted for the session. The owner of the grant is the authorization source, not the session.
- A distributed lock taken in the caller so that the caller can read, decide, and write. The lock is a second store with its own check-then-act (see [lock-moves-the-race.md](lock-moves-the-race.md)).
- A `find_or_create` helper in application code that is "careful". Carefulness in the caller cannot see the other caller.

## What The Reviewer Must Cite

Which store owns the state the decision is about, and whether the write to that store carries the condition or relies on the caller's earlier read. When the owner is a process (one GenServer per entity, one consumer per partition), cite what makes it the sole writer.

## The Wrong Fix It Rules Out

Adding coordination in the caller: a mutex, a semaphore, a "lock table" in application memory, a leader that is assumed to be unique. These help only when every writer is in the same process and takes the same lock, which is the narrow case covered in [serializer-is-named.md](serializer-is-named.md). For shared state the fix moves into the store, spelled as in [write-carries-condition.md](write-carries-condition.md).
