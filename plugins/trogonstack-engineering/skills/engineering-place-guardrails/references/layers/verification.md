# Layer 3: Verification

A stated property is checked across many inputs, a model of the system, or the running system. More expensive to build and run than static analysis, and runtime checks let some mistakes reach a live system before they are caught.

## Moves

- **Property-based tests and fuzzing.** Invariants over input spaces: round-trips, idempotence, ordering, conservation of totals.
- **Model checking and formal specs.** Protocols, state machines, concurrency, where examples cannot cover the interleavings.
- **Runtime assertions and contracts.** Fail loudly at the point the invariant breaks instead of corrupting state downstream.
- **Production signals tied to the property.** Alert on the invariant (balance never negative, every instance terminates) rather than on symptoms.

## Can This Layer Carry It?

Yes when the rule is a property of behavior that holds for all inputs or all executions, and examples in layer 2 would miss cases. No when the property cannot be stated precisely; that is judgment.

## Why It Sits Below Static Analysis

Verification states what must be true; it does not stop the wrong code from being written, and runtime checks fire after deploy. Prefer a layer 1 or 2 move when one exists, and use this layer for what they cannot express.
