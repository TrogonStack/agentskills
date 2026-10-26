# Cache Surfaces

A cache miss is a check. Filling the cache is the act. Between them, every other caller that misses on the same key does the same work, and the last writer wins regardless of which value was freshest.

## Principles At Work

- [Only the owner of the state can decide](../principles/owner-decides.md): a cached count or permission is a copy; the write must still carry its condition against the store that owns the data.
- [The write must carry its condition](../principles/write-carries-condition.md): `SET NX`, `add`, insert-if-absent, the in-flight claim published before the first yield.
- [A lock only helps when the read happens under it](../principles/lock-moves-the-race.md): the `SET NX PX` lease bounds the stampede and is itself a check-then-act.
- [Serialization is proven by naming the serializer](../principles/serializer-is-named.md): single-flight is safe only because the map read and write have no yield between them, and the finding says so.

## Get Or Compute Stampede

Avoid:

```
value = cache.get(key)
if value is missing:
    value = compute_expensive(key)
    cache.set(key, value, ttl)
return value
```

When the key expires under load, every concurrent request recomputes. Prefer single-flight inside the process, so one computation serves all concurrent callers for that key:

```
inflight: map key -> pending result

value = cache.get(key)
if value present: return value

pending = inflight.get(key)
if pending is missing:
    pending = start(compute_expensive(key) then cache.set(key, result, ttl))
    inflight.set(key, pending)       # no yield between get and set
return await pending                 # remove from inflight when settled
```

The `inflight.get` and `inflight.set` must run with no yield between them; that is what makes the dedupe atomic.

## Cross-Process Stampede

Single-flight covers one process. Across a fleet, take a short lease on the key and let only the holder recompute:

```
SET lock:{key} {token} NX PX 5000
```

A reply of `OK` means this caller computes and then writes the value. Anyone else either waits briefly and re-reads, or serves the stale value if one exists (stale-while-revalidate). Release the lease only if the token still matches, in a Lua script, so a slow holder does not delete a successor's lease:

```lua
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
end
return 0
```

The lease bounds the stampede; it does not guarantee a single computation. A holder that exceeds the lease lets a second holder in. The finding must say whether double computation is merely wasteful or actually wrong.

## Check Then Set

Avoid `if not exists(key) then set(key, v)`. Prefer the conditional write the store already offers: `SET key v NX` in Redis, `add` in Memcached, an insert-if-absent in an in-memory table. The reply tells you whether you won.

## Negative Caching

Caching "not found" for a key that is then created elsewhere leaves the negative entry serving a lie for its full TTL. Either invalidate on the create path (the creator knows the key), keep negative TTLs short enough that the domain accepts the window, or write-through on create. The finding states which one is in place or which is missing.

## Cache As Source Of Truth

Any decision that reads a cached count, balance, or permission and then writes to the real store has moved the check onto a copy. The cache can inform the fast path, but the write must still carry its own condition against the store that owns the data.

## What The Finding Must Cite

The key, the TTL, whether the fill path dedupes in-process and across processes, and whether a double fill produces a wrong value or just wasted work.

## Library Files

For what the store itself guarantees, read [redis](../systems/redis.md) first; the lease and release spellings for ioredis, Redix, go-redis, and redis-py live at the end of that file.

- TypeScript: [event-loop](../typescript/event-loop.md) for single-flight
- Rust: [moka-dashmap](../rust/moka-dashmap.md)
- Elixir: [ets](../elixir/ets.md)
- Go: [singleflight](../go/singleflight.md), [sync](../go/sync.md)
- Python: [asyncio](../python/asyncio.md)
