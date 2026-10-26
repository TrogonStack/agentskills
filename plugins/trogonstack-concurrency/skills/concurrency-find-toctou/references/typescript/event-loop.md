# Node Event Loop

Spells the in-process primitives from [in-process.md](../surfaces/in-process.md) and the single-flight from [cache.md](../surfaces/cache.md). The event loop is single threaded, so a pair with no `await` between check and act is atomic, and that fact is the serializer the finding names.

## Store The Promise, Not The Result

Publish the in-flight work before the first `await`, so later callers join it.

```ts
const connections = new Map<string, Promise<Conn>>();

function getConnection(host: string): Promise<Conn> {
  let pending = connections.get(host);
  if (!pending) {
    pending = connect(host).catch((err) => {
      connections.delete(host);
      throw err;
    });
    connections.set(host, pending);
  }
  return pending;
}
```

`if (!connections.has(host)) { const c = await connect(host); connections.set(host, c); }` is the race.

## Single-Flight Over A Cache

```ts
const inflight = new Map<string, Promise<Value>>();

async function getOrCompute(key: string): Promise<Value> {
  const cached = await cache.get(key);
  if (cached !== undefined) return cached;

  let p = inflight.get(key);
  if (!p) {
    p = computeExpensive(key)
      .then(async (v) => { await cache.set(key, v, ttl); return v; })
      .finally(() => inflight.delete(key));
    inflight.set(key, p);
  }
  return p;
}
```

The `inflight.get` and `inflight.set` have no `await` between them. The `cache.get` before them does yield, which is fine: it only decides whether to enter the synchronous section.

## Guard Flag

Safe only when nothing yields between reading and setting it.

```ts
if (this.flushing) return;
this.flushing = true;
try { await this.flush(); } finally { this.flushing = false; }
```

## Worker Threads

Workers share nothing except `SharedArrayBuffer`. For a counter there, `Atomics.compareExchange` in a loop is the compare-and-swap; a plain read then `Atomics.store` is the race.
