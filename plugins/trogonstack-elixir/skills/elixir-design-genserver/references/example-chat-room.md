# Example: Chat Room

One complete GenServer with every principle applied. Read it to see how the pieces fit; read the linked references for why each piece looks the way it does.

## Why a Process

Each room owns the live conversation: the order of messages and who is in the room must change consistently while many members post at once. It also owns the subscriber processes it pushes messages to, and time, because an empty room stops itself.

The room is ephemeral, like a live support chat: when it stops, its history goes with it. If history must survive, the database is the source of truth and reads go to the database, not through this process; see [anti-pattern-database-gatekeeper.md](anti-pattern-database-gatekeeper.md).

Rooms are independent, so each one is its own process and a busy room never queues another; see [queuing-process-per-entity.md](queuing-process-per-entity.md).

## Layout

```text
MyApp.Chat                         public API, the only module callers use
MyApp.Chat.RoomServer              one GenServer per room
MyApp.Chat.RoomServerState         the room plus process-only data
MyApp.Chat.Room                    pure core: membership and bounded history
MyApp.Chat.Room.History            core result for a page of messages
MyApp.Chat.Room.NotAMemberError    core error
MyApp.Chat.Member                  domain struct
MyApp.Chat.Message                 domain struct
MyApp.Chat.*Request, *Response     contract at the GenServer boundary
MyApp.Chat.MessagePosted           event pushed to subscribers
```

```elixir
children = [
  {Registry, keys: :unique, name: MyApp.Chat.RoomRegistry},
  {DynamicSupervisor, name: MyApp.Chat.RoomSupervisor, strategy: :one_for_one}
]
```

## Pure Core

```elixir
defmodule MyApp.Chat.Member do
  defstruct [:id, :name]
end

defmodule MyApp.Chat.Message do
  defstruct [:id, :member_id, :body, :posted_at]
end

defmodule MyApp.Chat.Room.History do
  defstruct messages: [], more?: false
end

defmodule MyApp.Chat.Room.NotAMemberError do
  defexception [:member_id]

  @impl Exception
  def message(%__MODULE__{member_id: member_id}), do: "#{inspect(member_id)} is not a member of the room"
end

defmodule MyApp.Chat.Room do
  alias MyApp.Chat.{Member, Message}
  alias MyApp.Chat.Room.{History, NotAMemberError}

  defstruct [:id, :max_messages, members: %{}, messages: []]

  def new(id, max_messages), do: %__MODULE__{id: id, max_messages: max_messages}

  def join(%__MODULE__{} = room, %Member{} = member) do
    %__MODULE__{room | members: Map.put(room.members, member.id, member)}
  end

  def leave(%__MODULE__{} = room, member_id) do
    %__MODULE__{room | members: Map.delete(room.members, member_id)}
  end

  def post(%__MODULE__{} = room, %Message{} = message) do
    if Map.has_key?(room.members, message.member_id) do
      messages = Enum.take([message | room.messages], room.max_messages)
      {:ok, %__MODULE__{room | messages: messages}}
    else
      {:error, %NotAMemberError{member_id: message.member_id}}
    end
  end

  def history(%__MODULE__{} = room, before, limit) do
    older = if before, do: Enum.drop_while(room.messages, &(&1.id >= before)), else: room.messages
    {page, rest} = Enum.split(older, limit)
    %History{messages: page, more?: rest != []}
  end
end
```

