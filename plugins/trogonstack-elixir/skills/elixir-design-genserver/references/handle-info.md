# handle_info and Self-Messaging

`handle_info/2` receives every message that did not come through `GenServer.call/cast`: messages the server sends itself, timers, monitors, task results, exit signals, and messages from libraries.

## What Arrives Here

| Message | Source | Shape |
|---------|--------|-------|
| Deferred work | `send(self(), msg)` | Your struct, for example `%ImportNextBatch{}` |
| Timer | `Process.send_after(self(), msg, ms)` | Your struct, for example `%RefillTick{}` |
| Monitored process died | `Process.monitor/1` | `{:DOWN, ref, :process, pid, reason}` |
| Task finished | `Task.Supervisor.async_nolink/2` | `{ref, result}`, then `:DOWN` unless flushed |
| Linked process exited | Only when trapping exits | `{:EXIT, pid, reason}` |
| Library message | PubSub, sockets, ports | Whatever the library defines |

## Internal Message Structs

Messages you send yourself are a private protocol. Define them as structs nested under the server module, like `<Operation>Request` for client messages:

```elixir
defmodule MyApp.RateLimiter.RefillTick do
  defstruct [:token]
end
```

Match the tuples that OTP and libraries define (`:DOWN`, `{ref, result}`, `:EXIT`) as they are; you do not own those shapes.

## Never Call Yourself

```elixir
@impl GenServer
def handle_info(%RefillTick{}, %Bucket{} = bucket) do
  RateLimiter.take(self(), %TakeRequest{key: :system})
  {:noreply, bucket}
end
```

`GenServer.call/3` to `self()` exits immediately with `:calling_self`. The indirect version is worse: server A calls B while B calls A, and both block until the timeout. Inside callbacks, call the pure core directly and never the module's own client API. Between servers, break call cycles with `cast`, `send`, or by moving the shared logic into a pure module both can use.

## Deferring Work to Yourself

`send(self(), msg)` and `{:continue, term}` both defer work, with opposite ordering:

| Mechanism | Runs | Use for |
|-----------|------|---------|
| `{:continue, term}` | Immediately after the current callback, before any other message | Finishing setup or a follow-up step that must not interleave with clients |
| `send(self(), msg)` | After every message already in the mailbox | Yielding to clients between batches; see [queuing-chunk-long-work.md](queuing-chunk-long-work.md) |

## Timers

Use `Process.send_after/3` and reschedule from `handle_info/2`. Avoid `:timer.send_interval/2`, which keeps firing when the server falls behind and piles ticks into the mailbox.

`Process.cancel_timer/1` cannot cancel a message that was already delivered. Tag each timer with a token and ignore ticks that do not match the current one:

```elixir
@refill_interval :timer.seconds(1)

defp schedule_refill(%RateLimiterServerState{} = state) do
  if state.refill_timer, do: Process.cancel_timer(state.refill_timer)
  token = make_ref()
  timer = Process.send_after(self(), %RefillTick{token: token}, @refill_interval)
  %RateLimiterServerState{state | refill_timer: timer, refill_token: token}
end

@impl GenServer
def handle_info(%RefillTick{token: token}, %RateLimiterServerState{refill_token: token} = state) do
  bucket = Bucket.refill(state.bucket, System.monotonic_time(:millisecond))
  {:noreply, schedule_refill(%RateLimiterServerState{state | bucket: bucket})}
end

def handle_info(%RefillTick{}, %RateLimiterServerState{} = state) do
  {:noreply, state}
end
```

- The server reads the clock and passes it to the core; `Bucket.refill/2` stays deterministic. See [naming.md](naming.md#time-is-an-input).
- Timer refs and tokens are process-only data, so they live in `RateLimiterServerState`, not in `Bucket`.

## Monitors

When state holds pids (subscribers, pending callers, workers), monitor them. Otherwise entries for dead processes stay in state forever.

```elixir
@impl GenServer
def handle_call(%SubscribeRequest{pid: pid}, _from, %FeedServerState{} = state) do
  ref = Process.monitor(pid)
  {:reply, :ok, %FeedServerState{state | subscribers: Map.put(state.subscribers, ref, pid)}}
end

@impl GenServer
def handle_info({:DOWN, ref, :process, _pid, _reason}, %FeedServerState{} = state)
    when is_map_key(state.subscribers, ref) do
  {:noreply, %FeedServerState{state | subscribers: Map.delete(state.subscribers, ref)}}
end
```

Monitor instead of link: a link makes the server die with the subscriber, a monitor only tells it.

## Task Results

Results of `Task.Supervisor.async_nolink/2` arrive as `{ref, result}`, and a crash arrives as `:DOWN`. See [queuing-offload-slow-work.md](queuing-offload-slow-work.md) for the full pattern.

## Catch-All

`use GenServer` injects a `handle_info/2` that logs unexpected messages. Defining your own replaces it, so end with a catch-all clause or an unknown message crashes the server with a `FunctionClauseError`:

```elixir
require Logger

def handle_info(msg, state) do
  Logger.warning("unexpected message: #{inspect(msg)}")
  {:noreply, state}
end
```

Keep it as the last clause; clauses after it never match. `Logger.warning/1` is a macro, so the module needs `require Logger`.
