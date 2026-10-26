# PostgreSQL

Postgres decides every race with a unique or exclusion constraint, a row lock, an advisory lock, or a serialization failure. Application code never sees the other writer; the server does. A finding on Postgres names which of these the write relies on, and the isolation level the transaction actually runs under, because the same SQL means different things under each.

## Principles At Work

- [Only the owner of the state can decide](../principles/owner-decides.md): the constraint and the lock live in the catalog, not in the ORM.
- [The write must carry its condition](../principles/write-carries-condition.md): `ON CONFLICT`, `WHERE version = $n`, `WHERE status = 'pending'`.
- [A lock only helps when the read happens under it](../principles/lock-moves-the-race.md): `FOR UPDATE` before the read, in every writer, inside the transaction.
- [Retry belongs around the conditional write](../principles/retry-wraps-the-write.md): SQLSTATE `40001` and the zero-rowcount branch.
- [Serialization is proven by naming the serializer](../principles/serializer-is-named.md): cite the index from the migration, or the lock call.

## What Each Isolation Level Does To Check-Then-Act

`READ COMMITTED` is the default. Every statement takes a fresh snapshot, so a `SELECT` followed by an `UPDATE` in the same transaction can see two different worlds. The saving property: when an `UPDATE` or `DELETE` reaches a row that another committed transaction changed after the snapshot, it waits, re-reads the new row version, and re-evaluates its `WHERE`. That is why `UPDATE ... WHERE balance >= $1` is safe here while `SELECT balance` then `UPDATE` is not.

`REPEATABLE READ` takes one snapshot at the first statement. Reads never change inside the transaction. An `UPDATE` that reaches a row changed by a concurrent committed transaction does not re-evaluate; it fails with `40001` ("could not serialize access due to concurrent update"). First updater wins, the loser must retry the whole transaction. Two transactions that both `SELECT` nothing and both `INSERT` do not conflict here; only a unique index stops the second.

`SERIALIZABLE` adds predicate tracking on top. Two transactions whose reads and writes would not be equivalent to some serial order abort one of them with `40001` ("could not serialize access due to read/write dependencies"). It catches the `SELECT count(*)` then `INSERT` invariant that no constraint can express. It is correct only when every caller retries on `40001`; without the loop it has turned a silent race into a user-facing error. It also does not stop a unique violation from surfacing as `23505` rather than `40001`, so the retry handler needs both codes.

## Constraint-Backed Writes

```sql
INSERT INTO users (email) VALUES ($1)
ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
RETURNING id;
```

`ON CONFLICT` needs an arbiter: a unique index, a unique constraint, or an exclusion constraint matching the conflict target. Without one the statement is rejected at parse time, which is a useful property; the arbiter cannot be forgotten. `RETURNING` fires only for rows the statement inserted or updated, so `DO NOTHING` returns no row on conflict and the identity needs a follow-up `SELECT`, which is safe because the row now exists.

`INSERT ... SELECT ... WHERE NOT EXISTS (...)` is the same check-then-act in one statement. Both transactions evaluate `NOT EXISTS` against their own snapshot, both insert. The unique index is still the primitive; the subquery is a hint for the reader, not a guard.

"At most one active per user" is a partial unique index, and the conflict target has to repeat its predicate:

```sql
CREATE UNIQUE INDEX one_active_sub ON subscriptions (user_id) WHERE status = 'active';

INSERT INTO subscriptions (user_id, status) VALUES ($1, 'active')
ON CONFLICT (user_id) WHERE status = 'active' DO NOTHING;
```

"No two bookings overlap" is an exclusion constraint, which the planner enforces like a unique index:

```sql
ALTER TABLE bookings ADD CONSTRAINT no_overlap
  EXCLUDE USING gist (room_id WITH =, during WITH &&);
```

`=` on a scalar inside a GiST exclusion needs the `btree_gist` extension.

