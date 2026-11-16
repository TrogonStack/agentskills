# Declare And Check

How to move from a reviewed lifecycle table to a bound a program enforces. The point is determinism: whether a process is bounded must be a pure function of its declaration, so the same schema always gives the same verdict and a regression fails CI instead of waiting for a reviewer to notice.

There is no framework here. The pattern is three small pieces any team can build: a declaration, a checker, and a conformance test.

## 1. Declare

Put the lifecycle next to the schema of the events it describes, so a change to the events and a change to the lifecycle land in the same diff. With protobuf, a custom message option on the aggregate's event envelope works well:

```proto
edition = "2023";

package example.process.v1;

import "google/protobuf/descriptor.proto";
import "google/protobuf/duration.proto";

extend google.protobuf.MessageOptions {
  // Placed on the message that holds the aggregate's `oneof event`.
  // Use a field number from your organization's registered extension range.
  Lifecycle lifecycle = 50100;
}

message Lifecycle {
  google.protobuf.Duration budget = 1;   // promised maximum lifetime, including scheduler delay and reaction time
  string genesis_event = 2;              // oneof field name of the first event
  string initial_state = 3;
  repeated State states = 4;
  repeated Transition transitions = 5;
  repeated Window windows = 6;
  google.protobuf.Duration scheduler_delay = 7;  // delta: worst-case timer delivery delay
  google.protobuf.Duration reaction_bound = 8;   // rho: worst-case non-timer delivery plus handling
}

enum StateKind {
  STATE_KIND_UNSPECIFIED = 0;
  STATE_KIND_WAITING = 1;
  STATE_KIND_INSTANT = 2;
  STATE_KIND_TERMINAL = 3;
}

message State {
  string name = 1;
  StateKind kind = 2;  // the initial state is named by Lifecycle.initial_state
}

message Transition {
  string from = 1;
  string event = 2;  // oneof field name on the envelope
  string to = 3;     // equal to `from` for progress that does not change state
}

message Window {
  string name = 1;
  google.protobuf.Duration within = 2;
  repeated string covers = 3;   // armed on entering the set, disarmed on leaving it
  string on_deadline = 4;       // command message delivered when the window expires
}
```

Annotated envelope:

```proto
message AttemptEvent {
  option (example.process.v1.lifecycle) = {
    budget: { seconds: 1800 }
    scheduler_delay: { seconds: 60 }
    reaction_bound: { seconds: 1 }
    genesis_event: "begun"
    initial_state: "AwaitingConsent"
    states: [
      { name: "AwaitingConsent", kind: STATE_KIND_WAITING },
      { name: "CallbackClaimed", kind: STATE_KIND_WAITING },
      { name: "Exchanging",      kind: STATE_KIND_WAITING },
      { name: "OutcomeUnknown",  kind: STATE_KIND_WAITING },
      { name: "Completed", kind: STATE_KIND_TERMINAL },
      { name: "Failed",    kind: STATE_KIND_TERMINAL },
      { name: "Cancelled", kind: STATE_KIND_TERMINAL },
      { name: "Expired",   kind: STATE_KIND_TERMINAL }
    ]
    transitions: [
      { from: "AwaitingConsent", event: "callback_claimed", to: "CallbackClaimed" },
      { from: "CallbackClaimed", event: "exchange_started", to: "Exchanging" },
      { from: "Exchanging", event: "authority_captured", to: "Exchanging" },
      { from: "Exchanging", event: "outcome_unknown_recorded", to: "OutcomeUnknown" },
      { from: "Exchanging", event: "completed", to: "Completed" }
      // ... every other transition from the lifecycle table
    ]
    windows: [
      { name: "consent_window", within: { seconds: 600 },
        covers: ["AwaitingConsent", "CallbackClaimed"], on_deadline: "ExpireAuthorization" },
      { name: "exchange", within: { seconds: 30 },
        covers: ["Exchanging"], on_deadline: "RecordOutcomeUnknown" },
      { name: "reconciliation", within: { seconds: 900 },
        covers: ["OutcomeUnknown"], on_deadline: "FailAuthorization" }
    ]
  };

  oneof event {
    Begun begun = 1;
    CallbackClaimed callback_claimed = 2;
    // ...
  }
}
```

The same structure works as YAML or JSON next to any schema language. Protobuf has the advantage that the checker can resolve event and command names against real message types.

## 2. Check

A checker reads only the compiled descriptors (or the YAML): no runtime, no network, no model. Run it as a schema-lint plugin or as a unit test.

| Rule | Fails when |
|---|---|
| R0 values | A state's kind is unspecified; `budget`, `scheduler_delay`, or `reaction_bound` is missing or negative; a window's `within` is missing, zero, or negative. Runs first, so a negative duration can never shrink the R8 sum. |
| R1 resolve | A transition `event` is not a field of the envelope's `oneof`; an `on_deadline` is not a command message in the package; a referenced state is undeclared. |
| R2 coverage | An envelope event appears in no transition and is not the genesis event. |
| R3 armed | A waiting state is covered by no window, or an instant or terminal state is covered by one. |
| R4 terminal | A terminal state has an outgoing transition, or a non-terminal state has none. |
| R5 reachable | A state is unreachable from the initial state, or cannot reach a terminal state. |
| R6 acyclic | The graph has a cycle other than a `from == to` self-loop (counted loops are unrolled in the declaration). |
| R7 contiguous | A window's covered states are not contiguous along every path, so it would re-arm. |
| R8 budget | The longest path exceeds the budget, adding per window arming its `within` plus `scheduler_delay`, and per transition the `reaction_bound`. Under R6 and R7 each window arms at most once per path. |

Output names the rule and the location, so the failure reads like a review finding:

```text
example.attempts.v1.AttemptEvent:
  R3 armed: waiting state "Exchanging" is covered by no window
  R3 armed: waiting state "OutcomeUnknown" is covered by no window
```

## 3. Conform

The declaration is a claim about the hand-written state machine. A generic test, driven by the declaration, keeps the two from drifting:

1. Transitions: build a history that reaches each `from`, fold the declared event through the real fold or evolve function, and assert the state is `to`.
2. Undeclared pairs: assert the fold rejects every `(state, event)` pair the declaration does not list.
3. Arming: for every transition that enters a window from outside it, run the real decide function and assert it schedules `on_deadline` for `within` after the event, addressed to the same instance and written together with the event (same append or same outbox transaction). A state machine that folds correctly but never schedules its timer fails here.
4. Late timers: assert `on_deadline` is accepted in every covered state of the active arming and refused in every other state and for any earlier arming.
5. Duplicates: feed duplicate and reordered histories and assert terminal states do not move.

The only per-process code is a function that maps the fold state to a state name.

Later, if several processes share the shape, generate the state enum, the transition table, and the "schedule `on_deadline` when the window arms" calls from the declaration, which removes drift entirely. Do that only once the hand-written version has proven the declaration is useful.

## Where A Model Fits

Drafting the declaration from a design document's state table is a reasonable job for an assistant. Deciding whether the result is bounded is not: that is the checker's job, and the draft passes or fails it like any hand-written change.
