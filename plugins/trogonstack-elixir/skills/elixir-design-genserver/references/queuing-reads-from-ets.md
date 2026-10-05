# Serve Reads from ETS

When reads vastly outnumber writes, the server should own the data but not serve every read. Readers go straight to an ETS table; only writes go through the mailbox.

## Avoid

```elixir
def enabled?(server, %EnabledRequest{} = request) do
  GenServer.call(server, request)
end

@impl GenServer
def handle_call(%EnabledRequest{flag: flag}, _from, %Flags{} = flags) do
  {:reply, Flags.fetch(flags, flag), flags}
end
```

Every feature-flag check on every request queues behind every other check.

## Prefer

```elixir
defmodule MyApp.FeatureFlags do
  use GenServer

  alias MyApp.FeatureFlags.{EnableRequest, FlagNotFoundError}

  def start_link(opts) do
    {name, opts} = Keyword.pop!(opts, :name)
    GenServer.start_link(__MODULE__, opts, name: name)
  end

  def enabled?(table, flag) do
    case :ets.lookup(table, flag) do
      [{^flag, enabled?}] -> {:ok, enabled?}
      [] -> {:error, %FlagNotFoundError{flag: flag}}
    end
  end

  def enable(server, %EnableRequest{} = request) do
    GenServer.call(server, request)
  end

  @impl GenServer
  def init(opts) do
    table = :ets.new(Keyword.fetch!(opts, :table), [:named_table, :protected, read_concurrency: true])
    {:ok, table}
  end

  @impl GenServer
  def handle_call(%EnableRequest{flag: flag}, _from, table) do
    :ets.insert(table, {flag, true})
    {:reply, :ok, table}
  end
end
```

- `:protected` lets any process read and only the owner write, so writes stay serialized and consistent.
- `read_concurrency: true` optimizes for concurrent readers.
- The caller passes the table name, so several instances can coexist.

## Trade-offs

- The table dies with its owner. Readers get `ArgumentError` during the restart window; rebuild the table in `init/1` or `handle_continue/2`, or have a parent process own it.
- A write is visible to readers as soon as `:ets.insert/2` returns, and the `call` returns after that, so the writer reads its own write.
- For data that almost never changes, `:persistent_term` reads are faster still, but every update triggers a global garbage collection scan. Use it for configuration, not for anything updated at runtime.
