# tokio

Spells the async lock and one-time initialization primitives from [in-process.md](../surfaces/in-process.md).

## Hold The Lock Across The Decision

A `std::sync::Mutex` guard held across an `.await` makes the future `!Send`, so `tokio::spawn` rejects it, and on a current-thread runtime it deadlocks the moment another task needs the lock. Dropping the guard before the await reopens the race. Switch to `tokio::sync::Mutex` and hold it across the whole decision:

```rust
let mut state = state.lock().await;
if !state.contains_key(&key) {
    let value = build(&key).await;
    state.insert(key, value);
}
```

That serializes every caller through one lock, which is a throughput choice the finding should note. When per-key atomicity is enough, prefer [moka-dashmap.md](moka-dashmap.md).

## Lock, Release, Await, Re-Lock

```rust
let present = state.lock().await.contains_key(&key);   // guard dropped at end of statement
if !present {
    let value = build(&key).await;
    state.lock().await.insert(key, value);               // second critical section
}
```

Two tasks both see absent and both insert. The first guard is dropped at the semicolon; that drop is the yield point the finding cites.

## One-Time Initialization

`tokio::sync::OnceCell::get_or_init` runs the async initializer once and hands every concurrent caller the same value. `std::sync::OnceLock::get_or_init` is the synchronous form. A `Option<T>` behind a mutex with `if none { set }` across an await is the race.

## Publishing The In-Flight Work

The Rust spelling of "store the promise, not the result" is a shared future inserted under the key before any await: `DashMap::entry(key).or_insert_with(|| build(key).boxed().shared())`, shown in [moka-dashmap.md](moka-dashmap.md). A `JoinHandle` cannot be cloned, so it cannot be the thing later callers join.
