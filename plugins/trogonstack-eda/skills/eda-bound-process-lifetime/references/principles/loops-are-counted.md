# Loops Are Counted, Never Conditional

A loop adds bounded lifetime only when its number of iterations is fixed before it starts.

## Why It Holds

Each iteration of a loop may contain a bounded wait, but the number of iterations multiplies it. `retry until success` with a 30 second deadline per attempt is unbounded, because nothing caps the attempts. `retry at most 3 times` with the same deadline costs at most 90 seconds plus backoff. The difference is whether the exit depends only on the outside world (unbounded) or also on a counter the process owns (bounded).

A state that can be re-entered (`Pending -> Retrying -> Pending`) is a loop even if nobody calls it one. Every cycle in the state graph needs a counter carried in state, and the counter is part of the definition, not a runtime setting someone can raise to infinity.

## Decomposing What Must Run Forever

Some behavior really does repeat without end: a monitor that checks an entity every day, a subscription that renews monthly. Model each period as its own bounded instance that, at its end, starts the next one (or is started by a schedule). Each instance has a `T_max`; the chain does not need one. Versioning then works per instance: a new period starts on the new version.

## What Violating It Looks Like

- `while not done: send; wait` with no counter.
- Retry policies configured as "infinite" or "until success" for a step inside a process.
- Backoff with no cap on attempts (exponential backoff bounds the rate, not the count).
- A cycle in the state table with no counter field in state.
- A long-running "watcher" process that never terminates by design.

## What The Reviewer Must Cite

For each cycle in the state graph: the counter, its maximum, where the maximum is defined, and the exit taken when it is exhausted (typically `Failed` with a reason, or escalation).

## The Wrong Fix It Rules Out

Adding a global timeout on top of an uncounted loop. It bounds the instance but hides that the loop itself never gives up, and the timeout's exit rarely means what the loop's exhaustion should mean.
