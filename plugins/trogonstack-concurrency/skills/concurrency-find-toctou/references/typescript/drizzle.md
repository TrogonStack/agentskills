# Drizzle

Spells the database primitives from [database.md](../surfaces/database.md) with Drizzle ORM on Postgres. The unique index must be declared in the table schema for `onConflict` to have a target.

## Find Or Create

```ts
const [user] = await db
  .insert(users)
  .values({ email })
  .onConflictDoUpdate({ target: users.email, set: { email } })
  .returning({ id: users.id });
```

`onConflictDoNothing()` returns no row on conflict, so a follow-up `select` is needed.

## Conditional Transition With Returning

Drizzle does not expose a rowcount uniformly across drivers, so use `returning` and branch on the array length.

```ts
const moved = await db
  .update(orders)
  .set({ status: "paid" })
  .where(and(eq(orders.id, id), eq(orders.status, "pending")))
  .returning({ id: orders.id });
if (moved.length === 0) throw new AlreadyMoved();
```

## Counter And Balance

```ts
const debited = await db
  .update(accounts)
  .set({ balance: sql`${accounts.balance} - ${amount}` })
  .where(and(eq(accounts.id, id), gte(accounts.balance, amount)))
  .returning({ id: accounts.id });
if (debited.length === 0) throw new InsufficientFunds();
```

## Row Lock

```ts
await db.transaction(async (tx) => {
  const [row] = await tx.select().from(subscriptions).where(eq(subscriptions.id, id)).for("update");
  // decide
  await tx.update(subscriptions).set({ ... }).where(eq(subscriptions.id, id));
});
```

Every statement of the decision runs on `tx`; a `db.` call inside the callback uses a different connection and is outside the lock.
