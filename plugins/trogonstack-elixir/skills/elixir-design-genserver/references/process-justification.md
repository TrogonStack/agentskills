# Where an Actor Belongs, and Why

A process is justified by what it owns at runtime, never by the code it contains. Code is organized by modules; a process exists because something must be owned by exactly one place while many callers use it.

## The Question to Ask

"What does this process own that cannot live in the caller?"

Valid answers:

| Owns | Example |
|------|---------|
| Mutable state shared by many callers that must change consistently | Rate limiter buckets, in-memory counters, a game room |
| A resource with its own lifecycle | Socket, port, file handle, external connection |
| Time | Periodic jobs, debouncing, expiring sessions |
| A failure boundary | Code that may crash and must not take the caller down |

Invalid answers:

- "It is the service layer for users / orders / billing." That is a module.
- "It encapsulates the logic." Modules encapsulate logic.
- "It wraps the database / HTTP client." Those calls are already concurrent and pooled; a GenServer in front serializes them.
- "It makes writes fault tolerant" or "it prevents race conditions." Neither holds for database writes; see [anti-pattern-database-gatekeeper.md](anti-pattern-database-gatekeeper.md).
- "It runs in the background." That is a `Task` under a `Task.Supervisor`.
- "It caches data." Reads belong in ETS or `:persistent_term`; a process may own the table, but readers should not message it.

## Picking the Right Tool

| Need | Use |
|------|-----|
| Pure transformation of data | Plain module and functions |
| DB query or HTTP request | Call it from the caller's process |
| One-off concurrent work, result awaited | `Task` / `Task.async_stream` |
| Fire-and-forget work that must survive the caller | `Task.Supervisor.start_child` |
| Read-heavy shared data | ETS table owned by a process ([queuing-reads-from-ets.md](queuing-reads-from-ets.md)), or `:persistent_term` for rarely changing data |
| Shared state with logic, lifecycle, or timers | `GenServer` |
| One process per entity, looked up by key | `GenServer` + `Registry` + `DynamicSupervisor` ([queuing-process-per-entity.md](queuing-process-per-entity.md)) |
| Keyed state bottlenecked in one server | `PartitionSupervisor` (Elixir 1.14+, [queuing-partition-by-key.md](queuing-partition-by-key.md)) |

## The Anti-Pattern

A GenServer whose state is never used, forwarding every request to the database or an HTTP client. See [queuing-remove-the-process.md](queuing-remove-the-process.md) for the example and its fix.

## Smells in Review

- `state` is ignored or is `nil` / `%{}` forever
- Every `handle_call` clause is a thin pass-through to another module
- Callbacks wrap `Repo` calls ([anti-pattern-database-gatekeeper.md](anti-pattern-database-gatekeeper.md))
- The module is a named singleton and every web request calls it
- The GenServer exists "for consistency" with other modules
- Removing `use GenServer` and the callbacks would change nothing but concurrency
