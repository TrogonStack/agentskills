# SQLite

SQLite allows one writer at a time per database file, and the lock that enforces it is the serializer for everything. The TOCTOU specific to SQLite is a transaction that reads first and writes second: the read ran without the write lock, and by the time the write asks for it the snapshot can be stale, which SQLite reports as `SQLITE_BUSY` rather than silently overwriting.

## Principles At Work

- [A lock only helps when the read happens under it](../principles/lock-moves-the-race.md): `BEGIN IMMEDIATE` takes the write lock before the first read.
- [The write must carry its condition](../principles/write-carries-condition.md): `INSERT ... ON CONFLICT`, `UPDATE ... WHERE`, `changes()`.
- [Retry belongs around the conditional write](../principles/retry-wraps-the-write.md): `SQLITE_BUSY` on a deferred transaction means start over, not wait.
- [Serialization is proven by naming the serializer](../principles/serializer-is-named.md): the file lock on the database, which only holds when every writer is a connection to the same file.

## Deferred Versus Immediate

A plain `BEGIN` (deferred) takes no lock. The first `SELECT` takes a read lock and establishes the snapshot. The first `INSERT`, `UPDATE`, or `DELETE` tries to upgrade to the write lock. If another connection has written since this connection's snapshot, the upgrade cannot proceed: the reads already made would be from before that write. In WAL mode SQLite returns `SQLITE_BUSY_SNAPSHOT` immediately, without invoking the busy handler, because waiting cannot make a stale snapshot fresh. In rollback-journal mode the result is `SQLITE_BUSY`, and in the case where waiting would deadlock the busy handler is also skipped.

```sql
BEGIN;
SELECT balance FROM accounts WHERE id = 1;
UPDATE accounts SET balance = balance - 10 WHERE id = 1;   -- may fail with SQLITE_BUSY after the read
COMMIT;
```

`BEGIN IMMEDIATE` takes the write lock up front. Every read inside it is a read under the lock, there is no upgrade step, and `busy_timeout` applies to the `BEGIN` itself, where waiting does help:

```sql
PRAGMA busy_timeout = 5000;
BEGIN IMMEDIATE;
SELECT balance FROM accounts WHERE id = 1;
UPDATE accounts SET balance = balance - 10 WHERE id = 1;
COMMIT;
```

Any transaction that reads and then writes is `BEGIN IMMEDIATE`. A deferred transaction is for reads only. The retry on `SQLITE_BUSY` from a deferred transaction has to restart from `BEGIN`, because the decision was made on the stale snapshot.

## WAL Mode

`PRAGMA journal_mode = WAL` lets readers proceed while a writer is active and lets the writer proceed while readers are active. It does not allow a second writer. Readers see the snapshot as of their first read; a long-lived read transaction holds the WAL from checkpointing but never blocks a write. The one-writer rule and the `BEGIN IMMEDIATE` advice are unchanged.

## Constraint-Backed Writes

```sql
INSERT INTO users (email) VALUES (?)
ON CONFLICT (email) DO UPDATE SET email = excluded.email
RETURNING id;
```

`ON CONFLICT ... DO UPDATE` arrived in 3.24 and `RETURNING` in 3.35; confirm against the library version in use, since embedded SQLite is often older than the system one. `INSERT OR IGNORE` is the older spelling of `DO NOTHING` and applies to every `UNIQUE`, `NOT NULL`, `CHECK`, and `PRIMARY KEY` violation on the row, not only the key you meant. `INSERT OR REPLACE` deletes the conflicting row first, and its delete triggers fire only when `recursive_triggers` is on.

Because only one writer exists, the unique constraint never has two inserters racing inside the engine. It still matters: it is what makes the second `INSERT` fail rather than duplicate when two transactions run one after the other and both decided from the same stale read.

## Conditional Updates

```sql
UPDATE orders SET status = 'paid' WHERE id = ? AND status = 'pending';
SELECT changes();
```

`changes()` and the driver's affected-rows count report rows modified by the last statement. Inside `BEGIN IMMEDIATE` the conditional `WHERE` is evaluated under the write lock, so zero rows means a committed earlier transaction already moved the row, never a concurrent one.

## Where The Serializer Lives

The write lock is a lock on the database file, taken through the operating system's file locking (or the WAL shared-memory file). It serializes every connection in every process on the same machine. It does not serialize across a network filesystem reliably; SQLite's own documentation warns that NFS and SMB locking is unreliable, and a database on a shared mount has no serializer a reviewer can cite.

`:memory:` is a database per connection. A pool of connections opened on `:memory:` is a pool of unrelated empty databases, and tests on it never exercise the write lock. `file::memory:?cache=shared` makes connections in one process share the database, under a different locking scheme that reports `SQLITE_LOCKED` instead of `SQLITE_BUSY` and does not invoke the busy handler.

Serialized threading mode (`SQLITE_THREADSAFE=1`) is a mutex around the connection handle. It makes concurrent calls on one connection not crash; it does not make two statements from two threads a transaction.

## What The Finding Must Cite

Whether the transaction began deferred or immediate, the journal mode, the `busy_timeout`, whether the `SQLITE_BUSY` handler restarts the transaction or only the statement, and for tests whether the database under test is a file or `:memory:`.

## Library Files

The database library files in this skill target Postgres. The conditional update, version column, and `ON CONFLICT` shapes transfer to SQLite; the `BEGIN IMMEDIATE` discipline is the SQLite-specific addition, and each library spells it differently (a connection option, an explicit `execute("BEGIN IMMEDIATE")`, or a transaction mode argument), so confirm against the driver in use.
