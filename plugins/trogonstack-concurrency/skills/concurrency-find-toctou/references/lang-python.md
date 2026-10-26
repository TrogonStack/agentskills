# Python

How each primitive from the surface references is spelled in Python and the common libraries. Read the surface reference first for the smell and the interleaver; this file only gives the idiomatic form.

## Filesystem

Exclusive create:

```python
try:
    with open(path, "x") as f:
        f.write(data)
except FileExistsError:
    pass
```

The lower-level form is `os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)`. Open-then-verify: `fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW)` then `os.fstat(fd)`.

Atomic replace:

```python
import os, tempfile

fd, tmp = tempfile.mkstemp(dir=os.path.dirname(target))
with os.fdopen(fd, "wb") as f:
    f.write(data)
    f.flush()
    os.fsync(f.fileno())
os.replace(tmp, target)
```

`os.replace` is the atomic rename that also overwrites on Windows. Idempotent delete: `Path(path).unlink(missing_ok=True)`.

## Database

psycopg 3: the upsert returns the id on both paths; `cursor.rowcount` is the verdict for the conditional update.

```python
cur.execute(
    """INSERT INTO users (email) VALUES (%s)
       ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
       RETURNING id""",
    (email,),
)
user_id = cur.fetchone()[0]

cur.execute(
    "UPDATE accounts SET balance = balance - %s WHERE id = %s AND balance >= %s",
    (amount, account_id, amount),
)
if cur.rowcount == 0:
    raise InsufficientFunds()
```

SQLAlchemy 2 with the Postgres dialect:

```python
from sqlalchemy.dialects.postgresql import insert

stmt = (
    insert(User)
    .values(email=email)
    .on_conflict_do_update(index_elements=[User.email], set_={"email": email})
    .returning(User.id)
)
user_id = session.execute(stmt).scalar_one()

result = session.execute(
    update(Order)
    .where(Order.id == order_id, Order.status == "pending")
    .values(status="paid")
)
if result.rowcount == 0:
    raise AlreadyMoved()
```

Row lock: `select(Subscription).where(...).with_for_update()` inside the session's transaction.

## Cache

asyncio single-flight: the dict read and write have no `await` between them.

```python
inflight: dict[str, asyncio.Future] = {}

async def get_or_compute(key: str):
    cached = await cache.get(key)
    if cached is not None:
        return cached
    fut = inflight.get(key)
    if fut is None:
        fut = asyncio.ensure_future(_compute_and_store(key))
        inflight[key] = fut
        fut.add_done_callback(lambda _: inflight.pop(key, None))
    return await fut
```

Cross-process lease with redis-py: `r.set(f"lock:{key}", token, nx=True, px=5000)` returns `True` only for the winner.

## Distributed

nats-py KV: `update` takes the revision you read as `last`; `create` fails when the key already holds a live value.

```python
entry = await kv.get("config.limits")
nxt = bump(entry.value)
await kv.update("config.limits", nxt, last=entry.revision)

await kv.create("config.limits", initial)
```

JetStream publish with the expected-sequence header and a message id:

```python
await js.publish(
    subject,
    payload,
    headers={
        "Nats-Msg-Id": command_id,
        "Nats-Expected-Last-Subject-Sequence": str(loaded_seq),
    },
)
```

## Async And In-Process

On the asyncio event loop the invariant is the same as for JavaScript: no `await` between the check and the write makes the pair atomic. When the decision itself must await, hold an `asyncio.Lock` across the whole decision:

```python
async with lock:
    if key not in connections:
        connections[key] = await connect(key)
```

Threads: a `threading.Lock` around both the check and the write; `dict.setdefault(key, value)` is atomic under the GIL for a value already built, but the value expression is evaluated before the call, so it does not dedupe construction.
