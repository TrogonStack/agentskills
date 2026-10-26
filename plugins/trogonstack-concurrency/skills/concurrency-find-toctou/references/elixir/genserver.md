# GenServer

Spells "two calls into one server" from [in-process.md](../surfaces/in-process.md). A GenServer serializes each message, not a sequence of messages from one caller.

## One Message Carries The Decision

```elixir
GenServer.call(server, {:put_new, key, value})

def handle_call({:put_new, key, value}, _from, state) do
  case Map.fetch(state, key) do
    {:ok, existing} -> {:reply, {:exists, existing}, state}
    :error -> {:reply, {:ok, value}, Map.put(state, key, value)}
  end
end
```

`GenServer.call(server, {:get, key})` followed by `GenServer.call(server, {:put, key, value})` is the race: another caller's `put` lands between the two.

## Yielding Inside The Handler

A handler that calls out to another process, a database, or the network while deciding is still serialized: the server processes nothing else until the handler returns. That is correct and also a throughput choice the finding should note. A handler that replies early with `{:noreply, ...}` and finishes the decision in a later message has reopened the gap.

## One Process Per Entity

A process registered under the entity id that handles every write to that entity serializes those writes by construction. The finding cites the registry key and confirms no other code path (a migration, an admin task, a second service) writes the same state outside the process; see [registry.md](registry.md) for the claim and [serializer-is-named.md](../principles/serializer-is-named.md) for what the citation must contain.
