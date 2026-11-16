# Concurrent Waits Share One Window

When a process waits for several inputs as one step, a single deadline covers the step, and the partial states inherit that deadline instead of starting new ones.

## Why It Holds

Waiting for A **and** B is one logical wait. Implemented as a state machine it becomes several states (`WaitingForBoth`, `GotA`, `GotB`), and it is tempting to give each its own deadline. Then a slow A followed by a slow B costs two deadlines, and the bound grows with the number of partial states. One window, set when the step begins and covering every partial state, keeps the cost at one deadline however the inputs arrive.

Waiting for A **or** B is also one wait: the first arrival ends it, and the deadline covers the step until then.

The same shape appears without concurrency. A phase that is set up once and then passes through several states (consent link issued, callback received, code exchange about to start) often has one deadline fixed at the start of the phase. Modelling it per state would count it twice.

## How To Declare It

Give the window a name, a duration, the set of states it covers, and its exit. It arms on entering the set and disarms on leaving it. A window whose covered states are not contiguous on every path would re-arm, which is a design error.

```text
window consent_window: 10m, covers [AwaitingConsent, CallbackClaimed], on deadline: Expire
window exchange:       30s, covers [Exchanging],                       on deadline: RecordOutcomeUnknown
```

## What Violating It Looks Like

- Separate timeouts on `GotA` and `GotB`, each restarting the clock.
- A deadline stored once on the record but documented per state, so readers add it up twice.
- A join that waits for "all replies" with a per-reply timeout and no overall one.

## What The Reviewer Must Cite

For each join or multi-state phase: the window, the states it covers, when it arms and disarms, and its exit. For a disjunction: which arrival ends it and what happens to the losers (they are late inputs, absorbed per [terminal-states-absorb.md](terminal-states-absorb.md)).

## The Wrong Fix It Rules Out

Reducing per-state deadlines until their sum looks acceptable. The problem is double counting, not the values; shrinking them makes the honest single deadline too short.
