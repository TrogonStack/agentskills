# Supervision and Testing

A restart repairs state and nothing else: it fixes corruption and transient faults, and repeats any fault that lives outside the process. Supervise for the faults a clean start fixes, and test logic where it lives, in the pure core.

## Restart Strategy

`use GenServer` generates `child_spec/1` with `restart: :permanent`. Override it when that is wrong:

```elixir
use GenServer, restart: :transient
```

| Strategy | Restarts when | Fits |
|----------|---------------|------|
| `:permanent` | Always | Long-lived services |
| `:transient` | Abnormal exit only | Work that can finish normally, per-entity processes |
| `:temporary` | Never | One-shot processes whose failure the caller handles |

## Cleanup

- `terminate/2` runs on supervisor shutdown only if the process traps exits (`Process.flag(:trap_exit, true)`) and finishes within the child spec `shutdown` value.
- Trap exits only when cleanup is required, and set an explicit `shutdown`.
- Do not rely on `terminate/2` for anything that must happen; a `:kill` skips it. Tie the resource to a process exit instead; see [resource-lifecycle-ownership.md](resource-lifecycle-ownership.md).

## State Across Restarts

A restart starts from `init/1` with fresh state. If state must survive a crash, persist it, or rebuild it in `handle_continue/2` from a durable source.

## Testing

- Test the pure core directly, without processes. Most logic lives there.
- Start servers with `start_supervised!/1` so ExUnit stops them between tests.
- Pass a unique `:name` per test to keep `async: true`.
- Assert through the client API. Use `:sys.get_state/1` only as a last resort.
- For queuing behavior, measure handling time of the pure core and reason with `1 / handling_time` rather than load-testing the process in unit tests.
