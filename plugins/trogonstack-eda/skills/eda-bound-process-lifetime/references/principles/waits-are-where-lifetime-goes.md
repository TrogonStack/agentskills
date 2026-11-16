# Waits Are Where Lifetime Goes

An instance spends its life in the states where it waits for something it does not control; every other transition takes no meaningful time.

## Why It Holds

A process manager reacts: an input arrives, it folds the input into state, decides, emits commands, and stops. That reaction is bounded by the code that runs it. Between reactions the instance is idle, parked in a state until the next input. If the next input is something the process itself controls (an internal step that fires immediately), the state is instant. If the next input comes from another actor (a service reply, a provider callback, a person clicking, a payment network, a timer), the state is waiting, and its duration is decided outside the process.

So the lifetime question is entirely a question about waiting states. Finding them is the first step, and missing one is the most common way a bound turns out wrong.

## How To Spot A Waiting State

- A command or request was just sent and the state name says so: `Requested`, `Pending`, `Awaiting...`, `Sent`, `InFlight`, `Exchanging`, `Submitted`.
- The only ways out are events produced by another service, a human, or an external provider.
- The state exists so a correlation id can be matched against a later reply.
- An "unknown outcome" state after a lost response: the process is waiting for reconciliation, which is a wait.
- A human step: approval, consent, review, signature. Human waits are the longest and the most often left unbounded.

Instant states, by contrast, are left by an event the process emits itself in the same reaction or the next internal step (`Validated`, `Routed`, `Recorded`). They need no deadline.

## What Violating It Looks Like

- A state table where every state looks alike and nobody can say which ones park the instance.
- A "processing" state that actually waits on an external call, so it is treated as instant and gets no deadline.
- An outcome-unknown or reconciliation state listed as a recovery detail rather than as a state the instance can sit in.

## What The Reviewer Must Cite

For each non-terminal state: instant or waiting, and for waiting states, which actor the process is waiting on and which event it expects.

## The Wrong Fix It Rules Out

Putting a single global timeout on the whole instance and calling it bounded. One overall deadline hides which wait is slow, gives every exit the same meaning, and usually ends up much larger than the sum of honest per-wait deadlines. The global budget belongs in [longest-path.md](longest-path.md) as a check on the per-wait deadlines, not as a replacement for them.
