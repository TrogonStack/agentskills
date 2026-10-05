# Request and Response Contracts

The client API is a contract with every caller. Shape it so it can grow without breaking them: wrap what goes in and what comes out in structs, never bare values.

## Avoid

```elixir
def list_sessions(server) do
  GenServer.call(server, :list_sessions)
end

@impl GenServer
def handle_call(:list_sessions, _from, %Sessions{} = sessions) do
  {:reply, {:ok, Sessions.all(sessions)}, sessions}
end
```

```elixir
{:ok, sessions} = SessionStore.list_sessions(server)
```

The day the operation needs pagination, there is nowhere to put the cursor or the page size. Every option breaks callers:

- `{:ok, sessions, cursor}` breaks every match and violates the [reply shapes](callback-patterns.md#reply-shapes).
- `{:ok, %{sessions: sessions, cursor: cursor}}` breaks every caller that matched a list.
- `list_sessions(server, limit)` changes the arity, and every call site.

## Prefer

```elixir
defmodule MyApp.SessionStore.ListSessionsRequest do
  defstruct limit: 100, cursor: nil
end

defmodule MyApp.SessionStore.ListSessionsResponse do
  defstruct sessions: [], next_cursor: nil
end
```

```elixir
def list_sessions(server, %ListSessionsRequest{} = request) do
  GenServer.call(server, request)
end

@impl GenServer
def handle_call(%ListSessionsRequest{} = request, _from, %Sessions{} = sessions) do
  {page, next_cursor} = Sessions.page(sessions, request.cursor, request.limit)
  {:reply, {:ok, %ListSessionsResponse{sessions: page, next_cursor: next_cursor}}, sessions}
end
```

```elixir
{:ok, %ListSessionsResponse{sessions: sessions}} =
  SessionStore.list_sessions(server, %ListSessionsRequest{})
```

New request options and new response fields are new struct fields with defaults. Existing callers keep compiling and keep matching.

## Growing Without Breaking

A change to the contract should be additive: a new field with a default. A shape that can only change by being replaced forces every caller to change at once. That one idea explains every choice below.

- **A Request, even with no fields.** An operation that takes nothing today takes a filter or a page size tomorrow. A field is additive; a new argument changes the arity.
- **A Response, not a bare value.** A bare list, map, integer, or boolean has no room for a second piece of data, so the first piece of metadata (cursor, total, truncation) replaces the shape.
- **Collections in a named field.** Data about a collection belongs next to it, and a field named `sessions` leaves room for `next_cursor`.
- **`:ok` only when there is never anything to say.** Moving from `:ok` to `{:ok, response}` is a replacement. When an operation might return data later, start with an empty Response struct.
- **Callers match what they read.** A struct pattern such as `%ListSessionsResponse{sessions: sessions}` ignores fields added later. Comparing whole structs with `==`, in code or in test assertions, breaks as soon as a new field carries a value.
- **Evolve by addition.** Renaming or removing a field is a replacement. Add the new field and keep the old one until callers move.
- **Enforced keys are decided once.** Adding `@enforce_keys` later breaks every caller that builds the struct without the key.
- **Errors grow the same way.** `defexception` structs carry new detail as new fields; see [naming.md](naming.md#errors).

## Boundaries

Request and Response structs exist only at the GenServer boundary. `handle_call/3` unpacks the request and calls the pure core with domain values; the core returns domain values that the server wraps in the response. See [naming.md](naming.md#messages).

Items inside a response are domain structs (`%Session{}`), not tuples, for the same reason the reply is a struct.

## Trade-offs

- A struct per operation is more modules. That cost is paid once; a breaking change is paid at every call site.
- A response struct does not make a large reply cheap; it is still copied to the caller. Return a page or a lookup, not the whole collection. See [queuing-large-replies.md](queuing-large-replies.md).
