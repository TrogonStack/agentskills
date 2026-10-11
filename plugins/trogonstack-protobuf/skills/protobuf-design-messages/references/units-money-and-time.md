# Units, Money, and Time Instead of Bare Numbers

Use this reference when defining a quantity, a monetary amount, or an instant in time.

## Units Live in the Name

A bare numeric field answers "how much" but not "of what unit." Suffix the field name with the unit so the number is self-describing wherever it travels, including into JSON and logs. This mirrors [Google AIP-141](https://google.aip.dev/141): "Quantities with a clear unit of measurement (such as bytes, miles, and so on) must include the unit of measurement as the suffix."

```protobuf
// Avoid: ambiguous unit.
int64 size = 1;
int32 timeout = 2;

// Prefer: the unit travels with the value.
int64 size_bytes = 1;
int32 timeout_seconds = 2;
```

## Money Is Amount Plus Currency, Never a Float

A bare amount is incomplete without its currency, and floating point loses cents at scale. Keep the amount as a fixed-point integer, name it with its unit, and pair it with an ISO 4217 currency code, in one message:

```protobuf
// Avoid: no currency, and floating point drifts under repeated arithmetic.
double price = 1;

// Prefer: fixed-point amount, explicit unit, explicit currency.
message Money {
  int64 amount_micros = 1;
  string currency_code = 2;  // ISO 4217, e.g. "USD"
}
```

`google.type.Money` (units plus nanos, also paired with an ISO 4217 `currency_code`) is the widely used precedent for this shape; the fields above follow the same principle with micros instead of nanos as the fractional unit. Either precision works as long as the amount, its fractional unit, and the currency travel together in one message.

## Instants Are Timestamps, Named With `_at`

Use `google.protobuf.Timestamp` for a point in time, not an `int64` of ambiguous epoch and unit, and suffix the field name `_at` to mark it as an instant rather than a duration or a date-only value:

```protobuf
import "google/protobuf/timestamp.proto";

// Avoid: ambiguous unit (seconds? millis?) and epoch.
int64 created = 1;

// Prefer: self-describing type, _at suffix.
google.protobuf.Timestamp created_at = 1;
```

## Review Questions

- Does any numeric field omit its unit from the name?
- Does any monetary field use `float`/`double`, or omit the currency?
- Does any instant use a raw integer instead of `google.protobuf.Timestamp`, or omit the `_at` suffix?
