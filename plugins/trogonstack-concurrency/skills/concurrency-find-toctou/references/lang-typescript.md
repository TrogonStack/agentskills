# TypeScript And Node

How each primitive from the surface references is spelled in Node and the common TypeScript libraries. Read the surface reference first for the smell and the interleaver; this file only gives the idiomatic form.

## Filesystem

Exclusive create with the `wx` flag (`O_CREAT | O_EXCL`):

```ts
import { promises as fs } from "node:fs";

try {
  await fs.writeFile(path, data, { flag: "wx" });
} catch (err) {
  if ((err as NodeJS.ErrnoException).code !== "EEXIST") throw err;
}
```

Atomic replace: write to a sibling temp name, fsync, rename.

```ts
import { randomUUID } from "node:crypto";

const tmp = `${target}.${process.pid}.${randomUUID()}`;
const handle = await fs.open(tmp, "wx");
await handle.writeFile(data);
await handle.sync();
await handle.close();
await fs.rename(tmp, target);
```

Idempotent delete: `fs.rm(path, { force: true })` swallows `ENOENT`. Private temp directory: `fs.mkdtemp(prefix)`, then create files inside it.

## Database

node-postgres: the upsert returns the id on both paths, and the conditional update exposes the rowcount.

```ts
const { rows } = await client.query(
  `INSERT INTO users (email) VALUES ($1)
   ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
   RETURNING id`,
  [email],
);

const res = await client.query(
  `UPDATE accounts SET balance = balance - $1 WHERE id = $2 AND balance >= $1`,
  [amount, id],
);
if (res.rowCount === 0) throw new InsufficientFunds();
```

Prisma: `upsert` for find-or-create; `updateMany` with the expected state in `where` for a conditional transition, checking `count`.

```ts
const user = await prisma.user.upsert({
  where: { email },
  update: {},
  create: { email },
});

const { count } = await prisma.order.updateMany({
  where: { id, status: "PENDING" },
  data: { status: "PAID", paidAt: new Date() },
});
if (count === 0) throw new AlreadyMoved();
```

`prisma.order.update({ where: { id } })` after a `findUnique` that checked the status is the race; `updateMany` is the only Prisma call that lets a non-unique column into `where`.

Drizzle:

```ts
const [user] = await db
  .insert(users)
  .values({ email })
  .onConflictDoUpdate({ target: users.email, set: { email } })
  .returning({ id: users.id });

const moved = await db
  .update(orders)
  .set({ status: "paid" })
  .where(and(eq(orders.id, id), eq(orders.status, "pending")))
  .returning({ id: orders.id });
if (moved.length === 0) throw new AlreadyMoved();
```

## Cache

Single-flight on the event loop: the map read and write have no `await` between them.

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

Cross-process lease with ioredis; the reply is `"OK"` for the winner and `null` for everyone else:

```ts
const won = await redis.set(`lock:${key}`, token, "PX", 5000, "NX");
if (won === "OK") {
  // compute, write the value, then release through the compare-and-delete script
}
```

## Distributed

nats.js KV: pass the revision you read to `update`; it rejects when the key has moved on. `create` fails when the key already holds a live value.

```ts
const entry = await kv.get("config.limits");
const next = bump(entry!.json());
await kv.update("config.limits", JSON.stringify(next), entry!.revision);

await kv.create("config.limits", initial);
```

JetStream publish with the per-subject expected sequence and a message id:

```ts
await js.publish(subject, payload, {
  msgID: commandId,
  expect: { lastSubjectSequence: loadedSequence },
});
```

The `expect` object also accepts `lastSequence`, `lastMsgID`, and `streamName`, which map one to one onto the headers in the distributed surface reference.

## Async And In-Process

Store the promise, not the result, before the first `await`:

```ts
let pending = connections.get(host);
if (!pending) {
  pending = connect(host).catch((err) => {
    connections.delete(host);
    throw err;
  });
  connections.set(host, pending);
}
const conn = await pending;
```

A guard flag is safe only when nothing yields between reading and setting it:

```ts
if (this.flushing) return;
this.flushing = true;
try { await this.flush(); } finally { this.flushing = false; }
```

Worker threads share nothing except `SharedArrayBuffer`; for a counter there use `Atomics.compareExchange`.
