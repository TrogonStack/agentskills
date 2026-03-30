# OTel Metric Namespace Reference

> **Spec source**: https://opentelemetry.io/docs/specs/semconv/general/naming/

## Worked Examples

| Metric | Pattern Used | Why |
|--------|-------------|-----|
| `http.server.request.duration` | `{area}.{server}.{metric_name}` | Both client and server HTTP metrics exist — need `server` |
| `http.client.request.body.size` | `{area}.{client}.{metric_name}` | Same area, client perspective |
| `db.client.operation.duration` | `{area}.{client}.{metric_name}` | DB is always measured from client side, but convention uses `client` |
| `system.memory.usage` | `{area}.{metric_name}` | No client/server ambiguity |
| `system.network.packet.dropped` | `{area}.{metric_name}` | Precise: includes `packet` rather than just `network.dropped` |
| `kestrel.connection.duration` | `{system_name}.{metric_name}` | Kestrel-specific, always server — no `server` needed |
| `messaging.process.duration` | `{area}.{metric_name}` | "process" implies consumer side |
| `messaging.client.sent.messages` | `{area}.{client}.{metric_name}` | Ambiguous side — needs `client` |
| `jvm.gc.duration` | `{system_name}.{metric_name}` | JVM-specific runtime metric |
| `system.linux.cpu.load_1m` | `system.{os}.{metric_name}` | OS-specific — different meaning across operating systems |

## Root Namespace Catalog

### Protocol Namespaces

| Root | Description | Example Metrics |
|------|-------------|-----------------|
| `http` | HTTP client/server metrics | `http.server.request.duration`, `http.client.request.body.size` |
| `rpc` | Remote procedure calls (gRPC, etc.) | `rpc.server.duration`, `rpc.client.duration` |
| `messaging` | Message brokers (Kafka, RabbitMQ, NATS) | `messaging.client.sent.messages`, `messaging.process.duration` |
| `dns` | DNS resolution | `dns.lookup.duration` |

### Database Namespaces

| Root | Description | Example Metrics |
|------|-------------|-----------------|
| `db` | Database operations | `db.client.operation.duration`, `db.client.connection.count` |

### Infrastructure Namespaces

| Root | Description | Example Metrics |
|------|-------------|-----------------|
| `system` | Host-level metrics | `system.cpu.utilization`, `system.memory.usage`, `system.disk.io` |
| `process` | Process-level metrics | `process.cpu.time`, `process.memory.usage` |
| `container` | Container metrics | `container.cpu.usage`, `container.memory.usage` |
| `k8s` | Kubernetes metrics | `k8s.pod.cpu.utilization`, `k8s.node.memory.usage` |

### Runtime Namespaces

| Root | Description | Example Metrics |
|------|-------------|-----------------|
| `jvm` | Java Virtual Machine | `jvm.memory.used`, `jvm.gc.duration`, `jvm.thread.count` |
| `dotnet` | .NET runtime | `dotnet.gc.collections`, `dotnet.thread_pool.queue.length` |
| `nodejs` | Node.js runtime | `nodejs.eventloop.delay`, `nodejs.active_handles.total` |
| `go` | Go runtime | `go.goroutine.count`, `go.memory.used` |
| `v8js` | V8 JavaScript engine | `v8js.heap.space.used_size` |

### Cloud Namespaces

| Root | Description | Example Metrics |
|------|-------------|-----------------|
| `aws.*` | AWS services | `aws.dynamodb.consumed_capacity`, `aws.s3.request.duration` |
| `azure.*` | Azure services | `azure.cosmosdb.request.duration` |
| `gcp.*` | Google Cloud services | `gcp.pubsub.publish.duration` |

### Application Namespaces

| Root | Description | Example Metrics |
|------|-------------|-----------------|
| `faas` | Function-as-a-Service | `faas.invoke_duration`, `faas.init_duration` |
| `gen_ai` | Generative AI / LLM | `gen_ai.client.token.usage`, `gen_ai.client.operation.duration` |
| `cicd` | CI/CD pipelines | `cicd.pipeline.run.duration` |

### System-Specific Namespaces

Some systems define their own root namespace when they don't fit into the generic categories above:

| Root | Description | Example Metrics |
|------|-------------|-----------------|
| `kestrel` | ASP.NET Kestrel server | `kestrel.connection.duration`, `kestrel.active_connections` |
| `signalr` | ASP.NET SignalR | `signalr.server.connection.duration` |
| `aspnetcore` | ASP.NET Core | `aspnetcore.routing.match_attempts` |

## Sub-namespace Patterns

### Communication Side: `{client|server}`

Used to disambiguate perspective when both sides exist:

```
http.server.request.duration    ← measured at the server receiving requests
http.client.request.duration    ← measured at the client sending requests
db.client.operation.duration    ← always client-side (no db.server in OTel)
```

**When to omit**: if the root namespace or metric name already implies the side:
- `kestrel.*` — always server-side
- `messaging.process.*` — always consumer-side
- `jvm.*` — always local runtime

### Runtime Context: `{runtime}`

Used within process-level metrics:

```
process.runtime.jvm.memory.usage
process.runtime.dotnet.gc.collections
```

## Custom Namespace Guidelines

### Company-Specific

Use reverse domain notation to avoid collisions:

```
com.acme.checkout.cart.items          ← company metric
com.acme.payment.transaction.count   ← company metric
```

### Application-Specific

Use a unique application name as root:

```
myapp.queue.depth
myapp.cache.hit_ratio
myapp.job.processing.duration
```

### When to Propose a New OTel Namespace

If your metric could apply across the industry (not just your company), consider proposing it to the OTel specification. Examples of metrics that became standard:

- `gen_ai.*` — started as custom, became official for LLM observability
- `cicd.*` — CI/CD pipeline metrics
