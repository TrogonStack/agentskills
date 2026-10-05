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

## Rules

- Every operation takes an `<Operation>Request`, even with no fields today: `%ListSessionsRequest{}` leaves room for filters and pagination.
- Every success with data replies `{:ok, %<Operation>Response{}}`. Never reply with a bare list, map, integer, or boolean.
- Collections live in a named field (`sessions`, `items`), never as the whole reply. The struct is where metadata (cursor, total, truncation) lands later.
- Reply `:ok` only for commands that will never return data. When an operation might, start with an empty Response struct; changing `:ok` to `{:ok, response}` later breaks every caller.
- Callers match on the struct name and the fields they read, `%ListSessionsResponse{sessions: sessions}`, never on the whole struct. Matching the fields they need keeps them indifferent to new ones.
- Add fields with defaults. Never rename or remove a field callers may read; add the new one and keep the old one until callers move.
- Decide `@enforce_keys` when the struct is created. Enforcing a key later breaks every caller that builds the struct without it.
- Errors follow the same rule: `defexception` structs, so a new detail is a new field. See [naming.md](naming.md#errors).

## Boundaries

Request and Response structs exist only at the GenServer boundary. `handle_call/3` unpacks the request and calls the pure core with domain values; the core returns domain values that the server wraps in the response. See [naming.md](naming.md#messages).

Items inside a response are domain structs (`%Session{}`), not tuples, for the same reason the reply is a struct.

## Trade-offs

- A struct per operation is more modules. That cost is paid once; a breaking change is paid at every call site.
- A response struct does not make a large reply cheap; it is still copied to the caller. Return a page or a lookup, not the whole collection. See [queuing-large-replies.md](queuing-large-replies.md).
