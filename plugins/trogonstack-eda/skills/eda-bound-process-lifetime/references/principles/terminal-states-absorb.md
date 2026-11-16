# Terminal States Absorb

Once an instance reaches a terminal state, no input can move it again: duplicates, late replies, and late timers are refused or recorded as no-ops.

## Why It Holds

Messaging is at-least-once and unordered at the edges. The reply that lost the race against the deadline still arrives. The timer scheduled before the reply arrived still fires. The command retried by a client after a network blip arrives twice. If any of these can move a finished instance (reopen it, re-run a step, overwrite the outcome), then "finished" is not final, the instance can live past `T_max`, and the bound is fiction.

Absorption has two parts:

- **Refusal by state.** The decide function rejects inputs that do not apply in the current state, and a terminal state accepts none (or accepts them as explicit no-ops that record nothing). The same rule covers non-terminal states a timer no longer covers: a timer for `Exchanging` arriving in `Completed` is refused. A matching state name is not enough when a state can be re-entered: each timer carries the arming it was scheduled for (for example `instance_id + window + attempt`), and the decide function refuses it unless that arming is the active one, so a timer from attempt 1 cannot expire attempt 2.
- **Deterministic identity.** Messages and events carry ids derived from the instance and the step and the input itself (for example a name-based UUID from `instance_id + step + attempt + input type + source id`), not random ids. The input part keeps two different inputs of one step apart, such as both branches of a join, so deduplication never discards one of them. A redelivered command produces the same id, and the store or the decide function recognizes it as already applied.

## Typed Outcomes

Terminal states are typed and few: `Completed`, `Failed(reason)`, `Expired`, `Cancelled`, `Killed`. Each says why the instance ended, which is what operators and compensations need. "Done" with a free-text note is not a typed outcome.

A kill or abort transition, available from every non-terminal state, gives operators a bounded way to end an instance early (for an urgent version cutover, for example), followed by compensation and a restart on the new version.

## What Violating It Looks Like

- A late reply after `Expired` that flips the instance to `Completed`.
- A late timer that moves a completed instance to `Expired`.
- Random event ids, so a redelivered command appends a second event.
- Terminal states that accept "retry" commands and become non-terminal again.
- No way to end an instance early except deleting its data.

## What The Reviewer Must Cite

For each terminal state: what happens to a duplicate command, a late reply, and a late timer. For each timer: what happens when it arrives in a state it does not cover, and when it arrives for an arming that is no longer active. The id scheme for commands and events.

## The Wrong Fix It Rules Out

Cancelling timers on success and calling it handled. Cancellation is itself a message that can be lost or arrive after the timer fired. Refusal in the decide function works regardless of ordering.
