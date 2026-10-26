# nats.js

Spells the NATS KV and JetStream primitives from [distributed.md](../surfaces/distributed.md).

Read [references/systems/nats.md](../systems/nats.md) for what the store guarantees; this file covers how nats.js spells it.

## KV Update With Revision

`update` takes the revision you read and rejects when the key has moved on; `create` fails when the key already holds a live value.

```ts
const entry = await kv.get("config.limits");
const next = bump(entry!.json());
await kv.update("config.limits", JSON.stringify(next), entry!.revision);

await kv.create("config.limits", initial);
```

`kv.put` after `kv.get` is the race. Wrap `update` in a bounded loop that re-gets on a revision mismatch.

## Publish With Expected Sequence

```ts
await js.publish(subject, payload, {
  msgID: commandId,
  expect: { lastSubjectSequence: loadedSequence },
});
```

The `expect` object also accepts `lastSequence`, `lastMsgID`, and `streamName`, which map one to one onto the headers in the surface file. `msgID` sets `Nats-Msg-Id` and dedupes a retried publish inside the stream's duplicate window; it does not order two different decisions.

## Consumer Side

The client cannot make the effect transactional. Record the message id and the effect in one database transaction through the database library in use, then `msg.ack()`. Confirm the consumer's `ack_wait` exceeds worst-case processing time.
