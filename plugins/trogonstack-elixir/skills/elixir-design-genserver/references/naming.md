# Naming

A GenServer usually involves a public API with process callbacks, the messages it exchanges, and a pure deterministic core that doubles as the process state. Name each one after what it means, not where it sits.

## Recommended Layout

```text
MyApp.RateLimiter                          public API and GenServer callbacks
MyApp.RateLimiter.TakeRequest              message sent to the GenServer
MyApp.RateLimiter.TakeResponse             value in the {:ok, response} reply
MyApp.RateLimiter.Bucket                   pure deterministic core, and the process state
MyApp.RateLimiter.Bucket.ExhaustedError    error in the {:error, error} reply
```

```elixir
@impl GenServer
def handle_call(%TakeRequest{key: key}, _from, %Bucket{} = bucket) do
  case Bucket.take(bucket, key) do
    {:ok, bucket} ->
      {:reply, {:ok, %TakeResponse{remaining: Bucket.remaining(bucket, key)}}, bucket}

    {:error, error} ->
      {:reply, {:error, error}, bucket}
  end
end
```

```elixir
defmodule MyApp.RateLimiter.Bucket do
  alias MyApp.RateLimiter.Bucket.ExhaustedError

  defstruct [:capacity, tokens: %{}]

  def take(%__MODULE__{} = bucket, key) do
    case remaining(bucket, key) do
      0 -> {:error, %ExhaustedError{key: key}}
      n -> {:ok, %__MODULE__{bucket | tokens: Map.put(bucket.tokens, key, n - 1)}}
    end
  end

  def remaining(%__MODULE__{} = bucket, key) do
    Map.get(bucket.tokens, key, bucket.capacity)
  end
end
```

Replies follow the shapes in [callback-patterns.md](callback-patterns.md#reply-shapes): `:ok`, `{:ok, value}`, or `{:error, error}`.

## Public Module

Name it after the capability callers use: `MyApp.RateLimiter`. That it runs as a process is an implementation detail.

When the callbacks outgrow a single module, move them to `MyApp.RateLimiter.Server` and keep the client API in `MyApp.RateLimiter`. Callers never reference `.Server`.

## Messages

Exchange structs with the GenServer instead of tuples like `{:allow?, key}`. Name them `<Operation>Request` and `<Operation>Response`, nested under the public module:

- The pairing stays unambiguous as operations grow: `TakeRequest` and `TakeResponse`, `RefillRequest` and `RefillResponse`.
- Adding a field does not break pattern matches the way growing a tuple does.
- The client function takes the request and returns `{:ok, %TakeResponse{}}` or `{:error, error}`.
- An operation with nothing to return replies `:ok` and needs no Response struct.

Request and Response exist only at the GenServer boundary. The pure core never sees them; `handle_call/3` unpacks the request, calls the core with domain values, and builds the response.

## Pure Core

Name it after the domain concept: `Bucket`, `Room`, `Session`, `Ledger`. The struct and the functions that operate on it live in the same module, and they take and return that struct.

Avoid role names: `State`, `Core`, `Logic`, `Impl`, `Engine`, `Worker`, `Manager`, `Service`. They describe architecture rather than meaning, repeat in every GenServer, and tie the core to the process even when it is used without one.

Name core functions with domain verbs (`take`, `refill`, `expire`), never GenServer vocabulary (`handle_*`).

## Process State

Start with the domain struct as the process state: `init/1` returns `{:ok, %Bucket{}}`. Add a wrapper only when the process holds something the domain should not know about.

| Situation | State |
|-----------|-------|
| Only domain data | The domain struct: `%Bucket{}` |
| Process-only data too: timer refs, monitor refs, pending `from`s, task refs | `%ServerState{bucket: %Bucket{}, refill_timer: ref}` |
| Several domain structs | `%ServerState{bucket: %Bucket{}, quota: %Quota{}}` |
| No domain logic, only bookkeeping | `%ServerState{}` and no core module |

Process-only data stays out of the domain struct because refs and `from`s are runtime plumbing, not deterministic data; putting them in the core makes it harder to test and reuse without a process.

Name the wrapper `ServerState`, or `Server.State` when callbacks live in `.Server`.
