# Callback Patterns

## Module Layout

```elixir
defmodule MyApp.RateLimiter do
  use GenServer

  alias MyApp.RateLimiter.Bucket

  def start_link(opts) do
    {name, opts} = Keyword.pop!(opts, :name)
    GenServer.start_link(__MODULE__, opts, name: name)
  end

  def allow?(server, key) do
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
- Require `:name` in `start_link/1` and take the server as the first argument of every client function. Callers and tests always say which instance they talk to; a default argument hides that choice.
- Hold state in a struct so its shape is documented and enforced.

## call vs cast vs send

- `call`: the default. Back-pressure, errors reach the caller, the work is confirmed.
- `cast`: only when the caller does not care about the outcome and producers cannot outrun the server. See [mailbox-queuing.md](mailbox-queuing.md).
- `send/2` + `handle_info/2`: messages that are not part of the client API, such as timers, monitors, ports, and other libraries.

## Initialization

`init/1` blocks the caller of `start_link`; during boot that is the supervisor and every sibling after it.

- Return `{:ok, state, {:continue, :load}}` and do slow work in `handle_continue/2`.
- The supervisor starts the next sibling as soon as `init/1` returns, before `handle_continue/2` finishes. A sibling that calls the server during its own startup waits in the mailbox behind the load and can time out. When siblings need the loaded state at boot, keep loading in `init/1`, or expose an explicit readiness signal (a `ready?/0` call, a `Registry` entry, a `:persistent_term` flag) that they check.
- Crash from `handle_continue/2` only when a restart can fix the failure. A dependency that stays down (database, remote API) crashes the server repeatedly, exhausts the supervisor's restart intensity (3 restarts in 5 seconds by default), and takes the supervisor and its other children down with it. For those failures, stay up in a degraded state and retry with `Process.send_after/3` and backoff.
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
