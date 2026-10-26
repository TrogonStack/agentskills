# SQLAlchemy

Spells the database primitives from [database.md](../surfaces/database.md) with SQLAlchemy 2 and the Postgres dialect.

Read [references/systems/postgres.md](../systems/postgres.md) for what the store guarantees; this file covers how SQLAlchemy spells it. On MySQL, read [references/systems/mysql.md](../systems/mysql.md) instead.

## Upsert With Identity On Both Paths

```python
from sqlalchemy.dialects.postgresql import insert

stmt = (
    insert(User)
    .values(email=email)
    .on_conflict_do_update(index_elements=[User.email], set_={"email": email})
    .returning(User.id)
)
user_id = session.execute(stmt).scalar_one()
```

`session.scalar(select(User).where(User.email == email))` then `session.add(User(email=email))` is the race.

## Conditional Update And Rowcount

```python
from sqlalchemy import update

result = session.execute(
    update(Order)
    .where(Order.id == order_id, Order.status == "pending")
    .values(status="paid")
)
if result.rowcount == 0:
    raise AlreadyMoved()
```

Loading the ORM object, checking `order.status`, setting the attribute, and calling `commit()` is the race: the unit-of-work `UPDATE` carries only the primary key.

## Optimistic Version

`__mapper_args__ = {"version_id_col": version}` makes every unit-of-work `UPDATE` carry `WHERE version = :current` and raise `StaleDataError` when zero rows match; the caller reloads and retries, bounded.

## Row Lock

```python
sub = session.execute(
    select(Subscription).where(Subscription.id == sub_id).with_for_update()
).scalar_one()
# decide
sub.plan = new_plan
session.commit()
```

Every other writer to that row must lock the same way.

## Serializable Retry

`create_engine(url, isolation_level="SERIALIZABLE")` or `connection.execution_options(isolation_level="SERIALIZABLE")`, and a bounded loop that retries the whole transaction on `OperationalError` whose `orig` has `pgcode` of `"40001"` or `"40P01"`. A `23505` inside `IntegrityError` is retried only when the code can show the duplicate came from a value it chose after a read.
