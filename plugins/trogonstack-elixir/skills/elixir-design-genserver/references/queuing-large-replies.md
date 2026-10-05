# Keep Replies Small

Every message, including every reply, is copied from one process heap to the other. A `call` that returns a large map or list makes the server spend its time copying while the queue grows, and spikes memory in the caller.

Binaries larger than 64 bytes are the exception: they live in a shared heap and only a reference is copied.

## Avoid

```elixir
@impl GenServer
def handle_call(%GetRoomRequest{}, _from, %Room{} = room) do
  {:reply, {:ok, %GetRoomResponse{room: room}}, room}
end
```

```elixir
{:ok, %GetRoomResponse{room: room}} = RoomServer.get_room(room_id, %GetRoomRequest{})
Enum.find(room.members, &(&1.user_id == user_id))
```

The caller wants one member and receives the whole room: every member and the full message history. Handing out the state is how this usually starts.

## Prefer

Ask the process the question instead of asking for its state:

```elixir
@impl GenServer
def handle_call(%FetchMemberRequest{user_id: user_id}, _from, %Room{} = room) do
  case Room.fetch_member(room, user_id) do
    {:ok, member} -> {:reply, {:ok, %FetchMemberResponse{member: member}}, room}
    {:error, error} -> {:reply, {:error, error}, room}
  end
end
```

When many callers read the same data, serve it from ETS instead of the mailbox; see [queuing-reads-from-ets.md](queuing-reads-from-ets.md).

## Trade-offs

- Filtering in the server moves CPU into the serialized process. Keep the filter cheap, an indexed lookup, not a scan.
- The server state itself is never copied by callbacks; only messages are. A large state is a memory concern, not a copying one.
