# Chunk Long Work

A single message that triggers a long job holds the server for the whole job. Split the job into batches and send the next batch to yourself, so client messages that arrive in between are handled between batches.

If the job does not need server state, run it in a `Task` instead; see [queuing-offload-slow-work.md](queuing-offload-slow-work.md).

## Avoid

```elixir
@impl GenServer
def handle_call(%ImportRequest{rows: rows}, _from, %Catalog{} = catalog) do
  catalog = Enum.reduce(rows, catalog, &Catalog.import_row(&2, &1))
  {:reply, :ok, catalog}
end
```

Importing 100,000 rows blocks every lookup until the import ends.

## Prefer

```elixir
@batch_size 500

@impl GenServer
def handle_call(%ImportRequest{rows: rows}, _from, %CatalogServerState{} = state) do
  if state.import_queue == [], do: send(self(), %ImportNextBatch{})
  import_queue = state.import_queue ++ rows
  response = %ImportResponse{pending_rows: length(import_queue)}
  {:reply, {:ok, response}, %CatalogServerState{state | import_queue: import_queue}}
end

@impl GenServer
def handle_info(%ImportNextBatch{}, %CatalogServerState{import_queue: []} = state) do
  {:noreply, state}
end

def handle_info(%ImportNextBatch{}, %CatalogServerState{} = state) do
  {batch, rest} = Enum.split(state.import_queue, @batch_size)
  catalog = Enum.reduce(batch, state.catalog, &Catalog.import_row(&2, &1))
  send(self(), %ImportNextBatch{})
  {:noreply, %CatalogServerState{state | catalog: catalog, import_queue: rest}}
end
```

- `send(self(), msg)` puts the message at the back of the mailbox, behind client messages already waiting. That is what lets them interleave.
- `{:continue, term}` would run before any other message, which defeats the purpose here; see [handle-info.md](handle-info.md#deferring-work-to-yourself).
- Only a request that finds the queue empty schedules a batch. A second import joins the queue; scheduling again would start a second chain and double the batch rate.
- The reply means "accepted", not "imported", and reports the backlog. Progress is new fields on `ImportResponse` or a separate request.

## Trade-offs

- Lookups during the import see a partially imported catalog. If that is not acceptable, build the new catalog in a task and swap it in with one message.
- Batch size trades import throughput against lookup latency: a lookup waits at most one batch.
- The rows are copied into the server with the request; see [queuing-large-replies.md](queuing-large-replies.md). For large imports, send a source such as a file path and read it batch by batch.
