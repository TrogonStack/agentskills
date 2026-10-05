# Callback Patterns

## Module Layout

```elixir
defmodule MyApp.RateLimiter do
  use GenServer

  alias MyApp.RateLimiter.{Bucket, TakeRequest, TakeResponse}

  def start_link(opts) do
    {name, opts} = Keyword.pop!(opts, :name)
    GenServer.start_link(__MODULE__, opts, name: name)
  end

  def take(server, %TakeRequest{} = request) do
    GenServer.call(server, request)
  end

  @impl GenServer
  def init(opts) do
    {:ok, Bucket.new(opts)}
  end

  @impl GenServer
  def handle_call(%TakeRequest{key: key}, _from, %Bucket{} = bucket) do
    case Bucket.take(bucket, key) do
      {:ok, bucket} ->
        {:reply, {:ok, %TakeResponse{remaining: Bucket.remaining(bucket, key)}}, bucket}

      {:error, error} ->
        {:reply, {:error, error}, bucket}
    end
  end
end
```

- Callers never call `GenServer.call/cast` directly. The client API owns the call; the messages are `<Operation>Request` and `<Operation>Response` structs. See [naming.md](naming.md).
- Callbacks delegate to a pure core (`Bucket.take/2`) that knows nothing about the GenServer or its messages.
- Mark every callback with `@impl GenServer`.
- Require `:name` in `start_link/1` and take the server as the first argument of every client function. Callers and tests always say which instance they talk to; a default argument hides that choice.
- Hold state in a struct so its shape is documented and enforced. The domain struct is the state until process-only data appears; see [naming.md](naming.md).

## Reply Shapes

Every reply, and every result the pure core returns, is one of:

| Shape | When |
|-------|------|
| `:ok` | Success with nothing to return |
| `{:ok, value}` | Success with a value, usually an `<Operation>Response` struct |
| `{:error, error}` | Failure, with an error struct (`defexception`) |

Never reply with a tuple of more than two elements such as `{:ok, value, extra}` or `{:error, reason, details}`. Put the extra data in the struct. Callers can then handle every operation with the same `case` or `with`, and adding a field never breaks a pattern match.

Reply with a Response struct rather than a bare list or value, so the reply can grow; see [request-response.md](request-response.md).

This rule covers the replies you design. OTP callback return values such as `{:reply, reply, state}` or `{:ok, state, {:continue, term}}` keep the shapes OTP requires.

## call vs cast vs send

- `call`: the default. Back-pressure, errors reach the caller, the work is confirmed.
- `cast`: only when the caller does not care about the outcome and producers cannot outrun the server. See [mailbox-queuing.md](mailbox-queuing.md).
- `send/2` + `handle_info/2`: messages that are not part of the client API, such as timers, monitors, task results, and other libraries. See [handle-info.md](handle-info.md).

## Initialization

`init/1` blocks the caller of `start_link`; during boot that is the supervisor and every sibling after it.

- Return `{:ok, state, {:continue, :load}}` and do slow work in `handle_continue/2`.
- The supervisor starts the next sibling as soon as `init/1` returns, before `handle_continue/2` finishes. A sibling that calls the server during its own startup waits in the mailbox behind the load and can time out. When siblings need the loaded state at boot, keep loading in `init/1`, or expose an explicit readiness signal (a `ready?/0` call, a `Registry` entry, a `:persistent_term` flag) that they check.
- Crash from `handle_continue/2` only when a restart can fix the failure. A dependency that stays down (database, remote API) crashes the server repeatedly, exhausts the supervisor's restart intensity (3 restarts in 5 seconds by default), and takes the supervisor and its other children down with it. For those failures, stay up in a degraded state and retry with `Process.send_after/3` and backoff.
- Return `:ignore` when configuration disables the server.

## Timeouts and Long Work

- `GenServer.call/3` defaults to 5 seconds and exits the caller on expiry. A slow call inside a serialized process is a design question before it is a timeout question.
- Offload slow work to a task and reply later with `GenServer.reply/2`; see [queuing-offload-slow-work.md](queuing-offload-slow-work.md).
- For periodic work, timers, monitors, and the `handle_info/2` catch-all, see [handle-info.md](handle-info.md).

## Redacting State in Crash Logs

Crash reports and `:sys.get_status/1` print the full state. When it holds secrets (tokens, credentials, personal data), implement `format_status/1` (OTP 25+) to redact them:

```elixir
@impl GenServer
def format_status(%{state: %ClientServerState{} = state} = status) do
  %{status | state: %ClientServerState{state | api_key: :redacted}}
end

def format_status(status), do: status
```

## Process Names

- Singleton: `name: __MODULE__`, only for genuinely one-per-node services. A singleton on a request path is a global queue.
- Many instances: `name: {:via, Registry, {MyApp.Registry, key}}` under a `DynamicSupervisor`.
- Never create atoms from user input to name processes. Atoms are not garbage collected.
