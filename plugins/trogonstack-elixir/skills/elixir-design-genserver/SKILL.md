---
name: elixir-design-genserver
description: "Design or review Elixir GenServer modules. Decides whether a process is needed at all, shapes the client API, picks call vs cast, handles slow initialization, timeouts, and unexpected messages, and places the server under supervision. Use when writing a new GenServer, reviewing an existing one, or refactoring a process that became a bottleneck. Do not use for: (1) designing full supervision trees across an application, (2) distributed Erlang or clustering, (3) Phoenix LiveView or Channel processes, (4) GenStage, Broadway, or Flow pipelines."
allowed-tools:
  - AskUserQuestion
  - Read
  - Write
  - Shell
---

# Design an Elixir GenServer

Design GenServers that exist for a runtime reason, expose a small client API, keep business logic out of callbacks, and fail in ways their supervisor can recover from.

## Core Principle

Use a process to model runtime concerns (shared mutable state, concurrency, fault isolation, lifecycle), never to organize code. Code organization belongs in modules and functions.

## Do You Need a GenServer?

Answer before writing any callback:

| Need | Use |
|------|-----|
| Pure transformation of data | Plain module and functions |
| One-off concurrent work, result awaited | `Task` / `Task.async_stream` |
| Fire-and-forget work that must survive the caller | `Task.Supervisor.start_child` |
| Read-heavy shared data, many concurrent readers | ETS table (owned by a process) or `:persistent_term` for rarely changing data |
| Simple shared state with no logic | `Agent` (rarely worth it over a GenServer) |
| Shared state with logic, serialized access, lifecycle, or periodic work | `GenServer` |
| Many processes of the same kind, looked up by key | `GenServer` + `Registry` + `DynamicSupervisor` |

A GenServer handles one message at a time. Every call through a single named server is serialized, so a global singleton on a hot path is a bottleneck by design.

## Module Layout

Keep three layers in one module, or split the pure core into its own module when it grows:

```elixir
defmodule MyApp.RateLimiter do
  use GenServer

  alias MyApp.RateLimiter.Bucket

  # Client API

  def start_link(opts) do
    {name, opts} = Keyword.pop(opts, :name, __MODULE__)
    GenServer.start_link(__MODULE__, opts, name: name)
  end

  def allow?(server \\ __MODULE__, key) do
    GenServer.call(server, {:allow?, key})
  end

  # Server callbacks

  @impl GenServer
  def init(opts) do
    {:ok, Bucket.new(opts)}
  end

  @impl GenServer
  def handle_call({:allow?, key}, _from, bucket) do
    {result, bucket} = Bucket.take(bucket, key)
    {:reply, result, bucket}
  end
end
```

Rules:

- Callers never call `GenServer.call/cast` directly. The client API is the contract; message shapes are private.
- Callbacks delegate to pure functions (`Bucket.take/2` above) that take state and return new state. Test those without a process.
- Mark every callback with `@impl GenServer`.
- Accept `:name` (and the server reference in client functions) so tests can start isolated instances.
- Hold state in a struct, not a loose map, so its shape is documented and enforced.

## call vs cast

- Default to `call`. It gives back-pressure, surfaces errors to the caller, and confirms the work happened.
- Use `cast` only when the caller truly does not care about the outcome and producers cannot outrun the server. Unbounded casts grow the mailbox until the node runs out of memory.
- Use `send/2` + `handle_info/2` for messages from things that are not your client API: timers, monitors, ports, other libraries.

## Initialization

`init/1` blocks the caller of `start_link`, which during boot means it blocks the supervisor and every sibling started after it.

- Keep `init/1` fast. Return `{:ok, state, {:continue, :load}}` and do slow work (DB reads, network) in `handle_continue/2`.
- Do not hide failures: if the server cannot work without the loaded data, let `handle_continue` crash so the supervisor restarts it.
- Return `:ignore` when configuration disables the server, rather than starting an idle process.

## Timeouts and Long Work

- `GenServer.call/3` defaults to a 5 second timeout and exits the caller on expiry. Set an explicit timeout when work is known to be slow, and question why it is slow inside a serialized process.
- Do not block the server on slow I/O. Offload to a `Task` under a `Task.Supervisor`, reply later with `GenServer.reply/2` (return `{:noreply, state}` from `handle_call` and keep `from`), and handle the task result in `handle_info/2`.
- For periodic work use `Process.send_after/3` and reschedule inside `handle_info/2`. Avoid `:timer.send_interval/2`, which keeps firing even when the server falls behind.

## Unexpected Messages

`use GenServer` injects a default `handle_info/2` that logs unexpected messages. Once you define your own `handle_info/2`, that default is gone, so add a catch-all clause that logs and keeps state, otherwise an unknown message crashes the server with a `FunctionClauseError`.

```elixir
@impl GenServer
def handle_info(msg, state) do
  Logger.warning("unexpected message: #{inspect(msg)}")
  {:noreply, state}
end
```

## Naming and Discovery

- Singleton: `name: __MODULE__`. Only for genuinely one-per-node services.
- Many instances: `name: {:via, Registry, {MyApp.Registry, key}}`, started under a `DynamicSupervisor`.
- Never create atoms from user input to name processes. Atoms are not garbage collected.

## Supervision

- `use GenServer` generates `child_spec/1`. Override with `use GenServer, restart: :transient` (or `:temporary`) when the default `:permanent` is wrong.
- `:permanent`: always restart. `:transient`: restart only on abnormal exit. `:temporary`: never restart.
- Trap exits (`Process.flag(:trap_exit, true)`) only when you must run `terminate/2` for cleanup, and set an explicit `shutdown` in the child spec. `terminate/2` is not guaranteed to run otherwise.
- State is lost on restart. If it must survive a crash, persist it or rebuild it in `handle_continue`.

## Testing

- Test the pure core directly, without processes.
- Start servers with `start_supervised!/1` so ExUnit stops them between tests, and pass a unique `:name` to keep tests `async: true`.
- Do not assert on internal state with `:sys.get_state/1` except as a last resort; assert through the client API.

## Review Checklist

- [ ] A process is justified by a runtime concern, not code organization
- [ ] Client API wraps every `call`/`cast`; message tuples never leak
- [ ] Callbacks delegate to pure, separately tested functions
- [ ] `call` is the default; every `cast` has a reason
- [ ] `init/1` is fast; slow work moved to `handle_continue/2`
- [ ] No blocking I/O inside callbacks on a hot path
- [ ] `handle_info/2` has a catch-all clause
- [ ] Restart strategy matches the process lifecycle
- [ ] Process names never built from untrusted input
- [ ] Tests use `start_supervised!/1` with isolated names
