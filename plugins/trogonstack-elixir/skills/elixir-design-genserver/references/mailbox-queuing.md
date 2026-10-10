# Mailbox Queuing

A GenServer serializes everything sent to it. That is the point when it protects state that must change consistently, and pure cost when it does not. Remove serialization the problem does not need; bound the serialization it does.

## The Model

A GenServer is a queue with exactly one worker:

- Messages land in an unbounded FIFO mailbox.
- The server handles one message at a time, to completion, before taking the next.
- Adding cores, schedulers, or callers does not add workers.

Throughput ceiling: `1 / average_handling_time`. A callback that takes 10 ms caps the server at 100 messages per second on a 64-core machine.

Latency under load (Little's law): a message waits roughly `queue_length * average_handling_time` before it is handled. When arrival rate exceeds the ceiling, the queue grows without bound and so does latency.

## How Queuing Fails

### With `call`

- Each caller blocks until every message ahead of it is handled.
- The default 5 second timeout exits the caller, but the request stays in the mailbox and the server still does the work, then the reply is dropped. The call was tagged with an alias the caller removed on timeout, so the late reply never reaches its mailbox. Load does not drop when callers give up.
- Callers that retry on timeout add more messages to a queue that is already behind, so the backlog feeds itself.
- A server that calls another busy server inherits that server's queue as well.

### With `cast`

- No back-pressure: producers never slow down, so a slow server lets the mailbox grow until memory runs out.
- A large mailbox makes the process heap and garbage collection expensive, which slows handling further.
- Nothing tells the producer the server is behind; the first visible symptom is often memory alarms or the node going down.

### Hidden Serialization

The worst queues are the ones nobody meant to build: a GenServer that wraps work which was already concurrent (DB pool, HTTP client, pure functions). Each request is fast in isolation, tests pass, and production latency grows with traffic.

## Detecting It

```elixir
Process.info(pid, :message_queue_len)
```

- `:recon.proc_count(:message_queue_len, 10)` lists the processes with the longest mailboxes.
- `:observer.start()` Processes tab, sorted by MsgQ.

Measure handling time per callback, so the `1 / handling_time` ceiling is a number rather than a guess:

```elixir
@impl GenServer
def handle_call(%TakeRequest{key: key}, _from, %Bucket{} = bucket) do
  result =
    :telemetry.span([:my_app, :rate_limiter, :take], %{}, fn ->
      {Bucket.take(bucket, key), %{}}
    end)

  case result do
    {:ok, bucket} -> {:reply, {:ok, %TakeResponse{remaining: Bucket.remaining(bucket, key)}}, bucket}
    {:error, error} -> {:reply, {:error, error}, bucket}
  end
end
```

Sample mailbox length with `telemetry_poller`:

```elixir
{:telemetry_poller,
 measurements: [
   {:process_info, name: MyApp.RateLimiter, event: [:my_app, :rate_limiter], keys: [:message_queue_len]}
 ]}
```

Symptoms: `GenServer.call` timeouts that rise with load, latency that grows linearly with traffic, one scheduler pegged while others idle, process memory climbing on a single pid.

## Patterns

Each pattern has an avoid/prefer example. Pick the least invasive one that removes the queue.

| Pattern | Read when |
|---------|-----------|
| [Remove the process](queuing-remove-the-process.md) | The server wraps a DB query, HTTP call, or pure computation and owns no state |
| [Serve reads from ETS](queuing-reads-from-ets.md) | Reads vastly outnumber writes and every read goes through the mailbox |
| [Offload slow work](queuing-offload-slow-work.md) | A callback blocks on I/O while other callers wait |
| [Chunk long work](queuing-chunk-long-work.md) | One message triggers a long job and client calls stall until it finishes |
| [Keep replies small](queuing-large-replies.md) | A `call` returns a large map or list |
| [Partition by key](queuing-partition-by-key.md) | Unrelated keys wait on each other in one server |
| [Process per entity](queuing-process-per-entity.md) | One server holds many independent entities (rooms, sessions, devices) |
| [Pool a resource](queuing-pool-resources.md) | The bottleneck is a scarce external resource, not state |
| [Shed load](queuing-shed-load.md) | The queue cannot be removed and callers must fail fast instead of timing out |

Prefer `call` over `cast` from producers that can outrun the server: the blocked caller is the back-pressure.
