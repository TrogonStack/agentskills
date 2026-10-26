# C Atomics And pthreads

Spells scalar compare-and-swap and the mutex discipline from [in-process.md](../surfaces/in-process.md).

## Compare-And-Swap Loop

```c
#include <stdatomic.h>

_Atomic uint64_t counter;

uint64_t cur = atomic_load(&counter);
for (;;) {
    if (cur >= limit) return -1;
    if (atomic_compare_exchange_weak(&counter, &cur, cur + 1)) break;
}
```

`atomic_compare_exchange_weak` reloads `cur` with the observed value on failure, which is what the loop needs. `atomic_load` then `atomic_store` is the race; `atomic_fetch_add` alone cannot enforce the limit because it has no condition.

GCC and Clang builtins: `__atomic_compare_exchange_n(&counter, &cur, cur + 1, true, __ATOMIC_ACQ_REL, __ATOMIC_ACQUIRE)`.

## Mutex Discipline

A `pthread_mutex_t` held across both the check and the write is correct when every writer to that state takes the same mutex. A check outside the mutex followed by a locked write is the race, and so is a double-checked read of a non-atomic field without a fence.

## Where Atomics Stop

An atomic protects one word. A decision that reads two atomics and writes one has the same gap as any two reads; use a mutex over the pair or pack the state into one word.
