# Lifetime Is The Longest Path

The maximum lifetime of an instance is the heaviest path through its state graph, where each arming of a waiting window weighs its deadline, each transition weighs the reaction bound, and nothing else adds time.

## Why It Holds

With every wait bounded (principles 2 to 5), loops counted (unrolled up to their maximum), and terminal states final (principle 6), the state graph is a finite directed acyclic graph apart from self-loops that record progress without changing state. The worst an instance can do is take the path that accumulates the most waiting. That path's weight is `T_max`.

## Computing It

1. Unroll each counted loop to its maximum iterations.
2. Weigh each path: add each window's deadline **once per arming**. A window arms when the path enters any state it covers and disarms when it leaves them all. Moving between states the same window covers does not re-arm it; each unrolled loop iteration that re-enters the window does.
3. Add the timer delivery delay `delta` once per arming.
4. Add the reaction bound `rho` once per transition on the path. `rho` is the stated worst case for delivering a non-timer input and running the reaction that folds it (queue lag for replies and callbacks, plus handler time). It is usually small next to the deadlines, but it is not zero.
5. `T_max` is the maximum over all paths from the initial state to a terminal state.

Graphs for real process managers have a handful of states, so enumerating paths by hand or in a few lines of code is fine.

Worked example:

```text
consent_window  10m  covers AwaitingConsent, CallbackClaimed
exchange        30s  covers Exchanging
reconciliation  15m  covers OutcomeUnknown
delta (scheduler delivery delay)  1m per arming
rho   (reaction bound)            1s per transition

Longest path: AwaitingConsent -> CallbackClaimed -> Exchanging -> OutcomeUnknown -> Failed
Armings: consent_window, exchange, reconciliation (3); transitions: 4
T_max = 10m + 30s + 15m + 3 * 1m + 4 * 1s = 28m34s
Budget: 30m  -> fits
```

## The Budget

Declare a budget per process type: the lifetime the business is willing to promise, including scheduler delay and reaction time, because it is compared with `T_max`, which includes both. It is the number operations will use for version drain (`deploy_time + T_max`) and retention (`T_max` plus audit margin). When `T_max` exceeds the budget, the options are a shorter deadline, a different exit (escalate instead of wait), or splitting the process into chained instances. Raising the budget is allowed, but it is a recorded decision, not a default.

## What Violating It Looks Like

- No one can state how long the process can run.
- Version cutover plans that say "wait until the old instances drain" with no date.
- Retention set to forever because nobody knows when an instance is safe to drop.
- A `T_max` computed without the scheduler delay or the reaction bound, with a shared window counted per state, or with a retried window counted once.

## What The Reviewer Must Cite

The path that yields `T_max`, the armings and transitions on it, the arithmetic, the `delta` and `rho` used and where each comes from, and the budget it is compared with. When the platform states no bound for `delta` or `rho`, say so: `T_max` is then a target, not a guarantee.

## The Wrong Fix It Rules Out

Measuring `T_max` from production (the p99 of instance lifetimes). Observed lifetimes say how long instances happened to run; the bound says how long they can run. Use the measurement to check the bound, never to replace it.
