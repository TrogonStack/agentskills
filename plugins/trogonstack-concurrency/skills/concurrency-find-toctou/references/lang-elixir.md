# Elixir

How each primitive from the surface references is spelled in Elixir, Ecto, and OTP. Read the surface reference first for the smell and the interleaver; this file only gives the idiomatic form.

## Filesystem

Exclusive create:

```elixir
case File.open(path, [:write, :exclusive]) do
  {:ok, io} ->
    IO.binwrite(io, data)
    File.close(io)
  {:error, :eexist} ->
    :exists
end
```

Atomic replace: write to a sibling temp path, then `File.rename/2` onto the target. Idempotent delete: `File.rm/1` returns `{:error, :enoent}` instead of raising; match on it.

## Database

Ecto upsert that returns the id on both paths:

```elixir
Repo.insert(changeset,
  on_conflict: [set: [email: email]],
  conflict_target: :email,
  returning: true
)
```

`unique_constraint/3` in a changeset only translates the database error into a changeset error. Without the unique index in a migration it prevents nothing.

Conditional transition with `update_all`; the count is the verdict:

```elixir
from(o in Order, where: o.id == ^id and o.status == "pending")
|> Repo.update_all(set: [status: "paid", paid_at: DateTime.utc_now()])
|> case do
  {1, _} -> :ok
  {0, _} -> {:error, :already_moved}
end
```

Balance debit in one statement:

```elixir
from(a in Account, where: a.id == ^id and a.balance >= ^amount)
|> Repo.update_all(inc: [balance: -amount])
```

Optimistic version: `optimistic_lock(changeset, :version)` raises `Ecto.StaleEntryError` when the row moved. Row lock: `from(s in Subscription, where: s.id == ^id, lock: "FOR UPDATE")` inside `Repo.transaction/1`.

Dedupe record and effect in one transaction. The dedupe row goes in as a changeset that declares the unique constraint; inserting a bare struct raises `Ecto.ConstraintError` on the violation instead of returning the error tuple the `case` matches on.

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

## Cache

ETS has no server to serialize anything, so use its atomic calls:

```elixir
:ets.insert_new(table, {key, value})
:ets.update_counter(table, key, {2, 1}, {key, 0})
:ets.select_replace(table, [{{key, old}, [], [{{key, new}}]}])
```

`insert_new/2` returns `false` to the loser. `update_counter/4` with a default creates the row if missing. `select_replace/2` is a compare-and-swap on a match spec. Plain integers: `:atomics.compare_exchange/4`.

Stampede protection across processes uses the store's `SET NX PX` from the cache surface reference; Redix passes the command through unchanged: `Redix.command(conn, ["SET", key, token, "NX", "PX", "5000"])`.

## Async And In-Process

Two calls into one GenServer are two moments. Put the decision in one handler:

```elixir
GenServer.call(server, {:put_new, key, value})

def handle_call({:put_new, key, value}, _from, state) do
  case Map.fetch(state, key) do
    {:ok, existing} -> {:reply, {:exists, existing}, state}
    :error -> {:reply, {:ok, value}, Map.put(state, key, value)}
  end
end
```

Claiming a key with a `:unique` Registry: the register call is the claim, and `Registry.lookup/2` beforehand is the race.

```elixir
case Registry.register(MyRegistry, key, nil) do
  {:ok, _owner} -> :claimed
  {:error, {:already_registered, pid}} -> {:taken, pid}
end
```

A process that owns an entity (one GenServer per key, registered under the key) serializes writes to that entity by construction; the finding cites the registry key and confirms no other code path writes the same state.

## Distributed

NATS KV and JetStream from Elixir follow the concept in [surfaces-distributed.md](surfaces-distributed.md): pass the revision you read to the update, and set `Nats-Expected-Last-Subject-Sequence` as a header on the publish. The client libraries differ in how they expose headers and KV, so cite the exact call from the library in use rather than assuming a method name.