A `DEFERRABLE INITIALLY DEFERRED` unique constraint moves the violation to `COMMIT`, and `ON CONFLICT` refuses to use a deferrable constraint as an arbiter. The write still loses, but the error arrives from `COMMIT`, after the application thinks the insert succeeded. A finding on a deferrable constraint cites where the commit error is handled.

## Conditional Updates

```sql
UPDATE orders SET status = 'paid' WHERE id = $1 AND status = 'pending';
UPDATE accounts SET balance = balance - $1 WHERE id = $2 AND balance >= $1;
UPDATE documents SET body = $1, version = version + 1 WHERE id = $2 AND version = $3;
```

The command tag's rowcount is the verdict. Zero rows under `READ COMMITTED` means the re-evaluated `WHERE` was false on the current row version; the other writer has already won. The system column `xmin` can stand in for a version column: it changes on every update to the row, compare it for equality only, never for ordering, and most ORMs do not expose it, so an explicit `version` column is the portable choice.

A `CHECK (balance >= 0)` is the backstop for any writer that omits the `WHERE`. It turns a wrong balance into `23514` rather than a silent negative.

## Row Locks

```sql
BEGIN;
SELECT * FROM subscriptions WHERE id = $1 FOR UPDATE;
UPDATE subscriptions SET ... WHERE id = $1;
COMMIT;
```

`FOR UPDATE` blocks other `FOR UPDATE`, `FOR NO KEY UPDATE`, `FOR SHARE`, `UPDATE`, and `DELETE` on the row until commit. `FOR NO KEY UPDATE` is the right strength when the row is referenced by foreign keys from other tables and the update does not touch the key, because plain `FOR UPDATE` also blocks the `FOR KEY SHARE` that foreign key checks take, which blocks inserts into child tables that reference the row until the lock is released. `SKIP LOCKED` makes a queue table hand each row to one worker; `NOWAIT` turns waiting into an error.

Postgres has no gap or predicate locks outside `SERIALIZABLE`. `SELECT ... WHERE email = $1 FOR UPDATE` on a missing row locks nothing, and two inserters proceed. Locking does not solve find-or-create; the unique index does.

## Advisory Locks

```sql
SELECT pg_advisory_xact_lock(hashtext('sessions:' || $1));
SELECT count(*) FROM sessions WHERE user_id = $1 AND active;
INSERT INTO sessions ...;
```

`pg_advisory_xact_lock` holds until commit or rollback and takes a `bigint` or a pair of `int`. The session-scoped `pg_advisory_lock` outlives the transaction and must be released explicitly, which makes it the wrong tool inside a connection pool. Hash collisions make the lock coarser, never unsafe. Every writer of the invariant has to take the same lock, or the lock protects nothing.

## What Does Not Serialize

A trigger runs inside the triggering statement, under its snapshot. A `BEFORE INSERT` trigger that counts rows and raises when over quota reads a snapshot that another transaction's uncommitted insert is invisible to. The trigger has to take the advisory lock or rely on a constraint.

Data-modifying CTEs in one statement all run against the same snapshot and cannot see each other's rows. `WITH ins AS (INSERT ... ON CONFLICT DO NOTHING RETURNING id) SELECT id FROM ins UNION ALL SELECT id FROM users WHERE email = $1` works only because the arbiter is a unique index; the `SELECT` branch is not a check that protects the insert.

A transaction on its own serializes nothing. It is the frame inside which the constraint, the lock, or the `40001` can act.

## What The Finding Must Cite

The isolation level the connection actually uses, the SQL of the check and the act, the arbiter or lock the act relies on, and where `40001`, `23505`, and the zero-rowcount branch are handled.

## Library Files

- TypeScript: [node-postgres](../typescript/node-postgres.md), [prisma](../typescript/prisma.md), [drizzle](../typescript/drizzle.md)
- Rust: [sqlx](../rust/sqlx.md)
- Elixir: [ecto](../elixir/ecto.md)
- Go: [database-sql](../go/database-sql.md)
- Python: [psycopg](../python/psycopg.md), [sqlalchemy](../python/sqlalchemy.md)
