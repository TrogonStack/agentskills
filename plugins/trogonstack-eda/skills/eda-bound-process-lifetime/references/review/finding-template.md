# Finding Template: Worked Example

One finding per unbounded wait, uncounted loop, missing absorption, or missing budget. This example comes from the OAuth attempt in [lifecycle-table.md](lifecycle-table.md).

```markdown
### Code exchange can wait forever in Exchanging

- Location: design doc, "Code exchange" section; `attempt/decide.rs:142` (ExchangeStarted handler)
- State: Exchanging
- Waiting on: the provider's token endpoint response, relayed by the exchange worker
- Missing: deadline, exit
- Consequence: if the worker crashes after sending the code, or the response is lost, the attempt stays
  in Exchanging indefinitely. A periodic sweep ("reaper over attempts stuck in Exchanging") is the only
  way out, and it runs on an unstated interval, so T_max for the process is undefined, old versions of
  the attempt logic can never be proven drained, and attempt streams cannot be given a retention period.
- Principle: Every Waiting State Has A Deadline And A Named Exit
- Fix: on ExchangeStarted, schedule RecordOutcomeUnknown for now + 30s (above the provider's documented
  token-endpoint timeout) on the attempt's own stream. The exit leads to OutcomeUnknown, which already
  has a reconciliation path. Refuse RecordOutcomeUnknown in every state except Exchanging, so a late
  timer after Completed or Failed is a no-op. The reaper, if kept, only sends RecordOutcomeUnknown for
  attempts whose timer was lost; it never decides an outcome itself.
- Residual: OutcomeUnknown is itself unbounded (separate finding). The bound also depends on the
  scheduler's delivery delay, which is not stated.
```

## Writing Guidance

- **Consequence names the operational cost**, not only "it could hang": undefined `T_max`, blocked version drain, unbounded retention, operator toil.
- **Fix names a value and its source** (provider contract, business staleness), or says the value must be decided and by whom. Never a bare "add a timeout".
- **Fix names who schedules the timer and when**, and how a late timer is refused.
- **Residual is honest**: other unbounded states, unstated scheduler delay, a budget nobody has declared.

## Summary Block

After the findings, close the review with:

```markdown
## Lifetime Summary

- Process: <name>
- Waiting states: <n> (<m> bounded, <k> unbounded)
- Loops: <n> (<m> counted)
- T_max: <value with derivation> | undefined (<k> unbounded waits)
- Budget: <value> | not declared
- Verdict: bounded within budget | bounded over budget | unbounded
```
