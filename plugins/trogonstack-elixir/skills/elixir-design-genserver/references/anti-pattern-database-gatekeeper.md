# Anti-Pattern: Database Gatekeeper

A GenServer stands in front of the database and every callback wraps a `Repo` call. It is usually built for fault tolerance or to serialize writes, and it delivers neither. The database already provides both, for every writer, on every node.

## Avoid

```elixir
defmodule MyApp.Accounts.AccountsServer do
  use GenServer

  @impl GenServer
  def init(_opts), do: {:ok, nil}

  @impl GenServer
  def handle_call(%DebitRequest{account_id: account_id, amount: amount}, _from, state) do
    account = Repo.get!(Account, account_id)

    reply =
      account
      |> Account.debit_changeset(amount)
      |> Repo.update()

    {:reply, reply, state}
  end
end
```

## What It Seems to Give

| Belief | Reality |
|--------|---------|
| Supervision makes the write fault tolerant | A restart does not retry the write. The in-flight call is lost and the caller exits. The transaction is the failure boundary; retries belong to the caller, with an idempotency key. |
| One process linearizes writes, so there are no races | It serializes only callers that go through it, on one node. Other nodes, the overlap during a rolling deploy, migrations, jobs, other services, and `iex` all write around it. |
| It protects the database from load | The Repo pool already bounds connections and queues callers. The GenServer adds a pool of size one in front of it. |
| `cast` makes writes fast and async | The mailbox is not durable. A crash or deploy drops every queued write without a trace. |
| It caches rows in its state | Two sources of truth that drift the moment anyone else writes. |

## Prefer

Run the write in the caller's process and let the database linearize it:

```elixir
defmodule MyApp.Accounts do
  import Ecto.Query

  def debit(account_id, amount) do
    Repo.transact(fn ->
      Account
      |> where([a], a.id == ^account_id)
      |> lock("FOR UPDATE")
      |> Repo.one!()
      |> Account.debit_changeset(amount)
      |> Repo.update()
    end)
  end
end
```

The row lock serializes concurrent debits of the same account, from any process on any node, while debits of other accounts run in parallel. `Repo.transact/2` (Ecto 3.13+) commits on `{:ok, value}` and rolls back on `{:error, error}`.

Pick the database mechanism that matches the guarantee:

| Need | Use |
|------|-----|
| No duplicates | Unique index, and `Repo.insert(changeset, on_conflict: :nothing, conflict_target: :email)` for upserts |
| No lost updates on a contended row | `lock("FOR UPDATE")` inside a transaction |
| No lost updates on a rarely contended row | `Ecto.Changeset.optimistic_lock/3`, retrying on `Ecto.StaleEntryError` |
| Ordering or sequence numbers | A database sequence or a version column |
| Mutual exclusion that is not a single row | `SELECT pg_advisory_xact_lock($1)` inside the transaction |
| Async writes that must survive a crash | A persisted job queue such as Oban |

## When a Process Belongs Near the Database

The process must own something the database does not:

- Time and a buffer: write-behind batching that collects rows and flushes them with `Repo.insert_all/3` on a timer or size threshold. It trades durability for throughput, so document the loss window and flush in `terminate/2` with `Process.flag(:trap_exit, true)`.
- A connection-shaped resource: a `Postgrex.Notifications` listener for `LISTEN`/`NOTIFY`.
- Authoritative in-memory state: a game room or auction that runs in memory and persists snapshots. While it runs, the process is the source of truth and the database is the backup, never both at once.

## Smells in Review

- `handle_call/3` bodies are `Repo` calls and the state is `nil` or unused
- The process is justified as "fault tolerance" or "to avoid race conditions"
- Writes go through `cast`
- The state holds rows that other code also writes
- The module has no unique indexes, locks, or transactions because the process "already serializes"

## Trade-offs

- Row locks and advisory locks hold a connection while waiting; keep transactions short and never call external services inside them.
- Optimistic locking pushes retries to the caller; it fits rows that rarely conflict.
- Throughput cost of the gatekeeper is covered in [queuing-remove-the-process.md](queuing-remove-the-process.md).
