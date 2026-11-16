# Time Is A Message

The deadline reaches the process as an ordinary input it scheduled for itself, never as a clock reading inside a decision.

## Why It Holds

An event-sourced process decides from its history. If a decision reads the current time, replaying the same history on another day gives a different answer, and two replicas can disagree about whether the deadline passed. A timer message removes the clock from the decision: on entering a waiting state, the process schedules its exit input (`ExpireX`, `RecordOutcomeUnknown`) for `now + d` through a durable scheduler, addressed to the same instance. When it arrives, it is folded and decided like any reply. Replays see the recorded expiry event, not the clock.

Because the timer is just another input, it races with the real reply, and it can arrive after the process has moved on. The process must refuse or absorb a timer whose state it has left (see [terminal-states-absorb.md](terminal-states-absorb.md)). That is simpler than cancelling timers: cancellation can fail, refusal cannot.

## The Timer Is Durable With The State

Entering the waiting state and scheduling its timer must not be two independent writes. If the state change is stored and the process crashes before the timer is scheduled, the instance waits with no deadline and no exit. Use one of:

- The transition and the timer intent are recorded atomically (the timer is an event or command in the same append).
- An outbox records the timer intent in the same transaction as the state change, and a relay delivers it to the scheduler.
- A recovery step on restart scans for waiting states whose arming has no scheduled timer and schedules it.

## The Scheduler Is Part Of The Bound

A timer is delivered some time after it is due: queue lag, a scheduler outage, a consumer restart. Call the worst case `delta`. The real bound is the sum of the deadlines plus `delta` for each timer on the path. If the scheduler states no delivery-delay bound, say so in the result; the number is then a target, not a guarantee.

## What Violating It Looks Like

- `if now() > requested_at + 10m then expire` inside a decide or fold function.
- A loop that sleeps and polls the external system until it answers.
- An in-memory timer (process-local `setTimeout`, an actor's `send_after`) with no durable record, so a restart forgets the deadline.
- Expiry decided by a query over all instances (`WHERE requested_at < now() - 10m`), which is the reaper of [deadline-and-exit.md](deadline-and-exit.md).

## What The Reviewer Must Cite

Who schedules each timer, when (on entering which state), how the timer intent is made durable together with the state transition, what input it delivers, where it is delivered (same stream or correlation), how a late timer is refused, and the scheduler's stated delivery delay.

## The Wrong Fix It Rules Out

Replacing the clock read with a more precise clock. Precision is not the problem; nondeterminism under replay and the lack of a recorded exit are.
