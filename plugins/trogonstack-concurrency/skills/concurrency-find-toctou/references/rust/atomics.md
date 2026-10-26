# Rust Atomics

Spells scalar compare-and-swap from [in-process.md](../surfaces/in-process.md). The loop is the retry from [retry-wraps-the-write.md](../principles/retry-wraps-the-write.md) in its smallest form: reload, re-decide, conditional write.

## Compare-And-Swap Loop

```rust
use std::sync::atomic::{AtomicU64, Ordering};

loop {
    let current = counter.load(Ordering::Acquire);
    if current >= limit { return Err(Error::Exhausted); }
    if counter
        .compare_exchange(current, current + 1, Ordering::AcqRel, Ordering::Acquire)
        .is_ok()
    {
        break;
    }
}
```

`counter.load()` then `counter.store(current + 1)` is the race; `fetch_add` alone cannot enforce the limit because it has no condition.

## fetch_update

`AtomicU64::fetch_update(AcqRel, Acquire, |cur| (cur < limit).then_some(cur + 1))` is the same loop with the decision as a closure and `Err(cur)` when the closure declines.

## Where Atomics Stop

An atomic protects one word. A decision that reads two atomics and writes one has the same gap as any two reads; use a mutex over the pair or fold the state into one word.
