# Naming

A GenServer usually involves a public API with process callbacks, the messages it exchanges, the process state, and a pure deterministic core. Name each one after what it means, not where it sits.

## Recommended Layout

```text
MyApp.RateLimiter               public API and GenServer callbacks
MyApp.RateLimiter.TakeRequest   message sent to the GenServer
MyApp.RateLimiter.TakeResponse  reply from the GenServer
MyApp.RateLimiter.ServerState   process bookkeeping, holds the core as a field
MyApp.RateLimiter.Bucket        pure deterministic core, struct and functions
```

```elixir
@impl GenServer
def handle_call(%TakeRequest{key: key}, _from, %ServerState{} = state) do
  case Bucket.take(state.bucket, key) do
    {:ok, bucket} ->
      {:reply, %TakeResponse{allowed?: true}, %ServerState{state | bucket: bucket}}

    {:error, :exhausted} ->
      {:reply, %TakeResponse{allowed?: false}, state}
  end
end
```

```elixir
defmodule MyApp.RateLimiter.Bucket do
  defstruct [:capacity, tokens: %{}]

  def take(%__MODULE__{} = bucket, key) do
    case Map.get(bucket.tokens, key, bucket.capacity) do
      0 -> {:error, :exhausted}
      remaining -> {:ok, %__MODULE__{bucket | tokens: Map.put(bucket.tokens, key, remaining - 1)}}
    end
  end
end
```

## Public Module

Name it after the capability callers use: `MyApp.RateLimiter`. That it runs as a process is an implementation detail.

When the callbacks outgrow a single module, move them to `MyApp.RateLimiter.Server` and keep the client API in `MyApp.RateLimiter`. Callers never reference `.Server`.

## Messages

Exchange structs with the GenServer instead of tuples like `{:allow?, key}`. Name them `<Operation>Request` and `<Operation>Response`, nested under the public module:

- The pairing stays unambiguous as operations grow: `TakeRequest` and `TakeResponse`, `RefillRequest` and `RefillResponse`.
- Adding a field does not break pattern matches the way growing a tuple does.
- The client function takes the request and returns the response: `RateLimiter.take(server, %TakeRequest{key: key})`.

Request and Response exist only at the GenServer boundary. The pure core never sees them; `handle_call/3` unpacks the request, calls the core with domain values, and builds the response.

## Process State

Name the process struct `ServerState`, or `Server.State` when callbacks live in `.Server`. It holds process concerns (timers, monitors, pending replies) and the domain core as a field:

```elixir
defmodule MyApp.RateLimiter.ServerState do
  defstruct [:bucket, :refill_timer, :pending]
end
```

When the process has no domain logic at all, `ServerState` alone is enough and no core module is needed.

## Pure Core

Name it after the domain concept: `Bucket`, `Room`, `Session`, `Ledger`. The struct and the functions that operate on it live in the same module, and they take and return that struct.

Avoid role names: `State`, `Core`, `Logic`, `Impl`, `Engine`, `Worker`, `Manager`, `Service`. They describe architecture rather than meaning, repeat in every GenServer, and tie the core to the process even when it is used without one.

Name core functions with domain verbs (`take`, `refill`, `expire`), never GenServer vocabulary (`handle_*`).
