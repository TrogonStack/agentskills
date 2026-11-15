# Every Waiting State Has A Deadline And A Named Exit

A wait is bounded only when it states both how long it will wait and which event ends it when the time is up.

## Why It Holds

A deadline alone does nothing: when it passes, something has to happen, and that something must be a recorded transition to a known state, or the instance is still sitting where it was. An exit alone (a `Cancel` command, an `Expire` command) does nothing either if no one is obliged to send it by a known time. Bounding needs the pair: after `d`, the process receives the exit input and moves to a defined state.

The exit also has to *mean* something. "The provider never answered" can mean the request failed, the request may have succeeded and needs reconciliation, the user abandoned the flow, or the step should be escalated to a person. Those are different business outcomes with different follow-ups. Choosing between them is a product or domain decision, so it is asked for, not invented.

## Choosing The Deadline Value

- **From the other party's contract.** A provider's documented response time, a token or code lifetime, a payment network's settlement window. The deadline is no shorter than what the other side may legitimately take.
- **From the person waiting.** For human steps: how long until the request is stale for the business (a consent link, an approval request, a quote). Then decide the exit: expire, remind and extend once (counted), or escalate.
- **From what the exit costs.** A short deadline whose exit is "outcome unknown, reconcile" is cheap. A short deadline whose exit is "fail and refund" is expensive when it fires spuriously.
- **Round and named.** `10m consent window`, `30s provider response`, not `437s`. Deadlines are read by people during incidents.

## What Violating It Looks Like

- A waiting state whose only exits are the happy reply and an explicit cancel.
- An expiry field stored on the record that nothing schedules or acts on.
- "A reaper sweeps instances stuck in X." The reaper is a deadline with no stated value and an exit decided at sweep time. It is evidence of a missing deadline.
- A timeout in the client library (HTTP timeout, RPC deadline) treated as the process deadline. The client timeout bounds one call; if the response is lost, the process is still waiting unless the timeout produces a recorded exit event.
- A human approval with no expiry because "they will get to it".

## What The Reviewer Must Cite

For each waiting state: the deadline value and where it is configured, the exit event, the state the exit leads to, and what that state means for the business. For a missing value or meaning: a finding, and the question to ask.

## The Wrong Fix It Rules Out

Keeping the reaper and tuning its interval. A reaper decides outcomes in bulk, outside the process, on a schedule nobody reasons about; a deadline decides one outcome inside the process at a stated time. A reaper may remain as a backstop for a broken scheduler, but then it only *delivers* the exit the process already expects, it never chooses one.
