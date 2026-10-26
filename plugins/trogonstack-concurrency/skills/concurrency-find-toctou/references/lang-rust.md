# Rust

How each primitive from the surface references is spelled in Rust and the common crates. Read the surface reference first for the smell and the interleaver; this file only gives the idiomatic form.

## Filesystem

Exclusive create:

```rust
use std::fs::OpenOptions;
use std::io::ErrorKind;

match OpenOptions::new().write(true).create_new(true).open(&path) {
    Ok(file) => write_all(file, data)?,
    Err(e) if e.kind() == ErrorKind::AlreadyExists => { /* someone else created it */ }
    Err(e) => return Err(e.into()),
}
```

Atomic replace with the `tempfile` crate: create in the target's directory so `persist` is a rename on the same filesystem.

```rust
use std::io::Write;
use tempfile::NamedTempFile;

let dir = target.parent().unwrap();
let mut tmp = NamedTempFile::new_in(dir)?;
tmp.write_all(data)?;
tmp.as_file().sync_all()?;
tmp.persist(&target)?;
```

The standard library has no `openat`; use `cap-std` or `rustix` to resolve children relative to an open directory when walking untrusted trees.

## Database

sqlx: `RETURNING` for the upsert, `rows_affected()` for the conditional update.

```rust
let id: i64 = sqlx::query_scalar(
    "INSERT INTO users (email) VALUES ($1)
     ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
     RETURNING id",
)
.bind(&email)
.fetch_one(&pool)
.await?;

let done = sqlx::query(
    "UPDATE accounts SET balance = balance - $1 WHERE id = $2 AND balance >= $1",
)
.bind(amount)
.bind(id)
.execute(&pool)
.await?;
if done.rows_affected() == 0 {
    return Err(Error::InsufficientFunds);
}
```

Row lock inside a transaction: run `SELECT ... FOR UPDATE` on the `Transaction`, decide, update, commit. Every other writer to that row must lock the same way.

## Cache

`moka::future::Cache::get_with` computes once per key and hands the same value to concurrent callers; `try_get_with` does the same for a fallible initializer.

```rust
let value = cache
    .get_with(key.clone(), async { compute_expensive(&key).await })
    .await;
```

For a plain map, `DashMap::entry(key).or_insert_with(|| build(&key))` is atomic per key for synchronous construction. For one-time initialization, `std::sync::OnceLock::get_or_init` (sync) or `tokio::sync::OnceCell::get_or_init` (async).

## Distributed

async-nats KV: `update` takes the expected revision and fails on mismatch; `create` fails when the key already holds a live value. Confirm the exact method signatures against the `async-nats` version in use; the revision-guarded shape is stable, the argument order is what to check.

```rust
let entry = kv.entry("config.limits").await?.expect("key present");
let next = bump(&entry.value);
kv.update("config.limits", next.into(), entry.revision).await?;

kv.create("config.limits", initial.into()).await?;
```

JetStream publish: build a `Publish` with the expected last subject sequence and a message id. The builder exposes `expected_last_subject_sequence`, `expected_last_sequence`, `expected_stream`, and `message_id`, which set the headers named in the distributed surface reference. If the builder differs in the version in use, set the `Nats-Expected-Last-Subject-Sequence` header directly on the message.

```rust
use async_nats::jetstream::context::Publish;

let publish = Publish::build()
    .payload(payload.into())
    .message_id(command_id)
    .expected_last_subject_sequence(loaded_sequence);
let ack = js.send_publish(subject, publish).await?.await?;
```

## Async And In-Process

A `std::sync::Mutex` guard held across an `.await` makes the future `!Send`, so `tokio::spawn` rejects it, and on a current-thread runtime it deadlocks the moment another task needs the lock. Either drop the guard before the await (which reopens the race) or switch to `tokio::sync::Mutex` and hold it across the whole decision:

```rust
let mut state = state.lock().await;
if !state.contains_key(&key) {
    let value = build(&key).await;
    state.insert(key, value);
}
```

That serializes every caller through one lock. When per-key atomicity is enough, prefer the entry API or `moka` from the cache section.

Scalar compare-and-swap:

```rust
use std::sync::atomic::{AtomicU64, Ordering};

loop {
    let current = counter.load(Ordering::Acquire);
    if current >= limit { return Err(Error::Exhausted); }
    if counter
        .compare_exchange(current, current + 1, Ordering::AcqRel, Ordering::Acquire)
        .is_ok()
    {
        break;
    }
}
```
