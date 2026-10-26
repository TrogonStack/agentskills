# sqlx

Spells the database primitives from [database.md](../surfaces/database.md). The SQL carries the condition; sqlx exposes `RETURNING` rows and `rows_affected()`.

Read [references/systems/postgres.md](../systems/postgres.md) for what the store guarantees; this file covers how sqlx spells it.

## Upsert With Identity On Both Paths

```rust
let id: i64 = sqlx::query_scalar(
    "INSERT INTO users (email) VALUES ($1)
     ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
     RETURNING id",
)
.bind(&email)
.fetch_one(&pool)
.await?;
```

## Conditional Update And Rowcount

```rust
let done = sqlx::query(
    "UPDATE accounts SET balance = balance - $1 WHERE id = $2 AND balance >= $1",
)
.bind(amount)
.bind(id)
.execute(&pool)
.await?;
if done.rows_affected() == 0 {
    return Err(Error::InsufficientFunds);
}
```

The same shape covers `WHERE status = 'pending'`, `WHERE version = $3`, and `WHERE owner_id = $3`.

## Row Lock

Run every statement of the decision on the `Transaction`, not on the pool; a pool call inside the transaction uses another connection and is outside the lock.

```rust
let mut tx = pool.begin().await?;
let row = sqlx::query_as::<_, Subscription>("SELECT * FROM subscriptions WHERE id = $1 FOR UPDATE")
    .bind(id)
    .fetch_one(&mut *tx)
    .await?;
// decide
sqlx::query("UPDATE subscriptions SET ... WHERE id = $1").bind(id).execute(&mut *tx).await?;
tx.commit().await?;
```

Every other writer to that row must lock the same way.

## Serializable Retry

Set the isolation with `sqlx::query("SET TRANSACTION ISOLATION LEVEL SERIALIZABLE")` as the first statement on the transaction, and retry the whole transaction, bounded, when the error's SQLSTATE (`e.as_database_error().and_then(|d| d.code())`) is `40001` or `40P01`. Retry `23505` only when the code can show the duplicate came from a value it chose after a read; otherwise it is a persistent error.
