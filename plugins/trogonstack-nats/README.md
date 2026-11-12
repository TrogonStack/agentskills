# trogonstack-nats

NATS channel design guidance for Core NATS and JetStream. The plugin covers subject hierarchies, request-reply, live signals, durable events, durable work, account tenancy, authorization, AsyncAPI fragments, NACK-owned streams and consumers, and subject migrations.

```bash
claude plugin install trogonstack-nats@trogonstack
```

Use the skill when you need to design or audit NATS subjects, decide whether a channel is Core NATS or JetStream, define AsyncAPI application fragments, define NACK-owned streams and optional consumers, or document the management and provisioning contract. It does not configure a NATS cluster or replace client-library documentation.

The tagged subject examples can be checked locally:

```bash
node plugins/trogonstack-nats/skills/nats-design-subject/scripts/validate-subjects.mjs \
  --root plugins/trogonstack-nats/skills/nats-design-subject
```
