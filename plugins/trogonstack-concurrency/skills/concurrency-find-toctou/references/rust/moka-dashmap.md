# moka And DashMap

Spells single-flight and per-key atomic entry from [cache.md](../surfaces/cache.md) and [in-process.md](../surfaces/in-process.md).

## Single-Flight With moka

`moka::future::Cache::get_with` computes once per key and hands the same value to every concurrent caller; `try_get_with` does the same for a fallible initializer and does not cache the error.

```rust
let value = cache
    .get_with(key.clone(), async { compute_expensive(&key).await })
    .await;
```

`cache.get(&key)` then `cache.insert(key, compute().await)` is the stampede.

## Per-Key Entry With DashMap

`entry(key).or_insert_with(...)` is atomic per key for synchronous construction. The shard lock is held while the closure runs, so the closure must not await or call back into the same map.

```rust
let conn = map.entry(host.clone()).or_insert_with(|| connect_blocking(&host)).clone();
```

`map.get(&host)` then `map.insert(host, ...)` is two operations with a gap, even though each one is internally locked.

## Insert-If-Absent As The Claim

For async construction, store a shareable in-flight future through `or_insert_with` and await it after the entry guard is dropped. `futures::FutureExt::shared` makes one future awaitable by every caller; a `JoinHandle` cannot be cloned, so it cannot play this role.

```rust
use futures::FutureExt;

let pending = map
    .entry(key.clone())
    .or_insert_with(|| build(key.clone()).boxed().shared())
    .clone();
let value = pending.await;
```

Holding the `Entry` across the await keeps the shard locked and stalls every other key in that shard.
