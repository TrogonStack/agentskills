# Naming

A GenServer usually involves a public API with process callbacks, a pure deterministic core, and the process state. Name each one after what it means, not where it sits.

## Recommended Layout

```text
MyApp.RateLimiter                     public API and GenServer callbacks
MyApp.RateLimiter.ServerState         process bookkeeping, holds the core as a field
MyApp.RateLimiter.Bucket              pure deterministic core, struct and functions
MyApp.RateLimiter.Bucket.TakeRequest  input to Bucket.take/2
MyApp.RateLimiter.Bucket.TakeResponse output of Bucket.take/2
```

```elixir
defmodule MyApp.RateLimiter.Bucket do
  alias MyApp.RateLimiter.Bucket.{TakeRequest, TakeResponse}

  defstruct [:capacity, :tokens]

  def take(%__MODULE__{} = bucket, %TakeRequest{key: key}) do
    case Map.get(bucket.tokens, key, bucket.capacity) do
      0 ->
        %TakeResponse{allowed?: false, bucket: bucket}

      remaining ->
        tokens = Map.put(bucket.tokens, key, remaining - 1)
        %TakeResponse{allowed?: true, bucket: %__MODULE__{bucket | tokens: tokens}}
    end
  end
end
```

```elixir
@impl GenServer
def handle_call({:allow?, key}, _from, %ServerState{} = state) do
  %TakeResponse{allowed?: allowed?, bucket: bucket} =
    Bucket.take(state.bucket, %TakeRequest{key: key})

  {:reply, allowed?, %ServerState{state | bucket: bucket}}
end
```

## Public Module

Name it after the capability callers use: `MyApp.RateLimiter`. That it runs as a process is an implementation detail.

When the callbacks outgrow a single module, move them to `MyApp.RateLimiter.Server` and keep the client API in `MyApp.RateLimiter`. Callers never reference `.Server`.

## Pure Core

Name it after the domain concept: `Bucket`, `Room`, `Session`, `Ledger`. The struct and the functions that operate on it live in the same module.

Avoid role names: `State`, `Core`, `Logic`, `Impl`, `Engine`, `Worker`, `Manager`, `Service`. They describe architecture rather than meaning, repeat in every GenServer, and tie the core to the process even when it is used without one.

Name core functions with domain verbs (`take`, `refill`, `expire`), never GenServer vocabulary (`handle_*`).

## Process State

Name the process struct `ServerState`, or `Server.State` when callbacks live in `.Server`. It holds process concerns (timers, monitors, pending replies) and the domain core as a field:

```elixir
defmodule MyApp.RateLimiter.ServerState do
  defstruct [:bucket, :refill_timer, :pending]
end
```

When the process has no domain logic at all, `ServerState` alone is enough and no core module is needed.

## Inputs and Outputs

Pass structs in and out of the core. Tuples like `{result, bucket}` leave the contract unnamed and break callers when a field is added.

Name them `<Operation>Request` and `<Operation>Response`, nested under the core module:

- The pairing stays unambiguous as operations grow: `TakeRequest` and `TakeResponse`, `RefillRequest` and `RefillResponse`.
- The response carries the new core state, so the server takes the reply and the next state from one value.
- These are the core's contract, not the GenServer message. The message tuple stays private to the public module.
