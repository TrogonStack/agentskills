# Review Checklist

## Justification ([process-justification.md](process-justification.md))

- [ ] The process owns something concrete: shared state, a resource, a lifecycle, or a failure boundary
- [ ] No stateless operation (DB, HTTP, computation) is routed through it

## Queuing ([mailbox-queuing.md](mailbox-queuing.md))

- [ ] Hot-path throughput fits within `1 / handling_time` of one process, or the work is partitioned
- [ ] No unbounded casts from producers that can outrun the server
- [ ] No blocking I/O inside callbacks on a hot path

## Module Shape ([callback-patterns.md](callback-patterns.md))

- [ ] Client API wraps every message; message tuples never leak
- [ ] Callbacks delegate to pure, separately tested functions
- [ ] `init/1` is fast; slow work runs in `handle_continue/2`
- [ ] `handle_info/2` has a catch-all clause
- [ ] Process names never built from untrusted input

## Supervision ([supervision-and-testing.md](supervision-and-testing.md))

- [ ] Restart strategy matches the process lifecycle
