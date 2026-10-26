# go-redis

Spells the Redis primitives from [cache.md](../surfaces/cache.md). The server evaluates `NX` and the Lua script atomically.

Read [references/systems/redis.md](../systems/redis.md) for what the store guarantees; this file covers how go-redis spells it.

## Lease For Cross-Process Single-Flight

`SetNX` returns `true` only for the winner.

```go
token := uuid.NewString()
won, err := rdb.SetNX(ctx, "lock:"+key, token, 5*time.Second).Result()
if err != nil { return err }
if won {
    defer release(ctx, rdb, "lock:"+key, token)
    value, err := computeExpensive(ctx, key)
    if err != nil { return err }
    return rdb.Set(ctx, key, encode(value), ttl).Err()
}
// wait briefly and re-read, or serve stale
```

## Compare-And-Delete Release

```go
var releaseScript = redis.NewScript(`
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
end
return 0`)

func release(ctx context.Context, rdb *redis.Client, lockKey, token string) error {
    return releaseScript.Run(ctx, rdb, []string{lockKey}, token).Err()
}
```

`rdb.Get` then `rdb.Del` from the client is the race the script exists to remove.

## Check Then Set

`rdb.SetNX(ctx, key, value, 0)` replaces `Exists` then `Set`; `rdb.SetArgs` with `Mode: "NX"` is the same call with more options.
