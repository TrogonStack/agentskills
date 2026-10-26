# Redix

Spells the Redis primitives from [cache.md](../surfaces/cache.md). Redix passes commands through unchanged, so the server evaluates `NX` and the Lua script atomically.

Read [references/systems/redis.md](../systems/redis.md) for what the store guarantees; this file covers how Redix spells it.

## Lease For Cross-Process Single-Flight

The reply is `"OK"` for the winner and `nil` for everyone else.

```elixir
token = :crypto.strong_rand_bytes(16) |> Base.encode16()

case Redix.command(conn, ["SET", "lock:#{key}", token, "NX", "PX", "5000"]) do
  {:ok, "OK"} ->
    try do
      value = compute_expensive(key)
      Redix.command(conn, ["SET", key, encode(value), "PX", to_string(ttl_ms)])
    after
      release(conn, "lock:#{key}", token)
    end
  {:ok, nil} ->
    # wait briefly and re-read, or serve stale
end
```

## Compare-And-Delete Release

```elixir
@release """
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
end
return 0
"""

def release(conn, lock_key, token) do
  Redix.command(conn, ["EVAL", @release, "1", lock_key, token])
end
```

`GET` then `DEL` from the client is the race the script exists to remove.

## Check Then Set

`["SET", key, value, "NX"]` replaces `EXISTS` then `SET`.
