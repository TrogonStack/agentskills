# ioredis

Spells the Redis primitives from [cache.md](../surfaces/cache.md). The server evaluates `NX` and the Lua script atomically; the client only passes them through.

Read [references/systems/redis.md](../systems/redis.md) for what the store guarantees; this file covers how ioredis spells it.

## Lease For Cross-Process Single-Flight

The reply is `"OK"` for the winner and `null` for everyone else.

```ts
const token = randomUUID();
const won = await redis.set(`lock:${key}`, token, "PX", 5000, "NX");
if (won === "OK") {
  try {
    const value = await computeExpensive(key);
    await redis.set(key, JSON.stringify(value), "PX", ttlMs);
  } finally {
    await release(`lock:${key}`, token);
  }
} else {
  // wait briefly and re-read, or serve stale
}
```

## Compare-And-Delete Release

Release only when the token still matches, in one script, so a slow holder does not delete a successor's lease.

```ts
const RELEASE = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
end
return 0`;

redis.defineCommand("release", { numberOfKeys: 1, lua: RELEASE });
await (redis as any).release(`lock:${key}`, token);
```

`redis.get` then `redis.del` from the client is the race the script exists to remove.

## Check Then Set

`redis.set(key, value, "NX")` replaces `exists` then `set`. The lease above is an instance of the same call with an expiry.
