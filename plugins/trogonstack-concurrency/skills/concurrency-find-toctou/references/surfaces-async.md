# Async And In-Process Surfaces

Inside one process the interleaver is another task on the same event loop, another thread, or another process in the same VM. The gap that lets it in is any point where control yields: an `await`, a message round trip, a lock released and re-taken, a second call into the same server. A check and an act with a yield between them are two separate moments.

## Check, Yield, Set

Avoid:

```
if not connections.has(host):
    conn = await connect(host)
    connections.set(host, conn)
```

Every caller that arrives during `connect` sees the map empty and opens its own connection; the last one wins and the rest leak. Prefer publishing the claim before the first yield, so later callers find it:

```
pending = connections.get(host)
if pending is missing:
    pending = start(connect(host))          # the in-flight work, not its result
    connections.set(host, pending)          # no yield between get and set
    on failure: connections.delete(host)
conn = await pending
```

The rule for a single-threaded event loop: everything between the check and the write must be synchronous. If it is, the pair is atomic. If there is a yield, it is not. A boolean guard set synchronously (`if busy: return; busy = true`) is safe for the same reason.

## Lock, Release, Yield, Lock Again

Avoid:

```
with lock: present = map.contains(key)
if not present:
    value = await build(key)
    with lock: map.insert(key, value)
```

The lock is released after the check, so two tasks both miss and both insert. Prefer one of:

- Hold the lock across the whole decision, using a lock type that may be held across a yield. This serializes all callers through the lock, which is a throughput choice the finding should note.
- Use an entry API that is atomic per key: insert-if-absent, get-or-insert-with, or a cache with built-in single-flight for async construction.
- For a scalar, compare-and-swap in a loop.

A lock type that must not be held across a yield (a plain OS mutex in an async runtime) has to be dropped before the yield, which puts the race back. Switch the lock type or the data structure instead.

## Two Calls Into One Server

Avoid:

```
case server.call(get, key):
    missing -> server.call(put, key, value)
    existing -> existing
```

Each call is serialized by the server, but the pair is not. Another caller can `put` between them. Prefer one message that carries the decision, so the server does the check and the act inside a single handler:

```
server.call(put_new, key, value)
# handler: if key present reply exists, else insert and reply ok
```

The same shape applies to a shared in-memory table that has no server: use its insert-if-absent, atomic counter, or compare-and-swap primitive instead of lookup then insert.

## Claim Then Act

"Check that no process owns this key, then register as owner" is lookup-then-insert on a registry. Prefer the registry's own register call as the claim: it succeeds for exactly one caller and tells the others who won.

## What The Finding Must Cite

The exact yield point between the check and the act (the `await`, the second call, the lock release), and which other task or process can run at that point. If no yield exists, the pair is atomic and the finding says so.

## Idiomatic Forms

Read [lang-typescript.md](lang-typescript.md), [lang-rust.md](lang-rust.md), [lang-elixir.md](lang-elixir.md), [lang-go.md](lang-go.md), [lang-python.md](lang-python.md), or [lang-c.md](lang-c.md) for the promise map, the async-aware lock, the entry API, the single `call`, and the compare-and-swap in the language under review.
