# Database Surfaces

A row read in one statement says nothing about the row when the next statement runs. The database is the only actor that can see every writer, so the condition has to be expressed where the database enforces it: a constraint, a conditional `WHERE`, a row lock, or an expected version.

A transaction on its own does not help. Under `READ COMMITTED` (the Postgres default) and under InnoDB's default `REPEATABLE READ`, two transactions can both `SELECT` nothing and both `INSERT`. Only a unique constraint or a lock makes one of them lose.

## Principles At Work

- [Only the owner of the state can decide](../principles/owner-decides.md): the database sees every writer; application code sees one snapshot.
- [The write must carry its condition](../principles/write-carries-condition.md): `ON CONFLICT`, `WHERE status = ...`, `WHERE balance >= ...`, `WHERE version = ...`.
- [A lock only helps when the read happens under it](../principles/lock-moves-the-race.md): `FOR UPDATE` and advisory locks, taken before the read, by every writer.
- [Retry belongs around the conditional write](../principles/retry-wraps-the-write.md): the zero-rowcount branch and the `40001` retry loop.
- [Serialization is proven by naming the serializer](../principles/serializer-is-named.md): a safe verdict names the unique index from the migration, not from an ORM helper.

## Find Or Create

Avoid:

```sql
SELECT id FROM users WHERE email = $1;
-- none found
INSERT INTO users (email) VALUES ($1);
```

Prefer a unique index and an upsert, and read the identity back in the same statement:

```sql
INSERT INTO users (email) VALUES ($1)
ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
RETURNING id;
```

`DO UPDATE` on a no-op column makes `RETURNING` fire on both paths. `DO NOTHING` returns no row on conflict, so a follow-up `SELECT` is needed, which is acceptable because the row now certainly exists. MySQL spells it `INSERT ... ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`.

An ORM helper that translates the unique violation into a validation error prevents nothing without the unique index in the schema.

`SELECT ... FOR UPDATE` does not solve find-or-create. Locking a row that does not exist locks nothing, and two inserters still race. The constraint is the primitive.

## Read, Modify, Write

Avoid:

```
row = SELECT balance FROM accounts WHERE id = $1
if row.balance >= amount:
    UPDATE accounts SET balance = row.balance - amount WHERE id = $1
```

Two debits read the same balance and both succeed. Prefer the condition and the arithmetic inside one statement, and treat zero rows as the failure:

```sql
UPDATE accounts
SET balance = balance - $1
WHERE id = $2 AND balance >= $1;
-- rowcount 0 means insufficient funds or missing account
```

A `CHECK (balance >= 0)` constraint is the backstop that catches any writer that forgets the `WHERE`.

## Status Transitions

Avoid `SELECT status` then `UPDATE status`. Prefer:

```sql
UPDATE orders
SET status = 'paid', paid_at = now()
WHERE id = $1 AND status = 'pending';
```

Zero rows means another worker already moved it. Whether that is an error or a no-op depends on the domain; the finding must say which.

## Optimistic Versioning

When the act depends on several columns read earlier, carry a version column and update only if it is unchanged:

```sql
UPDATE documents
SET body = $1, version = version + 1
WHERE id = $2 AND version = $3;
```

Zero rows means stale read: reload, re-decide, retry or surface the conflict.

## Pessimistic Row Lock

When the decision needs the row's current data and cannot be folded into one statement, lock the row for the length of the transaction:

```sql
BEGIN;
SELECT * FROM subscriptions WHERE id = $1 FOR UPDATE;
-- decide in application code
UPDATE subscriptions SET ... WHERE id = $1;
COMMIT;
```

Everything that mutates the same row must also take the lock, or the lock protects nothing.

## Cross-Row Invariants

"At most N active sessions per user" cannot be a unique constraint. Serialize the invariant with an advisory lock scoped to the key, inside the transaction:

```sql
SELECT pg_advisory_xact_lock(hashtext('sessions:' || $1));
SELECT count(*) FROM sessions WHERE user_id = $1 AND active;
INSERT INTO sessions ...;
```

The lock releases at commit. Hash collisions only make the lock coarser, never unsafe.

## Serializable Isolation

`SERIALIZABLE` makes the database detect the interleaving and abort one transaction with SQLSTATE `40001`. It is correct only when every caller retries the whole transaction on that code and on `40P01`. Without the retry loop it has turned a silent race into a user-facing error. `23505` and `23P01` are retried only when the caller can show the conflict was a race on a value it chose from a prior read, because the same codes also mean a persistent error.

## What The Finding Must Cite

The `SELECT`, the write it gates, the isolation level in effect, and whether a constraint or lock already exists for that key. Name the constraint or index when claiming a pair is safe.

## Library Files

For what the store itself guarantees, read [postgres](../systems/postgres.md), [mysql](../systems/mysql.md), or [sqlite](../systems/sqlite.md) first.

- TypeScript: [node-postgres](../typescript/node-postgres.md), [prisma](../typescript/prisma.md), [drizzle](../typescript/drizzle.md)
- Rust: [sqlx](../rust/sqlx.md)
- Elixir: [ecto](../elixir/ecto.md)
- Go: [database-sql](../go/database-sql.md)
- Python: [psycopg](../python/psycopg.md), [sqlalchemy](../python/sqlalchemy.md)
