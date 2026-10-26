# nats-py

Spells the NATS KV and JetStream primitives from [distributed.md](../surfaces/distributed.md).

Read [references/systems/nats.md](../systems/nats.md) for what the store guarantees; this file covers how nats-py spells it.

## KV Update With Revision

`update` takes the revision you read as `last`; `create` fails when the key already holds a live value.

```python
entry = await kv.get("config.limits")
nxt = bump(entry.value)
await kv.update("config.limits", nxt, last=entry.revision)

await kv.create("config.limits", initial)
```

`kv.put` after `kv.get` is the race. Wrap `update` in a bounded loop that re-gets on the mismatch error.

## Publish With Expected Sequence

nats-py takes the headers directly.

```python
await js.publish(
    subject,
    payload,
    headers={
        "Nats-Msg-Id": command_id,
        "Nats-Expected-Last-Subject-Sequence": str(loaded_seq),
    },
)
```

`Nats-Msg-Id` dedupes a retried publish inside the duplicate window; it does not order two different decisions.

## Consumer Side

Record the message id and the effect in one transaction through [psycopg.md](psycopg.md) or [sqlalchemy.md](sqlalchemy.md), then `await msg.ack()`. Confirm the consumer's `ack_wait` exceeds worst-case processing time and `max_deliver` is set.
