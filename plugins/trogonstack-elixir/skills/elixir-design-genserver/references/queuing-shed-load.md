# Shed Load

When the queue cannot be removed, bound it. Reject new work early with an error the caller can act on, instead of letting it wait and time out after the server already committed to doing the work.

## Avoid

```elixir
def take(server, %TakeRequest{} = request) do
  GenServer.call(server, request, 30_000)
end
```

A longer timeout hides the overload: callers wait longer, the mailbox keeps growing, and work for callers that already gave up still runs.

## Prefer

```elixir
@max_queue_length 1_000

def take(server, %TakeRequest{} = request) do
  if overloaded?(server) do
    {:error, %OverloadedError{}}
  else
    GenServer.call(server, request)
  end
end

defp overloaded?(server) do
  with pid when is_pid(pid) <- GenServer.whereis(server),
       {:message_queue_len, length} <- Process.info(pid, :message_queue_len) do
    length > @max_queue_length
  else
    _ -> false
  end
end
```

- The check runs in the caller, so it costs the server nothing.
- `{:error, %OverloadedError{}}` follows the reply shapes in [callback-patterns.md](callback-patterns.md#reply-shapes); callers map it to a retry with backoff or an HTTP 429.
- When the server is not running, `overloaded?/1` returns `false` and the `call` exits as it would have anyway.

## Trade-offs

- The check is approximate: the queue can grow between the check and the send. That is fine for shedding, which only needs to stop runaway growth.
- `Process.info/2` works only for local pids. For remote servers, track in-flight requests with a counter (`:atomics` or `:ets.update_counter/3`) instead.
- Shedding is a last resort. It keeps the node alive, but callers still fail; prefer the patterns that remove the queue.
