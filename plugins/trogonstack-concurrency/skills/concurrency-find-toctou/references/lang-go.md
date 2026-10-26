# Go

How each primitive from the surface references is spelled in Go and the common modules. Read the surface reference first for the smell and the interleaver; this file only gives the idiomatic form.

## Filesystem

Exclusive create:

```go
f, err := os.OpenFile(path, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0o600)
if errors.Is(err, fs.ErrExist) {
    // someone else created it
} else if err != nil {
    return err
}
```

Atomic replace:

```go
tmp, err := os.CreateTemp(filepath.Dir(target), ".tmp-*")
if err != nil { return err }
if _, err := tmp.Write(data); err != nil { return err }
if err := tmp.Sync(); err != nil { return err }
if err := tmp.Close(); err != nil { return err }
if err := os.Rename(tmp.Name(), target); err != nil { return err }
```

Idempotent delete: `os.Remove` then `errors.Is(err, fs.ErrNotExist)`. Walking untrusted trees: `os.Root` (Go 1.24+) resolves paths relative to an opened directory and refuses escapes.

## Database

database/sql: `QueryRowContext` with `RETURNING` for the upsert; `RowsAffected` for the conditional update.

```go
var id int64
err := db.QueryRowContext(ctx,
    `INSERT INTO users (email) VALUES ($1)
     ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
     RETURNING id`, email).Scan(&id)

res, err := db.ExecContext(ctx,
    `UPDATE accounts SET balance = balance - $1 WHERE id = $2 AND balance >= $1`,
    amount, id)
if err != nil { return err }
if n, _ := res.RowsAffected(); n == 0 {
    return ErrInsufficientFunds
}
```

Row lock: `tx.QueryRowContext(ctx, "SELECT ... FOR UPDATE")` inside `db.BeginTx`, decide, `tx.ExecContext`, `tx.Commit`.

## Cache

Single-flight dedupes the computation; `sync.Map.LoadOrStore` publishes exactly one value.

```go
var group singleflight.Group

v, err, _ := group.Do(key, func() (any, error) {
    return computeExpensive(ctx, key)
})
```

```go
actual, loaded := m.LoadOrStore(key, candidate)
```

`LoadOrStore` evaluates `candidate` before the call; pair it with `singleflight` when construction is expensive. One-time initialization: `sync.Once` or `sync.OnceValue`. Cross-process lease with go-redis: `rdb.SetNX(ctx, "lock:"+key, token, 5*time.Second)` returns `true` only for the winner.

## Distributed

nats.go v2 jetstream KV: `Update` takes the revision you read and fails on mismatch; `Create` fails when the key already holds a live value.

```go
entry, err := kv.Get(ctx, "config.limits")
next := bump(entry.Value())
_, err = kv.Update(ctx, "config.limits", next, entry.Revision())

_, err = kv.Create(ctx, "config.limits", initial)
```

JetStream publish options set the headers from the distributed surface reference:

```go
ack, err := js.Publish(ctx, subject, payload,
    jetstream.WithMsgID(commandID),
    jetstream.WithExpectLastSequencePerSubject(loadedSeq),
)
```

`jetstream.WithExpectLastSequence`, `jetstream.WithExpectLastMsgID`, and `jetstream.WithExpectStream` cover the other headers.

## Async And In-Process

A `sync.Mutex` held across both the check and the store is correct and simple when contention is low:

```go
mu.Lock()
defer mu.Unlock()
if _, ok := m[key]; !ok {
    m[key] = build(key)
}
```

Releasing between the check and the store, or checking under `RLock` and storing under `Lock`, reopens the race. Scalar compare-and-swap:

```go
for {
    cur := counter.Load()
    if cur >= limit { return ErrExhausted }
    if counter.CompareAndSwap(cur, cur+1) { break }
}
```
