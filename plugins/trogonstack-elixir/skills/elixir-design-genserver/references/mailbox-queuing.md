# Mailbox Queuing

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
- The default 5 second timeout exits the caller, but the request stays in the mailbox and the server still does the work, then the reply is discarded. Load does not drop when callers give up.
- Callers that retry on timeout add more messages to a queue that is already behind, so the backlog feeds itself.
- A server that calls another busy server inherits that server's queue as well.

### With `cast`

- No back-pressure: producers never slow down, so a slow server lets the mailbox grow until memory runs out.
- A large mailbox makes the process heap and garbage collection expensive, which slows handling further.
- Nothing tells the producer the server is behind; the first visible symptom is often memory alarms or the node going down.

### Hidden Serialization

The worst queues are the ones nobody meant to build: a singleton GenServer that wraps work which was already concurrent (DB pool, HTTP client, pure functions). Each request is fast in isolation, tests pass, and production latency grows with traffic.

## Detecting It

```elixir
Process.info(pid, :message_queue_len)
:sys.get_status(pid)
```

- `:recon.proc_count(:message_queue_len, 10)` lists the processes with the longest mailboxes.
- `:observer.start()` Processes tab, sorted by MsgQ.
- Telemetry: emit handling duration per callback and sample `message_queue_len` periodically.

Symptoms: `GenServer.call` timeouts that rise with load, latency that grows linearly with traffic, one scheduler pegged while others idle, process memory climbing on a single pid.

## Fixes, Least Invasive First

1. **Remove the process.** If it owns nothing (see [process-justification.md](process-justification.md)), call the functions directly from the caller.
2. **Move reads out of the mailbox.** The server owns writes; readers go straight to ETS.

   ```elixir
   :ets.new(__MODULE__, [:named_table, :protected, read_concurrency: true])

   def lookup(key) do
     case :ets.lookup(__MODULE__, key) do
       [{^key, value}] -> {:ok, value}
       [] -> :error
     end
   end
   ```

3. **Move slow work out of the callback.** Start a `Task` under a `Task.Supervisor`, return `{:noreply, state}` while keeping `from`, and answer with `GenServer.reply/2` when the task result arrives in `handle_info/2`. The server keeps accepting messages while the work runs.
4. **Partition by key.** Run N copies and route each key to one, so unrelated keys stop waiting on each other.

   ```elixir
   children = [
     {PartitionSupervisor, child_spec: MyApp.Counter, name: MyApp.Counters}
   ]

   GenServer.call({:via, PartitionSupervisor, {MyApp.Counters, key}}, {:incr, key})
   ```

5. **One process per entity.** Use `Registry` + `DynamicSupervisor` when each entity has its own state and lifecycle (a chat room, a device session).
6. **Pool a scarce resource.** Use a pool (`NimblePool`, `:poolboy`) when the bottleneck is a limited external resource rather than state.
7. **Shed load.** When the queue cannot be avoided, bound it: check `message_queue_len` or a counter before enqueueing and reject early with `{:error, :overloaded}` instead of letting callers time out.

Prefer `call` over `cast` from producers that can outrun the server: the blocked caller is the back-pressure.
