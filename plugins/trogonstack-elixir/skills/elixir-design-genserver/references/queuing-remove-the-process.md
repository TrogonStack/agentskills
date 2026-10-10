# Remove the Process

The cheapest queue to fix is the one that should not exist. A GenServer that only forwards to the database, an HTTP client, or a pure function owns nothing, and serializes work that was already concurrent.

## Avoid

```elixir
defmodule MyApp.Accounts do
  use GenServer

  alias MyApp.Accounts.{GetUserRequest, GetUserResponse, UserNotFoundError}

  def get_user(server, %GetUserRequest{} = request) do
    GenServer.call(server, request)
  end

  @impl GenServer
  def init(_opts), do: {:ok, nil}

  @impl GenServer
  def handle_call(%GetUserRequest{id: id}, _from, state) do
    case Repo.get(User, id) do
      nil -> {:reply, {:error, %UserNotFoundError{id: id}}, state}
      user -> {:reply, {:ok, %GetUserResponse{user: user}}, state}
    end
  end
end
```

The state is `nil` forever. Every request in the system waits in this one mailbox while the Repo connection pool sits mostly idle.

## Prefer

```elixir
defmodule MyApp.Accounts do
  alias MyApp.Accounts.UserNotFoundError

  def get_user(id) do
    case Repo.get(User, id) do
      nil -> {:error, %UserNotFoundError{id: id}}
      user -> {:ok, user}
    end
  end
end
```

The caller's process runs the query. Concurrency is bounded by the Repo pool, which is the resource that actually needs bounding.

The same holds without Ecto. A Postgrex connection started under the supervisor is already a pool, and any process can query it:

```elixir
children = [
  {Postgrex, name: MyApp.DB, hostname: "localhost", database: "my_app", pool_size: 10}
]
```

```elixir
defmodule MyApp.Accounts do
  alias MyApp.Accounts.{User, UserNotFoundError}

  def get_user(id) do
    case Postgrex.query(MyApp.DB, "SELECT id, email FROM users WHERE id = $1", [id]) do
      {:ok, %Postgrex.Result{rows: [[id, email]]}} -> {:ok, %User{id: id, email: email}}
      {:ok, %Postgrex.Result{rows: []}} -> {:error, %UserNotFoundError{id: id}}
      {:error, error} -> {:error, error}
    end
  end
end
```

`Postgrex.query/4` checks a connection out of the pool for the caller and returns it after the query, so concurrent callers run concurrent queries up to `pool_size`. HTTP clients work the same way: Finch, and Req on top of it, pool connections and run requests in the caller's process; see [queuing-pool-resources.md](queuing-pool-resources.md).

## Trade-offs

None, as long as the process owned nothing. If it was built to make writes fault tolerant or race free, see [anti-pattern-database-gatekeeper.md](anti-pattern-database-gatekeeper.md) for what provides those guarantees instead.

If removing it breaks something, that something is what the process owns; see [process-justification.md](process-justification.md).
