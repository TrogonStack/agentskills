# Offload Slow Work

A callback that blocks on I/O stalls every caller behind it. Start the work in a task, return immediately, and reply when the task finishes.

First ask whether the server is needed at all. If the work does not read or change server state, the caller can run it; see [queuing-remove-the-process.md](queuing-remove-the-process.md). This pattern is for servers that must coordinate the work, for example to deduplicate concurrent fetches or to update state with the result.

## Avoid

```elixir
@impl GenServer
def handle_call(%FetchRateRequest{currency: currency}, _from, %RateCache{} = cache) do
  case RatesClient.fetch(currency) do
    {:ok, rate} -> {:reply, {:ok, %FetchRateResponse{rate: rate}}, RateCache.put(cache, currency, rate)}
    {:error, error} -> {:reply, {:error, error}, cache}
  end
end
```

A 2 second HTTP call caps the server at one request every 2 seconds, and every other caller times out.

## Prefer

```elixir
@impl GenServer
def handle_call(%FetchRateRequest{currency: currency}, from, %RatesServerState{} = state) do
  task = Task.Supervisor.async_nolink(state.task_supervisor, fn -> RatesClient.fetch(currency) end)
  pending = Map.put(state.pending, task.ref, %PendingFetch{from: from, currency: currency})
  {:noreply, %RatesServerState{state | pending: pending}}
end

@impl GenServer
def handle_info({ref, result}, %RatesServerState{} = state) when is_map_key(state.pending, ref) do
  Process.demonitor(ref, [:flush])
  {%PendingFetch{} = fetch, pending} = Map.pop(state.pending, ref)
  state = %RatesServerState{state | pending: pending}

  case result do
    {:ok, rate} ->
      GenServer.reply(fetch.from, {:ok, %FetchRateResponse{rate: rate}})
      {:noreply, %RatesServerState{state | cache: RateCache.put(state.cache, fetch.currency, rate)}}

    {:error, error} ->
      GenServer.reply(fetch.from, {:error, error})
      {:noreply, state}
  end
end

def handle_info({:DOWN, ref, :process, _pid, reason}, %RatesServerState{} = state)
    when is_map_key(state.pending, ref) do
  {%PendingFetch{} = fetch, pending} = Map.pop(state.pending, ref)
  GenServer.reply(fetch.from, {:error, %FetchFailedError{reason: reason}})
  {:noreply, %RatesServerState{state | pending: pending}}
end
```

- `async_nolink` keeps a crashing task from taking the server down; the crash arrives as `:DOWN`.
- Returning `{:noreply, state}` from `handle_call/3` frees the server; `GenServer.reply/2` answers the caller later.
- `Process.demonitor(ref, [:flush])` drops the `:DOWN` message that would otherwise follow a successful result.
- The state is a `RatesServerState` wrapper because pending `from`s and task refs are process-only data; see [naming.md](naming.md#process-state).

## Trade-offs

- The caller still waits for the I/O, but other callers no longer wait for it.
- The caller's `call` timeout still applies. A reply after the timeout is discarded.
- Keep the clauses above the `handle_info/2` catch-all; see [handle-info.md](handle-info.md).
