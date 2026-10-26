# Ecto

Spells the database primitives from [database.md](../surfaces/database.md) and the transactional dedupe from [distributed.md](../surfaces/distributed.md).

## Find Or Create

The upsert returns the id on both paths. `unique_constraint/3` in a changeset only translates the database error into a changeset error; without the unique index in a migration it prevents nothing.

```elixir
Repo.insert(changeset,
  on_conflict: [set: [email: email]],
  conflict_target: :email,
  returning: true
)
```

`Repo.get_by(User, email: email) || Repo.insert(...)` is the race.

## Conditional Transition

`update_all` with the expected state in the query; the count is the verdict.

```elixir
from(o in Order, where: o.id == ^id and o.status == "pending")
|> Repo.update_all(set: [status: "paid", paid_at: DateTime.utc_now()])
|> case do
  {1, _} -> :ok
  {0, _} -> {:error, :already_moved}
end
```

`Repo.get!` then `Repo.update` through a changeset is the race, because the changeset's `WHERE` is the primary key only.

## Balance Debit In One Statement

```elixir
from(a in Account, where: a.id == ^id and a.balance >= ^amount)
|> Repo.update_all(inc: [balance: -amount])
```

## Optimistic Version And Row Lock

`optimistic_lock(changeset, :version)` adds `WHERE version = ^current` and raises `Ecto.StaleEntryError` when the row moved; the caller reloads and retries, bounded.

Row lock inside `Repo.transaction/1`:

```elixir
Repo.transaction(fn ->
  sub = Repo.one!(from(s in Subscription, where: s.id == ^id, lock: "FOR UPDATE"))
  # decide
  Repo.update!(Subscription.changeset(sub, attrs))
end)
```

Every other writer to that row must take the same lock.

## Dedupe Record And Effect In One Transaction

The dedupe row goes in as a changeset that declares the unique constraint; inserting a bare struct raises `Ecto.ConstraintError` on the violation instead of returning the error tuple the `case` matches on.

```elixir
seen =
  %ProcessedMessage{}
  |> Ecto.Changeset.change(msg_id: msg_id)
  |> Ecto.Changeset.unique_constraint(:msg_id)

Ecto.Multi.new()
|> Ecto.Multi.insert(:seen, seen)
|> Ecto.Multi.update_all(:debit, debit_query, [])
|> Repo.transaction()
|> case do
  {:ok, _} -> :ok
  {:error, :seen, %{errors: [msg_id: _]}, _} -> :already_done
end
```

## Advisory Lock

`Repo.query!("SELECT pg_advisory_xact_lock(hashtext($1))", ["sessions:#{user_id}"])` as the first statement inside `Repo.transaction/1` serializes a cross-row invariant on that key; the lock releases at commit.
