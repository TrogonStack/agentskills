# Lifetime Is The Longest Path

The maximum lifetime of an instance is the heaviest path through its state graph, where waiting windows weigh their deadline and everything else weighs zero.

## Why It Holds

With every wait bounded (principles 2 to 5), loops counted (unrolled up to their maximum), and terminal states final (principle 6), the state graph is a finite directed acyclic graph apart from self-loops that record progress without changing state. The worst an instance can do is take the path that accumulates the most waiting. That path's weight is `T_max`.

## Computing It

1. Unroll each counted loop to its maximum iterations.
2. Weigh each path: add each window's deadline **once** if the path passes through any state it covers. Instant transitions and self-loops add nothing.
3. Add the timer delivery delay `delta` once per window on the path.
4. `T_max` is the maximum over all paths from the initial state to a terminal state.

Graphs for real process managers have a handful of states, so enumerating paths by hand or in a few lines of code is fine.

Worked example:

```text
consent_window  10m  covers AwaitingConsent, CallbackClaimed
exchange        30s  covers Exchanging
reconciliation  15m  covers OutcomeUnknown
delta (scheduler delivery delay)  1m per timer

Longest path: AwaitingConsent -> CallbackClaimed -> Exchanging -> OutcomeUnknown -> Failed
T_max = 10m + 30s + 15m + 3 * 1m = 28m30s
Budget: 30m  -> fits
```

## The Budget

Declare a budget per process type: the lifetime the business is willing to promise. It is the number operations will use for version drain (`deploy_time + T_max`) and retention (`T_max` plus audit margin). When `T_max` exceeds the budget, the options are a shorter deadline, a different exit (escalate instead of wait), or splitting the process into chained instances. Raising the budget is allowed, but it is a recorded decision, not a default.

## What Violating It Looks Like

- No one can state how long the process can run.
- Version cutover plans that say "wait until the old instances drain" with no date.
- Retention set to forever because nobody knows when an instance is safe to drop.
- A `T_max` computed without the scheduler delay, or with a shared window counted per state.

## What The Reviewer Must Cite

The path that yields `T_max`, the arithmetic, the `delta` used and where it comes from, and the budget it is compared with.

## The Wrong Fix It Rules Out

Measuring `T_max` from production (the p99 of instance lifetimes). Observed lifetimes say how long instances happened to run; the bound says how long they can run. Use the measurement to check the bound, never to replace it.
