# Review Checklist

## Justification ([process-justification.md](process-justification.md))

- [ ] The process owns something concrete: shared state, a resource, a lifecycle, or a failure boundary
- [ ] No stateless operation (DB, HTTP, computation) is routed through it

## Queuing ([mailbox-queuing.md](mailbox-queuing.md))

- [ ] Hot-path throughput fits within `1 / handling_time` of one process, or the work is partitioned
- [ ] No unbounded casts from producers that can outrun the server
- [ ] No blocking I/O inside callbacks on a hot path
- [ ] Replies return only what the caller needs, not whole collections
- [ ] Handling time and mailbox length are measured with telemetry

## Module Shape ([callback-patterns.md](callback-patterns.md))

- [ ] Client API wraps every `call`/`cast`; callers never send messages directly
- [ ] Callbacks delegate to pure, separately tested functions
- [ ] `init/1` is fast; slow work runs in `handle_continue/2`, unless siblings need the state at boot
- [ ] Persistent dependency failures retry with backoff instead of crash-looping the supervisor
- [ ] Replies and core results are `:ok`, `{:ok, value}`, or `{:error, error}`, never longer tuples
- [ ] Process names never built from untrusted input
- [ ] Secrets in state are redacted with `format_status/1`

## handle_info ([handle-info.md](handle-info.md))

- [ ] Callbacks never call the module's own client API
- [ ] Self-sent and timer messages are structs; OTP and library tuples are matched as defined
- [ ] Timers use `Process.send_after/3` with a token to ignore stale ticks
- [ ] Pids held in state are monitored and removed on `:DOWN`
- [ ] `handle_info/2` ends with a catch-all clause

## Naming ([naming.md](naming.md))

- [ ] Pure core named after a domain concept, not a role (`State`, `Core`, `Logic`, `Impl`)
- [ ] The domain struct is the state; a `<Name>ServerState` wrapper exists only for process-only data or several domain structs
- [ ] Server modules carry the domain name (`RateLimiterServer`), never a bare `.Server`
- [ ] GenServer messages are `<Operation>Request` / `<Operation>Response` structs, not tuples
- [ ] The pure core never references the Request/Response structs

## Contracts ([request-response.md](request-response.md))

- [ ] Every operation takes a Request struct, even with no fields
- [ ] Replies carry a Response struct, never a bare list, map, or scalar
- [ ] Collections sit in a named field of the Response
- [ ] New fields have defaults; no field callers read was renamed or removed

## Supervision ([supervision-and-testing.md](supervision-and-testing.md))

- [ ] Restart strategy matches the process lifecycle
