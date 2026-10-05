# Process per Entity

When one server holds many independent entities, each with its own state and lifecycle, give each entity its own process. Activity in one room no longer queues behind activity in every other room, and a crash affects one entity.

## Avoid

```elixir
@impl GenServer
def handle_call(%PostMessageRequest{room_id: room_id, message: message}, _from, %Rooms{} = rooms) do
  case Rooms.post(rooms, room_id, message) do
    {:ok, rooms} -> {:reply, :ok, rooms}
    {:error, error} -> {:reply, {:error, error}, rooms}
  end
end
```

One process holds every chat room; a busy room slows down all of them.

## Prefer

```elixir
children = [
  {Registry, keys: :unique, name: MyApp.Chat.RoomRegistry},
  {DynamicSupervisor, name: MyApp.Chat.RoomSupervisor, strategy: :one_for_one}
]
```

```elixir
defmodule MyApp.Chat.RoomServer do
  use GenServer, restart: :transient

  alias MyApp.Chat.{PostMessageRequest, Room}

  def start_link(opts) do
    room_id = Keyword.fetch!(opts, :room_id)
    GenServer.start_link(__MODULE__, room_id, name: via(room_id))
  end

  def ensure_started(room_id) do
    case DynamicSupervisor.start_child(MyApp.Chat.RoomSupervisor, {__MODULE__, room_id: room_id}) do
      {:ok, _pid} -> :ok
      {:error, {:already_started, _pid}} -> :ok
      {:error, error} -> {:error, error}
    end
  end

  def post(room_id, %PostMessageRequest{} = request) do
    GenServer.call(via(room_id), request)
  end

  defp via(room_id), do: {:via, Registry, {MyApp.Chat.RoomRegistry, room_id}}

  @impl GenServer
  def init(room_id), do: {:ok, Room.new(room_id)}

  @impl GenServer
  def handle_call(%PostMessageRequest{message: message}, _from, %Room{} = room) do
    case Room.post(room, message) do
      {:ok, room} -> {:reply, :ok, room}
      {:error, error} -> {:reply, {:error, error}, room}
    end
  end
end
```

- `Registry` maps the entity id to its pid, so callers address rooms by id.
- `:transient` restarts a room that crashes, but not one that stops normally.
- `ensure_started/1` treats `:already_started` as success, which covers two callers racing to start the same room.

## Trade-offs

- Idle entities hold memory. Stop them after inactivity, for example by returning a timeout from callbacks and stopping with `{:stop, :normal, state}` on `:timeout`.
- State is lost when the process stops. Load it from durable storage in `handle_continue/2` if it must survive.
- Cross-entity operations become messages between processes; keep them rare or move them to a separate read model.
