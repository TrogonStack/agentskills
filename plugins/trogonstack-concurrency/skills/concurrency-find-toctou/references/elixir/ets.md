# ETS

Spells insert-if-absent, atomic counters, and compare-and-swap from [in-process.md](../surfaces/in-process.md) and [cache.md](../surfaces/cache.md). ETS has no owning server to serialize a lookup and an insert, so only its single-call atomic operations count as conditional writes.

## Insert If Absent

`insert_new/2` returns `false` to the loser.

```elixir
case :ets.insert_new(table, {key, value}) do
  true -> :claimed
  false -> :taken
end
```

`:ets.lookup(table, key) == []` followed by `:ets.insert/2` is the race.

## Atomic Counter With Default

`update_counter/4` with a default creates the row if missing and increments in one call.

```elixir
:ets.update_counter(table, key, {2, 1}, {key, 0})
```

A limit cannot be enforced inside `update_counter`; it only clamps with a threshold tuple (`{2, 1, limit, limit}`), so a caller that must know whether it won checks the returned value against the limit and decrements on loss, or uses `select_replace` below.

## Compare-And-Swap With select_replace

`select_replace/2` replaces only the rows that match the spec, and returns how many it replaced.

```elixir
case :ets.select_replace(table, [{{key, old}, [], [{{key, new}}]}]) do
  1 -> :ok
  0 -> :stale
end
```

## Plain Integers

`:atomics.compare_exchange/4` on an `:atomics` array is the word-level compare-and-swap; `:atomics.get/2` then `:atomics.put/3` is the race.
