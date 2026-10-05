# Review Checklist

## Justification ([process-justification.md](process-justification.md))

- [ ] The process owns something concrete: shared state, a resource, a lifecycle, or a failure boundary
- [ ] No stateless operation (DB, HTTP, computation) is routed through it

## Queuing ([mailbox-queuing.md](mailbox-queuing.md))

- [ ] Hot-path throughput fits within `1 / handling_time` of one process, or the work is partitioned
- [ ] No unbounded casts from producers that can outrun the server
- [ ] No blocking I/O inside callbacks on a hot path

## Module Shape ([callback-patterns.md](callback-patterns.md))

- [ ] Client API wraps every `call`/`cast`; callers never send messages directly
- [ ] Callbacks delegate to pure, separately tested functions
- [ ] `init/1` is fast; slow work runs in `handle_continue/2`, unless siblings need the state at boot
- [ ] Persistent dependency failures retry with backoff instead of crash-looping the supervisor
- [ ] Replies and core results are `:ok`, `{:ok, value}`, or `{:error, error}`, never longer tuples
- [ ] `handle_info/2` has a catch-all clause
- [ ] Process names never built from untrusted input

## Naming ([naming.md](naming.md))

- [ ] Pure core named after a domain concept, not a role (`State`, `Core`, `Logic`, `Impl`)
- [ ] The domain struct is the state; a `<Name>ServerState` wrapper exists only for process-only data or several domain structs
- [ ] Server modules carry the domain name (`RateLimiterServer`), never a bare `.Server`
- [ ] GenServer messages are `<Operation>Request` / `<Operation>Response` structs, not tuples
- [ ] The pure core never references the Request/Response structs

## Supervision ([supervision-and-testing.md](supervision-and-testing.md))

- [ ] Restart strategy matches the process lifecycle
