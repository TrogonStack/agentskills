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

Count requests from the moment a caller sends one until the server takes it out of the mailbox. The caller reserves a slot, and the server releases it:

```elixir
@max_queued 1_000
@timeout 5_000

def take(name, %TakeRequest{} = request) do
  case Registry.lookup(MyApp.RateLimiters, name) do
    [{pid, admission}] -> admit(pid, admission, request)
    [] -> {:error, %RateLimiterNotFoundError{name: name}}
  end
end

defp admit(pid, admission, %TakeRequest{} = request) do
  if :atomics.add_get(admission, 1, 1) > @max_queued do
    :atomics.sub(admission, 1, 1)
    {:error, %OverloadedError{}}
  else
    deadline = System.monotonic_time(:millisecond) + @timeout
    GenServer.call(pid, %TakeRequest{request | admission: admission, deadline: deadline}, @timeout)
  end
end

@impl GenServer
def init(opts) do
  admission = :atomics.new(1, signed: true)
  {:ok, _owner} = Registry.register(MyApp.RateLimiters, Keyword.fetch!(opts, :name), admission)
  {:ok, Bucket.new(Keyword.fetch!(opts, :capacity))}
end

@impl GenServer
def handle_call(%TakeRequest{} = request, _from, %Bucket{} = bucket) do
  :atomics.sub(request.admission, 1, 1)

  if System.monotonic_time(:millisecond) > request.deadline do
    {:noreply, bucket}
  else
    case Bucket.take(bucket, request.key) do
      {:ok, bucket} -> {:reply, {:ok, %TakeResponse{remaining: Bucket.remaining(bucket, request.key)}}, bucket}
      {:error, error} -> {:reply, {:error, error}, bucket}
    end
  end
end
```

- The slot is released when the request leaves the mailbox, not when the caller stops waiting. A caller that times out leaves its request queued and its slot taken, so the count never drops below what the mailbox holds.
- The server creates the counter in `init/1` and publishes it as its `Registry` value. A restart drops the old entry with the old process and starts from a fresh counter, so slots held by requests lost in the crash do not leak into the new server. See [resource-lifecycle-ownership.md](resource-lifecycle-ownership.md).
- Callers send to the pid they looked up, and the request carries the counter it reserved, so the server always releases the right one.
- The deadline lets the server drop a request whose caller already gave up, without doing the work; `:noreply` avoids a late reply to it.

## Trade-offs

- Use the mailbox check when stopping runaway growth is enough; use admission control when the bound must hold.
- `Process.info/2`, `:atomics`, `Registry`, and `System.monotonic_time/1` are local to one node, so both checks fit callers on the server's node.
- Admission control counts only callers that go through it; casts and messages from elsewhere still reach the mailbox.
- Shedding is a last resort. It keeps the node alive, but callers still fail; prefer the patterns that remove the queue.
