# Cache Surfaces

A cache miss is a check. Filling the cache is the act. Between them, every other caller that misses on the same key does the same work, and the last writer wins regardless of which value was freshest.

## Get Or Compute Stampede

Avoid:

```ts
let value = await cache.get(key);
if (value === undefined) {
  value = await computeExpensive(key);
  await cache.set(key, value, { ttl });
}
return value;
```

When the key expires under load, every concurrent request recomputes. Prefer single-flight inside the process, so one computation serves all concurrent callers for that key:

```ts
const inflight = new Map<string, Promise<Value>>();

async function getOrCompute(key: string): Promise<Value> {
  const cached = await cache.get(key);
  if (cached !== undefined) return cached;

  let p = inflight.get(key);
  if (!p) {
    p = computeExpensive(key)
      .then(async (v) => { await cache.set(key, v, { ttl }); return v; })
      .finally(() => inflight.delete(key));
    inflight.set(key, p);
  }
  return p;
}
```

The `inflight.get` and `inflight.set` run with no `await` between them, which is what makes the dedupe atomic on a single-threaded event loop. Go has `golang.org/x/sync/singleflight` for the same shape.

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

Avoid `if not exists(key) then set(key, v)`. Prefer the conditional write the store already offers: `SET key v NX` in Redis, `add` in Memcached, `insert_new` in ETS. The reply tells you whether you won.

## Negative Caching

Caching "not found" for a key that is then created elsewhere leaves the negative entry serving a lie for its full TTL. Either invalidate on the create path (the creator knows the key), keep negative TTLs short enough that the domain accepts the window, or write-through on create. The finding states which one is in place or which is missing.

## Cache As Source Of Truth

Any decision that reads a cached count, balance, or permission and then writes to the real store has moved the check onto a copy. The cache can inform the fast path, but the write must still carry its own condition against the store that owns the data.

## What The Finding Must Cite

The key, the TTL, whether the fill path dedupes in-process and across processes, and whether a double fill produces a wrong value or just wasted work.
