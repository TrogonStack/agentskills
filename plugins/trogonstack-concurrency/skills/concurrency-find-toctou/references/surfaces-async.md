# Async And In-Process Surfaces

Inside one process the interleaver is another task on the same event loop, another thread, or another process in the same VM. The gap that lets it in is any point where control yields: an `await`, a message round trip, a second call into the same server. A check and an act with a yield between them are two separate moments.

## JavaScript: Check, Await, Set

Avoid:

```ts
if (!connections.has(host)) {
  const conn = await connect(host);
  connections.set(host, conn);
}
```

Every caller that arrives during `connect` sees the map empty and opens its own connection; the last one wins and the rest leak. Prefer storing the promise synchronously, so the map is populated before the first yield:

```ts
let pending = connections.get(host);
if (!pending) {
  pending = connect(host).catch((err) => {
    connections.delete(host);
    throw err;
  });
  connections.set(host, pending);
}
const conn = await pending;
```

The rule for an event loop: everything between the check and the write must be synchronous. If it is, the pair is atomic. If there is an `await`, it is not.

A boolean guard set synchronously (`if (this.flushing) return; this.flushing = true;`) is safe for the same reason. The finding should confirm there is no `await` between the read and the assignment.

## Rust: Lock, Await, Lock Again

Avoid:

```rust
if !state.lock().await.contains_key(&key) {
    let value = build(&key).await;
    state.lock().await.insert(key, value);
}
```

The lock is released after `contains_key`, so two tasks both miss and both insert. Prefer one of:

- Hold a `tokio::sync::Mutex` guard across the whole decision when the critical section must await. This serializes all callers through the mutex, which is a throughput choice the finding should note.
- Use an entry API that is atomic per key: `DashMap::entry(key).or_insert_with(...)` for synchronous construction, or a per-key `OnceCell` / `moka` cache `get_with` for async construction with built-in single-flight.
- For a scalar, `AtomicU64::compare_exchange` and loop on failure.

A `std::sync::Mutex` guard must not be held across an `await`. The future stops being `Send`, so `tokio::spawn` rejects it, and on a current-thread runtime it deadlocks the moment another task needs the lock. Either reshape the code so the guard drops before the await, or switch to the async mutex.

## Elixir: Two Calls Into One Server

Avoid:

```elixir
case GenServer.call(server, {:get, key}) do
  nil -> GenServer.call(server, {:put, key, value})
  existing -> existing
end
```

Each call is serialized, but the pair is not. Another process can `put` between them. Prefer one message that carries the decision:

```elixir
GenServer.call(server, {:put_new, key, value})

def handle_call({:put_new, key, value}, _from, state) do
  case Map.fetch(state, key) do
    {:ok, existing} -> {:reply, {:exists, existing}, state}
    :error -> {:reply, {:ok, value}, Map.put(state, key, value)}
  end
end
```

The same shape against ETS, where there is no server to serialize anything:

```elixir
# avoid
case :ets.lookup(table, key) do
  [] -> :ets.insert(table, {key, value})
  [{_, existing}] -> existing
end

# prefer
:ets.insert_new(table, {key, value})   # false when the key already exists
```

`:ets.update_counter/4` with a default increments atomically and creates the row if missing. `:ets.select_replace/2` is a compare-and-swap on a match spec. `:atomics.compare_exchange/4` covers plain integers. For "one process per key", `Registry.register/3` on a `:unique` registry returns `{:error, {:already_registered, pid}}` to the loser; checking `Registry.lookup` first is the race.

## Go: Check Then Store

```go
// avoid
if _, ok := m[key]; !ok {
    m[key] = build(key)
}

// prefer
actual, loaded := m.LoadOrStore(key, build(key))   // sync.Map
```

If `build` is expensive, `singleflight.Group.Do(key, ...)` dedupes the construction and `LoadOrStore` the publication. A `sync.Mutex` held across the whole check-and-store is also correct and simpler when contention is low.

## What The Finding Must Cite

The exact yield point between the check and the act (the `await`, the second `call`, the lock release), and which other task or process can run at that point. If no yield exists, the pair is atomic and the finding says so.
