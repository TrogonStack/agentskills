# Go `database/sql`

Spells the database primitives from [database.md](../surfaces/database.md). The SQL carries the condition; the package exposes `RETURNING` through `QueryRowContext` and the rowcount through `RowsAffected`.

Read [references/systems/postgres.md](../systems/postgres.md) for what the store guarantees; this file covers how `database/sql` spells it. On MySQL, read [references/systems/mysql.md](../systems/mysql.md) instead.

## Upsert With Identity On Both Paths

```go
var id int64
err := db.QueryRowContext(ctx,
    `INSERT INTO users (email) VALUES ($1)
     ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
     RETURNING id`, email).Scan(&id)
```

## Conditional Update And Rowcount

```go
res, err := db.ExecContext(ctx,
    `UPDATE accounts SET balance = balance - $1 WHERE id = $2 AND balance >= $1`,
    amount, id)
if err != nil { return err }
if n, _ := res.RowsAffected(); n == 0 {
    return ErrInsufficientFunds
}
```

The same shape covers `WHERE status = 'pending'`, `WHERE version = $3`, and `WHERE owner_id = $3`.

## Row Lock

Every statement of the decision runs on the `*sql.Tx`; a `db.` call inside the transaction uses another connection and is outside the lock.

```go
tx, err := db.BeginTx(ctx, nil)
if err != nil { return err }
defer tx.Rollback()
var sub Subscription
if err := tx.QueryRowContext(ctx, "SELECT ... FROM subscriptions WHERE id = $1 FOR UPDATE", id).Scan(&sub.Fields...); err != nil {
    return err
}
// decide
if _, err := tx.ExecContext(ctx, "UPDATE subscriptions SET ... WHERE id = $1", id); err != nil {
    return err
}
return tx.Commit()
```

## Serializable Retry

`db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})` and a bounded loop that retries the whole transaction when the driver error's SQLSTATE is `40001` (`pgconn.PgError.Code` with pgx, `pq.Error.Code` with lib/pq).
