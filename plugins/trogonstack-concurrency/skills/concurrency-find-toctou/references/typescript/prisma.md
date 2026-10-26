# Prisma

Spells the database primitives from [database.md](../surfaces/database.md) with Prisma Client. The constraint still has to exist in the schema as `@unique` or `@@unique`; Prisma does not add one for `upsert`.

Read [references/systems/postgres.md](../systems/postgres.md) for what the store guarantees; this file covers how Prisma spells it.

## Find Or Create

`upsert` against a unique field is the find-or-create. It runs as one `INSERT ... ON CONFLICT` only when the `update` clause is not empty, `where` names one unique field, `create` carries the same value, and neither branch nests a query (Prisma 4.6 and later on PostgreSQL, CockroachDB, and SQLite). With `update: {}` Prisma runs the find and the create as separate statements, and the race surfaces as `P2002`.

```ts
const user = await prisma.user.upsert({
  where: { email },
  update: { email },
  create: { email },
});
```

`findUnique` then `create` is the race, and so is `upsert` with an empty `update`.

## Conditional Transition

`update` takes a unique field plus any other column in `where` (Prisma 4.5 and later) and throws `P2025` when no row matches. `updateMany` takes the same filter and returns `count`, which is the cleaner signal.

```ts
const { count } = await prisma.order.updateMany({
  where: { id, status: "PENDING" },
  data: { status: "PAID", paidAt: new Date() },
});
if (count === 0) throw new AlreadyMoved();
```

`prisma.order.update({ where: { id } })` after a `findUnique` that checked the status is the race. The status belongs in the `where` of the write, whichever call makes it.

## Counter And Balance

Use the atomic number operations with the condition in `where`:

```ts
const { count } = await prisma.account.updateMany({
  where: { id, balance: { gte: amount } },
  data: { balance: { decrement: amount } },
});
if (count === 0) throw new InsufficientFunds();
```

## Row Lock And Advisory Lock

Prisma Client documents no query-builder spelling for `FOR UPDATE` or `pg_advisory_xact_lock`. Use `$queryRaw` inside an interactive transaction (`prisma.$transaction(async (tx) => { ... })`) and run every statement of the decision on `tx`, not on `prisma`.

## Serializable Retry

`prisma.$transaction(fn, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })` surfaces a write conflict or deadlock as `PrismaClientKnownRequestError` with code `P2034`. Wrap in a bounded retry on that code. This is the Prisma 6 shape; the next major changes the transaction API, so confirm against the version in use.
