# Serve Reads from ETS

When reads vastly outnumber writes, the server should own the data but not serve every read. Readers go straight to an ETS table; only writes go through the mailbox.

## Avoid

```elixir
def fetch_flag(server, %FetchFlagRequest{} = request) do
  GenServer.call(server, request)
end

@impl GenServer
def handle_call(%FetchFlagRequest{name: name}, _from, %Flags{} = flags) do
  case Flags.fetch(flags, name) do
    {:ok, flag} -> {:reply, {:ok, %FetchFlagResponse{flag: flag}}, flags}
    {:error, error} -> {:reply, {:error, error}, flags}
  end
end
```

Every feature-flag check on every request queues behind every other check.

## Prefer

```elixir
defmodule MyApp.FeatureFlags do
  use GenServer

  alias MyApp.FeatureFlags.{EnableRequest, FeatureFlagsServerState, Flag, FlagNotFoundError}

  def start_link(opts) do
    {name, opts} = Keyword.pop!(opts, :name)
    GenServer.start_link(__MODULE__, opts, name: name)
  end

  def fetch_flag(table, name) do
    case :ets.lookup(table, name) do
      [{^name, %Flag{} = flag}] -> {:ok, flag}
      [] -> {:error, %FlagNotFoundError{name: name}}
    end
  end

  def enable(server, %EnableRequest{} = request) do
    GenServer.call(server, request)
  end

  @impl GenServer
  def init(opts) do
    table = :ets.new(Keyword.fetch!(opts, :table), [:named_table, :protected, read_concurrency: true])
    {:ok, %FeatureFlagsServerState{table: table}}
  end

  @impl GenServer
  def handle_call(%EnableRequest{name: name}, _from, %FeatureFlagsServerState{} = state) do
    :ets.insert(state.table, {name, %Flag{name: name, enabled?: true}})
    {:reply, :ok, state}
  end
end
```

- `:protected` lets any process read and only the owner write, so writes stay serialized and consistent.
- `read_concurrency: true` optimizes for concurrent readers.
- Reads never reach the GenServer, so `fetch_flag/2` takes domain values and returns the `Flag` struct; Request and Response structs exist only for messages to the server.
- The table is process-only data, so the state is a `FeatureFlagsServerState` wrapper; see [naming.md](naming.md#process-state).
- The caller passes the table name, so several instances can coexist.

## Trade-offs

- The table dies with its owner. Readers get `ArgumentError` during the restart window; rebuild the table in `init/1` or `handle_continue/2`, or have a parent process own it. See [resource-lifecycle-ownership.md](resource-lifecycle-ownership.md).
- A write is visible to readers as soon as `:ets.insert/2` returns, and the `call` returns after that, so the writer reads its own write.
- For data that almost never changes, `:persistent_term` reads are faster still, but every update triggers a global garbage collection scan. Use it for configuration, not for anything updated at runtime.
