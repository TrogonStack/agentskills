# singleflight

Spells in-process single-flight from [cache.md](../surfaces/cache.md) with `golang.org/x/sync/singleflight`.

## One Computation Per Key

Concurrent callers for the same key share one `fn` call and receive the same result.

```go
var group singleflight.Group

v, err, shared := group.Do(key, func() (any, error) {
    value, err := computeExpensive(ctx, key)
    if err == nil {
        cache.Set(key, value, ttl)
    }
    return value, err
})
```

`cache.Get(key)` miss followed by `computeExpensive` and `cache.Set` is the stampede.

## What It Does Not Cover

- It dedupes within one process. Across a fleet the lease in [go-redis.md](go-redis.md) bounds the stampede.
- The `ctx` captured by the closure belongs to the first caller. If that caller cancels, every joined caller gets its error. Use `DoChan` and a detached context when callers can cancel independently.
- An error is shared too. A failed computation is handed to every joined caller; nothing is cached, so the next wave recomputes.
