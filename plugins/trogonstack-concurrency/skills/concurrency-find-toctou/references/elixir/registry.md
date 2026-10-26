# Registry

Spells "claim then act" from [in-process.md](../surfaces/in-process.md). With `keys: :unique`, the register call is the claim; it succeeds for exactly one process and tells the others who won.

## Register As The Claim

```elixir
case Registry.register(MyRegistry, key, nil) do
  {:ok, _owner} -> :claimed
  {:error, {:already_registered, pid}} -> {:taken, pid}
end
```

`Registry.lookup(MyRegistry, key) == []` followed by `Registry.register/3` is the race.

## Starting The Owner

Starting a process under a `:via` name has the same shape built in: `GenServer.start_link(mod, arg, name: {:via, Registry, {MyRegistry, key}})` returns `{:error, {:already_started, pid}}` to the loser. A `DynamicSupervisor.start_child` with that name is the idiomatic find-or-start; `Registry.lookup` then `start_child` is the race.

## Across Nodes

`Registry` is local to one node. Two nodes can each register the same key locally. When one owner per key must hold across the cluster, the claim has to come from a store that spans nodes (a database unique row, a NATS KV `create`), and the finding says which.
