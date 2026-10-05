# Where an Actor Belongs, and Why

## The Question to Ask

"What does this process own that cannot live in the caller?"

Valid answers:

| Owns | Example |
|------|---------|
| Mutable state shared by many callers that must change consistently | Rate limiter buckets, in-memory counters, a game room |
| A resource with its own lifecycle | Socket, port, file handle, external connection |
| Time | Periodic jobs, debouncing, expiring sessions |
| A failure boundary | Code that may crash and must not take the caller down |

Invalid answers:

- "It is the service layer for users / orders / billing." That is a module.
- "It encapsulates the logic." Modules encapsulate logic.
- "It wraps the database / HTTP client." Those calls are already concurrent and pooled; a GenServer in front serializes them.
- "It runs in the background." That is a `Task` under a `Task.Supervisor`.
- "It caches data." Reads belong in ETS or `:persistent_term`; a process may own the table, but readers should not message it.

## Picking the Right Tool

| Need | Use |
|------|-----|
| Pure transformation of data | Plain module and functions |
| DB query or HTTP request | Call it from the caller's process |
| One-off concurrent work, result awaited | `Task` / `Task.async_stream` |
| Fire-and-forget work that must survive the caller | `Task.Supervisor.start_child` |
| Read-heavy shared data | ETS table owned by a process, or `:persistent_term` for rarely changing data |
| Shared state with logic, lifecycle, or timers | `GenServer` |
| One process per entity, looked up by key | `GenServer` + `Registry` + `DynamicSupervisor` |
| Stateless server that is a bottleneck | `PartitionSupervisor` (Elixir 1.14+) |

## The Anti-Pattern

```elixir
defmodule MyApp.Users do
  use GenServer

  def get(id), do: GenServer.call(__MODULE__, {:get, id})

  @impl GenServer
  def handle_call({:get, id}, _from, state) do
    {:reply, Repo.get(User, id), state}
  end
end
```

The state is never used. Every request in the system now waits in one mailbox for every other `get/1` ahead of it, while the Repo connection pool sits mostly idle. The fix is deleting the process:

```elixir
defmodule MyApp.Users do
  def get(id), do: Repo.get(User, id)
end
```

## Smells in Review

- `state` is ignored or is `nil` / `%{}` forever
- Every `handle_call` clause is a thin pass-through to another module
- The module is a named singleton and every web request calls it
- The GenServer exists "for consistency" with other modules
- Removing `use GenServer` and the callbacks would change nothing but concurrency