- No process, no clock, no ids: the server generates the message id and timestamp and passes a complete `Message` in. See [naming.md](naming.md#time-is-an-input).
- `join/2` and `leave/2` cannot fail, so they return the room. `post/2` can, so it returns `{:ok, room}` or `{:error, error}`. `history/3` returns a `History` struct, not a loose tuple. See [callback-patterns.md](callback-patterns.md#reply-shapes).
- History is bounded by `max_messages`, so the state and every reply stay small. See [queuing-large-replies.md](queuing-large-replies.md).

## Contract

```elixir
defmodule MyApp.Chat.JoinRequest do
  @enforce_keys [:member]
  defstruct [:member]
end

defmodule MyApp.Chat.JoinResponse do
  defstruct recent_messages: [], room_ref: nil
end

defmodule MyApp.Chat.PostMessageRequest do
  @enforce_keys [:member_id, :body]
  defstruct [:member_id, :body]
end

defmodule MyApp.Chat.PostMessageResponse do
  defstruct [:message]
end

defmodule MyApp.Chat.ListMessagesRequest do
  defstruct limit: 50, before: nil
end

defmodule MyApp.Chat.ListMessagesResponse do
  defstruct messages: [], more?: false
end

defmodule MyApp.Chat.MessagePosted do
  defstruct [:room_id, :message]
end

defmodule MyApp.Chat.RoomNotFoundError do
  defexception [:room_id]

  @impl Exception
  def message(%__MODULE__{room_id: room_id}), do: "room #{inspect(room_id)} is not running"
end
```

- Every operation takes a Request and answers with a Response, so each can grow by adding fields. See [request-response.md](request-response.md).
- `JoinResponse` carries the recent messages. Joining and reading the backlog in one call means no message can slip in between them.
- `@enforce_keys` is decided now, while there are no callers to break.

## Server

```elixir
defmodule MyApp.Chat.Subscriber do
  defstruct [:member_id, :pid]
end

defmodule MyApp.Chat.RoomServerState do
  defstruct [:room, subscribers: %{}]
end

defmodule MyApp.Chat.RoomServer do
  use GenServer, restart: :temporary

  require Logger

  alias MyApp.Chat.{
    JoinRequest,
    JoinResponse,
    ListMessagesRequest,
    ListMessagesResponse,
    Message,
    MessagePosted,
    PostMessageRequest,
    PostMessageResponse,
    Room,
    RoomNotFoundError,
    RoomServerState,
    Subscriber
  }

  alias MyApp.Chat.Room.History

  @max_messages 500
  @backlog 50
  @idle_timeout :timer.minutes(30)

  def start_link(opts) do
    room_id = Keyword.fetch!(opts, :room_id)
    GenServer.start_link(__MODULE__, room_id, name: via(room_id))
  end

  def whereis(room_id) do
    case Registry.lookup(MyApp.Chat.RoomRegistry, room_id) do
      [{pid, _value}] -> {:ok, pid}
      [] -> {:error, %RoomNotFoundError{room_id: room_id}}
    end
  end

  def ensure_started(room_id) do
    with {:error, %RoomNotFoundError{}} <- whereis(room_id) do
      case DynamicSupervisor.start_child(MyApp.Chat.RoomSupervisor, {__MODULE__, room_id: room_id}) do
        {:ok, pid} -> {:ok, pid}
        {:error, {:already_started, pid}} -> {:ok, pid}
        {:error, error} -> {:error, error}
      end
    end
  end

  defp via(room_id), do: {:via, Registry, {MyApp.Chat.RoomRegistry, room_id}}

  @impl GenServer
  def init(room_id) do
    {:ok, %RoomServerState{room: Room.new(room_id, @max_messages)}, @idle_timeout}
  end

  @impl GenServer
  def handle_call(%JoinRequest{member: member}, {pid, _tag}, %RoomServerState{} = state) do
    ref = Process.monitor(pid)
    subscribers = Map.put(state.subscribers, ref, %Subscriber{member_id: member.id, pid: pid})
    room = Room.join(state.room, member)
    %History{} = history = Room.history(room, nil, @backlog)
    reply(%RoomServerState{state | room: room, subscribers: subscribers}, {:ok, %JoinResponse{recent_messages: history.messages}})
  end

  def handle_call(%PostMessageRequest{} = request, _from, %RoomServerState{} = state) do
    message = %Message{
      id: System.unique_integer([:positive, :monotonic]),
      member_id: request.member_id,
      body: request.body,
      posted_at: DateTime.utc_now()
    }

    case Room.post(state.room, message) do
      {:ok, room} ->
        broadcast(state, %MessagePosted{room_id: room.id, message: message})
        reply(%RoomServerState{state | room: room}, {:ok, %PostMessageResponse{message: message}})

      {:error, error} ->
        reply(state, {:error, error})
    end
  end

  def handle_call(%ListMessagesRequest{} = request, _from, %RoomServerState{} = state) do
    %History{} = history = Room.history(state.room, request.before, request.limit)
    reply(state, {:ok, %ListMessagesResponse{messages: history.messages, more?: history.more?}})
  end

  @impl GenServer
  def handle_info({:DOWN, ref, :process, _pid, _reason}, %RoomServerState{} = state)
      when is_map_key(state.subscribers, ref) do
    {%Subscriber{} = subscriber, subscribers} = Map.pop!(state.subscribers, ref)
    still_present? = Enum.any?(Map.values(subscribers), &(&1.member_id == subscriber.member_id))
    room = if still_present?, do: state.room, else: Room.leave(state.room, subscriber.member_id)
    noreply(%RoomServerState{state | room: room, subscribers: subscribers})
  end

  def handle_info(:timeout, %RoomServerState{subscribers: subscribers} = state)
      when map_size(subscribers) == 0 do
    {:stop, :normal, state}
  end

  def handle_info(msg, %RoomServerState{} = state) do
    Logger.warning("unexpected message: #{inspect(msg)}")
    noreply(state)
  end

  defp broadcast(%RoomServerState{} = state, %MessagePosted{} = event) do
    Enum.each(Map.values(state.subscribers), &send(&1.pid, event))
  end

  defp reply(%RoomServerState{} = state, reply), do: {:reply, reply, state, idle_timeout(state)}

  defp noreply(%RoomServerState{} = state), do: {:noreply, state, idle_timeout(state)}

  defp idle_timeout(%RoomServerState{subscribers: subscribers}) when map_size(subscribers) == 0,
    do: @idle_timeout

  defp idle_timeout(%RoomServerState{}), do: :infinity
end
```

- Callbacks translate messages into core calls and own only what the core must not know: subscriber pids, monitors, the clock, ids, and the idle timeout. That process-only data is why `RoomServerState` exists. See [naming.md](naming.md#process-state).
- The joining process is the subscriber, taken from `from`. The room monitors it and removes the member when its last subscriber goes down. See [handle-info.md](handle-info.md#monitors).
- `broadcast/2` uses `send/2`, which never blocks the room on a slow subscriber.
- An empty room returns `@idle_timeout` from every callback and stops with `:normal` when it fires. A room with subscribers returns `:infinity`.
- `restart: :temporary`: a restart would bring back an empty room that no subscriber is listening to, so a crashed room stays down and the next join starts a fresh one.
- `handle_info/2` ends with a catch-all. See [handle-info.md](handle-info.md#catch-all).

## Public API

```elixir
defmodule MyApp.Chat do
  alias MyApp.Chat.{
    JoinRequest,
    JoinResponse,
    ListMessagesRequest,
    PostMessageRequest,
    RoomServer
  }

  def join(room_id, %JoinRequest{} = request) do
    with {:ok, pid} <- RoomServer.ensure_started(room_id) do
      ref = Process.monitor(pid)

      case GenServer.call(pid, request) do
        {:ok, %JoinResponse{} = response} ->
          {:ok, %JoinResponse{response | room_ref: ref}}

        {:error, error} ->
          Process.demonitor(ref, [:flush])
          {:error, error}
      end
    end
  end

  def post_message(room_id, %PostMessageRequest{} = request), do: call(room_id, request)

  def list_messages(room_id, %ListMessagesRequest{} = request), do: call(room_id, request)

  defp call(room_id, request) do
    with {:ok, pid} <- RoomServer.whereis(room_id) do
      GenServer.call(pid, request)
    end
  end
end
```

- Callers use `MyApp.Chat` and never reference `RoomServer` or call `GenServer.call/2` themselves.
- Only `join/2` starts a room. Posting to or reading from a room that is not running returns `{:error, %RoomNotFoundError{}}` instead of creating an empty one.
- `whereis/1` checks the `Registry` first, so the `DynamicSupervisor` is called only when a room actually starts, not on every request.
- `join/2` monitors the room in the caller's process and returns the ref in `JoinResponse`. A subscriber that receives `:DOWN` for it knows the room is gone and can join again.

## Trade-offs

- A caller can look up a room just before it stops idle and get an exit from `GenServer.call/2`. The room stops only when it has no subscribers, so active members never hit this.
- Subscribers receive `MessagePosted` in their mailbox. A subscriber that cannot keep up grows its own queue, not the room's; for fan-out across nodes, use `Phoenix.PubSub` instead of pids.
- One room is still one queue. A room with thousands of active posters needs its traffic measured; see [mailbox-queuing.md](mailbox-queuing.md).
