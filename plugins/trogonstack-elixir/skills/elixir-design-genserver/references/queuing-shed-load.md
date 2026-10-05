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

The mailbox check is best-effort: concurrent callers can all see a length below the limit and enqueue together, so it cannot enforce a hard bound.

## Hard Bound

Reserve a slot atomically before sending, release it when the call returns, and give the request a deadline so the server skips work nobody is waiting for:

```elixir
@max_in_flight 1_000
@timeout 5_000

def take(server, admission, %TakeRequest{} = request) do
  if :atomics.add_get(admission, 1, 1) > @max_in_flight do
    :atomics.sub(admission, 1, 1)
    {:error, %OverloadedError{}}
  else
    deadline = System.monotonic_time(:millisecond) + @timeout

    try do
      GenServer.call(server, %TakeRequest{request | deadline: deadline}, @timeout)
    after
      :atomics.sub(admission, 1, 1)
    end
  end
end

@impl GenServer
def handle_call(%TakeRequest{key: key, deadline: deadline}, _from, %Bucket{} = bucket) do
  if System.monotonic_time(:millisecond) > deadline do
    {:noreply, bucket}
  else
    case Bucket.take(bucket, key) do
      {:ok, bucket} -> {:reply, {:ok, %TakeResponse{remaining: Bucket.remaining(bucket, key)}}, bucket}
      {:error, error} -> {:reply, {:error, error}, bucket}
    end
  end
end
```

- `admission` is `:atomics.new(1, signed: true)`, created once by whoever starts the server and passed to callers, for example through the same place the server name lives.
- The counter bounds callers waiting, not the mailbox. A caller that times out frees its slot while its request stays queued, so the mailbox can briefly hold more than `@max_in_flight` requests.
- The deadline keeps that overflow cheap: the server drops an expired request without doing the work, and `:noreply` avoids sending a late reply to a caller that already gave up.
- `System.monotonic_time/1` is per node, so the deadline holds only for a local server.

## Trade-offs

- Use the mailbox check when stopping runaway growth is enough; use admission control when the bound must hold.
- `Process.info/2` works only for local pids. For remote servers, use admission control.
- Admission control counts only callers that go through it; casts and messages from elsewhere still reach the mailbox.
- Shedding is a last resort. It keeps the node alive, but callers still fail; prefer the patterns that remove the queue.
