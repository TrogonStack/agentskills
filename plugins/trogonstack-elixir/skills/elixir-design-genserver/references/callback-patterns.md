# Callback Patterns

## Module Layout

```elixir
defmodule MyApp.RateLimiter do
  use GenServer

  alias MyApp.RateLimiter.Bucket

  def start_link(opts) do
    {name, opts} = Keyword.pop(opts, :name, __MODULE__)
    GenServer.start_link(__MODULE__, opts, name: name)
  end

  def allow?(server \\ __MODULE__, key) do
    GenServer.call(server, {:allow?, key})
  end

  @impl GenServer
  def init(opts) do
    {:ok, Bucket.new(opts)}
  end

  @impl GenServer
  def handle_call({:allow?, key}, _from, bucket) do
    {result, bucket} = Bucket.take(bucket, key)
    {:reply, result, bucket}
  end
end
```

- Callers never call `GenServer.call/cast` directly. The client API is the contract; message shapes are private.
- Callbacks delegate to pure functions (`Bucket.take/2`) that take state and return new state.
- Mark every callback with `@impl GenServer`.
- Accept `:name`, and a server reference in client functions, so tests can start isolated instances.
- Hold state in a struct so its shape is documented and enforced.

## call vs cast vs send

- `call`: the default. Back-pressure, errors reach the caller, the work is confirmed.
- `cast`: only when the caller does not care about the outcome and producers cannot outrun the server. See [mailbox-queuing.md](mailbox-queuing.md).
- `send/2` + `handle_info/2`: messages that are not part of the client API, such as timers, monitors, ports, and other libraries.

## Initialization

`init/1` blocks the caller of `start_link`; during boot that is the supervisor and every sibling after it.

- Return `{:ok, state, {:continue, :load}}` and do slow work in `handle_continue/2`.
- If the server cannot work without the loaded data, let `handle_continue/2` crash so the supervisor restarts it.
- Return `:ignore` when configuration disables the server.

## Timeouts and Long Work

- `GenServer.call/3` defaults to 5 seconds and exits the caller on expiry. A slow call inside a serialized process is a design question before it is a timeout question.
- Offload slow work to a `Task` and reply later with `GenServer.reply/2`.
- For periodic work use `Process.send_after/3` and reschedule inside `handle_info/2`. `:timer.send_interval/2` keeps firing even when the server falls behind, which piles messages into the mailbox.

## Unexpected Messages

`use GenServer` injects a `handle_info/2` that logs unexpected messages. Defining your own replaces it, so add a catch-all clause or an unknown message crashes the server with a `FunctionClauseError`.

```elixir
@impl GenServer
def handle_info(msg, state) do
  Logger.warning("unexpected message: #{inspect(msg)}")
  {:noreply, state}
end
```

## Naming

- Singleton: `name: __MODULE__`, only for genuinely one-per-node services. A singleton on a request path is a global queue.
- Many instances: `name: {:via, Registry, {MyApp.Registry, key}}` under a `DynamicSupervisor`.
- Never create atoms from user input to name processes. Atoms are not garbage collected.
