# Metric Naming Anti-Patterns

> **Spec sources**:
> - https://opentelemetry.io/docs/specs/semconv/general/naming/
> - https://opentelemetry.io/blog/2025/how-to-name-your-metrics/

## Bad Metric Names

| Bad Name | Correct | Why |
|----------|---------|-----|
| `payment_transaction_total` | `transaction.count` + `service.name=payment` | Service name → resource attribute |
| `user_service_auth_latency_ms` | `auth.duration` + unit `ms` | No service name or unit in name |
| `inventory_db_query_seconds` | `db.client.operation.duration` + unit `s` | Use semantic conventions |
| `api_gateway_requests_per_second` | `http.server.request.rate` + unit `{request}/s` | Clean name, rate in unit |
| `redis_cache_hit_ratio_percent` | `cache.hit_ratio` + unit `1` | Ratios are unitless |
| `prod_payment_errors` | `error.count` + `deployment.environment.name=prod` | Environment → resource attribute |
| `user_service_v2_latency` | `request.duration` + `service.version=2.0` | Version → resource attribute |
| `nodejs_payment_memory` | `process.runtime.memory` | Tech stack irrelevant to name |
| `latency_ms` | `request.duration` + unit `ms` | Unit in metadata |
| `count_total` | `request.count` | Never append `_total` |
| `ecommerce_cpu_usage` | `system.cpu.utilization` | Business domain doesn't belong |
| `node_42_memory_usage` | `system.memory.usage` + instance attribute | Instance in resource |

## Attribute Anti-Patterns

| Anti-Pattern | Problem | Fix |
|-------------|---------|-----|
| `product.id` vs `product.uuid` vs `product.unique_identifier` | Same concept, different names | Pick one and standardize |
| `service.env` vs `service.environment` vs `env` | Inconsistent naming | Use `deployment.environment.name` |
| `userId` vs `user_id` vs `user.id` | Mixed formats | Use dot-delimited snake_case: `user.id` |

## Cardinality Traps

High-cardinality metric attributes explode time series and cost. Never use as metric attributes:

- User IDs
- Request IDs
- IP addresses
- Full URL paths
- Session tokens
- Trace/span IDs

These belong in **span attributes** or **log fields**, not metric dimensions.

## Cross-Cutting Mistakes

1. **Units in metric names** — use unit metadata field
2. **Service/team names in metric names** — use `service.name` resource attribute
3. **Environment/version in names** — use resource attributes
4. **Appending `_total` to counters** — confuses delta backends
5. **Technology stack in names** (`nodejs_payment_memory`) — won't survive language migrations
6. **Using `otel.*` namespace for custom names** — reserved, risks future conflicts
7. **UpDownCounter attribute mismatch** — different attributes on increment vs decrement creates separate time series
