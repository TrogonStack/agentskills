# asyncio

Spells the in-process primitives from [in-process.md](../surfaces/in-process.md) and the single-flight from [cache.md](../surfaces/cache.md). The event loop runs one task at a time, so a pair with no `await` between check and act is atomic, and that fact is the serializer the finding names.

## Store The Future, Not The Result

```python
inflight: dict[str, asyncio.Future] = {}

async def get_or_compute(key: str):
    cached = await cache.get(key)
    if cached is not None:
        return cached
    fut = inflight.get(key)
    if fut is None:
        fut = asyncio.ensure_future(_compute_and_store(key))
        inflight[key] = fut
        fut.add_done_callback(lambda _: inflight.pop(key, None))
    return await asyncio.shield(fut)
```

The dict read and write have no `await` between them. The `shield` matters: cancelling a task that is awaiting a future cancels that future too, so without it one caller's timeout would cancel the shared computation for every other waiter and leave the cache empty. With it the cancelled caller still gets `CancelledError`, and the computation finishes for the rest. `if key not in connections: connections[key] = await connect(key)` is the race.

## Hold The Lock Across The Decision

When the decision itself must await, an `asyncio.Lock` may be held across it:

```python
async with lock:
    if key not in connections:
        connections[key] = await connect(key)
```

That serializes every caller through one lock, which is a throughput choice the finding should note. Checking outside the lock and inserting inside it is the race.

## Threads

A `threading.Lock` around both the check and the write. `dict.setdefault(key, value)` is atomic under the GIL for a value already built, but the value expression is evaluated before the call, so it does not dedupe construction. Free-threaded builds keep `setdefault` atomic per the dict's internal lock; a check followed by `d[key] = ...` is the race on every build.
