# Protocol-Specific Span Naming Patterns

> **Spec sources**:
> - https://opentelemetry.io/docs/specs/semconv/http/http-spans/
> - https://opentelemetry.io/docs/specs/semconv/database/database-spans/
> - https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/
> - https://opentelemetry.io/docs/specs/semconv/rpc/rpc-spans/

## HTTP Spans

- Format: **`{method} {route}`** or just **`{method}`** if no low-cardinality route
- `{method}` = `http.request.method` value; use `HTTP` if method is `_OTHER`
- Server spans: use `http.route` (e.g., `/users/:userID`)
- Client spans: use `url.template` if available
- **MUST NOT default to URI path** — cardinality explosion

Examples:
- `GET /api/users/:id`
- `POST /orders`
- `HTTP` (unknown method)

## Database Spans

- Hierarchy: `{db.query.summary}` > `{db.operation.name} {target}` > `{target}` > `{db.system.name}`
- `{target}` preference: `db.collection.name` > `db.stored_procedure.name` > `db.namespace` > `server.address:server.port`
- Parameterize queries by default; sanitize non-parameterized (replace literals with `?`)

Examples:
- `SELECT public.users`
- `INSERT products`
- `customers`
- `postgresql`

### Query Parameterization

- Collect parameterized queries by default
- For non-parameterized queries, sanitize by replacing literals with `?`
- Example: `SELECT * FROM users WHERE id = 123` → `SELECT * FROM users WHERE id = ?`

## Messaging Spans

- Format: **`{messaging.operation.name} {destination}`**
- `{destination}` preference: `messaging.destination.template` > `messaging.destination.name` > `server.address:server.port`

| Operation | Span Kind |
|-----------|-----------|
| `create` | `PRODUCER` |
| `send` | `PRODUCER` or `CLIENT` |
| `receive` | `CLIENT` |
| `process` | `CONSUMER` |
| `settle` | `CLIENT` |

Examples:
- `create shop.orders`
- `send shop.orders`
- `process shop.orders`
- `settle shop.orders`

## RPC Spans

- Format: **`{rpc.method}`** or `{rpc.system.name}` as fallback
- Client spans: `SpanKind.CLIENT`; Server spans: `SpanKind.SERVER`

Examples:
- `com.example.UserService/GetUser`
- `EchoService/Echo`
