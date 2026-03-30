# Span Naming Anti-Patterns

> **Spec sources**:
> - https://opentelemetry.io/docs/specs/semconv/general/naming/
> - https://opentelemetry.io/blog/2025/how-to-name-your-spans/

## Bad Span Names

| Bad Name | Good Name | Why |
|----------|-----------|-----|
| `process_payment_for_user_jane_doe` | `process payment` | User ID → attribute |
| `send_invoice_#98765` | `send invoice` | Invoice number → attribute |
| `render_ad_for_campaign_summer_sale` | `render ad` | Campaign → attribute |
| `calculate_shipping_for_zip_90210` | `calculate shipping` | Zip code → attribute |
| `validation_failed` | `validate user_input` | Focus on operation, not outcome |
| `process_invoice_98765` | `process invoice` | No instance-specific data |
| `user_jane_doe_login` | `authenticate user` | No user-specific data |
| `payment_service_process_v2` | `process payment` | No service/version context |

## High-Cardinality Red Flags

- Names appearing only once in a trace
- UUIDs, user IDs, or timestamps in the name
- Hundreds of slight variations for the same operation
- Full URL paths instead of route templates

## HTTP-Specific Anti-Patterns

| Bad | Good | Why |
|-----|------|-----|
| `/users/123/orders/456` | `GET /users/:id/orders/:orderId` | Raw path → cardinality explosion |
| `GET https://api.example.com/users/123` | `GET /users/:id` | Full URL → use route template |
| `unknown` | `HTTP` | Use `HTTP` when method is `_OTHER` |

## Attribute Anti-Patterns

| Anti-Pattern | Problem | Fix |
|-------------|---------|-----|
| `product.id` vs `product.uuid` | Same concept, different names | Pick one and standardize |
| `userId` vs `user_id` vs `user.id` | Mixed formats | Use dot-delimited snake_case: `user.id` |
| Missing `db.system.name` on DB calls | Won't correlate across services | Always set semantic convention attributes |
| Using `otel.*` for custom attributes | Reserved namespace | Use app or company prefix |

## Cross-Cutting Mistakes

1. **High-cardinality span names** — IDs, user data, timestamps → use span attributes
2. **Raw URL paths as span targets** — `/users/123` → use route templates `/users/{id}`
3. **Service/version in span names** — `payment_service_process_v2` → use resource attributes
4. **Outcome in span name** — `validation_failed` → use span status for outcomes
5. **Inconsistent naming across teams** — `userId` vs `user_id` vs `user.id` → standardize
6. **Missing semantic convention attributes** — DB calls without `db.system.name`, `db.statement` won't correlate
