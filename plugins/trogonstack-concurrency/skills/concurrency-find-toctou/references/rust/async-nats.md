# async-nats

Spells the NATS KV and JetStream primitives from [distributed.md](../surfaces/distributed.md). The revision-guarded shape is stable across versions; the exact argument order and builder method names are what to confirm against the `async-nats` version in use.

## KV Update With Revision

`update` takes the expected revision and fails on mismatch; `create` fails when the key already holds a live value.

```rust
let entry = kv.entry("config.limits").await?.expect("key present");
let next = bump(&entry.value);
kv.update("config.limits", next.into(), entry.revision).await?;

kv.create("config.limits", initial.into()).await?;
```

`kv.put` after `kv.entry` is the race. Wrap `update` in a bounded loop that re-reads on the mismatch error.

## Publish With Expected Sequence

Build a `Publish` with the expected last subject sequence and a message id. The builder exposes `expected_last_subject_sequence`, `expected_last_sequence`, `expected_stream`, and `message_id`, which set the headers named in the surface file. If the builder differs in the version in use, set the `Nats-Expected-Last-Subject-Sequence` header directly on the message.

```rust
use async_nats::jetstream::context::Publish;

let publish = Publish::build()
    .payload(payload.into())
    .message_id(command_id)
    .expected_last_subject_sequence(loaded_sequence);
let ack = js.send_publish(subject, publish).await?.await?;
```

The first `await` sends; the second awaits the server's ack, which is where a sequence mismatch surfaces.

## Consumer Side

Record the message id and the effect in one database transaction through [sqlx.md](sqlx.md), then `message.ack().await?`. Confirm the consumer's `ack_wait` exceeds worst-case processing time.
