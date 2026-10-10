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
  case RateCache.fetch(state.cache, currency) do
    {:ok, rate} -> {:reply, {:ok, %FetchRateResponse{rate: rate}}, state}
    {:error, %RateNotCachedError{}} -> {:noreply, await_fetch(state, currency, from)}
  end
end

@impl GenServer
def handle_info({ref, result}, %RatesServerState{} = state) when is_map_key(state.fetching, ref) do
  Process.demonitor(ref, [:flush])
  {%PendingFetch{} = fetch, state} = pop_fetch(state, ref)

  case result do
    {:ok, rate} ->
      reply_all(fetch, {:ok, %FetchRateResponse{rate: rate}})
      {:noreply, %RatesServerState{state | cache: RateCache.put(state.cache, fetch.currency, rate)}}

    {:error, error} ->
      reply_all(fetch, {:error, error})
      {:noreply, state}
  end
end

def handle_info({:DOWN, ref, :process, _pid, reason}, %RatesServerState{} = state)
    when is_map_key(state.fetching, ref) do
  {%PendingFetch{} = fetch, state} = pop_fetch(state, ref)
  reply_all(fetch, {:error, %FetchFailedError{reason: reason}})
  {:noreply, state}
end

defp await_fetch(%RatesServerState{} = state, currency, from) do
  case Map.fetch(state.pending, currency) do
    {:ok, %PendingFetch{} = fetch} ->
      pending = Map.put(state.pending, currency, %PendingFetch{fetch | callers: [from | fetch.callers]})
      %RatesServerState{state | pending: pending}

    :error ->
      task = Task.Supervisor.async_nolink(state.task_supervisor, RatesClient, :fetch, [currency])
      fetch = %PendingFetch{currency: currency, callers: [from]}

      %RatesServerState{
        state
        | pending: Map.put(state.pending, currency, fetch),
          fetching: Map.put(state.fetching, task.ref, currency)
      }
  end
end

defp pop_fetch(%RatesServerState{} = state, ref) do
  {currency, fetching} = Map.pop!(state.fetching, ref)
  {fetch, pending} = Map.pop!(state.pending, currency)
  {fetch, %RatesServerState{state | pending: pending, fetching: fetching}}
end

defp reply_all(%PendingFetch{callers: callers}, reply) do
  Enum.each(callers, &GenServer.reply(&1, reply))
end
```

- What the process owns is coordination: a cache hit replies at once, and concurrent misses for the same currency share one fetch instead of each calling the API.
- `async_nolink` keeps a crashing task from taking the server down; the crash arrives as `:DOWN` and every waiting caller gets an error.
- Returning `{:noreply, state}` from `handle_call/3` frees the server; `GenServer.reply/2` answers the callers later.
- `Process.demonitor(ref, [:flush])` drops the `:DOWN` message that would otherwise follow a successful result.
- Pending callers and task refs are process-only data, so they live in the `RatesServerState` wrapper and not in `RateCache`; see [naming.md](naming.md#process-state).

## Trade-offs

- The caller still waits for the I/O, but other callers no longer wait for it.
- Cache hits still go through the mailbox. When they dominate, serve them from ETS as well; see [queuing-reads-from-ets.md](queuing-reads-from-ets.md).
- The caller's `call` timeout still applies. A reply after the timeout is discarded.
- Keep the clauses above the `handle_info/2` catch-all; see [handle-info.md](handle-info.md).
