# Resource Lifecycle Ownership

When a resource should live exactly as long as a process, tie it to that process and let the exit release it. Exit is the one cleanup path that always runs: a crash, a `:kill`, or a node shutdown skips `terminate/2` and any explicit `release/1`, but never the exit.

## What the Runtime Cleans Up

| Resource | When the owning process exits |
|----------|-------------------------------|
| ETS table | Deleted, or given to its `heir` |
| Port or socket | Closed |
| `Registry` key | Unregistered |
| Monitor | The watcher receives `:DOWN` |
| Link | Linked processes receive an exit signal |

Files, rows, external leases, and anything else outside the VM are not on this list. The runtime cannot release them; see [External Resources](#external-resources).

## Two Roles

- **Owner:** the process is the lifetime. It holds the resource, and the resource ends when the process ends. A connection process owns its socket; a room owns its ETS table.
- **Observer:** the process watches someone else's lifetime. It monitors that process and releases the resource on `:DOWN`.

Neither role serves calls on the hot path, so neither becomes a queue. Both satisfy "A Process Must Own Something": the process owns a lifecycle.

## Avoid

```elixir
@impl GenServer
def handle_call(%AcquireRequest{key: key}, {pid, _tag}, %LockServerState{} = state) do
  if Map.has_key?(state.holders, key) do
    {:reply, {:error, %LockHeldError{key: key}}, state}
  else
    {:reply, :ok, %LockServerState{state | holders: Map.put(state.holders, key, pid)}}
  end
end

@impl GenServer
def handle_call(%ReleaseRequest{key: key}, _from, %LockServerState{} = state) do
  {:reply, :ok, %LockServerState{state | holders: Map.delete(state.holders, key)}}
end
```

The lock is released only when the holder remembers to call `release`. A holder that crashes, times out, or is killed holds the lock forever, and every caller queues behind one process to acquire it.

## Prefer

Let the holder own the lock. A unique `Registry` key belongs to the process that registered it and disappears when that process exits:

```elixir
children = [{Registry, keys: :unique, name: MyApp.Locks}]
```

```elixir
defmodule MyApp.Locks do
  def acquire(key) do
    case Registry.register(__MODULE__, key, nil) do
      {:ok, _owner} -> :ok
      {:error, {:already_registered, holder}} -> {:error, %LockHeldError{key: key, holder: holder}}
    end
  end

  def release(key), do: Registry.unregister(__MODULE__, key)
end
```

- `release/1` is an optimization for holders that finish early. Correctness never depends on it.
- There is no lock server to queue behind. `Registry` partitions its own bookkeeping.
- `Registry` is local to one node. A lock that must hold across nodes belongs in the database; see [anti-pattern-database-gatekeeper.md](anti-pattern-database-gatekeeper.md).

## External Resources

When the resource lives outside the VM, a process still gives it a lifetime, but the release is code that can be skipped. Make the process an observer of the real owner and keep a backstop for the cases it misses:

```elixir
defmodule MyApp.Uploads.ScratchDirServer do
  use GenServer, restart: :temporary

  def start_link(%ScratchDir{} = scratch_dir) do
    GenServer.start_link(__MODULE__, scratch_dir)
  end

  @impl GenServer
  def init(%ScratchDir{} = scratch_dir) do
    Process.flag(:trap_exit, true)
    owner_ref = Process.monitor(scratch_dir.owner)

    case File.mkdir_p(scratch_dir.path) do
      :ok -> {:ok, %ScratchDirServerState{scratch_dir: scratch_dir, owner_ref: owner_ref}}
      {:error, reason} -> {:stop, reason}
    end
  end

  @impl GenServer
  def handle_info({:DOWN, ref, :process, _pid, _reason}, %ScratchDirServerState{owner_ref: ref} = state) do
    {:stop, :normal, state}
  end

  @impl GenServer
  def terminate(_reason, %ScratchDirServerState{} = state) do
    File.rm_rf(state.scratch_dir.path)
  end
end
```

```elixir
def open_scratch_dir(owner \\ self()) do
  path = Path.join(System.tmp_dir!(), "upload-#{System.unique_integer([:positive])}")
  scratch_dir = %ScratchDir{owner: owner, path: path}

  case DynamicSupervisor.start_child(MyApp.ScratchDirs, {ScratchDirServer, scratch_dir}) do
    {:ok, _pid} -> {:ok, scratch_dir}
    {:error, error} -> {:error, error}
  end
end
```

- The directory follows the owner, a request or a LiveView, without the owner calling anything. When the owner exits, the server stops and removes it.
- `restart: :temporary`: a restarted server would watch nothing, and its owner may already be gone.
- Trapping exits makes `terminate/2` run on supervisor shutdown, within the child spec `shutdown`.
- A monitor, not a link: the owner's crash should stop the server cleanly, and the server's crash should not take the owner down.
- `terminate/2` is still skipped by `:kill` and by a VM crash. Sweep stale directories when the application boots; the sweep is what makes the cleanup certain, the server is what makes it prompt.

## Smells in Review

- Cleanup depends on callers remembering to call `release`, `close`, or `stop`
- `terminate/2` is the only place a resource is released
- State holds pids with no monitor, so entries for dead processes stay forever
- A link where a monitor belongs: the observer dies with the process it watches
- A process recreates, on restart, a resource whose owner is gone

## Trade-offs

- An ETS table dies with its owner; give it an `heir` or a longer-lived parent when readers must survive a crash. See [queuing-reads-from-ets.md](queuing-reads-from-ets.md).
- One observer per resource is a process per resource. That is cheap, but it is still a process to supervise; a single observer that monitors many owners fits when the resources are small and uniform. See [handle-info.md](handle-info.md#monitors).
- When `terminate/2` runs and when it does not is covered in [supervision-and-testing.md](supervision-and-testing.md#cleanup).
