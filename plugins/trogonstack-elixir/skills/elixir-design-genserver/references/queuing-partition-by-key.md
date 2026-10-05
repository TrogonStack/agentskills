# Partition by Key

When requests for unrelated keys wait on each other in one server, run several copies and route each key to the same copy. Keys still serialize against themselves, which preserves per-key consistency, but no longer against each other.

## Avoid

```elixir
children = [
  {MyApp.Counter, name: MyApp.Counter}
]

MyApp.Counter.increment(MyApp.Counter, %IncrementRequest{key: key})
```

Every increment for every key goes through one mailbox.

## Prefer

```elixir
children = [
  {PartitionSupervisor, child_spec: MyApp.Counter, name: MyApp.CounterPartitions}
]
```

```elixir
defmodule MyApp.Counter do
  use GenServer

  alias MyApp.Counter.{Counts, IncrementRequest}

  def start_link(opts) do
    GenServer.start_link(__MODULE__, opts)
  end

  def increment(partitions, %IncrementRequest{key: key} = request) do
    GenServer.call({:via, PartitionSupervisor, {partitions, key}}, request)
  end

  @impl GenServer
  def init(_opts), do: {:ok, Counts.new()}

  @impl GenServer
  def handle_call(%IncrementRequest{key: key}, _from, %Counts{} = counts) do
    {:reply, :ok, Counts.increment(counts, key)}
  end
end
```

- `PartitionSupervisor` starts one child per scheduler by default (`partitions: System.schedulers_online()`).
- Partitions are not named. Callers address them through the `PartitionSupervisor` with the routing key, so `start_link/1` takes no `:name`.
- The same key always routes to the same partition.

## Trade-offs

- Anything that spans keys (totals, "list all") must ask every partition; `PartitionSupervisor.which_children/1` lists them.
- A hot key still serializes on its partition. If one key dominates, partitioning does not help; see [queuing-process-per-entity.md](queuing-process-per-entity.md) or [queuing-reads-from-ets.md](queuing-reads-from-ets.md).
- A crashed partition loses only its own keys' state.
