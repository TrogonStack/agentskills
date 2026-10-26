# Prisma

Spells the database primitives from [database.md](../surfaces/database.md) with Prisma Client. The constraint still has to exist in the schema as `@unique` or `@@unique`; Prisma does not add one for `upsert`.

## Find Or Create

`upsert` with an empty `update` is the atomic find-or-create against a unique field.

```ts
const user = await prisma.user.upsert({
  where: { email },
  update: {},
  create: { email },
});
```

`findUnique` then `create` is the race.

## Conditional Transition

`update` only accepts unique fields in `where`, so it cannot carry a status or version condition. `updateMany` can, and returns `count`.

```ts
const { count } = await prisma.order.updateMany({
  where: { id, status: "PENDING" },
  data: { status: "PAID", paidAt: new Date() },
});
if (count === 0) throw new AlreadyMoved();
```

`prisma.order.update({ where: { id } })` after a `findUnique` that checked the status is the race; `updateMany` is the only Prisma call that lets a non-unique column into `where`.

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

Prisma has no query-builder spelling for `FOR UPDATE` or `pg_advisory_xact_lock`. Use `$queryRaw` inside an interactive transaction (`prisma.$transaction(async (tx) => { ... })`) and run every statement of the decision on `tx`, not on `prisma`.

## Serializable Retry

`prisma.$transaction(fn, { isolationLevel: "Serializable" })` surfaces the conflict as `PrismaClientKnownRequestError` with code `P2034`. Wrap in a bounded retry on that code.
