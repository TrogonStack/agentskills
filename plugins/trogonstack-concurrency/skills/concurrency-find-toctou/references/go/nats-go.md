# nats.go

Spells the NATS KV and JetStream primitives from [distributed.md](../surfaces/distributed.md) with the `jetstream` package of nats.go v2.

Read [references/systems/nats.md](../systems/nats.md) for what the store guarantees; this file covers how nats.go spells it.

## KV Update With Revision

`Update` takes the revision you read and fails on mismatch; `Create` fails when the key already holds a live value.

```go
entry, err := kv.Get(ctx, "config.limits")
if err != nil { return err }
next := bump(entry.Value())
_, err = kv.Update(ctx, "config.limits", next, entry.Revision())

_, err = kv.Create(ctx, "config.limits", initial)
```

`kv.Put` after `kv.Get` is the race. Wrap `Update` in a bounded loop that re-gets on the mismatch error.

## Publish With Expected Sequence

```go
ack, err := js.Publish(ctx, subject, payload,
    jetstream.WithMsgID(commandID),
    jetstream.WithExpectLastSequencePerSubject(loadedSeq),
)
```

`jetstream.WithExpectLastSequence`, `jetstream.WithExpectLastMsgID`, and `jetstream.WithExpectStream` cover the other headers. `WithMsgID` dedupes a retried publish inside the duplicate window; it does not order two different decisions.

## Consumer Side

Record the message id and the effect in one transaction through [database-sql.md](database-sql.md), then `msg.Ack()`. Confirm the consumer's `AckWait` exceeds worst-case processing time and `MaxDeliver` is set.
