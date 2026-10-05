# Pool a Resource

When the bottleneck is a scarce external resource (connections, sockets, licenses), the fix is a pool of them, not one process guarding a single instance.

## Avoid

```elixir
@impl GenServer
def init(opts) do
  {:ok, conn} = PaymentsClient.connect(opts)
  {:ok, conn}
end

@impl GenServer
def handle_call(%ChargeRequest{} = request, _from, conn) do
  {:reply, PaymentsClient.charge(conn, request), conn}
end
```

One connection, one request at a time, for the whole node.

## Prefer

Use the pool your client library already ships before writing one. Ecto pools database connections and Finch pools HTTP connections:

```elixir
children = [
  {Finch, name: MyApp.Finch, pools: %{"https://payments.example.com" => [size: 25]}}
]

Finch.build(:post, "https://payments.example.com/charges", headers, body)
|> Finch.request(MyApp.Finch)
```

When no library pool exists, build one with `NimblePool`, which checks a resource out to the caller's process so the work runs there and the pool process only hands out resources:

```elixir
NimblePool.checkout!(MyApp.PaymentsPool, :checkout, fn _from, conn ->
  {PaymentsClient.charge(conn, request), conn}
end)
```

## Trade-offs

- Pool size is a capacity decision: too small queues callers at checkout, too large overwhelms the external system.
- Checkout has its own timeout; treat a checkout timeout as overload, not as a bug.
