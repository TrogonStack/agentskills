# Partition by Key

When requests for unrelated keys wait on each other in one server, run several copies and route each key to the same copy. Keys still serialize against themselves, which preserves per-key consistency, but no longer against each other.

## Avoid

```elixir
children = [
  {MyApp.RateLimiter, name: MyApp.RateLimiter, capacity: 100}
]

MyApp.RateLimiter.take(MyApp.RateLimiter, %TakeRequest{key: key})
```

Every take for every key goes through one mailbox.

## Prefer

```elixir
children = [
  {PartitionSupervisor, child_spec: {MyApp.RateLimiter, capacity: 100}, name: MyApp.RateLimiterPartitions}
]
```

```elixir
defmodule MyApp.RateLimiter do
  use GenServer

  alias MyApp.RateLimiter.{Bucket, TakeRequest, TakeResponse}

  def start_link(opts) do
    GenServer.start_link(__MODULE__, opts)
  end

  def take(partitions, %TakeRequest{key: key} = request) do
    GenServer.call({:via, PartitionSupervisor, {partitions, key}}, request)
  end

  @impl GenServer
  def init(opts), do: {:ok, Bucket.new(opts)}

  @impl GenServer
  def handle_call(%TakeRequest{key: key}, _from, %Bucket{} = bucket) do
    case Bucket.take(bucket, key) do
      {:ok, bucket} -> {:reply, {:ok, %TakeResponse{remaining: Bucket.remaining(bucket, key)}}, bucket}
      {:error, error} -> {:reply, {:error, error}, bucket}
    end
  end
end
```

- `PartitionSupervisor` starts one child per scheduler by default (`partitions: System.schedulers_online()`).
- Partitions are not named. Callers address them through the `PartitionSupervisor` with the routing key, so `start_link/1` takes no `:name`.
- The same key always routes to the same partition, so each key keeps its own bucket.

## Trade-offs

- Partition only when per-key logic needs a process. A plain counter needs none: `:counters` or `:ets.update_counter/3` updates it from the caller without a mailbox.
- Anything that spans keys (totals, "list all") must ask every partition; `PartitionSupervisor.which_children/1` lists them.
- A hot key still serializes on its partition. If one key dominates, partitioning does not help; see [queuing-process-per-entity.md](queuing-process-per-entity.md) or [queuing-reads-from-ets.md](queuing-reads-from-ets.md).
- A crashed partition loses only its own keys' state.
