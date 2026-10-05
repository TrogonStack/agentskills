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

## Trade-offs

None, as long as the process owned nothing. If removing it breaks something, that something is what the process owns; see [process-justification.md](process-justification.md).
