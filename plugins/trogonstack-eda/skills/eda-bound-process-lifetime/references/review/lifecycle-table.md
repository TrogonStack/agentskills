# Lifecycle Table

The lifecycle table is the skill's main artifact. It lists every state of one process type, marks which states wait, and attaches each waiting state to a window with a deadline and an exit.

## Columns

| Column | Meaning |
|---|---|
| State | The state name used in code or the design. |
| Kind | `initial`, `waiting`, `instant`, or `terminal`. A state can be both `initial` and `waiting`. |
| Entered by | The event that moves the instance into this state. |
| Left by | Every event that leaves it, with the target state. Self-loops are marked `(stays)`. |
| Window | The named deadline covering this state, shared across states when one deadline spans a phase. `-` for instant and terminal states. |
| Deadline | Duration, or `MISSING`. |
| On deadline | The exit input the timer delivers and the state it leads to, or `MISSING`. |

## Filled Example: OAuth Authorization Attempt

A process that sends a user to a provider's consent page, receives the callback, exchanges the code for tokens, and records the result. One instance per attempt.

| State | Kind | Entered by | Left by | Window | Deadline | On deadline |
|---|---|---|---|---|---|---|
| AwaitingConsent | initial, waiting | AuthorizationBegun | CallbackClaimed -> CallbackClaimed; Failed; Cancelled; Expired | consent_window | 10m | ExpireAuthorization -> Expired |
| CallbackClaimed | waiting | CallbackClaimed | ExchangeStarted -> Exchanging; Failed; Cancelled; Expired | consent_window | (shared) | ExpireAuthorization -> Expired |
| Exchanging | waiting | ExchangeStarted | AuthorityCaptured (stays); Completed; Failed; OutcomeUnknownRecorded -> OutcomeUnknown | exchange | MISSING | MISSING |
| OutcomeUnknown | waiting | OutcomeUnknownRecorded | AuthorityCaptured (stays); Completed; Failed | reconciliation | MISSING | MISSING |
| Completed | terminal | AuthorizationCompleted | none | - | - | - |
| Failed | terminal | AuthorizationFailed | none | - | - | - |
| Cancelled | terminal | AuthorizationCancelled | none | - | - | - |
| Expired | terminal | AuthorizationExpired | none | - | - | - |

Reading it: the consent phase is bounded by one 10 minute window set when the attempt begins. `Exchanging` and `OutcomeUnknown` both wait on the provider (a token response, then reconciliation) and have no deadline, so the instance can sit there indefinitely. Each `MISSING` becomes a finding (see [finding-template.md](finding-template.md)). Cancel and Expire are not exits from `Exchanging` on purpose: once the code is sent, the exchange cannot be un-sent, so the only honest exits are a result or "outcome unknown".

After the fixes (`exchange` 30s exiting to `OutcomeUnknown`, `reconciliation` 15m exiting to `Failed` with a typed reason), the longest path is `AwaitingConsent -> CallbackClaimed -> Exchanging -> OutcomeUnknown -> Failed`, and `T_max = 10m + 30s + 15m + 3 * delta + 4 * rho` (three window armings, four transitions).

## Encoding It

The table is plain data. Keep it next to the code it describes (a markdown table in the design doc, a YAML file, or a schema annotation) so that changes to the process show up as changes to the table in review. To have a program check it instead of a reviewer, read [declare-and-check.md](declare-and-check.md).
