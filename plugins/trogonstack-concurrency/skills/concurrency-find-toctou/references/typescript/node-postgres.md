# node-postgres

Spells the database primitives from [database.md](../surfaces/database.md) with the `pg` client. The SQL carries the condition; the client only exposes the result.

Read [references/systems/postgres.md](../systems/postgres.md) for what the store guarantees; this file covers how node-postgres spells it.

## Upsert With Identity On Both Paths

```ts
const { rows } = await client.query(
  `INSERT INTO users (email) VALUES ($1)
   ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
   RETURNING id`,
  [email],
);
const userId = rows[0].id;
```

## Conditional Update And Rowcount

`rowCount` is the verdict. Zero means another writer won; the code must branch on it.

```ts
const res = await client.query(
  `UPDATE accounts SET balance = balance - $1 WHERE id = $2 AND balance >= $1`,
  [amount, id],
);
if (res.rowCount === 0) throw new InsufficientFunds();
```

The same shape covers status transitions (`WHERE status = 'pending'`), optimistic versions (`WHERE version = $3`), and authorization folded into the write (`WHERE owner_id = $3`).

## Row Lock

Take the lock on a dedicated client inside a transaction, not on the pool, so the lock and the later write share a connection.

```ts
const client = await pool.connect();
try {
  await client.query("BEGIN");
  const { rows } = await client.query(
    "SELECT * FROM subscriptions WHERE id = $1 FOR UPDATE",
    [id],
  );
  // decide
  await client.query("UPDATE subscriptions SET ... WHERE id = $1", [id]);
  await client.query("COMMIT");
} catch (err) {
  await client.query("ROLLBACK");
  throw err;
} finally {
  client.release();
}
```

Running `BEGIN` and `FOR UPDATE` through `pool.query` sends each statement on whichever connection is free, so the lock is taken on one connection and the write runs on another.

## Serializable Retry

A transaction at `SERIALIZABLE` surfaces the conflict as an error whose `code` is `40001`. Wrap the whole transaction in a bounded loop that retries on `40001` and `40P01`. Retry `23505` only when the code can show the duplicate came from a value it chose after a read; otherwise it is a persistent error.
