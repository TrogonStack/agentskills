# redis-py

Spells the Redis primitives from [cache.md](../surfaces/cache.md). The server evaluates `nx` and the Lua script atomically.

## Lease For Cross-Process Single-Flight

`set(..., nx=True)` returns `True` only for the winner.

```python
token = uuid4().hex
if r.set(f"lock:{key}", token, nx=True, px=5000):
    try:
        value = compute_expensive(key)
        r.set(key, encode(value), px=ttl_ms)
    finally:
        release(r, f"lock:{key}", token)
else:
    ...  # wait briefly and re-read, or serve stale
```

## Compare-And-Delete Release

```python
RELEASE = r.register_script("""
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
end
return 0
""")

def release(r, lock_key, token):
    RELEASE(keys=[lock_key], args=[token])
```

`r.get` then `r.delete` from the client is the race the script exists to remove.

## Check Then Set

`r.set(key, value, nx=True)` replaces `exists` then `set`. `r.setnx` is the older spelling without an expiry.
