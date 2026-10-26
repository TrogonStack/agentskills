# MySQL (InnoDB)

InnoDB has a plain `SELECT`, which reads a consistent snapshot and takes no locks, and a locking `SELECT`, which reads the latest committed row and holds it, and both can appear in the same transaction. A check made with the plain kind protects nothing. Most TOCTOU findings on MySQL come down to a snapshot read gating a write, and most fixes come down to either a unique key or turning the read into a locking read.

## Principles At Work

- [Only the owner of the state can decide](../principles/owner-decides.md): the unique key and the row lock are the only things that see every writer.
- [The write must carry its condition](../principles/write-carries-condition.md): `ON DUPLICATE KEY UPDATE`, `WHERE status = 'pending'`, `WHERE version = ?`.
- [A lock only helps when the read happens under it](../principles/lock-moves-the-race.md): `FOR UPDATE` on the read, not a plain `SELECT` followed by an `UPDATE`.
- [Retry belongs around the conditional write](../principles/retry-wraps-the-write.md): error 1213 (deadlock) rolls the transaction back and the whole transaction is retried, not the statement.
- [Serialization is proven by naming the serializer](../principles/serializer-is-named.md): cite the `UNIQUE KEY` from `SHOW CREATE TABLE`, or the locking read.

## Snapshot Reads Versus Locking Reads

The default isolation level is `REPEATABLE READ`. The first consistent read in a transaction establishes the snapshot; every later plain `SELECT` sees that snapshot regardless of what commits. A plain `SELECT` is therefore a read of the past by design.

`SELECT ... FOR UPDATE` and `SELECT ... FOR SHARE` (`LOCK IN SHARE MODE` before 8.0) read the latest committed version and lock what they read until commit. `UPDATE` and `DELETE` behave like locking reads: they see the latest committed rows that match. This is why `UPDATE ... WHERE balance >= ?` is safe and `SELECT balance` then `UPDATE` is not, exactly as in Postgres.

Under `SERIALIZABLE`, InnoDB rewrites every plain `SELECT` as `SELECT ... FOR SHARE` when autocommit is off. The read is then held, but it is held as a shared lock, and two transactions that both share-lock a row and both try to update it deadlock. Pick `FOR UPDATE` explicitly instead of relying on the level.

## Gap Locks Change What A Missing Row Means

Under `REPEATABLE READ`, a locking read on an index range also locks the gaps between index records (next-key locking). `SELECT ... WHERE email = ? FOR UPDATE` on a missing email locks the gap where that email would be inserted, so a second transaction's `INSERT` blocks. This is the opposite of Postgres, and it is where "FOR UPDATE then INSERT" findings on MySQL need care.

The gap lock is shared. Two transactions can both take it for the same missing key, then both attempt the `INSERT`. Each insert needs an insert intention lock that the other's gap lock blocks, and InnoDB reports a deadlock (error 1213) to one of them and rolls that transaction back. The outcome is safe only if the caller retries the whole transaction on 1213. The unique key plus `ON DUPLICATE KEY UPDATE` avoids both the gap lock and the deadlock, and is the better primitive for find-or-create.

Under `READ COMMITTED`, gap locking is disabled except for foreign key and duplicate key checks. A locking read on a missing row then locks nothing, which matches Postgres and makes the unique key mandatory.

## Constraint-Backed Writes

```sql
INSERT INTO users (email) VALUES (?)
ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id);
SELECT LAST_INSERT_ID();
```

There is no `RETURNING` in MySQL (MariaDB added one; confirm against the server in use). The `LAST_INSERT_ID(expr)` form makes the function return the existing row's id on the update path, so one round trip gives the identity either way. The affected-rows count is 1 for an insert, 2 for an update, 0 when the update changed nothing.

`INSERT IGNORE` converts the duplicate key error into a warning, and also converts data truncation, `NOT NULL` violations (it inserts the column default), and invalid enum values into warnings. It is too blunt for a guard; use `ON DUPLICATE KEY UPDATE` with a no-op assignment.

`REPLACE` is a delete followed by an insert. It fires `DELETE` triggers, cascades foreign keys that reference the row, and allocates a new auto-increment id. Anything holding the old id is now stale.

## Conditional Updates

```sql
UPDATE orders SET status = 'paid' WHERE id = ? AND status = 'pending';
UPDATE accounts SET balance = balance - ? WHERE id = ? AND balance >= ?;
UPDATE documents SET body = ?, version = version + 1 WHERE id = ? AND version = ?;
```

`ROW_COUNT()` and the driver's affected-rows value are the verdict. By default MySQL reports rows changed, not rows matched; an `UPDATE` that matches a row and sets it to the values it already has reports 0. Drivers expose a found-rows flag (`CLIENT_FOUND_ROWS`) that switches the count to rows matched. A conditional update whose assignment can be a no-op on the current value, such as re-setting the same status, reads as "lost" without the flag. The finding cites which count the driver returns.

## Row Locks And Queues

```sql
START TRANSACTION;
SELECT * FROM jobs WHERE status = 'queued' ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED;
UPDATE jobs SET status = 'running', worker = ? WHERE id = ?;
COMMIT;
```

`SKIP LOCKED` and `NOWAIT` arrived in 8.0. Before that, the queue pattern is the conditional update alone: `UPDATE jobs SET status = 'running', worker = ? WHERE id = ? AND status = 'queued'`, with the rowcount deciding who owns the job.

Lock waits time out with error 1205 after `innodb_lock_wait_timeout`, which rolls back only the statement unless `innodb_rollback_on_timeout` is on; the transaction is still open and holds its other locks. Deadlock (1213) rolls back the whole transaction. The retry handler needs to know which happened.

## Named Locks

```sql
SELECT GET_LOCK('sessions:42', 5);
SELECT count(*) FROM sessions WHERE user_id = 42 AND active;
INSERT INTO sessions ...;
SELECT RELEASE_LOCK('sessions:42');
```

`GET_LOCK` is session scoped, not transaction scoped. It survives `COMMIT` and `ROLLBACK` and is released only by `RELEASE_LOCK`, `RELEASE_ALL_LOCKS`, or the session ending. Inside a connection pool a lock that is not released on every exit path is held by whichever caller gets the connection next. The name is limited to 64 characters. Since 5.7 a session may hold several named locks at once; earlier versions release the previous one on each `GET_LOCK`.

## What The Finding Must Cite

The isolation level, whether the check was a consistent read or a locking read, the unique key or lock the act relies on, how affected rows is counted by the driver, and where 1213 and 1205 are handled.

## Library Files

- Go: [database-sql](../go/database-sql.md)
- Python: [sqlalchemy](../python/sqlalchemy.md)
- The other database library files target Postgres. Their conditional update and version column shapes transfer unchanged; their `RETURNING` and `ON CONFLICT` shapes do not.
