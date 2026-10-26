# psycopg

Spells the database primitives from [database.md](../surfaces/database.md) with psycopg 3. The SQL carries the condition; the cursor exposes `RETURNING` rows and `rowcount`.

Read [references/systems/postgres.md](../systems/postgres.md) for what the store guarantees; this file covers how psycopg spells it.

## Upsert With Identity On Both Paths

```python
cur.execute(
    """INSERT INTO users (email) VALUES (%s)
       ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
       RETURNING id""",
    (email,),
)
user_id = cur.fetchone()[0]
```

## Conditional Update And Rowcount

```python
cur.execute(
    "UPDATE accounts SET balance = balance - %s WHERE id = %s AND balance >= %s",
    (amount, account_id, amount),
)
if cur.rowcount == 0:
    raise InsufficientFunds()
```

The same shape covers `WHERE status = 'pending'`, `WHERE version = %s`, and `WHERE owner_id = %s`.

## Row Lock

Every statement of the decision runs on the same connection inside one transaction; psycopg 3 opens a transaction on the first statement and `with conn.transaction():` commits at the end of the block.

```python
with conn.transaction():
    cur.execute("SELECT * FROM subscriptions WHERE id = %s FOR UPDATE", (sub_id,))
    sub = cur.fetchone()
    # decide
    cur.execute("UPDATE subscriptions SET ... WHERE id = %s", (sub_id,))
```

A connection in autocommit mode commits after the `SELECT`, which releases the lock before the decision.

## Serializable Retry

`conn.isolation_level = psycopg.IsolationLevel.SERIALIZABLE` and a bounded loop that retries the whole transaction on `psycopg.errors.SerializationFailure` (SQLSTATE `40001`).
