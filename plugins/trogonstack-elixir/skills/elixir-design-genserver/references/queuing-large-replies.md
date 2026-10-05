# Keep Replies Small

Every message, including every reply, is copied from one process heap to the other. A `call` that returns a large map or list makes the server spend its time copying while the queue grows, and spikes memory in the caller.

Binaries larger than 64 bytes are the exception: they live in a shared heap and only a reference is copied.

## Avoid

```elixir
@impl GenServer
def handle_call(%ListSessionsRequest{}, _from, %Sessions{} = sessions) do
  {:reply, {:ok, %ListSessionsResponse{sessions: Sessions.all(sessions)}}, sessions}
end
```

```elixir
{:ok, %ListSessionsResponse{sessions: sessions}} = SessionStore.list_sessions(server, %ListSessionsRequest{})
Enum.find(sessions, &(&1.user_id == user_id))
```

The caller wants one session and receives 100,000 of them.

## Prefer

Ask the server for what you need, and let it do the filtering:

```elixir
@impl GenServer
def handle_call(%FindSessionRequest{user_id: user_id}, _from, %Sessions{} = sessions) do
  case Sessions.find_by_user(sessions, user_id) do
    {:ok, session} -> {:reply, {:ok, %FindSessionResponse{session: session}}, sessions}
    {:error, error} -> {:reply, {:error, error}, sessions}
  end
end
```

When callers genuinely need to scan large data, serve it from ETS instead; see [queuing-reads-from-ets.md](queuing-reads-from-ets.md).

## Trade-offs

- Filtering in the server moves CPU into the serialized process. Keep the filter cheap, an indexed lookup, not a scan.
- The server state itself is never copied by callbacks; only messages are. A large state is a memory concern, not a copying one.
