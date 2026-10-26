# Go `sync` And `sync/atomic`

Spells the in-process primitives from [in-process.md](../surfaces/in-process.md).

## Hold The Mutex Across Check And Store

```go
mu.Lock()
defer mu.Unlock()
if _, ok := m[key]; !ok {
    m[key] = build(key)
}
```

Releasing between the check and the store, or checking under `RLock` and storing under `Lock`, reopens the race: two goroutines both miss under the read lock and both insert under the write lock.

## sync.Map.LoadOrStore

Publishes exactly one value per key and tells the loser which one won.

```go
actual, loaded := m.LoadOrStore(key, candidate)
```

`candidate` is evaluated before the call, so `LoadOrStore` does not dedupe construction; pair it with [singleflight.md](singleflight.md) when building the value is expensive. `m.Load` then `m.Store` is the race.

## One-Time Initialization

`sync.Once` and `sync.OnceValue` run the initializer once and block concurrent callers until it finishes. A `var initialized bool` checked and set across a goroutine boundary is the race.

## Compare-And-Swap

```go
for {
    cur := counter.Load()
    if cur >= limit { return ErrExhausted }
    if counter.CompareAndSwap(cur, cur+1) { break }
}
```

`counter.Add(1)` alone cannot enforce the limit because it has no condition; `Load` then `Store` is the race.
